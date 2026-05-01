export default [
  { type: "string", regex: /"(?:\\.|[^"\\])*"/y },
  { type: "number", regex: /-?\b\d+(\.\d+)?([eE][+-]?\d+)?\b/y },
  { type: "keyword", regex: /\b(true|false|null)\b/y },
  { type: "operator", regex: /:/y },
  { type: "punctuation", regex: /[{}[\];,]/y }
];
