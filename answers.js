const express = require('express')
const app = express()
app.use(express.static(__dirname+'/public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
const cors = require('cors')
app.use(cors())

const path = require('path')
const swaggerUi = require("swagger-ui-express")
const fs = require('fs')
const jsyaml = require('js-yaml');
const file_path = path.join(__dirname,'answerSwagger.yaml')
const spec = fs.readFileSync(file_path, 'utf8');
swaggerDocument = jsyaml.load(spec);
app.use(
    '/swgr',
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
);


const MongoClient = require('mongodb').MongoClient

require('dotenv').config()

const url = 'mongodb+srv://pradyumnakedilaya:secret123%23@cluster0.vlavb.mongodb.net/skillenhancement?retryWrites=true&w=majority'
const db_name = 'skillenhancement'
const col_name_q = 'questionAnswer'
const col_name_u = 'users'

//function to do token verification
const validate_user = require('./authorize')

const request = require('request')

MongoClient.connect(url,(err,db)=>{
    if(err)throw err
    const dbo = db.db(db_name)


    //connecting to globals collection to fetch the next post id
    dbo.collection('globals').find({}).toArray((err,result)=>{

        //get all answer obects
        app.get('/answers',(req,res)=>{
            dbo.collection(col_name_q).find({'PostTypeId':2}).toArray((err,result)=>{
                if(err) throw err
                res.send(result)
            })
        })
   
        //get a particular answer object using a unique answer id
        app.get('/answers/:answer_id',(req,res)=>{
            const answer_id = parseInt(req.params.answer_id)
            //checking for valid answer ID
            dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                if(err) throw err
                if(result.length == 1){
                    const answer = result[0]
                    dbo.collection(col_name_q).updateOne({'PostTypeId':2,'Id':answer_id},{$inc:{'ViewCount':1}},(err,result)=>{
                        if(err) throw err

                        answer.ViewCount+=1
                        res.send(answer)
                    })
                
                }
                else{
                    res.send('Invalid Answer ID')
                }
            })
        })

        //accepting a particular answer for a specific question i.e. marking it as the most correct answer
        app.post('/answers/:answer_id/accept',(req,res)=>{
            const answer_id = parseInt(req.params.answer_id)
            const token = req.headers['x-access-token']

            //checking logged in or not
            if(token==null){
                res.send('Not Logged In')
            }
            else{
            //checking token existence & verifying it
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{
                    if(result.length == 1 && (uv =await validate_user(token,result[0]))){
                    
                        const User = result[0]
                        const ActionUserId = result[0].Id

                        //checking answer existence
                        dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                            if(err) throw err
                            if(result.length == 1){
                                const OwnerUserId = result[0].OwnerUserId
                                const question_id = result[0].ParentId

                                //checking the existence of parent question
                                dbo.collection(col_name_q).find({'PostTypeId':1,'Id':question_id}).toArray((err,result)=>{
                                    if(err) throw err
                                    //only owner of the question is authorised to accept the answer
                                    if(result.length==1 && result[0].OwnerUserId == User.Id){
                                        if(result[0].AcceptedAnswerId!=-1){
                                            res.send('Contains An Already Accepted Answer,Undo that to Accept this one')
                                        }
                                        //checking if question is closed
                                        else if(result[0].ClosedDate==null)
                                        {
                                            dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':question_id},{$set:{'AcceptedAnswerId':answer_id}},async (err,result)=>{
                                                if(err) throw err

                                                //after updation sending notification to the owner of the answer which got accepted
                                                
                                                const query_res = await dbo.collection('globals').find().toArray()
                                                let n_counter = query_res[0].n_num
                                                await dbo.collection('notifications').insertOne({
                                                    'Id':n_counter++,
                                                    'Body':"Congo!!!! "+User.username + " has accepted your answer on this question",
                                                    'UserId':OwnerUserId,
                                                    'PostId':answer_id,
                                                    'Status':'unread'
                                                })
                                                await dbo.collection('globals').updateOne({},{$set:{'n_num':n_counter}})
                                                res.redirect(`/answers/${answer_id}`)
                                            })
                                        }
                                        else{
                                            res.send('Question is already Closed')
                                        }
    
    
                                    }
                                    else{
                                        res.send('Invalid Answer ID')        
                                    }
                                })
    
                            }
                            else{
                                res.send('Invalid Answer ID')
                            }
                        })
                    }
                    else{
                        res.send('Invalid User')
                    }
                })
            }
        })

        //api to undo an accepted answer
        app.post('/answers/:answer_id/accept/undo',(req,res)=>{
            const answer_id = parseInt(req.params.answer_id)
            const token = req.headers['x-access-token']

            //login check
            if(token==null){
                res.send('Not Logged In')
            }
            else{
            //token check & verification
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{
                    if(result.length == 1 && (uv =await validate_user(token,result[0]))){
                    
                        const User = result[0]
                        //checking if the answer object exists
                        dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                            if(err) throw err
                            if(result.length == 1){
                        
                                const question_id = result[0].ParentId
                                //checking if the parent question exists
                                dbo.collection(col_name_q).find({'PostTypeId':1,'Id':question_id}).toArray((err,result)=>{
                                    if(err) throw err
                            
                                    //only owner of parent question can undo an accept 
                                    if(result.length==1 && User.Id == result[0].OwnerUserId){
                                        //closed question cant undo an accept
                                        if(result[0].ClosedDate!=null)
                                            res.send('Question is in Closed State')
                                        //checks if there is even an accepted answer or not
                                        else if(result[0].AcceptedAnswerId==-1){
                                            res.send('Contains No Accepted Answer')
                                        }
                                        //checks if this answer is accepte done
                                        else if(result[0].AcceptedAnswerId==answer_id)
                                        {
                                            dbo.collection(col_name_q).updateOne({'PostTypeId':1,'Id':question_id},{$set:{'AcceptedAnswerId':-1}},(err,result)=>{
                                                if(err) throw err
                                                res.redirect(`/answers/${answer_id}`)
                                            })
                                        }
                                        else
                                            res.send('This is not an accepted answer')
                                    }
                                    else{
                                        res.send('Invalid Question ID')        
                                    }
                                })
    
                            }
                            else{
                                res.send('Invalid Answer ID')
                            }
                        })
                    }
                    else{
                        res.send('Invalid User')
                    }
                })
            }

        })
  
        //api to delete an answer
        app.post('/answers/:answer_id/delete',(req,res)=>{
            const answer_id = parseInt(req.params.answer_id)
            const token = req.headers['x-access-token']

            //login check
            if(token==null){
                res.send('Not Logged In')
            }
            else{
                dbo.collection(col_name_u).find({'token':token}).toArray(async (err,result)=>{

                    //token check & verification
                    if(result.length == 1 && (uv =await validate_user(token,result[0]))){
                    
                        const User = result[0]

                        //answer object existence check
                        dbo.collection(col_name_q).find({'PostTypeId':2,'Id':answer_id}).toArray((err,result)=>{
                            if(err) throw err
                            if(result.length == 1 && result[0].OwnerUserId == User.Id){

                                //parent question object existence check
                                dbo.collection(col_name_q).find({'Id':result[0].ParentId}).toArray((err,result)=>{
                                    if(result.length == 1){
                                        const question_id = result[0].Id

                                        //accepted answer cant be deleted
                                        if(result[0].AcceptedAnswerId == answer_id){
                                            res.send('Cant Delete an Accepted Answer')
                                        }
                                        else{
                                            dbo.collection(col_name_q).deleteOne({'PostTypeId':2,'Id':answer_id},async (err,result)=>{
                                                if(err) throw err
                                                const ans = await dbo.collection(col_name_q).find({'Id':question_id,'PostTypeId':1}).toArray()
                                                res.send(ans[0])
                                            })
                                        }
                                    }   
                                    else{
                                        res.send('Invalid Question ID')         
                                    } 
                                })
                            }
                            else{
                                res.send('Invalid Answer ID')
                            }
                        })
                    }
                    else{
                        res.send('Invalid User')
                    }
                })
            }
        })

        //api to edit an answer object ,calls the question edit api as the schema & process are similar
        app.post('/answers/:answer_id/edit',async (req,res)=>{
            const answer_id = parseInt(req.params.answer_id)
            const token = req.headers['x-access-token']

            const tok_find = await dbo.collection(col_name_u).find({'token':token}).toArray()
            const ans_find = await dbo.collection(col_name_q).find({'Id':answer_id}).toArray()

            if(token == null || token == undefined) {
                res.send('Not Logged In')
                
            }
            else if(!(tok_find.length == 1 && await validate_user(token,tok_find[0]))) {
                res.send('Invalid User')
                
            }
            else if(!(ans_find.length == 1 && ans_find[0].OwnerUserId == tok_find[0].Id)) {
                res.send('Invalid Post ID')
                
            }
            else{
                const Body = (req.body.Body == undefined)?ans_find[0].Body:req.body.Body
                await dbo.collection(col_name_q).updateOne({'PostTypeId':2,'Id':answer_id},{$set:{'Body':Body}})
                res.redirect(`/answers/${answer_id}`)
            }
        })

        //api to vote up or down a answer ,calls the question vote api as the schema & process are same
        app.get('/answers/:answer_id/:vote',async (req,res)=>{
            const answer_id = parseInt(req.params.answer_id)
            const vote = req.params.vote
            const token = req.headers['x-access-token']

            const tok_find = await dbo.collection(col_name_u).find({'token':token}).toArray()
            const ans_find = await dbo.collection(col_name_q).find({'Id':answer_id}).toArray()

            if(token == null || token == undefined) {
                res.send('Not Logged In')
            }
            else if(!(tok_find.length == 1 && await validate_user(token,tok_find[0]))) {
                res.send('Invalid User')
            }
            else if(ans_find.length != 1) {
                res.send('Invalid Post ID')
            }
            else{
                let amt,sts;
                const query_res = await dbo.collection('votes').find({'PostId':answer_id,'UserId':tok_find[0].Id,'PostTypeId':2}).toArray();
                if(query_res.length == 0){
                    amt=(vote=='upvote')?1:-1;
                    sts=amt;
                }
                else{
                    const doc = query_res[0];
                    if(doc.Status==1)
                    {
                        if(vote=='upvote')
                        {
                            await dbo.collection('votes').deleteOne({'PostId':answer_id,'UserId':tok_find[0].Id,'PostTypeId':2});
                            amt = -1;
                            sts=0;
                        }
                        else if(vote=='downvote'){
                            amt=-2;
                            sts=-1;
                        }
                    }
                    else if(doc.Status == -1)
                    {
                        if(vote=='downvote')
                        {
                            await dbo.collection('votes').deleteOne({'PostId':answer_id,'UserId':tok_find[0].Id,'PostTypeId':2});
                            amt = 1;
                            sts=0;
                        }
                        else if(vote=='upvote'){
                            amt=2;
                            sts=1;
                        }
                    }
                }

                if(sts!=0)
                    await dbo.collection('votes').updateOne({'PostId':answer_id,'UserId':tok_find[0].Id,'PostTypeId':2},{$set:{'Status':sts}},{upsert:true});

                const upd_sel={
                    'Id':answer_id
                };
        
                const upd_params = {
                    $inc:{
                        'Score': amt
                    }
                };

                await dbo.collection(col_name_q).updateOne(upd_sel,upd_params)
                if(tok_find[0].Id!=ans_find[0].OwnerUserId){
                    const query_res = await dbo.collection('globals').find().toArray()
                    let n_counter = query_res[0].n_num

                    await dbo.collection('notifications').insertOne({
                        'Id':n_counter++,
                        'Body':tok_find[0].username + " has Reacted On your Post",
                        'UserId':ans_find[0].OwnerUserId,
                        'PostId':answer_id,
                        'Status':'unread'
                    })
                    await dbo.collection('globals').updateOne({},{$set:{'n_num':n_counter}})
                }

                res.redirect(`/answers/${answer_id}`)
            }

        })

    })

})

module.exports = app
