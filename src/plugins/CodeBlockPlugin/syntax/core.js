export function tokenize(code, rules) {
  if (!code) return [];
  if (!rules || rules.length === 0) return [{ type: 'plain', value: code }];

  const tokens = [];
  let index = 0;
  const length = code.length;

  while (index < length) {
    let matched = false;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      rule.regex.lastIndex = index;
      const match = rule.regex.exec(code);

      if (match && match.index === index) {
        tokens.push({ type: rule.type, value: match[0] });
        index += match[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // It's a plain character
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && lastToken.type === 'plain') {
        lastToken.value += code[index];
      } else {
        tokens.push({ type: 'plain', value: code[index] });
      }
      index++;
    }
  }

  return tokens;
}
