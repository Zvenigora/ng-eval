import { invalidPatternPath, matchesPattern } from './pattern';

/** The subset pattern of a filter's and a trigger's `match` (Q36). */
describe('matchesPattern', () => {
  it('matches a scalar by ===', () => {
    expect(matchesPattern({ region: 'EU' }, { region: 'EU', tier: 'gold' })).toBe(true);
    expect(matchesPattern({ region: 'EU' }, { region: 'UK' })).toBe(false);
    expect(matchesPattern({ total: 100 }, { total: '100' })).toBe(false);
    expect(matchesPattern({ flag: null }, { flag: null })).toBe(true);
  });

  it('reads an array as any-of', () => {
    expect(matchesPattern({ region: ['EU', 'UK'] }, { region: 'UK' })).toBe(true);
    expect(matchesPattern({ region: ['EU', 'UK'] }, { region: 'US' })).toBe(false);
    expect(matchesPattern({ region: [] }, { region: 'EU' })).toBe(false);
  });

  it('matches an array target by any of its elements', () => {
    expect(matchesPattern({ keys: ['order:total'] }, { keys: ['customer:tier', 'order:total'] })).toBe(true);
    expect(matchesPattern({ keys: ['order:total'] }, { keys: ['customer:tier'] })).toBe(false);
  });

  it('recurses into a nested object', () => {
    expect(matchesPattern({ customer: { tier: 'gold' } }, { customer: { tier: 'gold', id: 7 } })).toBe(true);
    expect(matchesPattern({ customer: { tier: 'gold' } }, { customer: { tier: 'silver' } })).toBe(false);
    expect(matchesPattern({ customer: { tier: 'gold' } }, { customer: 'gold' })).toBe(false);
  });

  it('does not match a target that lacks a key the pattern names', () => {
    expect(matchesPattern({ region: 'EU' }, {})).toBe(false);
    expect(matchesPattern({ region: undefined }, {})).toBe(false);
    expect(matchesPattern({}, {})).toBe(true);
  });

  it('reads own properties only: an inherited constructor is not a match', () => {
    expect(matchesPattern({ constructor: { name: 'Object' } }, {})).toBe(false);
    expect(matchesPattern({ toString: [] }, {})).toBe(false);
    expect(matchesPattern({ constructor: { name: 'Object' } }, { constructor: { name: 'Object' } })).toBe(true);
  });

  it('matches nothing inherited for a __proto__ key, which JSON.parse makes an own property', () => {
    const pattern = JSON.parse('{ "__proto__": { "polluted": true } }');
    expect(Object.keys(pattern)).toEqual(['__proto__']);
    expect(matchesPattern(pattern, {})).toBe(false);
    expect(matchesPattern(pattern, Object.create({ polluted: true }))).toBe(false);
  });
});

describe('invalidPatternPath', () => {
  it('accepts what JSON writes', () => {
    expect(invalidPatternPath({ a: [1, 'b', true, null, { c: [] }] }, 'match')).toBeUndefined();
  });

  it('names the first value that is not a pattern', () => {
    expect(invalidPatternPath({ a: [1, Number.NaN] }, 'match')).toBe('match.a[1]');
    expect(invalidPatternPath({ a: { b: () => 1 } }, 'match')).toBe('match.a.b');
    expect(invalidPatternPath({ a: new Date(0) }, 'match')).toBe('match.a');
    expect(invalidPatternPath({ a: Infinity }, 'match')).toBe('match.a');
  });
});
