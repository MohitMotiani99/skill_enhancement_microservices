const dotenv = require('dotenv').config();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const substitute = require('shellsubstitute');

module.exports = async function envSwgr(file_name){
    const OUTPUT_FILE_WITH_ENV_VARS = file_name;  
  
    const swaggerConfig =await yaml.load(fs.readFileSync(path.join(__dirname,'swagger', file_name), 'utf-8'));
    const JSONconfigWithEnvVars = await substitute(JSON.stringify(swaggerConfig, null, 2), process.env);
    const swaggerConfigWithEnvVars = await yaml.dump(JSON.parse(JSONconfigWithEnvVars));
    await fs.writeFileSync(path.join(__dirname,'swagger', file_name), swaggerConfigWithEnvVars);

}
  
