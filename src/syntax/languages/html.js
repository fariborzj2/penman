export default [
  { type: "comment", regex: /<!--[\s\S]*?-->/y },
  { type: "string", regex: /=(["'])(?:\\.|(?!\1)[^\\])*\1/y },
  { type: "keyword", regex: /<\/?\w+/y },
  { type: "operator", regex: /=>?|>/y },
  { type: "punctuation", regex: /\/?>/y }
];
