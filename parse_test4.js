const { JSDOM } = require('jsdom');
// Browsers natively split <p> if a block level is inside. Let's see what jsdom does.
const dom = new JSDOM('<p>A<ul><li>B</li></ul>C</p>');
console.log(dom.window.document.body.innerHTML);
