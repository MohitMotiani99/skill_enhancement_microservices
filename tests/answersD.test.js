const app = require('../modules/answers/answers')
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


test('POST /answers/:answer_id/delete NOT LOGGED IN', async () => {
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/delete`)
        .set({'content-type':'application/json'})
        .expect(200)
        .then(async (res)=>{
            // console.log(res.text)
            expect(res.text).toBe('Not Logged In')

        })

})
test('POST /answers/:answer_id/delete INVALID TOKEN', async () => {
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'nottoken'})
        .expect(200)
        .then(async (res)=>{


            expect(res.text).toBe('Invalid User')

        })

})
test('POST /answers/:answer_id/delete INVALID ANSWER', async () => {
    const answer_id = 9998000
    await supertest(app)
        .post(`/answers/${answer_id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t2'})
        .expect(200)
        .then(async (res)=>{


            expect(res.text).toBe('Invalid Answer ID')

        })

})
test('POST /answers/:answer_id/delete OWNER USER', async () => {
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{


            expect(res.text).toBe('Invalid Answer ID')

        })

})
describe('Delete a Answer With Invalid Parent Question',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).deleteOne({'Id':9999,'PostTypeId':1})
    })
    test('POST /answers/:answer_id/delete INVALID PARENT QUESTION', async () => {
        const answer_id = 9998
        await supertest(app)
            .post(`/answers/${answer_id}/delete`)
            .set({'content-type':'application/json'})
            .set({'x-access-token':'t2'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Invalid Question ID')
            })
    
    })  
})
describe('Delete an Accepted Answer',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).updateOne({'Id':9999,'PostTypeId':1},{$set:{'AcceptedAnswerId':9998}})
    })
    test('POST /answers/:answer_id/delete ACCEPTED ANSWER', async () => {
        const answer_id = 9998
        await supertest(app)
            .post(`/answers/${answer_id}/delete`)
            .set({'content-type':'application/json'})
            .set({'x-access-token':'t2'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Cant Delete an Accepted Answer')
            })
    
    })  
})
test('POST /answers/:answer_id/delete', async () => {
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t2'})
        .expect(200)
        .then(async (res)=>{

            let expected = await dbo.collection(col_name_q).find({'PostTypeId':1,Id:9999}).toArray()
            expected = expected[0]
            expect(JSON.stringify(res.body)).toBe(JSON.stringify(expected))
        })

})
