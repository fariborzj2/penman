const { JSDOM } = require('jsdom');
// Let's test with a div inside a p, which jsdom handles
const dom2 = new JSDOM('<p>A<div>B</div>C</p>');
console.log(dom2.window.document.body.innerHTML);
