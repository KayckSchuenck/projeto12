import express,{json} from 'express'
import cors from 'cors'
import {MongoClient} from 'mongodb'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import joi from 'joi'

dotenv.config()
const client=new MongoClient(process.env.URL_MONGO)
let db;

const server=express()
server.use(cors())
server.use(json())

client.connect().then(()=>{
    db=client.db('API_UOL')
})

server.post('/participants',async(req,res)=>{
    try{
        const schemaParticipants=joi.object({
            name:joi.string().required(),
        })
        const validation=schemaParticipants.validate(req.body)
        if(validation.error){
            res.sendStatus(422)
            return
        }
        const {name}=req.body
        const check=await db.collection("participantes").findOne({name})
        if(check){
            res.sendStatus(409)
            return
        }
        await db.collection("participantes").insertOne({name,lastStatus:Date.now()})
        res.sendStatus(201)
    } catch(e){
        res.status(500).send(e)
    }
})    
    
server.get('/participants',async (req,res)=>{
    try {
        const participantes= await db.collection('participantes').find().toArray()
        res.send(participantes)
    } catch(e){
        res.status(500).send(e)
    }
})

server.post('/messages',async (req,res)=>{
    const schemaMessages=joi.object({
        to:joi.string().required(),
        text:joi.string().required(),
        type:joi.string().valid("message","private_message").required(),
    })
    const validation=schemaMessages.validate(req.body)
    const {to,text,type}=req.body
    const from=req.headers.user
    const time=dayjs().format('HH:mm:ss')
    const check=await db.collection("participantes").findOne({name:from})
    try {
        if(!check||validation.error){
            res.sendStatus(422)
            return
        }
        await db.collection('mensagens').insertOne({
            to,
            text,
            type,
            from,
            time
        })
        res.sendStatus(201)
    } catch(e){
        res.status(500).send(e)
    }
})
server.get('/messages',async (req,res)=>{
    try{
        const limit=(req.query.limit)
        const {user}=req.headers
        const mensagens= await db.collection('mensagens').find().toArray()
        let filtrado=mensagens.filter(e=>e.to===user||e.from===user||e.type==='message')
        if(!limit){
            res.send(filtrado)
        } else{
            res.send(filtrado.slice(-limit))
        }
    } catch(e){
      res.status(500).send(e)
    }
})
server.post('/status',async (req,res)=>{
    try{
        const {user}=req.headers
        const search= await db.collection('participantes').findOne({name:user})
        if(search){
            await db.collection('participantes').updateOne(
                { name:user },
                { $set:{lastStatus:Date.now()} }
            )
            res.sendStatus(200)
        } else{
            res.sendStatus(404)
        }
    } catch(e){
        res.status(500).send(e)
    }
})

setInterval(async (req,res) => {
    try{
        const tempo=Date.now()-10000
        const search=await db.collection('participantes').find({ lastStatus: { $lte:tempo} }).toArray()
        if(search.length>0){
            const mensagemSaida= search.map(e=>{
                return {
                    from:e.name,
                    to:'Todos',
                    text:`sai da sala...`,
                    type:'status',
                    time:dayjs().format('HH:mm:ss')
                }
            })
            db.collection("mensagens").insertMany(mensagemSaida)
            db.collection('participantes').deleteMany({ lastStatus: { $lte:tempo} })
        }
    } catch(e){
        res.status(500).send(e)
    }
}, 15000);

server.listen(5000)