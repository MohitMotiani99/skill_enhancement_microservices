const app = require('../modules/questions/questions')
const supertest = require('supertest')

const MongoClient = require('mongodb').MongoClient


const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'
const col_name_n = 'notifications'


let connection;
let dbo;

function compare(recieved,expected){
    expect(recieved.Id).toBe(expected.Id)
    expect(recieved.AcceptedAnswerId).toBe(expected.AcceptedAnswerId)
    expect(recieved.PostTypeId).toBe(expected.PostTypeId)
    expect(recieved.CreationDate).toBe(expected.CreationDate)
    expect(recieved.Score).toBe(expected.Score)
    expect(recieved.OwnerUserId).toBe(expected.OwnerUserId)
    expect(recieved.Title).toBe(expected.Title)
    expect(recieved.Body).toBe(expected.Body)
    expect(recieved.Tags).toEqual(expected.Tags)
    expect(recieved.ClosedDate).toBe(expected.ClosedDate)
}

beforeAll(async ()=>{
    connection = await MongoClient.connect(url,{
        useNewUrlParser: true,
        useUnifiedTopology: true
  
    })
    dbo = await connection.db(db_name)
    //console.log('db')
    //console.log(dbo)
})

afterAll(async ()=>{
    //await dbo.close()
    //console.log('in here')
    await connection.close()
    //done()
})


beforeEach(async ()=>{
    await dbo.collection(col_name_q).insertOne({
        "Id": 9998,
        "PostTypeId": 2,
        "CreationDate": Date.now(),
        "ParentId":9999,
        "Score": 12,
        "ViewCount": 100,
        "OwnerUserId": 902,
        "Body": "Answer Tests v1.0",
    })
    await dbo.collection(col_name_q).insertOne({
        "Id": 9999,
        "PostTypeId": 1,
        "AcceptedAnswerId": -1,
        "CreationDate": 1629953505529,
        "Score": 15,
        "ViewCount": 186,
        "OwnerUserId": 901,
        "Title": "testing api for edit question again after reopening edittes",
        "Body": "api seems to work fine reopen",
        "Tags": [
            "java",
            "mongo",
            "python"
        ],
        "ClosedDate": null
    })
    await dbo.collection(col_name_u).insertMany([{
        'Id':901,
        'token':'t1',
        'username':'tester'
    },
    {
        'Id':902,
        'token':'t2',
        'username':'tester'
    },])
})
afterEach(async ()=>{
    await dbo.collection(col_name_q).deleteOne({'Id':9998,'PostTypeId':2})
    await dbo.collection(col_name_q).deleteOne({'Id':9999,'PostTypeId':1})
    await dbo.collection(col_name_u).deleteMany({'username':'tester'})
    await dbo.collection(col_name_n).deleteMany({'UserId':901})
    await dbo.collection(col_name_n).deleteMany({'UserId':902})
    await dbo.collection('votes').deleteMany({'UserId':901})
    await dbo.collection('votes').deleteMany({'UserId':902})
})


test('GET /questions/:question_id  InValid Question',async () => {

    const question_id = 100000
    await supertest(app).get(`/questions/${question_id}`)
        .expect(200)
        .then((res)=>{
            //console.log(res.text)
            expect(res.text).toBe('Invalid Question ID')
        })
        
})

test('GET /questions/:question_id  Valid Question',async () => {

    const question_id = 9999
    await supertest(app).get(`/questions/${question_id}`)
        .expect(200)
        .then(async (res)=>{
            const query_res = await dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray()
            const expected = query_res[0]
            const recieved = res.body

            compare(recieved,expected)
        })
})

test('GET /questions/:question_id/:vote NOT LOGGED IN',async ()=>{
    const question_id = 9999
    const vote = 'upvote'
    await supertest(app)
        .get(`/questions/${question_id}/${vote}`)
        .expect(200)
        .then(async (res)=>{
            //should exit why update
            //console.log(res.text)
            //console.log(res.body)
            expect(res.text).toBe('Not Logged In')
        })
})

test('GET /questions/:question_id/:vote UPVOTE',async ()=>{

    const question_id = 9999
    const vote = 'upvote'

    let query_res = await dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray()
    const preAPI = query_res[0]

    await supertest(app)
        .get(`/questions/${question_id}/${vote}`)
        .set({'x-access-token':'t2'})
        .expect(302)
        .then(async (res)=>{
            //console.log(res.text)
            //console.log(res.body)
            query_res = await dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray()
            const postAPI = query_res[0]
            //let preAPI = postAPI
            //console.log(preAPI)
            preAPI['Score']+=1
            //console.log(postAPI)
            compare(preAPI,postAPI)
        })
})

