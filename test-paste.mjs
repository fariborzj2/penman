const text = "import { JSDOM } from 'jsdom';\nconst dom = new JSDOM();\nconst document = dom.window.document;";
const textWithCarriageReturn = "import { JSDOM } from 'jsdom';\r\nconst dom = new JSDOM();\r\nconst document = dom.window.document;";

console.log(text);
console.log("-------");
console.log(textWithCarriageReturn);
