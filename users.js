/* eslint-disable consistent-return */
/* eslint-disable no-console */
const express = require('express')
const bodyParser = require('body-parser')
const {OAuth2Client} = require('google-auth-library')
const client = new OAuth2Client("457453379813-1ei0s3u553o1elucdfbmhj6c8v6cknt7.apps.googleusercontent.com")
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))
const cors = require('cors')
app.use(cors())
const { verifyAuth } = require('./pauthorize')

app.use(bodyParser.urlencoded({
    extended:true
}));

const MongoClient = require('mongodb').MongoClient
const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'


const path = require('path')
const swaggerUi = require("swagger-ui-express")
const fs = require('fs')
const jsyaml = require('js-yaml');
const file_path = path.join(__dirname,'userSwagger.yaml')
const spec = fs.readFileSync(file_path, 'utf8');
const swaggerDocument = jsyaml.load(spec);
app.use(
    '/swgr',
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
);

require('dotenv').config()

MongoClient.connect(url,(err,db)=>{
    if(err)throw err
    const dbo = db.db(db_name)


    dbo.collection('globals').find({}).toArray((err,result)=>{

        //get complete user details from id
        app.get('/users/:user_id',async (req,res)=>{
        
            //fetch user id
            const user_id = String(req.params.user_id)
            //find the user is database
            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                if(result.length == 1)
                {
                    res.send(result[0])
                }
                else
                {
                    res.send('Invalid User')
                }
            })
        })


        // edit user profile
        app.patch('/users/:user_id/editprofile', verifyAuth, (req,res)=>{

            //only owner
            const user_id = String(req.params.user_id)
            const g = (req.body.gender)
            const s = (req.body.SocialLink)
            const d = (req.body.displayName)
            const u = (req.body.username)
            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                        if (result.length==1)
                        {
                            const u_obj={
                                //password:(p==undefined)?result[0].password:p,
                                displayName:(d==undefined)?result[0].displayName:d,
                                username:(u==undefined)?result[0].username:u,
                                gender:(g==undefined)?result[0].gender:g,
                                SocialLink:(s==undefined)?result[0].SocialLink:s,
                            }
                            dbo.collection('users').updateOne({"Id":String(user_id)},{$set:u_obj},(err,result)=>{
                                res.send(result);
                                //res.redirect(`/users/${user_id}`)
        
                            })
                      
                        }
                    })
                }
                else res.send('Invalid User')
            })
        
        })
        

        //delete user profile
        app.delete('/users/:user_id/delete', verifyAuth, (req,res)=>{
            const user_id = String(req.params.user_id)

            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{

                if (result.length==1)
                {
                    const u = result[0]
                    dbo.collection('users').deleteOne({'Id':user_id},(err,result)=>{
                        res.send('User: '+u.username +' Deleted')
                    })
                }
                else res.send('Invalid User')
            })
        })   


        //get all the questions asked by the user
        app.get('/users/:user_id/questions', (req,res)=>{
            const user_id = String(req.params.user_id)

            dbo.collection('users').find({Id:user_id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection('questionAnswer').find({'OwnerUserId':user_id, 'PostTypeId':1}).toArray((err,result)=>{
                        if(result.length >= 1)
                            res.send(result)                            
                        else
                            res.send('You have not asked any questions yet')
                    })
                }
                else res.send('Invalid User')
            })
        
        })


        //get all the comments made by the user
        app.get('/users/:user_id/comments', (req,res)=>{
            const user_id = String(req.params.user_id)

            dbo.collection('users').find({Id:user_id}).toArray((err,result)=>{
                if(result.length==1){

                    dbo.collection('comments').find({'UserId':user_id}).toArray((err,result)=>{
                        if(result.length != 0)
                            res.send(result)
                        else if (result.length == 0)
                            res.send('You have not commented any posts yet')
                    })
                }
                else res.send('Invalid User')
            })

        
        })

        //get total number of questions posted by the user
        app.get('/users/:user_id/totalquestions', (req,res)=>{
            const user_id = String(req.params.user_id)

            dbo.collection('users').find({Id:user_id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection('questionAnswer').find({'OwnerUserId':user_id, 'PostTypeId':1}).toArray((err,result)=>{
                        res.send(JSON.stringify(result.length))
                    })
                }
                else res.send('Invalid User ID')

            })

        
        })

        //get total number of comments posted by the user
        app.get('/users/:user_id/totalcomments', (req,res)=>{
            const user_id = String(req.params.user_id)

            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection('comments').find({'UserId':user_id}).toArray((err,result)=>{
                        res.send(JSON.stringify(result.length))
                    })
                }
                else res.send('Invalid User ID')

            })
        
        })
        
        //get total number of answered posted by the user
        app.get('/users/:user_id/totalanswers', (req,res)=>{
            const user_id = String(req.params.user_id)
            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection('questionAnswer').find({'OwnerUserId':user_id, 'PostTypeId':2}).toArray((err,result)=>{
                        res.send(JSON.stringify(result.length))
                    })
                }
                else res.send('Invalid User ID')
            })
        
        })
    

        //get all the answers posted by the user
        app.get('/users/:user_id/answers', (req,res)=>{
            const user_id = String(req.params.user_id)
            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                if(result.length==1){
                    dbo.collection('questionAnswer').find({'OwnerUserId':user_id, 'PostTypeId':2}).toArray((err,result)=>{
                        if(result.length!=0)
                            res.send(result)
                        else
                            res.send('You have not answered any quesions yet')
                    })
                }
                else res.send('Invalid User')
            })
        
        })

        app.get('/users' , (req,res)=>{
            dbo.collection('users').find().toArray((err,result)=>{
                if(err) throw err
                if(result.length >= 1)
                    res.send(result)                    
                else
                    res.send('No users to display')
            })
        })

        app.post('/api/googlelogin', (req,res)=>{
            const {accessToken} = req.body
            console.log(accessToken)
            const {tokenId} = req.body
        
            client.verifyIdToken({idToken: tokenId, audience: "457453379813-1ei0s3u553o1elucdfbmhj6c8v6cknt7.apps.googleusercontent.com"}).then(response =>{
                const {email_verified, name, email, sub, given_name, family_name, picture} = response.payload;
        
                console.log(response.payload);
                const user_id=sub;
                const Id=sub;
                console.log(user_id);
                //console.log(tokenId)
                console.log(accessToken)
        
                if (email_verified){
                    dbo.collection('users').find({'Id':user_id}).toArray((err,result) => {
                        if(err)
                        {
                            console.log('pradyumna you have an error')
                            return res.status(400).json({
                                error: "This user doesn't exist, signup first"
                            })
                        }
                        else if (result.length==0)
                        {
                            const u_obj={
                                Id: user_id,
                                username: email,
                                displayName: name,
                                firstName: given_name,
                                lastName: family_name,
                                image: picture,
                                token: accessToken,
                                LastLogin: Date(),
                                gender:'Unspecified',
                                SocialLink:'None',
                                grade:0,
                                CreationDate:Date()  
                            }
        
                            dbo.collection('users').insertOne(u_obj,(err,result)=>{
                                if(err) throw err
                                if (res){res.send("User " +email +" is added succesfully")}
                                else {res.send('Invalid User')}
                            })
                            dbo.collection('users').find({'Id':user_id}).toArray((err,result)=>{
                                if(result.length == 1)
                                {
                                    res.json(result[0])
                                }
                                else
                                {
                                    res.send('Invalid User')
                                }
                            })
                        }
                        else if (result.length == 1)
                        {
                            console.log('pradyumna success!, user exists')     
                            console.log(accessToken)
                           
                            const u_obj={
                                token: accessToken,
                                LastLogin: Date()
                            }
                            dbo.collection('users').updateOne({"Id":String(user_id)},{$set:u_obj},(err,result)=>{
                                if (err) throw err
                                else{console.log('success')}              
                            })
                            res.json(result[0])
                            /*                             res.json({
                                accessToken,
                                Id
                            })
 */                        
                            
                        }
                    })
                }
            })
        })
        

    })
})

module.exports = app

/* 
res.json({
    token,
    user_id
})
 */