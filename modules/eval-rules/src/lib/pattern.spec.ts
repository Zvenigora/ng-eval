import { MAX_PATTERN_DEPTH, MAX_PATTERN_VALUES, invalidPatternValues, matchesPattern } from './pattern';

/** `levels` arrays, each holding the next, the innermost holding 1. */
const nested = (levels: number): unknown => JSON.parse('['.repeat(levels) + '1' + ']'.repeat(levels));

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

describe('invalidPatternValues', () => {
  it('accepts what JSON writes', () => {
    expect(invalidPatternValues({ a: [1, 'b', true, null, { c: [] }] }, 'match')).toEqual([]);
  });

  it('names every value that is not a pattern', () => {
    expect(invalidPatternValues({ a: [1, Number.NaN] }, 'match')).toEqual([{ path: 'match.a[1]', reason: 'value' }]);
    expect(invalidPatternValues({ a: { b: () => 1 }, c: new Date(0), d: Infinity }, 'match')).toEqual([
      { path: 'match.a.b', reason: 'value' },
      { path: 'match.c', reason: 'value' },
      { path: 'match.d', reason: 'value' },
    ]);
  });

  it('names a cycle at the value that closes it, and a shared value that is no cycle not at all', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic['self'] = cyclic;
    const list: unknown[] = [];
    list.push({ back: list });
    expect(invalidPatternValues({ x: cyclic, y: list }, 'match')).toEqual([
      { path: 'match.x.self', reason: 'cycle' },
      { path: 'match.y[0].back', reason: 'cycle' },
    ]);
    const shared = { tier: 'gold' };
    expect(invalidPatternValues({ a: shared, b: [shared] }, 'match')).toEqual([]);
  });

  it('reads an array by index, so a hole is a value, undefined, and named', () => {
    const holed: unknown[] = [1];
    holed[2] = 2;
    expect(invalidPatternValues({ a: holed }, 'match')).toEqual([{ path: 'match.a[1]', reason: 'value' }]);
  });

  it(`nests at most ${MAX_PATTERN_DEPTH} arrays and objects, the pattern itself the first`, () => {
    expect(MAX_PATTERN_DEPTH).toBe(64);
    expect(invalidPatternValues({ a: nested(63) }, 'match')).toEqual([]);
    expect(invalidPatternValues({ a: nested(64) }, 'match')).toEqual([
      { path: `match.a${'[0]'.repeat(63)}`, reason: 'depth' },
    ]);
    // 65 objects, each holding the next: the 65th is one too deep.
    let objects: unknown = 1;
    for (let level = 0; level < 65; level++) {
      objects = { a: objects };
    }
    expect(invalidPatternValues(objects, 'match')).toEqual([{ path: `match${'.a'.repeat(64)}`, reason: 'depth' }]);
  });

  it('names a pattern JSON nests 20,000 deep once, at its depth, and does not run out of stack', () => {
    expect(invalidPatternValues({ a: nested(20_000) }, 'match')).toEqual([
      { path: `match.a${'[0]'.repeat(63)}`, reason: 'depth' },
    ]);
  });

  it(`holds at most ${MAX_PATTERN_VALUES.toLocaleString('en-US')} values, counted on every path, and names the pattern alone`, () => {
    expect(MAX_PATTERN_VALUES).toBe(100_000);
    // The object, the array and its elements: 100,000 values, then one more.
    // `b`, invalid, comes first, so the walk has found it when the count stops it.
    expect(invalidPatternValues({ a: new Array(99_998).fill(1) }, 'match')).toEqual([]);
    expect(invalidPatternValues({ b: Number.NaN, a: new Array(99_999).fill(1) }, 'match')).toEqual([
      { path: 'match', reason: 'size' },
    ]);
  });

  it('stops a shared value counted on every path at the bound, a diamond 40 levels deep among them', () => {
    let diamond: unknown = 1;
    for (let level = 0; level < 40; level++) {
      diamond = { l: diamond, r: diamond };
    }
    expect(invalidPatternValues({ d: diamond }, 'match')).toEqual([{ path: 'match', reason: 'size' }]);
  });
});
