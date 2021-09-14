/* eslint-disable no-console */
const app = require('../modules/dashboard/dashboard')
const supertest = require('supertest')
const MongoClient = require('mongodb').MongoClient


const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'
const col_name_n = 'notifications'


let connection;
let dbo;

beforeAll(async ()=>{
    connection = await MongoClient.connect(url,{
        useNewUrlParser: true,
        useUnifiedTopology: true
  
    })
    dbo = await connection.db(db_name)
    
})

afterAll(async ()=>{
    await connection.close()
})


test('GET /mainpage2 ',async () => {
    await supertest(app).get('/mainpage2')
        .expect(200)
        .then(async (res)=>{
            const questions = await dbo.collection(col_name_q).find({'PostTypeId':1}).toArray()
            const answers = await dbo.collection(col_name_q).find({'PostTypeId':2}).toArray()

            expect(JSON.stringify(res.body.questions)).toEqual(JSON.stringify(questions))
            expect(JSON.stringify(res.body.answers)).toEqual(JSON.stringify(answers))
        })
})

test('POST /searchstring ',async () => {
    const search_obj={
        search_string:"c++"
    }
    await supertest(app).post('/searchstring')
        .send(search_obj)
        .expect(200)
        .then(async (res)=>{
            const recieved = res.body
            recieved.questions.forEach(p=>expect((p.Title+p.Body).indexOf(search_obj.search_string)>=0).toBe(true))
            recieved.answers.forEach(p=>expect((p.Title+p.Body).indexOf(search_obj.search_string)>=0).toBe(true))
        })
})

test('GET /searchpost/:search_string ',async () => {
    
    const search_string = "c++ mongo"
    await supertest(app).get(`/searchpost/${search_string}`)
        .expect(200)
        .then(async (res)=>{
            const recieved = res.body

            const posts = await dbo.collection(col_name_q).find({$text:{$search:search_string}}).toArray()
            const questions = posts.filter(p=>{return p.PostTypeId==1}).sort((q1,q2)=>q2.ViewCount-q1.ViewCount)
            const answers = posts.filter(p=>{return p.PostTypeId==2}).sort((a1,a2)=>a2.ViewCount-a1.ViewCount)

            expect(JSON.stringify(res.body.questions)).toEqual(JSON.stringify(questions))
            expect(JSON.stringify(res.body.answers)).toEqual(JSON.stringify(answers))
        })
})


test('POST /suggested ',async () => {
    const q_details={
        "Title":"Testing",
        "Body":"using jest"
    }
    await supertest(app).post('/suggested')
        .send(q_details)
        .expect(302)
        .then(async (res)=>{
            // const recieved = res.body

            // const posts = await dbo.collection(col_name_q).find({$text:{$search:q_details.Title+" "+q_details.Body}}).toArray()
            // const questions = posts.filter(p=>{return p.PostTypeId==1}).sort((q1,q2)=>q2.ViewCount-q1.ViewCount)

            // expect(JSON.stringify(res.body)).toEqual(JSON.stringify(questions))
            let str = q_details.Title+" "+q_details.Body
            const str_arr = str.split(" ")
            str = str_arr.join("%20")
            expect(res.headers.location).toBe(`/searchpost/${str}`)
        })
})


test('GET /questions/sort/ViewCount/asc ',async () => {
    await supertest(app).get('/questions/sort/ViewCount/asc')
        .expect(200)
        .then(async (res)=>{
            const questions = await dbo.collection(col_name_q).find({'PostTypeId':1}).sort({'ViewCount':1}).toArray()

            expect(JSON.stringify(res.body)).toEqual(JSON.stringify(questions))
            
        })
})

test('GET /questions/sort/ViewCount/desc ',async () => {
    await supertest(app).get('/questions/sort/ViewCount/desc')
        .expect(200)
        .then(async (res)=>{
            const questions = await dbo.collection(col_name_q).find({'PostTypeId':1}).sort({'ViewCount':-1}).toArray()

            expect(JSON.stringify(res.body)).toEqual(JSON.stringify(questions))
            
        })
})

test('GET /questions/sort/Score/asc ',async () => {
    await supertest(app).get('/questions/sort/Score/asc')
        .expect(200)
        .then(async (res)=>{
            const questions = await dbo.collection(col_name_q).find({'PostTypeId':1}).sort({'Score':1}).toArray()

            expect(JSON.stringify(res.body)).toEqual(JSON.stringify(questions))
            
        })
})

test('GET /answers/sort/Score/asc ',async () => {
    await supertest(app).get('/answers/sort/Score/asc')
        .expect(200)
        .then(async (res)=>{
            const answers = await dbo.collection(col_name_q).find({'PostTypeId':2}).sort({'Score':1}).toArray()

            expect(JSON.stringify(res.body)).toEqual(JSON.stringify(answers))
            
        })
})

test('GET /trending ',async () => {
    await supertest(app).get('/trending')
        .expect(302)
        .then(async (res)=>{
            expect(res.headers.location).toBe(`/questions/sort/Score/desc`)            
        })
})

test('GET /searchcusts/:name ',async () => {
    const name='pradyumn'
    
    await supertest(app).get(`/searchcusts/${name}`)
        .expect(200)
        .then(async (res)=>{
            const recieved = res.body

            const users = await dbo.collection(col_name_u).find().toArray()
            const expected = users.filter(u=>{return u.displayName.toLowerCase().indexOf(name)>=0})
            expect(JSON.stringify(recieved)).toEqual(JSON.stringify(expected))
        })
})

test('GET /searchTags/:tag', async () => {
    const tag = "c++"

    await supertest(app).get(`/searchTags/${tag}`)
        .expect(200)
        .then(async (res)=>{
            const recieved = res.body

            const questions = await dbo.collection(col_name_q).find({'PostTypeId':1}).sort({'ViewCount':-1}).toArray()
            const expected = questions.filter(q=>{return q.Tags.indexOf(tag)>=0})
            expect(JSON.stringify(recieved.questions)).toEqual(JSON.stringify(expected))
        })
})
