const app = require('../modules/notifications/notifications')
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

test('GET /User/:User_id/notifs NOT LOGGED IN', async () => {
    const User_Id = 901
    await supertest(app).get(`/User/${User_Id}/notifs`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })
})
test('GET /User/:User_id/notifs INVALID TOKEN', async () => {
    const User_Id = 901
    await supertest(app).get(`/User/${User_Id}/notifs`)
        .set({'x-access-token':'nottoken'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('GET /User/:User_id/notifs INVALID USER', async () => {
    const User_Id = 901000
    await supertest(app).get(`/User/${User_Id}/notifs`)
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('GET /User/:User_id/notifs NO UNREADS', async () => {
    const User_Id = 901
    await supertest(app).get(`/User/${User_Id}/notifs`)
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('No Unread Notifications')
        })
})
describe('Get Unread Notifications for a User',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_n).insertMany([{'Id':'id1','UserId':901,'Status':'unread'},{'Id':'id2','UserId':901,'Status':'read'}])
    })
    test('GET /User/:User_Id/notifs ', async () => {
        const User_Id = 901
        await supertest(app).get(`/User/${User_Id}/notifs`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                res.body.forEach(n=>{
                    expect(n.Status).toBe('unread')
                    expect(n.UserId).toBe(901)
                })
            })
    
    })
    
})

describe('Read a Notification',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_n).insertMany([{'Id':9009,'UserId':901,'Status':'unread'},{'Id':90099,'UserId':901,'Status':'read'}])
    })
    afterEach(async ()=>{
        await dbo.collection(col_name_n).deleteMany({'UserId':901})
    })
    test('GET /User/:User_id/:noti_id/read INVALID USER', async () => {
        const User_Id = 901000
        const noti_id = 9009
        await supertest(app).get(`/User/${User_Id}/${noti_id}/read`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Invalid User Id')
            })
    })
    test('GET /User/:User_id/:noti_id/read INVALID NOTIF', async () => {
        const User_Id = 901
        const noti_id = 900900
        await supertest(app).get(`/User/${User_Id}/${noti_id}/read`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Invalid Notification ID')
            })
    })
    test('GET /User/:User_id/:noti_id/read', async () => {
        const User_Id = 901
        const noti_id = 9009
        await supertest(app).get(`/User/${User_Id}/${noti_id}/read`)
            .set({'x-access-token':'t1'})
            .expect(302)
            .then(async (res)=>{
                expect(res.headers.location).toBe(`/User/${User_Id}/notifs`)
                let recieved = await dbo.collection(col_name_n).find({'Id':9009}).toArray()
                recieved = recieved[0]
                expect(recieved.Status).toBe('read')
            })
    })  
})

describe('Read All Notifications',()=>{
    beforeEach(async ()=>{
        await dbo.collection(col_name_n).insertMany([{'Id':9009,'UserId':901,'Status':'unread'},{'Id':90099,'UserId':901,'Status':'read'}])
    })
    afterEach(async ()=>{
        await dbo.collection(col_name_n).deleteMany({'UserId':901})
    })
    test('GET /User/:User_id/readAll INVALID USER', async () => {
        const User_Id = 901000
        await supertest(app).get(`/User/${User_Id}/readAll`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('Invalid User Id')
            })
    })
    test('GET /User/:User_id/readAll ', async () => {
        const User_Id = 901
        await supertest(app).get(`/User/${User_Id}/readAll`)
            .set({'x-access-token':'t1'})
            .expect(200)
            .then(async (res)=>{
                expect(res.text).toBe('All Notifications Marked as Read')
            })
    })
      
})


test('POST /User/:User_id/push NOT LOGGED IN', async () => {
    const noti_body={
        'PostId':9999,
        'Body':'JEST Noti'
    }
    const User_Id = 901
    await supertest(app).post(`/User/${User_Id}/push`)
        .send(noti_body)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })
})
test('POST /User/:User_id/push INVALID USER', async () => {
    const noti_body={
        'PostId':9999,
        'Body':'JEST Noti'
    }
    const User_Id = 90100
    await supertest(app).post(`/User/${User_Id}/push`)
        .set({'x-access-token':'nottoken'})
        .send(noti_body)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User Id')
        })
})
test('POST /User/:User_id/push', async () => {
    const noti_body={
        'PostId':9999,
        'Body':'JEST Noti'
    }
    const User_Id = 901
    await supertest(app).post(`/User/${User_Id}/push`)
        .set({'x-access-token':'t1'})
        .send(noti_body)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Pushed')
        })
})

