export default [
  { type: "comment", regex: /--.*|\/\*[\s\S]*?\*\//y },
  { type: "string", regex: /(['"])(?:\\.|(?!\1)[^\\])*\1/y },
  { type: "keyword", regex: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AS|AND|OR|NOT|IN|LIKE|IS|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|ASC|DESC)\b/iy },
  { type: "number", regex: /\b\d+(\.\d+)?\b/y },
  { type: "operator", regex: /[+\-*/=<>!]+/y },
  { type: "punctuation", regex: /[();,]/y }
];
