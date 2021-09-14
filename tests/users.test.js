const app = require('../modules/users/users')
const supertest = require('supertest')
const MongoClient = require('mongodb').MongoClient
test('should ', () => {
    expect(1+1).toBe(2)
})


const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'
const col_name_n = 'notifications'
const col_name_c = 'comments'


let connection;
let dbo;

function compare(recieved,expected){
    expect(recieved.Id).toBe(expected.Id)
    expect(recieved.gender).toBe(expected.gender)
    expect(recieved.grade).toBe(expected.grade)
    expect(recieved.SocialLink).toBe(expected.SocialLink)
    expect(recieved.username).toBe(expected.username)
    expect(recieved.displayName).toBe(expected.displayName)
    expect(recieved.firstName).toBe(expected.firstName)
    expect(recieved.lastName).toBe(expected.lastName)
    expect(recieved.image).toBe(expected.image)
    expect(recieved.token).toBe(expected.token)
    expect(recieved.LastLogin).toBe(expected.LastLogin)
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
        "OwnerUserId": '903',
        "Body": "Answer Tests v1.0",
    })
    await dbo.collection(col_name_q).insertOne({
        "Id": 9999,
        "PostTypeId": 1,
        "AcceptedAnswerId": -1,
        "CreationDate": Date.now(),
        "Score": 15,
        "ViewCount": 186,
        "OwnerUserId": '903',
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
    },
    {
        'Id':'903',
        'token':'t3',
        'username':'tester',
        'displayName':'Mytester',
        'gender':undefined,
        'SocialLink':'http://myprof1.com'
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
    await dbo.collection('votes').deleteMany({'UserId':901})
    await dbo.collection('votes').deleteMany({'UserId':902})
})


test(' GET /users/:user_id NOT LOGGED IN', async () => {
    const user_id = 901
    await supertest(app).get(`/users/${user_id}`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test(' GET /users/:user_id INVALID USER ID', async () => {
    const user_id = 901000
    await supertest(app).get(`/users/${user_id}`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
// test(' GET /users/:user_id EXPIRED TOKEN', async () => {
//     const user_id = '104542337112312950899'
//     await supertest(app).get(`/users/${user_id}`)
//         .set({'x-access-token':'ya29.a0ARrdaM-qIoD4PUKNPPb1wKCDPRamwBUMkrpiG0WjkRTRy8rYrQjCqBEtzW3Wqy53bnXYSx2qZAestW9ekYeZWgz-wrGBPvYYbt2CGm7y31fl5GxIn7xZp1Tt3PL3vFuIKNR0fCnmyiQ_Crf9ASwSY4jrZlQW'})
//         .expect(403)
    
// })

/**
 * 
 * EDIT PROFILE
 * 
 */

test('PATCH /users/:user_id/editprofile INVALID USER ID', async () => {
    const user_id = '903000'
    const edits = {
        'gender':'Female',
        'SocialLink':'http://myprofile.com'
    }

    await supertest(app).patch(`/users/${user_id}/editprofile`)
        .send(edits)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
// test(' PATCH /users/:user_id/editprofile  EXPIRED TOKEN', async () => {
//     const user_id = '104542337112312950899'
//     await supertest(app).patch(`/users/${user_id}/editprofile`)
//         .set({'x-access-token':'ya29.a0ARrdaM-qIoD4PUKNPPb1wKCDPRamwBUMkrpiG0WjkRTRy8rYrQjCqBEtzW3Wqy53bnXYSx2qZAestW9ekYeZWgz-wrGBPvYYbt2CGm7y31fl5GxIn7xZp1Tt3PL3vFuIKNR0fCnmyiQ_Crf9ASwSY4jrZlQW'})
//         .expect(403)
    
// })
test('PATCH /users/:user_id/editprofile', async () => {
    const edits = {
        'gender':'Female',
        'SocialLink':'http://myprofile.com'
    }
    const user_id = '903'
    await supertest(app).patch(`/users/${user_id}/editprofile`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t3'})
        .send(edits)
        .expect(302)
        .then(async (res)=>{
            expect(res.headers.location).toBe(`/users/${user_id}`)
            let recieved = dbo.collection(col_name_u).find({'Id':user_id}).toArray()
            // console.log(recieved)
            recieved = recieved[0]

        })
})

test('DELETE /users/:user_id/delete', async () => {
    const user_id = '903'
    await supertest(app).delete(`/users/${user_id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t3'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('User: '+'tester'+' Deleted')
        
        })
})

test('GET /users/:user_id/totalquestions INVALID USER',async ()=>{
    const user_id = 901000
    await supertest(app).get(`/users/${user_id}/totalquestions`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User ID')
        })
})
test('GET /users/:user_id/totalquestions',async ()=>{
    const user_id = '903'
    await supertest(app).get(`/users/${user_id}/totalquestions`)
        .expect(200)
        .then(async (res)=>{
        //let cnt = await dbo.collection(col_name_q).find({'OwnerUserId':user_id,'PostTypeId':1}).toArray().length
            const cnt = '1'
            expect(res.text).toBe(cnt)
        })
})


test('GET /users/:user_id/totalanswers INVALID USER',async ()=>{
    const user_id = 901000
    await supertest(app).get(`/users/${user_id}/totalanswers`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User ID')
        })
})
test('GET /users/:user_id/totalanswers',async ()=>{
    const user_id = '903'
    await supertest(app).get(`/users/${user_id}/totalanswers`)
        .expect(200)
        .then(async (res)=>{
        //let cnt = await dbo.collection(col_name_q).find({'OwnerUserId':user_id,'PostTypeId':2}).toArray().length
            const cnt = '1'
            expect(res.text).toBe(cnt)
        })
})


test('GET /users/:user_id/totalcomments INVALID USER',async ()=>{
    const user_id = 901000
    await supertest(app).get(`/users/${user_id}/totalcomments`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User ID')
        })
})
test('GET /users/:user_id/totalcomments',async ()=>{
    const user_id = '903'
    await supertest(app).get(`/users/${user_id}/totalcomments`)
        .expect(200)
        .then(async (res)=>{
        //let cnt = await dbo.collection(col_name_c).find({'UserId':user_id}).toArray().length
            const cnt = '0'
            expect(res.text).toBe(cnt)
        })
})

test('GET /users/:user_id/questions', async() => {
    const user_id = '90300'
    await supertest(app).get(`/users/${user_id}/questions`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('GET /users/:user_id/questions', async() => {
    const user_id = '903'
    await supertest(app).get(`/users/${user_id}/questions`)
        .expect(200)
    
})

test('GET /users/:user_id/answers', async() => {
    const user_id = '903'
    await supertest(app).get(`/users/${user_id}/answers`)
        .expect(200)
    
})
test('GET /users/:user_id/answers', async() => {
    const user_id = '90300'
    await supertest(app).get(`/users/${user_id}/answers`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})

test('GET /users/:user_id/comments', async() => {
    const user_id = '90300'
    await supertest(app).get(`/users/${user_id}/comments`)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('GET /users/:user_id/comments', async() => {
    const user_id = '903'
    await supertest(app).get(`/users/${user_id}/comments`)
        .expect(200)
    
})

test('GET /users',async () => {
    await supertest(app).get('/users')
        .expect(200)
})


