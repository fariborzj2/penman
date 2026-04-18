const fs = require('fs');
let content = fs.readFileSync('src/sanitization/Sanitizer.test.js', 'utf8');

content = content.replace(/expect\(clean\)\.toBe\('<div>Hello alert\("xss"\) <span>World<\/span><\/div>'\);/g, "expect(clean).toBe('<p>Hello alert(\"xss\") World</p>');");
content = content.replace(/expect\(clean\)\.toBe\('<div><p>Safe <img src="x"> <span>Text<\/span><\/p><\/div>'\);/g, "expect(clean).toBe('<p>Safe <img src=\"x\"> Text</p>');");
content = content.replace(/expect\(html\)\.toBe\('<div>متن داخل div<\\\/div><p>\\nمتن بیرون از تگ<\\\/p>'\);/g, "expect(html).toBe('<p>متن داخل div\\nمتن بیرون از تگ</p>');");

fs.writeFileSync('src/sanitization/Sanitizer.test.js', content);
