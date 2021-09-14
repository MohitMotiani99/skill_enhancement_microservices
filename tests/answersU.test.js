const app = require('../modules/answers/answers')
const supertest = require('supertest')

const MongoClient = require('mongodb').MongoClient


const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'
const col_name_n = 'notifications'


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

test('GET /answers/:answer_id/:vote NOT LOGGED IN',async ()=>{
    const answer_id = 9998
    const vote = 'upvote'
    await supertest(app)
        .get(`/answers/${answer_id}/${vote}`)
        .expect(200)
        .then(async (res)=>{
        //should exit why update
        //console.log(res.text)
        //console.log(res.body)
            expect(res.text).toBe('Not Logged In')
        })
})
test('GET /answers/:answer_id/:vote INVALID TOKEN',async ()=>{
    const answer_id = 9998
    const vote = 'upvote'
    await supertest(app)
        .get(`/answers/${answer_id}/${vote}`)
        .set({'x-access-token':'nottoken'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })
})
test('GET /answers/:answer_id/:vote INVALID ANSWER',async ()=>{
    const answer_id = 9998000
    const vote = 'upvote'
    await supertest(app)
        .get(`/answers/${answer_id}/${vote}`)
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Post ID')
        })
})
test('GET /answers/:answer_id/:vote UPVOTE',async ()=>{

    const answer_id = 9998
    const vote = 'upvote'

    let query_res = await dbo.collection(col_name_q).find({'Id':answer_id,'PostTypeId':2}).toArray()
    const preAPI = query_res[0]

    await supertest(app)
        .get(`/answers/${answer_id}/${vote}`)
        .set({'x-access-token':'t1'})
        .expect(302)
        .then(async (res)=>{
            query_res = await dbo.collection(col_name_q).find({'Id':answer_id,'PostTypeId':2}).toArray()
            const postAPI = query_res[0]
            preAPI['Score']+=1
            compare(preAPI,postAPI)
        })
})

test('GET /answers/:answer_id/:vote DOWNVOTE',async ()=>{

    const answer_id = 9998
    const vote = 'downvote'

    let query_res = await dbo.collection(col_name_q).find({'Id':answer_id,'PostTypeId':2}).toArray()
    const preAPI = query_res[0]

    await supertest(app)
        .get(`/answers/${answer_id}/${vote}`)
        .set({'x-access-token':'t2'})
        .expect(302)
        .then(async (res)=>{
            query_res = await dbo.collection(col_name_q).find({'Id':answer_id,'PostTypeId':2}).toArray()
            const postAPI = query_res[0]
            preAPI['Score']-=1
            compare(preAPI,postAPI)
        })
})


/**
 * 
 * EDIT ANSWER
 * 
 */
test('POST /answers/:answer_id/edit NOT LOGGED IN', async () => {
    const answer={
        'Body':'Jest Testing Edit v1.4'
    }
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/edit`)
        .set({'content-type':'application/json'})
        .send(answer)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')
        })

})
test('POST /answers/:answer_id/edit INVALID TOKEN', async () => {
    const answer={
        'Body':'Jest Testing Edit v1.4'
    }
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/edit`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'nottoken'})
        .send(answer)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid User')
        })

})
test('POST /answers/:answer_id/edit OWNER USER', async () => {
    const answer={
        'Body':'Jest Testing Edit v1.4'
    }
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/edit`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t1'})
        .send(answer)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Post ID')
        })

})
test('POST /answers/:answer_id/edit INVALID ANSWER', async () => {
    const answer={
        'Body':'Jest Testing Edit v1.2'
    }
    const answer_id = 9998000
    await supertest(app)
        .post(`/answers/${answer_id}/edit`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t2'})
        .send(answer)
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Invalid Post ID')
        })

})
test('POST /answers/:answer_id/edit', async () => {
    const answer={
        'Body':'Jest Testing Edit v1.4'
    }
    const answer_id = 9998
    await supertest(app)
        .post(`/answers/${answer_id}/edit`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t2'})
        .send(answer)
        .expect(302)
        .then(async (res)=>{

            //console.log(res)
            // console.log(res.text)
            // console.log(res.headers)
            // console.log(res.body)
            expect(res.headers.location).toBe(`/answers/${answer_id}`)
            let recieved = await dbo.collection(col_name_q).find({'Id':9998,'PostTypeId':2}).toArray()
            recieved = recieved[0]

            expect(recieved.PostTypeId).toStrictEqual(2)
            expect(recieved.OwnerUserId).toStrictEqual(902)
            expect(recieved.Body).toBe(answer.Body)


        })

})
