const { JSDOM } = require('jsdom');
const dom = new JSDOM('<p><div>X</div></p>');
console.log(dom.window.document.body.innerHTML);
const dom2 = new JSDOM('<h3><div><p>X</p></div></h3>');
console.log(dom2.window.document.body.innerHTML);
