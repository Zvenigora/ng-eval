// Debug script to understand what's happening with prototype pollution
const { EvalService } = require('./dist/modules/eval-core/lib/actual/services/eval.service.js');

const service = new EvalService();

console.log('Testing computed property assignment...');
try {
  const result = service.simpleEval('obj[key] = value', {
    obj: {},
    key: '__proto__',
    value: { polluted: true }
  });
  console.log('Result:', result);
  console.log('No error thrown - this is the problem');
} catch (error) {
  console.log('Error thrown:', error.message);
}

console.log('\nTesting computed property access...');
try {
  const result = service.simpleEval('obj[key]', {
    obj: { dynamicKey: 'dynamic value' },
    key: 'dynamicKey'
  });
  console.log('Result:', result);
} catch (error) {
  console.log('Error thrown:', error.message);
}