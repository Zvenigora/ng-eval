import { toText, toVisible } from './coercion';

describe('toVisible', () => {

  // JavaScript truthiness, stated in the README (plan S 3.6). The cases below
  // are the ones a rule author actually hits, not a truth table for its own
  // sake: an empty control resolves `undefined` (S 3.4.3 - an empty field and
  // a missing field are indistinguishable), and a form-builder UI that stores
  // every value as a string produces `'false'`.

  it('should treat undefined as not visible', () => {
    // The load-bearing case, and the most ordinary input a form has: an empty
    // `FormControl` reaches here as `undefined` through both halves.
    expect(toVisible(undefined)).toEqual(false);
  });

  it('should treat the falsy values as not visible', () => {
    expect(toVisible(null)).toEqual(false);
    expect(toVisible(false)).toEqual(false);
    expect(toVisible(0)).toEqual(false);
    expect(toVisible('')).toEqual(false);
    expect(toVisible(NaN)).toEqual(false);
  });

  it('should treat a non-empty string as visible, including "false"', () => {
    // Truthiness, not parsing. A coercion that special-cased the string
    // `'false'` would pass every other case here.
    expect(toVisible('false')).toEqual(true);
    expect(toVisible('0')).toEqual(true);
  });

  it('should treat objects and arrays as visible', () => {
    expect(toVisible({})).toEqual(true);
    expect(toVisible([])).toEqual(true);
  });

  it('should return a boolean rather than the value', () => {
    // The template reads this into `@if`, and a rule that returned `'CA'`
    // would work there and then fail an `=== true` comparison in a consumer's
    // own code. The type is part of the contract.
    expect(toVisible('CA')).toBe(true);
    expect(toVisible(undefined)).toBe(false);
  });
});

describe('toText', () => {

  it('should map null and undefined to the empty string', () => {
    // Not `String(value)` for these two: `'undefined'` and `'null'` rendered
    // into a label is the failure this rule exists to prevent.
    expect(toText(undefined)).toEqual('');
    expect(toText(null)).toEqual('');
  });

  it('should stringify a value that is present', () => {
    expect(toText('CA')).toEqual('CA');
    expect(toText(30)).toEqual('30');
    expect(toText(true)).toEqual('true');
  });

  it('should stringify the falsy values that are not null or undefined', () => {
    // The discriminating pair: an implementation that mapped every falsy
    // value to `''` - which is the obvious way to write this rule wrongly -
    // passes the null/undefined case above and fails here.
    expect(toText(0)).toEqual('0');
    expect(toText(false)).toEqual('false');
    expect(toText('')).toEqual('');
  });

  it('should stringify by String(), not by JSON', () => {
    expect(toText([1, 2])).toEqual('1,2');
    expect(toText({})).toEqual('[object Object]');
  });
});
