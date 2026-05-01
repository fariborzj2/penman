export default [
  { type: "comment", regex: /\/\/.*|\/\*[\s\S]*?\*\//y },
  { type: "string", regex: /(['"`])(?:\\.|(?!\1)[^\\])*\1/y },
  { type: "keyword", regex: /\b(const|let|var|function|return|if|else|for|while|class|new|this|async|await|break|case|catch|continue|debugger|default|delete|do|enum|export|extends|false|finally|implements|import|in|instanceof|interface|null|package|private|protected|public|super|switch|static|throw|true|try|typeof|void|with|yield)\b/y },
  { type: "number", regex: /\b\d+(\.\d+)?\b/y },
  { type: "operator", regex: /[+\-*/=<>!&|]+/y },
  { type: "punctuation", regex: /[{}[\];(),.:]/y }
];
