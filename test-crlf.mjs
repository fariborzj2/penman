let str = "line1\r\nline2\r\nline3";
console.log(JSON.stringify(str));
str = str.replace(/\r\n/g, '\n');
console.log(JSON.stringify(str));
