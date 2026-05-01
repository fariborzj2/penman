export default [
  { type: "comment", regex: /\/\/.*|#.*|\/\*[\s\S]*?\*\//y },
  { type: "string", regex: /(['"])(?:\\.|(?!\1)[^\\])*\1/y },
  { type: "keyword", regex: /\b(echo|if|else|elseif|for|foreach|while|do|switch|case|break|continue|return|function|class|public|private|protected|static|new|try|catch|finally|throw|namespace|use|include|require)\b/y },
  { type: "number", regex: /\b\d+(\.\d+)?\b/y },
  { type: "operator", regex: /[+\-*/=<>!&|?:]+/y },
  { type: "punctuation", regex: /[{}[\];(),]/y }
];
