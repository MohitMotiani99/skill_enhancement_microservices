/* eslint-disable no-console */
const natural = require('natural');

const corpus = ['something', 'soothing'];
const spellcheck = new natural.Spellcheck(corpus);

console.log(spellcheck.getCorrections('soemthing', 1)); 
console.log(spellcheck.getCorrections('soemthing', 2));