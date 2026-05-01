export default [
  { type: "comment", regex: /#.*/y },
  { type: "string", regex: /(['"])(?:\\.|(?!\1)[^\\])*\1/y },
  { type: "keyword", regex: /\b(if|fi|then|elif|else|for|do|done|in|while|until|case|esac|function|return|export|local|echo|read)\b/y },
  { type: "number", regex: /\b\d+\b/y },
  { type: "operator", regex: /[=!+\-*/<>|&]+/y },
  { type: "punctuation", regex: /[{}[\];()]/y }
];
