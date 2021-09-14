/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/cognitive-complexity */
const express = require('express')
const app = express()
app.use(express.static(__dirname+'/public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
const cors = require('cors')
app.use(cors())

/**
 * Id
 * UserId
 * PostId
 * Body
 * Status
 */

const path = require('path')
const swaggerUi = require("swagger-ui-express")
const fs = require('fs')
const jsyaml = require('js-yaml');
const file_path = path.join(__dirname,'notificationSwagger.yaml')
const spec = fs.readFileSync(file_path, 'utf8');
const swaggerDocument = jsyaml.load(spec);
app.use(
    '/swgr',
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
);

require('dotenv').config()

const MongoClient = require('mongodb').MongoClient


const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'
const col_noti = 'notifications'


const validate_user = require('./authorize')

let n_counter

MongoClient.connect(url,(err,db)=>{
    if(err)throw err
    const dbo = db.db(db_name)


    //retrieves the notification counter(n_num) 
    dbo.collection('globals').find({}).toArray((err,result)=>{


        //api to get all unread notifications for a particular user
        app.get('/User/:User_Id/notifs',(req,res)=>{
            const token = req.headers['x-access-token']
        
            let User_Id = req.params.User_Id
            if(req.params.User_Id.length<=5)
                User_Id = parseInt(User_Id)
        
            if(token == null || token == undefined){
                res.send('Not Logged In')
            }
            else{
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{

                    if(result.length == 1 && (uv =await validate_user(token,result[0])) && User_Id==result[0].Id){

                        dbo.collection(col_noti).find({'UserId':User_Id,'Status':'unread'}).toArray((err,result)=>{
                            if(err)
                                throw err
                            if(result.length!=0)
                                res.send(result)
                            else
                                res.send('No Unread Notifications')
                        })

                    }
                    else{
                        res.send('Invalid User')
                    }
                })

            }
        })

        //api to read a particular notification for a particular user
        app.get('/User/:User_Id/:noti_id/read',(req,res)=>{
            const token = req.headers['x-access-token']
            const noti_id = parseInt(req.params.noti_id)
        
            let User_Id = req.params.User_Id
            if(req.params.User_Id.length<=5)
                User_Id = parseInt(User_Id)
        
            if(token == null || token == undefined){
                res.send('Not Logged In')
            }
            else{
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{

                    if(result.length == 1 && (uv =await validate_user(token,result[0])) && User_Id==result[0].Id){

                        dbo.collection(col_noti).find({'UserId':User_Id,'Id':noti_id}).toArray((err,result)=>{
                            if(err)
                                throw err
                            if(result.length == 1 && result[0].Status=='unread'){
                                dbo.collection(col_noti).updateOne({'UserId':User_Id,'Id':noti_id},{$set:{'Status':'read'}},(err,result)=>{
                                    if(err)
                                        throw err
                                    res.redirect(`/User/${User_Id}/notifs`)
                                })
                            }
                            else{
                                res.send('Invalid Notification ID')
                            }
                        })

                    }
                    else{
                        res.send('Invalid User Id')
                    }
                })

            }
        })

        //api to read all notifications for a particular user
        app.get('/User/:User_Id/readAll',(req,res)=>{
            const token = req.headers['x-access-token']
        
            let User_Id = req.params.User_Id
            if(req.params.User_Id.length<=5)
                User_Id = parseInt(User_Id)

            if(token == null || token == undefined){
                res.send('Not Logged In')
            }
            else{
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{

                    if(result.length == 1 && (uv =await validate_user(token,result[0])) && User_Id==result[0].Id){

                        dbo.collection(col_noti).updateMany({'UserId':User_Id,'Status':'unread'},{$set:{'Status':'read'}},(err,result)=>{
                            if(err)
                                throw err
                            res.send('All Notifications Marked as Read')
                        })

                    }
                    else{
                        res.send('Invalid User Id')
                    }
                })

            }
        })

        //api to push a notification for a particular user
        app.post('/User/:User_Id/push',(req,res)=>{
            const token = req.headers['x-access-token']
            const PostId = parseInt(req.body.PostId)

            let User_Id = req.params.User_Id
            if(req.params.User_Id.length<=5)
                User_Id = parseInt(User_Id)

            if(token == null || token == undefined){
                res.send('Not Logged In')
            }
            else{
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{

                    if(result.length == 1 && (uv =await validate_user(token,result[0]))){
                        const Body = req.body.Body

                        const query_res = await dbo.collection('globals').find().toArray()
                        let n_counter = query_res[0].n_num

                        dbo.collection(col_noti).insertOne({'Id':n_counter++,'Body':Body,'UserId':User_Id,'PostId':PostId,'Status':'unread'},async (err,result)=>{
                            if(err)
                                throw err
                            await dbo.collection('globals').updateOne({},{$set:{'n_num':n_counter}})
                            res.send('Pushed')
                        })

                    }
                    else{
                        res.send('Invalid User Id')
                    }
                })

            }
        })

    })
})

module.exports = app