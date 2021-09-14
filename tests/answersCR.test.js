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
    // console.log('before each')
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

test('GET /answers/:answer_id INVALID ANSWER',async () => {

    const answer_id = 100000
    await supertest(app).get(`/answers/${answer_id}`)
        .expect(200)
        .then((res)=>{
            expect(res.text).toBe('Invalid Answer ID')
        })
    
})

test('GET /answers/:answer_id VALID ANSWER',async () => {

    const answer_id = 9998
    await supertest(app).get(`/answers/${answer_id}`)
        .expect(200)
        .then(async (res)=>{
            const query_res = await dbo.collection(col_name_q).find({'Id':answer_id,'PostTypeId':2}).toArray()
            const expected = query_res[0]
            const recieved = res.body

            compare(recieved,expected)
        })
})

/**
 * 
 * ACCEPT ANSWER
 * 
 */
test('POST /answers/:answer_id/accept NOT LOGGED IN', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })
})
test('POST /answers/:answer_id/accept INVALID TOKEN', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept`)
        .set({'x-access-token':'nottoken'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('POST /answers/:answer_id/accept OWNER USER', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept`)
        .set({'x-access-token':'t2'})
        .expect(200)
        .then(async (res)=>{
        //console.log(res.text)
            expect(res.text).toBe('Invalid Answer ID')
        })
})
test('POST /answers/:answer_id/accept INVALID ANSWER', async () => {
    const answer_id = 9998000
    await supertest(app).post(`/answers/${answer_id}/accept`)
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Answer ID')
        })
})
describe('Accept Answer with Invalid Parent Question',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).deleteOne({'PostTypeId':1,'Id':9999})
    })

    test('POST /answers/:answer_id/accept INVALID PARENT QUESTION', async () => {
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Invalid Answer ID')
            })
    })
})
describe('Accept Answer with Closed Parent Question',()=>{
    beforeEach(async ()=>{
        //console.log('Hi')
        await dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':9999},{$set:{'ClosedDate':Date.now()}})
        //let q = await dbo.collection(col_name_q).find({'PostTypeId':1,Id:9999}).toArray()
        //console.log(q[0])
    })
    test('POST /answers/:answer_id/accept CLOSED PARENT QUESTION', async () => {
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Question is already Closed')
            })
    })
})
describe('Accept Answer with Parent Question Already Accepted One',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':9999},{$set:{'AcceptedAnswerId':100000}})
    })
    test('POST /answers/:answer_id/accept ALREADY AN ACCEPTED ANSWER', async () => {
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Contains An Already Accepted Answer,Undo that to Accept this one')
            })
    })    
})
test('POST /answers/:answer_id/accept', async () => {
    let expected = await dbo.collection(col_name_q).find({'PostTypeId':1,'Id':9999}).toArray()
    expected = expected[0]

    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept`)
        .set({'x-access-token':'t1'})
        .expect(302)
        .then(async (res)=>{
            expect(res.headers.location).toBe(`/answers/${answer_id}`)
            let recieved = await dbo.collection(col_name_q).find({'PostTypeId':1,'Id':9999}).toArray()
            recieved = recieved[0]
        
            expect(recieved.Id).toStrictEqual(9999)
            expect(recieved.AcceptedAnswerId).toStrictEqual(9998)
            expect(recieved.PostTypeId).toBe(expected.PostTypeId)
            expect(recieved.CreationDate).toBe(expected.CreationDate)
            expect(recieved.Score).toBe(expected.Score)
            expect(recieved.OwnerUserId).toBe(expected.OwnerUserId)
            expect(recieved.Title).toBe(expected.Title)
            expect(recieved.Body).toBe(expected.Body)
            expect(recieved.Tags).toEqual(expected.Tags)
            expect(recieved.ClosedDate).toBe(expected.ClosedDate)
        })
})


/**
 * 
 * ACCEPT ANSWER UNDO
 * 
 */
test('POST /answers/:answer_id/accept/undo  NOT LOGGED IN', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept/undo`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })
})
test('POST /answers/:answer_id/accept/undo INVALID TOKEN', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept/undo`)
        .set({'x-access-token':'nottoken'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('POST /answers/:answer_id/accept/undo  OWNER USER', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept/undo`)
        .set({'x-access-token':'t2'})
        .expect(200)
        .then(async (res)=>{
        //console.log(res.text)
            expect(res.text).toBe('Invalid Question ID')
        })
})
test('POST /answers/:answer_id/accept/undo INVALID ANSWER', async () => {
    const answer_id = 9998000
    await supertest(app).post(`/answers/${answer_id}/accept/undo`)
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Answer ID')
        })
})
describe('Undo Accept Answer with Invalid Parent Question',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).deleteOne({'PostTypeId':1,'Id':9999})
    })

    test('POST /answers/:answer_id/accept/undo INVALID PARENT QUESTION', async () => {
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept/undo`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Invalid Question ID')
            })
    })
})
describe('Undo Accept Answer with Closed Parent Question',()=>{
    beforeEach(async ()=>{
        //console.log('Hi')
        await dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':9999},{$set:{'ClosedDate':Date.now()}})
        //let q = await dbo.collection(col_name_q).find({'PostTypeId':1,Id:9999}).toArray()
        //console.log(q[0])
    })
    test('POST /answers/:answer_id/accept/undo  CLOSED PARENT QUESTION', async () => {
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept/undo`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Question is in Closed State')
            })
    })
})
describe('Undo Accept Answer But This is Not the Acceepted Answer',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':9999},{$set:{'AcceptedAnswerId':9000}})
    })
    test('POST /answers/:answer_id/accept/undo THIS IS NOT AN ACCEPTED ANSWER', async () => {
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept/undo`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('This is not an accepted answer')
            })
    })    
})
test('POST /answers/:answer_id/accept/undo THERE IS NOT AN ACCEPTED ANSWER', async () => {
    const answer_id = 9998
    await supertest(app).post(`/answers/${answer_id}/accept/undo`)
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Contains No Accepted Answer')
        })
})
describe('UNDO AN ACCEPTED ANSWER',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_q).updateOne({'Id':9999,'PostTypeId':1},{$set:{'AcceptedAnswerId':9998}})
    })
    test('POST /answers/:answer_id/accept/undo', async () => {
        let expected = await dbo.collection(col_name_q).find({'PostTypeId':1,'Id':9999}).toArray()
        expected = expected[0]    
        
        const answer_id = 9998
        await supertest(app).post(`/answers/${answer_id}/accept/undo`)
            .set({'x-access-token':'t1'})
            .expect(302)
            .then(async (res)=>{
                expect(res.headers.location).toBe(`/answers/${answer_id}`)
                let recieved = await dbo.collection(col_name_q).find({'PostTypeId':1,'Id':9999}).toArray()
                recieved = recieved[0]
            
                expect(recieved.Id).toStrictEqual(9999)
                expect(recieved.AcceptedAnswerId).toStrictEqual(-1)
                expect(recieved.PostTypeId).toBe(expected.PostTypeId)
                expect(recieved.CreationDate).toBe(expected.CreationDate)
                expect(recieved.Score).toBe(expected.Score)
                expect(recieved.OwnerUserId).toBe(expected.OwnerUserId)
                expect(recieved.Title).toBe(expected.Title)
                expect(recieved.Body).toBe(expected.Body)
                expect(recieved.Tags).toEqual(expected.Tags)
                expect(recieved.ClosedDate).toBe(expected.ClosedDate)
            })
    })
})
