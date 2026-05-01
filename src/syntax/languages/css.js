export default [
  { type: "comment", regex: /\/\*[\s\S]*?\*\//y },
  { type: "string", regex: /(['"])(?:\\.|(?!\1)[^\\])*\1/y },
  { type: "keyword", regex: /@[a-z-]+/y },
  { type: "number", regex: /\b\d+(\.\d+)?(px|em|rem|%|vh|vw)?\b/y },
  { type: "operator", regex: /[:;{}]/y },
  { type: "punctuation", regex: /[(),]/y }
];
