const MongoClient=require('mongodb').MongoClient
const url="mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/test"
const mydb="skillenhancement"
const commentCollection="comments"
const postsCollection = "questionAnswer"
const userCollection = "users"
const collection = "globals"


const express=require('express')
const app = express()
const bodyparser = require("body-parser")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

const path = require('path')
const swaggerUi = require("swagger-ui-express")
const fs = require('fs')
const jsyaml = require('js-yaml');
const file_path = path.join(__dirname,'commentSwagger.yaml')
const spec = fs.readFileSync(file_path, 'utf8');
const swaggerDocument = jsyaml.load(spec);
app.use(
    '/swgr',
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
);

require('dotenv').config()

let user

const request = require('request')
const validate_user = require('./authorize')
const get_token = require('./authorize')


MongoClient.connect(url,function(err,db){
    if(err) throw err
    const dbo=db.db(mydb)
    dbo.collection(collection).find({}).toArray(function(err,result){
    
        //Get comments on the posts identified by a comment id
        app.get('/comments/:id',(req,res)=>{
            const id = Number(req.params["id"])
            dbo.collection(commentCollection).find({Id:id}).toArray((err,result)=>{
                if(result.length!=1) res.send('Invalid Comment Id')
                else res.send(result[0])
            })
        })

        //Get comments on the posts (question or answer) identified by a set of ids
        app.get(["/questions/:id/comments","/answers/:id/comments"],(req,res)=>{
            const id = Number(req.params["id"])
            dbo.collection(commentCollection).find({PostId:id}).toArray(function(err,result){
                if (err) throw err
                else res.send(result)
            })
        })

        //Create a new comment on the post identified by id
        app.post(["/questions/:id/comments/add","/answers/:id/comments/add"],(req,res)=>{
            let questionOwner
            //auth required
            const token = req.headers['x-access-token']
            if(token==null) res.send('Not Logged In')
            else{
                const id = Number(req.params["id"])
                dbo.collection(userCollection).find({token:token}).toArray(async (err,result)=>{
                    if(result.length==1 && (uv = await validate_user(token, result[0]))){
                        const User = result[0]
                        dbo.collection(postsCollection).find({'Id':id}).toArray(async (err,result)=>{
                            if(result.length==1){
                                if(result[0].ClosedDate!=null) res.send('Post is Already Closed')
                                else{
                                    const query_res = await dbo.collection('globals').find().toArray()
                                    let commentId = query_res[0].c_num

                                    const commentObj={
                                        "Id": commentId++,
                                        "PostId": id,
                                        "Score":0,
                                        "Text":req.body.body,
                                        "CreationDate": Date.now(),
                                        "UserDisplayName": User.username,
                                        "UserId":Number(User.Id)
                                    }
                                    await dbo.collection('globals').updateOne({},{$set:{'c_num':commentId}})
                                    questionOwner = result[0].OwnerUserId
                                    dbo.collection(commentCollection).insertOne(commentObj,async function(err,result){
                                        if (err) throw err
                                        //Notification

                                        if(User.Id!=questionOwner){
                                            const query_res = await dbo.collection('globals').find().toArray()
                                            let n_counter = query_res[0].n_num

                                            await dbo.collection('notifications').insertOne({
                                                'Id':n_counter++,
                                                'Body':User.displayName + " has commented on your Post",
                                                'UserId':questionOwner,
                                                'PostId':id,
                                                'Status':'unread'
                                            })
                                            await dbo.collection('globals').updateOne({},{$set:{'n_num':n_counter}})
                                        }
                                        res.redirect(`/comments/${commentObj.Id}`)

                                    })
                                }
                            }
                            else res.send('Invalid Post Id')
                        })
                    }
                    else res.send('Invalid User Credentials')
                })
            }
        })

        //Edit a comment identified by its id
        app.patch("/comments/:id/edit",(req,res)=>{
            //auth required
            //Only owner
            const token = req.headers['x-access-token']
            const id = Number(req.params["id"])
            if (token == null) res.send("Not Logged In")
            else{
                dbo.collection(userCollection).find({"token":token}).toArray(async function(err,result){
                    if (err) throw err
                    else if(result.length == 1 && (uv = await validate_user(token,result[0]))){
                        user = result[0]
                        dbo.collection(commentCollection).find({"Id":id}).toArray(function(err,result){
                            if (result.length==1 && result[0].UserId == user.Id){
                                dbo.collection(postsCollection).find({'Id':result[0].PostId}).toArray(async (err,result)=>{
                                    if(result.length == 1){
                                        if(result[0].ClosedDate!=null)res.send('Post is Already Closed')
                                        else{
                                            await dbo.collection(commentCollection).updateOne({"Id":id},{$set:{"Text":req.body.body,"CreationDate":Date.now()}})
                                            res.send("Comment Edited")
                                        }
                                    }
                                    else res.send('Invalid Post Id')
                                })
                            }
                            else res.send("No access to edit the comment")
                        })
                    }
                    else res.send("Invalid User")
                })
            }
        })

        //Delete comment identified by its id
        app.delete("/comments/:id/delete",(req,res)=>{
            //auth required
            //Only owner
            const token = req.headers['x-access-token']
            const id = Number(req.params["id"])
            if (token == null) res.send("Not Logged In")
            else{
                dbo.collection(userCollection).find({"token":token}).toArray(async function(err,result){
                    if (err) throw err
                    else if(result.length == 1 && (uv = await validate_user(token,result[0]))){
                        user = result[0]
                        dbo.collection(commentCollection).find({"Id":id}).toArray(function(err,result){
                            if (result.length==1){ 
                                if(result[0].UserId == user.Id){
                                    dbo.collection(commentCollection).deleteOne({Id:id})
                                    res.send('Comment \"'+result[0].Text+'\" is Deleted')
                                }
                                else res.send("No access to delete the comment")
                            }
                            else res.send('Invalid Comment Id')
                        })
                    }
                    else res.send("Invalid User")
                })
            }
        })

        //Casts an upvote on the given comment && Undo an down Vote
        app.patch(["/comments/:id/upvote","/comments/:id/downvote/undo"],(req,res)=>{
            //auth required
            const token = req.headers['x-access-token']
            const id = Number(req.params["id"])
            if (token == null) res.send("Not Logged In")
            else{
                dbo.collection(userCollection).find({"token":token}).toArray(async function(err,result){
                    if (err) throw err
                    else if(result.length == 1 && (uv = await validate_user(token,result[0]))){
                        dbo.collection(commentCollection).find({Id:id}).toArray(function(arr,result){
                            if(result.length==1){
                                const score = result[0]["Score"]
                                dbo.collection(commentCollection).updateOne({"Id":Number(id)},{$set:{"Score":score+1}},(err,result)=>{
                                    if(err) throw err
                                    res.send("Reaction on Comment is captured")
                                })
                            }
                            else res.send('Invalid Comment Id')
                        })
                    }
                    else res.send('Invalid User')
                })
            }
        })

        //Downvote a given comment && Undo an up vote
        app.patch(["/comments/:id/downvote", "/comments/:id/upvote/undo"],(req,res)=>{
            //auth required
            const token = req.headers['x-access-token']
            const id = Number(req.params["id"])
            if (token == null) res.send("Not Logged In")
            else{
                dbo.collection(userCollection).find({"token":token}).toArray(async function(err,result){
                    if (err) throw err
                    else if(result.length == 1 && (uv = await validate_user(token,result[0]))){
                        dbo.collection(commentCollection).find({Id:id}).toArray(function(arr,result){
                            if(result.length==1){
                                const score = result[0]["Score"]
                                dbo.collection(commentCollection).updateOne({"Id":Number(id)},{$set:{"Score":score-1}},(err,result)=>{
                                    if(err) throw err
                                    res.send("Reaction on Comment is captured")
                                })
                            }
                            else res.send('Invalid Comment Id')
                        })
                    }
                    else res.send('Invalid User')
                })
            }
        })

        //change for commit
        //Get the comments posted by the users identified id
        app.get(["/users/:id/comments"],(req,res)=>{
            const id = Number(req.params["id"])
            dbo.collection(userCollection).find({'Id':id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection(commentCollection).find({UserId:id}).toArray(function(err,result){
                        if (err) throw err
                        else res.send(result)
                    })
                }
                else res.send('Invalid User Id')
            })
        })
    })
})

module.exports = app