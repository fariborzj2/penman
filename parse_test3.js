const { JSDOM } = require('jsdom');
const dom = new JSDOM('<span style="font-size: 16px; color: red;">Test</span>');
const span = dom.window.document.querySelector('span');
console.log(span.style.fontSize);
console.log(span.style.color);
console.log(Array.from(span.style));
