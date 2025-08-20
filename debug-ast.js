// Debug script to understand AST structure for member expressions
const { parse } = require('acorn');

console.log('=== obj.prop (dot notation) ===');
const dotNotation = parse('obj.prop', { ecmaVersion: 2020 });
console.log(JSON.stringify(dotNotation.body[0].expression, null, 2));

console.log('\n=== obj[key] (computed) ===');
const computed = parse('obj[key]', { ecmaVersion: 2020 });
console.log(JSON.stringify(computed.body[0].expression, null, 2));

console.log('\n=== obj["literal"] (computed literal) ===');
const computedLiteral = parse('obj["literal"]', { ecmaVersion: 2020 });
console.log(JSON.stringify(computedLiteral.body[0].expression, null, 2));