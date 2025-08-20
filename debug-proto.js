// Debug test for prototype pollution
const dangerous = { '__proto__': { evil: true } };

console.log('Dangerous object keys:', Object.getOwnPropertyNames(dangerous));
console.log('Dangerous object:', dangerous);
console.log('Has __proto__ property:', Object.prototype.hasOwnProperty.call(dangerous, '__proto__'));
console.log('Dangerous object prototype:', Object.getPrototypeOf(dangerous));

// Test with quoted property
const safeDangerous = { "__proto__": { evil: true } };
console.log('Safe dangerous object keys:', Object.getOwnPropertyNames(safeDangerous));
console.log('Safe dangerous object:', safeDangerous);