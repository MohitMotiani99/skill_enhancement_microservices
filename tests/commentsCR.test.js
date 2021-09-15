const app = require('../modules/comments/comments')
const supertest = require('supertest')

const MongoClient = require('mongodb').MongoClient


const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'
const col_name_n = 'notifications'
const col_name_c="comments"

function compare(recieved,expected){
    expect(recieved.Id).toBe(expected.Id)
    expect(recieved.CreationDate).toBe(expected.CreationDate)
    expect(recieved.Score).toBe(expected.Score)
    expect(recieved.Text).toBe(expected.Text)
    expect(recieved.PostId).toBe(expected.PostId)
    expect(recieved.UserDisplayName).toBe(expected.UserDisplayName)
    expect(recieved.UserId).toBe(expected.UserId)
}

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
        "CreationDate": Date.now(),
        "Score": 15,
        "ViewCount": 186,
        "OwnerUserId": 901,
        "Title": "Answer Testing Question v2.0",
        "Body": "Tester Body",
        "Tags": [
            "jest"
        ],
        "ClosedDate": null
    })
    await dbo.collection(col_name_u).insertMany([{
        'Id':901,
        'token':'t1',
        'username':'tester',
        'displayName':'Mytester'
    },
    {
        'Id':902,
        'token':'t2',
        'username':'tester',
        'displayName':'Mytester'
    },])
    await dbo.collection(col_name_c).insertOne({
        'Id':9997,
        'PostId':9999,
        'Score':0,
        'Text':'Comment Testing Text v1.0',
        'CreationDate':Date.now(),
        'UserDisplayName':'tester',
        'UserId':901
    })
})
afterEach(async ()=>{
    await dbo.collection(col_name_q).deleteOne({'Id':9998,'PostTypeId':2})
    await dbo.collection(col_name_q).deleteOne({'Id':9999,'PostTypeId':1})
    await dbo.collection(col_name_u).deleteMany({'username':'tester'})
    await dbo.collection(col_name_n).deleteMany({'UserId':901})
    await dbo.collection(col_name_n).deleteMany({'UserId':902})
    await dbo.collection(col_name_c).deleteMany({'PostId':9999})
    await dbo.collection(col_name_c).deleteMany({'PostId':9998})
})

test('GET /comments/:id INVALID COMMENT', async () => {
    const id = 9997000
    await supertest(app).get(`/comments/${id}`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Comment Id')
        })
})
test('GET /comments/:id', async () => {
    const id = 9997
    await supertest(app).get(`/comments/${id}`)
        .expect(200)
        .then(async (res)=>{
            const recieved = res.body
            let expected = await dbo.collection(col_name_c).find({'Id':id}).toArray()
            expected = expected[0]

            compare(recieved,expected)
        })
})


test('POST /questions/:id/comments/add NOT LOGGED IN', async () => {
    const id = 9999
    const comment = {
        'body':'Testing Comment APIS v1.2'
    }
    await supertest(app).post(`/questions/${id}/comments/add`)
        .send(comment)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })
})
test('POST /questions/:id/comments/add INVALID TOKEN', async () => {
    const id = 9999
    const comment = {
        'body':'Testing Comment APIS v1.2'
    }
    await supertest(app).post(`/questions/${id}/comments/add`)
        .set({'x-access-token':'nottoken'})
        .send(comment)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User Credentials')
        })
})
test('POST /questions/:id/comments/add EXPIRED TOKEN', async () => {
    const id = 9999
    const comment = {
        'body':'Testing Comment APIS v1.2'
    }
    await supertest(app).post(`/questions/${id}/comments/add`)
        .set({'x-access-token':'ya29.a0ARrdaM-qIoD4PUKNPPb1wKCDPRamwBUMkrpiG0WjkRTRy8rYrQjCqBEtzW3Wqy53bnXYSx2qZAestW9ekYeZWgz-wrGBPvYYbt2CGm7y31fl5GxIn7xZp1Tt3PL3vFuIKNR0fCnmyiQ_Crf9ASwSY4jrZlQW'})
        .send(comment)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User Credentials')
        })
})
test('POST /questions/:id/comments/add INVALID QUESTION ID', async () => {
    const id = 9999000
    const comment = {
        'body':'Testing Comment APIS v1.2'
    }
    await supertest(app).post(`/questions/${id}/comments/add`)
        .set({'x-access-token':'t2'})
        .send(comment)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Post Id')
        })
})
describe('Comment on Closed Question',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':9999},{$set:{'ClosedDate':Date.now()}})
    })
    test('POST /questions/:id/comments/add CLOSED QUESTION', async () => {
        const id = 9999
        const comment = {
            'body':'Testing Comment APIS v1.2'
        }
        await supertest(app).post(`/questions/${id}/comments/add`)
            .set({'x-access-token':'t2'})
            .send(comment)
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Post is Already Closed')
            })
    })  
})

test('POST /questions/:id/comments/add', async () => {
    const id = 9999
    const comment = {
        'body':'Testing Comment API for v'+Math.random()
    }

    await supertest(app).post(`/questions/${id}/comments/add`)
        .set({'x-access-token':'t2'})
        .send(comment)
        .expect(302)
        .then(async (res)=>{
            let recieved = await dbo.collection(col_name_c).find({'Text':comment.body}).toArray()
            //console.log(recieved)
            recieved = recieved[0]

            expect(res.headers.location).toBe(`/comments/${recieved.Id}`)
        
            expect(recieved.PostId).toStrictEqual(9999)
            expect(recieved.UserId).toStrictEqual(902)
            expect(recieved.Text).toStrictEqual(comment.body)
            expect(recieved.UserDisplayName).toStrictEqual('tester')

        })
})  

test('GET /questions/:id/comments', async () => {
    const id = 9999
    await supertest(app).get(`/questions/${id}/comments`)
        .expect(200)
        .then(async (res)=>{
            expect(res.body.length).toBe(1)
        })
})


