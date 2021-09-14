const request = require('request');

module.exports = {
    verifyAuth: async function (req, res, next) {
        // Get auth header value
        const token = req.headers['x-access-token'];
        const user_Id = String(req.params.user_id);
        if (token == undefined || token == null || token.length <5) {
            next();
        }
        // Check if token is undefined
        else if (typeof token !== 'undefined') {
            //const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
            //const user = await response.json();
            request.get({
                headers:{'content-type':'application/json'},
                url:`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
            },(err,response,body)=>{
                if(err) throw err
                //console.log(body);
                body=JSON.parse(body)
                if (body.user_id) { 
                    //console.log(body);
                    next(); }
                else if ([body.error]=='invalid_token'){res.sendStatus(403);}

            
            })
        }
        else res.sendStatus(403)
    },

    verifyToken: async function (req, res, next) {
        // Get auth header value
        const token = req.headers['x-access-token'];
        const user_Id = String(req.params.user_id);
        if (token == undefined || token == null || token.length <5) {
            next();
        }
        // Check if token is undefined
        else if (typeof token !== 'undefined') {
            //const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
            //const user = await response.json();
            request.get({
                headers:{'content-type':'application/json'},
                url:`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
            },(err,response,body)=>{
                if(err) throw err
                //console.log(body);
                body=JSON.parse(body)
                if (body.user_id) { 
                    //console.log(body);
                    next(); }
                else if ([body.error]=='invalid_token'){res.sendStatus(403);}

            
            })
        }
        else res.sendStatus(403)
    },


    validate_user: function (token,user_obj){
        return true
    },
}
