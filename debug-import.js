const acorn = require('acorn');

try {
  const ast = acorn.parse('import("./module")', {ecmaVersion: 2020, sourceType: 'module'});
  console.log('AST:', JSON.stringify(ast, null, 2));
} catch (e) {
  console.log('Module parse error:', e.message);
  
  try {
    const ast = acorn.parse('import("./module")', {ecmaVersion: 2020, sourceType: 'script'});
    console.log('AST:', JSON.stringify(ast, null, 2));
  } catch (e2) {
    console.log('Script parse error:', e2.message);
  }
}