import {
  MAX_PATH_KEY,
  MAX_PATTERN_DEPTH,
  MAX_PATTERN_PROBLEMS,
  MAX_PATTERN_VALUES,
  checkPattern,
  matchesPattern,
  pathKey,
} from './pattern';

const problemsIn = (pattern: unknown, path: string) => checkPattern(pattern, path).problems;

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

describe('checkPattern', () => {
  it('accepts what JSON writes', () => {
    expect(problemsIn({ a: [1, 'b', true, null, { c: [] }] }, 'match')).toEqual([]);
  });

  it('names every value that is not a pattern', () => {
    expect(problemsIn({ a: [1, Number.NaN] }, 'match')).toEqual([{ path: 'match.a[1]', reason: 'value' }]);
    expect(problemsIn({ a: { b: () => 1 }, c: new Date(0), d: Infinity }, 'match')).toEqual([
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
    expect(problemsIn({ x: cyclic, y: list }, 'match')).toEqual([
      { path: 'match.x.self', reason: 'cycle' },
      { path: 'match.y[0].back', reason: 'cycle' },
    ]);
    const shared = { tier: 'gold' };
    expect(problemsIn({ a: shared, b: [shared] }, 'match')).toEqual([]);
  });

  it('reads an array by index, so a hole is a value, undefined, and named', () => {
    const holed: unknown[] = [1];
    holed[2] = 2;
    expect(problemsIn({ a: holed }, 'match')).toEqual([{ path: 'match.a[1]', reason: 'value' }]);
  });

  it(`nests at most ${MAX_PATTERN_DEPTH} arrays and objects, the pattern itself the first`, () => {
    expect(MAX_PATTERN_DEPTH).toBe(64);
    expect(problemsIn({ a: nested(63) }, 'match')).toEqual([]);
    expect(problemsIn({ a: nested(64) }, 'match')).toEqual([
      { path: `match.a${'[0]'.repeat(63)}`, reason: 'depth' },
    ]);
    // 65 objects, each holding the next: the 65th is one too deep.
    let objects: unknown = 1;
    for (let level = 0; level < 65; level++) {
      objects = { a: objects };
    }
    expect(problemsIn(objects, 'match')).toEqual([{ path: `match${'.a'.repeat(64)}`, reason: 'depth' }]);
  });

  it('names a pattern JSON nests 20,000 deep once, at its depth, and does not run out of stack', () => {
    expect(problemsIn({ a: nested(20_000) }, 'match')).toEqual([
      { path: `match.a${'[0]'.repeat(63)}`, reason: 'depth' },
    ]);
  });

  it(`holds at most ${MAX_PATTERN_VALUES.toLocaleString('en-US')} values, counted on every path, and names the pattern alone`, () => {
    expect(MAX_PATTERN_VALUES).toBe(100_000);
    // The object, the array and its elements: 100,000 values. With `b` one more,
    // and `b`, invalid, comes first, so the walk has found it when the count stops it.
    expect(problemsIn({ a: new Array(99_998).fill(1) }, 'match')).toEqual([]);
    expect(problemsIn({ b: Number.NaN, a: new Array(99_998).fill(1) }, 'match')).toEqual([
      { path: 'match', reason: 'size' },
    ]);
  });

  it('reports the first value past the depth bound alone, and every other problem', () => {
    expect(problemsIn({ a: nested(64), b: Number.NaN, c: nested(64) }, 'match')).toEqual([
      { path: `match.a${'[0]'.repeat(63)}`, reason: 'depth' },
      { path: 'match.b', reason: 'value' },
    ]);
  });

  it('shows a key as .key when a short identifier, and quoted as JSON otherwise', () => {
    expect(MAX_PATH_KEY).toBe(64);
    expect(pathKey('tier')).toBe('.tier');
    expect(pathKey('$a_1')).toBe('.$a_1');
    expect(pathKey('a.b')).toBe('["a.b"]');
    expect(pathKey('Q1:1')).toBe('["Q1:1"]');
    expect(pathKey('')).toBe('[""]');
    expect(pathKey('1a')).toBe('["1a"]');
    expect(pathKey('a'.repeat(64))).toBe(`.${'a'.repeat(64)}`);
    expect(pathKey('a'.repeat(65))).toBe(`[${JSON.stringify(`${'a'.repeat(64)}…`)}]`);
  });

  it('tells a key holding a dot from two keys, one inside the other', () => {
    // JSON writes 1e999, which parses to Infinity.
    const match = JSON.parse('{"a.b":1e999,"a":{"b":1e999}}') as unknown;
    expect(problemsIn(match, 'match')).toEqual([
      { path: 'match["a.b"]', reason: 'value' },
      { path: 'match.a.b', reason: 'value' },
    ]);
  });

  it(`reports at most ${MAX_PATTERN_PROBLEMS} problems, then one saying there are more`, () => {
    expect(MAX_PATTERN_PROBLEMS).toBe(100);
    const nans = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, Number.NaN]));
    expect(problemsIn(nans(100), 'match')).toHaveLength(100);
    expect(problemsIn(nans(100), 'match').at(-1)).toEqual({ path: 'match.c99', reason: 'value' });
    const many = problemsIn(nans(101), 'match');
    expect(many).toHaveLength(101);
    expect(many[99]).toEqual({ path: 'match.c99', reason: 'value' });
    expect(many[100]).toEqual({ path: 'match', reason: 'more' });
    expect(problemsIn(nans(20_000), 'match')).toHaveLength(101);
  });

  it('stops at the first of its two bounds: 100 problems then 100,000 values is the size alone', () => {
    const nans = (n: number) => Array.from({ length: n }, (_, i): [string, unknown] => [`c${i}`, Number.NaN]);
    const big = new Array(100_000).fill(1);
    expect(problemsIn(Object.fromEntries([...nans(100), ['big', big]]), 'match')).toEqual([
      { path: 'match', reason: 'size' },
    ]);
    const capped = problemsIn(Object.fromEntries([...nans(101), ['big', big]]), 'match');
    expect(capped).toHaveLength(101);
    expect(capped[100]).toEqual({ path: 'match', reason: 'more' });
  });

  it('stops walking at the 101st problem: a getter after it is not read', () => {
    let read = false;
    const match: Record<string, unknown> = Object.fromEntries(
      Array.from({ length: 101 }, (_, i) => [`c${i}`, Number.NaN])
    );
    Object.defineProperty(match, 'late', {
      enumerable: true,
      get: () => {
        read = true;
        return 1;
      },
    });
    expect(problemsIn(match, 'match')).toHaveLength(101);
    expect(read).toBe(false);
  });

  it('reads each value once, and copies what it read', () => {
    let reads = 0;
    const match = {
      get tier(): unknown {
        reads += 1;
        return reads === 1 ? 'gold' : Number.NaN;
      },
    };
    const checked = checkPattern(match, 'match');
    expect(checked.problems).toEqual([]);
    expect(reads).toBe(1);
    expect(checked.copy).toEqual({ tier: 'gold' });
    expect(Object.isFrozen(checked.copy)).toBe(true);
    expect(Object.getPrototypeOf(checked.copy)).toBeNull();
  });

  it('gives no copy for a pattern with a problem', () => {
    expect(checkPattern({ a: Number.NaN }, 'match').copy).toBeUndefined();
    expect(checkPattern({ a: new Array(100_000).fill(1) }, 'match').copy).toBeUndefined();
  });

  it('stops a shared value counted on every path at the bound, a diamond 40 levels deep among them', () => {
    let diamond: unknown = 1;
    for (let level = 0; level < 40; level++) {
      diamond = { l: diamond, r: diamond };
    }
    expect(problemsIn({ d: diamond }, 'match')).toEqual([{ path: 'match', reason: 'size' }]);
  });
});
