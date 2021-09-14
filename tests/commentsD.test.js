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


test('DELETE /comments/:id/delete NOT LOGGED IN', async () => {
    const id = 9997
    await supertest(app)
        .delete(`/comments/${id}/delete`)
        .set({'content-type':'application/json'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Not Logged In')

        })

})
test('DELETE /comments/:id/delete INVALID TOKEN', async () => {
    const id = 9997
    await supertest(app)
        .delete(`/comments/${id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'nottoken'})
        .expect(200)
        .then(async (res)=>{


            expect(res.text).toBe('Invalid User')

        })

})
test('DELETE /comments/:id/delete INVALID COMMENT', async () => {
    const id = 9997000
    await supertest(app)
        .delete(`/comments/${id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{


            expect(res.text).toBe('Invalid Comment Id')

        })

})
test('DELETE /comments/:id/delete OWNER USER', async () => {
    const id = 9997
    await supertest(app)
        .delete(`/comments/${id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t2'})
        .expect(200)
        .then(async (res)=>{


            expect(res.text).toBe('No access to delete the comment')

        })

})
test('DELETE /comments/:id/delete', async () => {
    const id = 9997

    const query_res = await dbo.collection(col_name_c).find({'Id':9997})
    const expected = query_res[0]

    await supertest(app)
        .delete(`/comments/${id}/delete`)
        .set({'content-type':'application/json'})
        .set({'x-access-token':'t1'})
        .expect(200)
        .then(async (res)=>{
            expect(res.text).toBe('Comment \"'+'Comment Testing Text v1.0'+'\" is Deleted')
        })

})
