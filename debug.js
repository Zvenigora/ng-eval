// Debug script to test function safety logic

const DANGEROUS_FUNCTIONS = new Set([
  'Function',
  'eval',
  'setTimeout',
  'setInterval',  
  'setImmediate',
  'require',
  'import',
  'importScripts',
  'XMLHttpRequest',
  'fetch',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'ServiceWorker',
]);

const DANGEROUS_PATTERNS = [
  /\beval\s*\(/i,
  /\bFunction\s*\(/,  // Look for Function constructor (capital F only)
  /new\s+Function\s*\(/i,
  /\.__proto__\b/,
  /\.prototype\s*\.\s*constructor\b/,
  /\bglobalThis\b/,
];

const isDangerousFunctionName = (fnName) => {
  const result = DANGEROUS_FUNCTIONS.has(fnName);
  console.log(`isDangerousFunctionName("${fnName}") = ${result}`);
  return result;
};

const hasDangerousPatterns = (fnString) => {
  // If it's a native function ([native code]), allow it
  if (fnString.includes('[native code]')) {
    console.log(`hasDangerousPatterns: native function detected, returning false`);
    return false;
  }
  
  console.log(`Checking function string: "${fnString}"`);
  
  for (let i = 0; i < DANGEROUS_PATTERNS.length; i++) {
    const pattern = DANGEROUS_PATTERNS[i];
    const matches = pattern.test(fnString);
    console.log(`Pattern ${i} (${pattern}): ${matches}`);
    if (matches) {
      console.log(`hasDangerousPatterns: pattern ${i} matched, returning true`);
      return true;
    }
  }
  
  console.log(`hasDangerousPatterns: no patterns matched, returning false`);
  return false;
};

const isFunctionSafe = (fn, fnName) => {
  console.log(`\n=== isFunctionSafe check for "${fnName}" ===`);
  
  if (typeof fn !== 'function') {
    console.log('Not a function, returning false');
    return false;
  }

  // Check if it's a dangerous function by name
  if (fnName && isDangerousFunctionName(fnName)) {
    console.log('Dangerous function name, returning false');
    return false;
  }

  // Special check for Function constructor
  if (fn === Function) {
    console.log('Function constructor detected, returning false');
    return false;
  }

  try {
    // Check function string for dangerous patterns
    const fnString = fn.toString();
    console.log(`Function string: ${fnString}`);
    if (hasDangerousPatterns(fnString)) {
      console.log('Dangerous patterns found, returning false');
      return false;
    }
  } catch {
    // If we can't get the function string, be cautious
    console.log('Error getting function string, returning false');
    return false;
  }

  console.log('Function passed all checks, returning true');
  return true;
};

// Test cases
console.log('Testing Math.max:');
const mathMaxSafe = isFunctionSafe(Math.max, 'max');
console.log(`Result: ${mathMaxSafe}\n`);

console.log('Testing eval:');
const evalSafe = isFunctionSafe(eval, 'eval');
console.log(`Result: ${evalSafe}\n`);

console.log('Testing user function:');
function add(a, b) { return a + b; }
const addSafe = isFunctionSafe(add, 'add');
console.log(`Result: ${addSafe}\n`);

console.log('Testing getValue method:');
const getValue = function() { return this.name; };
const getValueSafe = isFunctionSafe(getValue, 'getValue');
console.log(`Result: ${getValueSafe}\n`);

console.log('Testing calculate method:');
const calculate = function(x, y) { return x * y; };
const calculateSafe = isFunctionSafe(calculate, 'calculate');
console.log(`Result: ${calculateSafe}\n`);

console.log('Testing dangerous function with Function constructor:');
const dangerousFunc = new Function('return 1');
const dangerousFuncSafe = isFunctionSafe(dangerousFunc, 'dangerous');
console.log(`Result: ${dangerousFuncSafe}\n`);