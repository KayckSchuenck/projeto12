import express,{json} from 'express'
import cors from 'cors'
import {MongoClient} from 'mongodb'
import dotenv from 'dotenv'
import dayjs from 'dayjs/locale/pt-br'
import joi from 'joi'

dotenv.config()
const client=new MongoClient(process.env.URL_MONGO)
let db;

const server=express()
server.use(cors())
server.use(json())

server.post('/participants',async(req,res)=>{
    try{
        await client.connect()
        db=client.db('API_UOL')
        const {name}=req.body
        await db.collection("participantes").insertOne({name,lastStatus:Date.now()})
        res.sendStatus(201)
        client.close()
    } catch(e){
        res.sendStatus(500)
        client.close()
    }
})    
    
server.get('/participants',async (req,res)=>{
    try {
        await client.connect()
        db=client.db('API_UOL')
        const participantes= await db.collection('participantes').find().toArray()
        res.send(participantes)
        client.close()
    } catch(e){
        res.sendStatus(500)
        client.close()
    }
})
server.post('/messages',async (req,res)=>{
    try {
        await client.connect()
        db=client.db('API_UOL')
        const {to,text,type}=req.body
        const from=req.headers.User
        const time=dayjs().locale('pt-br').format('HH:MM:SS')
        await db.collection('mensagem').insertOne({to,text,type,from,time})
        res.sendStatus(201)
        client.close()
    } catch(e){
        res.sendStatus(500)
        client.close()
    }
})
server.get('/messages',async (req,res)=>{
    try{
        await client.connect()
        db=client.db('API_UOL')
        const limit=parseInt(req.query.limit)
        const {User}=req.headers
        const mensagens= await db.collection('mensagens').find().toArray()
        mensagens.filter(e=>e.to===User||e.from===User)
        if(!limit){
            res.send(mensagens)
        } else{
            res.send(mensagens).splice(-limit)
        }
        client.close()
    } catch(e){
        res.sendStatus(500)
        client.close()
    }
})
server.post('/status',async (req,res)=>{
    try{
        await client.connect()
        db=client.db('API_UOL')
        const {User}=req.headers
        const colecao=await db.collection('participantes')
        const search=colecao.findOne({name:User})
        if(search){
            await colecao.updateOne(
                { name:User },
                { $set:{lastStatus:Date.now()} }
            )
            res.sendStatus(200)
        } else{
            res.sendStatus(404)
            client.close()
        }
    } catch(e) {
        res.sendStatus(500)
        client.close()
    }
})

setInterval(async () => {
    try{
        await client.connect()
        db=client.db('API_UOL')
        const query={$where:(e)=>{
            Date.now()-e.lastStatus>10
        }}
        await db.collection('participantes').deleteMany(query)
        client.close()
    } catch(e){
        res.sendStatus(500)
        client.close()
    }
}, 15000);

server.listen(5000)