test('GET /questions/:question_id/:vote DOWNVOTE',async ()=>{

    const question_id = 9999
    const vote = 'downvote'

    let query_res = await dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray()
    const preAPI = query_res[0]

    await supertest(app)
        .get(`/questions/${question_id}/${vote}`)
        .set({'x-access-token':'t2'})
        .expect(302)
        .then(async (res)=>{
            //console.log(res.text)
            //console.log(res.body)
            query_res = await dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray()
            const postAPI = query_res[0]
            //let preAPI = postAPI
            //console.log(preAPI)
            preAPI['Score']-=1
            //console.log(postAPI)
            compare(preAPI,postAPI)
        })
})


test('POST /questions/add  NOT LOGGED IN', async () => {
    const question={
        'Title':'Testing Jtest',
        'Body':'Jest Testing going on',
        'Tags':['jest','supertest']
    }
        
    await supertest(app)
        .post('/questions/add')
        .set({'content-type':'application/json'})
        .send(question)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })
})
test('POST /questions/add  INVALID TOKEN', async () => {
    const question={
        'Title':'Testing Jtest',
        'Body':'Jest Testing going on',
        'Tags':['jest','supertest']
    }
        
    await supertest(app)
        .post('/questions/add')
        .set({'content-type':'application/json'})
        .set({'x-access-token':'nottoken'})
        .send(question)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})


describe('Adding Question ', ()=>{

    let q_id;

        
    afterEach(async ()=>{
            
        await dbo.collection(col_name_q).deleteOne({'Id':q_id})
    })

    test('POST /questions/add', async () => {
        const question={
            'Title':Math.random().toString(),
            'Body':'Jest Testing going on',
            'Tags':['jest','supertest']
        }
            
        await supertest(app)
            .post('/questions/add')
            .set({'content-type':'application/json'})
            .set({'x-access-token':'t1'})
            .send(question)
            .expect(302)
            .then(async (res)=>{
    
                expect(res.headers.location).toMatch(/questions\/\d+/)
    
                q_id = res.body.Id
                // console.log(res)
    
                let recieved = await dbo.collection(col_name_q).find({'Title':question.Title,'PostTypeId':1}).toArray()
                recieved = recieved[0]
                q_id = recieved.Id
                expect(recieved.AcceptedAnswerId).toStrictEqual(-1)
                expect(recieved.PostTypeId).toStrictEqual(1)
                expect(recieved.Score).toStrictEqual(0)
                expect(recieved.OwnerUserId).toStrictEqual(901)
                expect(recieved.Title).toBe(question.Title)
                expect(recieved.Body).toBe(question.Body)
                expect(recieved.Tags).toEqual(question.Tags)
                expect(recieved.ClosedDate).toBe(null)
            })
    })
})

describe('Add Answer ',()=>{
    afterEach(async ()=>{
        await dbo.collection(col_name_q).deleteMany({'PostTypeId':2,'ParentId':9999})
    })
    test('POST /questions/:question_id/answers/add', async () => {
        const question_id = 9999
        const answer = {
            'Body':'Testing Add Answer v1.2 for JEST'
        }
        await supertest(app).post(`/questions/${question_id}/answers/add`)
            .set({'content-type':'application/json'})
            .set({'x-access-token':'t2'})
            .send(answer)
            .expect(200)
            .then(async (res)=>{
                let recieved = await dbo.collection(col_name_q).find({'PostTypeId':2,'ParentId':9999,'Body':answer.Body}).toArray()
                recieved = recieved[0]
                expect(res.body.Body).toBe(answer.Body)
            }) 
    })
})

describe('Add Answer to Closed Question',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':9999},{$set:{'ClosedDate':Date.now()}})
    })
    test('POST /questions/:question_id/answers/add CLOSED QUESTION', async () => {
        const question_id = 9999
        const answer = {
            'Body':'Testing Add Answer v1.2 for JEST'
        }
        await supertest(app).post(`/questions/${question_id}/answers/add`)
            .set({'content-type':'application/json'})
            .set({'x-access-token':'t2'})
            .send(answer)
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Already Closed Question')
            }) 
    })
})
test('POST /questions/:question_id/answers/add INVALID QUESTION', async () => {
    const question_id = 9999000
    const answer = {
        'Body':'Testing Add Answer v1.2 for JEST'
    }
    await supertest(app).post(`/questions/${question_id}/answers/add`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t2'})
        .send(answer)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Question ID')
        }) 
})
test('POST /questions/:question_id/answers/add INVALID USER', async () => {
    const question_id = 9999
    const answer = {
        'Body':'Testing Add Answer v1.2 for JEST'
    }
    await supertest(app).post(`/questions/${question_id}/answers/add`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'nottoken'})
        .send(answer)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        }) 
})