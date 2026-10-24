import { AnyNode, AssignmentExpression, ExpressionStatement, Identifier, Program } from 'acorn';
import { EvalContext, EvalKnownOptions, EvalScope, EvalState, createDependencyTracker } from '../classes/eval';
import { Registry } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * A characterisation of assignment targets as the evaluator handles them up to
 * 0.13.3: what a target evaluates, reads, calls, reports and writes
 * (`docs/a45/plan.md`, step 1; `docs/backlog.md` A45 part 2 and A44).
 *
 * Nothing else in the three suites pins this. The plan's prototype of the
 * change left every existing case green (its M4), so this spec is the witness
 * steps 2 and 3 rewrite. Each row's expectations are recorded by hand, from the
 * plan's measurements, and never computed from the implementation.
 *
 * Every row runs in both case modes, and carries per mode:
 *
 * - `today`, the outcome the evaluator gives now;
 * - `js`, JavaScript's outcome, checked against the native arm: the row's own
 *   source run natively, or under `caseInsensitive` a case-variant row's
 *   `nativeAs`, the same assignment written by hand in the data's spelling.
 *   A row JavaScript has no answer for says so, with its reason;
 * - its marks. `flips` names the step that changes `today`. `held` names the
 *   register entry that keeps a row from JavaScript's outcome after its step,
 *   with the outcome it keeps. `design` names the decision a deviation is.
 *
 * Marks are not asserted here. They are measured by applying the plan's
 * prototype: step 2's half must turn red exactly the cases marked `2`, and the
 * whole of it exactly those marked `2` or `3`. The marks are in each case's
 * name, so the red cases read off the run.
 *
 * The native arm runs the source in sloppy mode under `with`, over a proxy that
 * holds every name, so a name the data lacks reads as `undefined` and is
 * written onto the data, as the evaluator does, and nothing reaches a global.
 * `this` is the data. The evaluator's context is built from the data as a
 * caller builds one, so under `caseInsensitive` a plain object is copied into a
 * `Registry`, and the store is read back through the context.
 */
describe('assignment targets (A45 part 2, A44): today, pinned', () => {

  /** Parses to the whole `Program` at ES2022, where logical assignment is. */
  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2022, extractExpressions: false }) as AnyNode;

  type Mode = 'cs' | 'ci';
  type PerMode<T> = { cs: T; ci: T };
  type Outcome = Record<string, unknown>;

  /** One run, and what can be read of it afterwards. */
  interface Ran {
    value?: unknown;
    threw?: string;
    /** A key, read through the context or, natively, off the data. */
    read: (key: string) => unknown;
    /** The store's own keys: the data, or the `caseInsensitive` copy. */
    keys: () => unknown[];
    /** Whether `key` is an own JavaScript property of a `Registry` store, beside its map. */
    stray: (key: string) => boolean;
    /** A second source, run on the same context or data. */
    later: (source: string) => unknown;
  }

  interface Engine {
    native: boolean;
    /**
     * `arm` runs after the context is built and before the source runs. A
     * host-built AST, in place of a source, has no native run.
     */
    run(source: string | AnyNode, data: Record<string, unknown>, options: EvalKnownOptions,
      arm?: (context?: EvalContext, state?: EvalState) => void): Ran;
  }

  const attempt = (run: () => unknown): { value?: unknown; threw?: string } => {
    try {
      return { value: run() };
    } catch (error) {
      return { threw: error instanceof Error ? error.message : String(error) };
    }
  };

  const evaluator: Engine = {
    native: false,
    run: (source, data, options, arm) => {
      const context = EvalContext.fromContext(data, options);
      const state = EvalState.fromContext(context, options);
      arm?.(context, state);
      const ran = attempt(() => evaluate(typeof source === 'string' ? programOf(source) : source, state));
      const store = context.original;
      return {
        ...ran,
        read: key => context.get(key),
        keys: () => store instanceof Registry ? [...store.keys] : Object.keys(store),
        stray: key => store instanceof Registry && Object.prototype.hasOwnProperty.call(store, key),
        later: text => evaluate(programOf(text), EvalState.fromContext(context, options)),
      };
    },
  };

  const nativeEngine: Engine = {
    native: true,
    run: (source, data, _options, arm) => {
      if (typeof source !== 'string') {
        throw new Error('A host-built AST has no native run');
      }
      const scope = new Proxy(data, { has: (_target, key) => typeof key === 'string' });
      const run = (text: string): unknown =>
        new Function('scope', `with (scope) { return (${text}); }`).call(data, scope);
      arm?.();
      return {
        ...attempt(() => run(source)),
        read: key => data[key],
        keys: () => Object.keys(data),
        stray: () => false,
        later: text => run(text),
      };
    },
  };

  /** A row's fixture, built fresh per call, run on `engine`, and what it observed. */
  type Observe = (engine: Engine, source: string, options: EvalKnownOptions) => Outcome;

  type Js = { native: Outcome } | { none: string };

  type Step = 2 | 3;

  /** A row whose outcome after its step is still not JavaScript's, and the entry that keeps it so. */
  interface Hold {
    under: 'A48' | 'A49' | 'A50' | 'A51';
    after: Outcome;
  }

  interface Row {
    source: string;
    observe: Observe;
    today: PerMode<Outcome>;
    js: PerMode<Js>;
    /** Under `caseInsensitive`, the assignment in the data's spelling, written by hand. */
    nativeAs?: string;
    flips?: Partial<PerMode<Step>>;
    held?: Partial<PerMode<Hold>>;
    design?: Partial<PerMode<string>>;
  }

  const both = <T>(value: T): PerMode<T> => ({ cs: value, ci: value });
  const native = (outcome: Outcome): Js => ({ native: outcome });
  const none = (reason: string): Js => ({ none: reason });

  const outcome = (ran: Ran, shown: (value: unknown) => unknown = value => value): Outcome =>
    ran.threw !== undefined ? { threw: ran.threw } : { value: shown(ran.value) };

  /**
   * The native arm. Probe (iii) replaces its body with
   * `row.observe(evaluator, row.source, options)`, the evaluator's own result,
   * so every row whose `today` differs from JavaScript's goes red: the arm is a
   * separate producer, and not the evaluator read twice.
   */
  const nativeArm = (row: Row, source: string, options: EvalKnownOptions): Outcome =>
    row.observe(nativeEngine, source, options);

  const dangerousProperty = (name: string) => `Access to dangerous property "${name}" is blocked for security reasons`;
  const dangerousFunction = 'Access to dangerous function "fetch" is blocked for security reasons';
  const contextWrite = 'Write to the evaluation context is blocked for security reasons';
  const nonObject = (type: string) => `Cannot set property on non-object: ${type}`;
  const copied = 'a write into the caseInsensitive copy';

  /** A class instance whose `g` is an accessor on its prototype, logging each call. */
  const accessorInstance = (log: string[], initial: unknown): object => {
    let held = initial;
    class C {
      get g(): unknown { log.push('get g'); return held; }
      set g(value: unknown) { log.push(`set g=${String(value)}`); held = value; }
    }
    return new C();
  };

  /**
   * An accessor on the context itself, `name` holding `initial`, counting its
   * calls once armed. Under `caseInsensitive` the copy reads it before the walk,
   * so the counts start after the context is built.
   */
  const contextAccessor = (name: string, initial: unknown): Observe => (engine, source, options) => {
    const counts = { get: 0, set: 0 };
    let held = initial;
    let armed = false;
    const data: Record<string, unknown> = {};
    Object.defineProperty(data, name, {
      get: () => { counts.get += armed ? 1 : 0; return held; },
      set: (value: unknown) => { counts.set += armed ? 1 : 0; held = value; },
      enumerable: true,
      configurable: true,
    });
    const ran = engine.run(source, data, options, () => { armed = true; });
    return { ...outcome(ran), ...counts };
  };

  // --- E (M1a): getters, setters, calls and order ---------------------------

  /**
   * `o.g` an own accessor holding `initial`; `t` a proxy over `{ x: 10 }`
   * logging `get` and `set`; `getObj` returning `t`, `k` returning `'x'` and `f`
   * returning `5`, each logging its call.
   */
  const effects = (initial: number): Observe => (engine, source, options) => {
    const log: string[] = [];
    let held: unknown = initial;
    const o = {
      get g(): unknown { log.push('get g'); return held; },
      set g(value: unknown) { log.push(`set g=${String(value)}`); held = value; },
    };
    const t = new Proxy({ x: 10 } as Record<string, unknown>, {
      get: (target, key, receiver) => {
        if (typeof key === 'string') {
          log.push(`get ${key}`);
        }
        return Reflect.get(target, key, receiver);
      },
      set: (target, key, value, receiver) => {
        log.push(`set ${String(key)}=${String(value)}`);
        return Reflect.set(target, key, value, receiver);
      },
    });
    const getObj = () => { log.push('getObj'); return t; };
    const k = () => { log.push('k'); return 'x'; };
    const f = () => { log.push('f'); return 5; };
    const ran = engine.run(source, { o, t, getObj, k, f }, options);
    return { ...outcome(ran), log };
  };

  const E: Row[] = [
    {
      source: 'o.g = 1', observe: effects(1),
      today: both({ value: 1, log: ['get g', 'get g', 'set g=1'] }),
      js: both(native({ value: 1, log: ['set g=1'] })),
      flips: both(3),
    },
    {
      source: 'o.g += 1', observe: effects(1),
      today: both({ value: 2, log: ['get g', 'set g=2'] }),
      js: both(native({ value: 2, log: ['get g', 'set g=2'] })),
    },
    {
      source: 'o.g &&= 1', observe: effects(1),
      today: both({ value: 1, log: ['get g', 'set g=1'] }),
      js: both(native({ value: 1, log: ['get g', 'set g=1'] })),
    },
    {
      source: 'o.g ||= 1', observe: effects(0),
      today: both({ value: 1, log: ['get g', 'set g=1'] }),
      js: both(native({ value: 1, log: ['get g', 'set g=1'] })),
    },
    {
      source: 'o.g ??= 1', observe: effects(1),
      today: both({ value: 1, log: ['get g'] }),
      js: both(native({ value: 1, log: ['get g'] })),
    },
    {
      source: 'getObj().x = 1', observe: effects(1),
      today: both({ value: 1, log: ['getObj', 'get x', 'getObj', 'get x', 'set x=1'] }),
      js: both(native({ value: 1, log: ['getObj', 'set x=1'] })),
      flips: both(3),
    },
    {
      source: 't[k()] = f()', observe: effects(1),
      today: both({ value: 5, log: ['k', 'get x', 'f', 'k', 'get x', 'set x=5'] }),
      js: both(native({ value: 5, log: ['k', 'f', 'set x=5'] })),
      flips: both(3),
    },
    {
      source: 'getObj()[k()] = f()', observe: effects(1),
      today: both({ value: 5, log: ['getObj', 'k', 'get x', 'f', 'getObj', 'k', 'get x', 'set x=5'] }),
      js: both(native({ value: 5, log: ['getObj', 'k', 'f', 'set x=5'] })),
      flips: both(3),
    },
    {
      source: 'getObj()[k()] += f()', observe: effects(1),
      today: both({ value: 15, log: ['getObj', 'k', 'get x', 'f', 'set x=15'] }),
      js: both(native({ value: 15, log: ['getObj', 'k', 'get x', 'f', 'set x=15'] })),
    },
    {
      source: 'getObj()[k()] ||= f()', observe: effects(1),
      today: both({ value: 10, log: ['getObj', 'k', 'get x'] }),
      js: both(native({ value: 10, log: ['getObj', 'k', 'get x'] })),
    },
    {
      source: 'getObj()[k()] &&= f()', observe: effects(1),
      today: both({ value: 5, log: ['getObj', 'k', 'get x', 'f', 'set x=5'] }),
      js: both(native({ value: 5, log: ['getObj', 'k', 'get x', 'f', 'set x=5'] })),
    },
    {
      source: 'getObj().x++', observe: effects(1),
      today: both({ value: 10, log: ['getObj', 'get x', 'set x=11'] }),
      js: both(native({ value: 10, log: ['getObj', 'get x', 'set x=11'] })),
    },
  ];

  // --- F (M1b): a listed function as the target -----------------------------

  /**
   * `fetch`, and `obj.fetch`, a listed function. jsdom has no global `fetch`,
   * so it is one bound under the listed name, which the funnel refuses by its
   * name, as part 1's pin does. `fetch ||= 1` is not here: part 1 pins it.
   */
  const funnelled: Observe = (engine, source, options) => {
    const listed = function fetch(): void { return undefined; }.bind(null);
    const obj: Record<string, unknown> = { fetch: listed };
    const shown = (value: unknown) => value === listed ? 'the listed function' : value;
    const ran = engine.run(source, { fetch: listed, obj }, options);
    return { ...outcome(ran, shown), fetch: shown(ran.read('fetch')), objFetch: shown(obj['fetch']) };
  };

  const listed = 'the listed function';
  const listedPlusOne = 'function () { [native code] }1';

  const F: Row[] = [
    {
      source: 'fetch = 1', observe: funnelled,
      today: both({ threw: dangerousFunction, fetch: listed, objFetch: listed }),
      js: both(native({ value: 1, fetch: 1, objFetch: listed })),
      flips: both(3),
    },
    {
      source: 'obj.fetch = 1', observe: funnelled,
      today: both({ threw: dangerousFunction, fetch: listed, objFetch: listed }),
      js: both(native({ value: 1, fetch: listed, objFetch: 1 })),
      flips: both(3),
    },
    {
      source: 'fetch += 1', observe: funnelled,
      today: both({ threw: dangerousFunction, fetch: listed, objFetch: listed }),
      js: both(native({ value: listedPlusOne, fetch: listedPlusOne, objFetch: listed })),
      design: both('the funnel'),
    },
    {
      source: 'obj.fetch += 1', observe: funnelled,
      today: both({ threw: dangerousFunction, fetch: listed, objFetch: listed }),
      js: both(native({ value: listedPlusOne, fetch: listed, objFetch: listedPlusOne })),
      design: both('the funnel'),
    },
    {
      source: 'obj.fetch ||= 1', observe: funnelled,
      today: both({ threw: dangerousFunction, fetch: listed, objFetch: listed }),
      js: both(native({ value: listed, fetch: listed, objFetch: listed })),
      design: both('the funnel'),
    },
    {
      source: 'obj.fetch &&= 1', observe: funnelled,
      today: both({ threw: dangerousFunction, fetch: listed, objFetch: listed }),
      js: both(native({ value: 1, fetch: listed, objFetch: 1 })),
      design: both('the funnel'),
    },
    {
      source: 'fetch++', observe: funnelled,
      today: both({ value: NaN, fetch: NaN, objFetch: listed }),
      js: both(native({ value: NaN, fetch: NaN, objFetch: listed })),
    },
    {
      source: 'obj.fetch++', observe: funnelled,
      today: both({ value: NaN, fetch: listed, objFetch: NaN }),
      js: both(native({ value: NaN, fetch: listed, objFetch: NaN })),
    },
  ];

  // --- B (M1c, M8a-M8c): blocklisted names, the resolver's edges -----------

  /**
   * `o` an empty object, `s` a string, `n` `null`, `u` `undefined`, `fn` a
   * function with an own `x`, and `f` returning `5` and counting its calls.
   * `keys` is the store's keys, and `caller` the caller's own object's: the
   * same object case-sensitive, and under `caseInsensitive` the object the
   * copy was made from.
   */
  const blocked: Observe = (engine, source, options) => {
    const o: Record<string, unknown> = {};
    const fn = Object.assign(() => undefined, { x: 1 });
    const f = Object.assign(() => { f.calls += 1; return 5; }, { calls: 0 });
    const data: Record<string, unknown> = { o, s: 'str', n: null, u: undefined, fn, f };
    const ran = engine.run(source, data, options);
    return {
      ...outcome(ran), calls: f.calls, o: Object.keys(o), fn: Object.keys(fn), keys: ran.keys(), caller: Object.keys(data),
    };
  };

  const keys = ['o', 's', 'n', 'u', 'fn', 'f'];
  const untouched = { calls: 0, o: [], fn: ['x'], keys, caller: keys };
  /** `name` written onto the caller's object, which is the store. */
  const wrote = (name: string) => ({ keys: [...keys, name], caller: [...keys, name] });
  /** `name` written into the `caseInsensitive` copy, and the caller's object left as it was. */
  const intoCopy = (name: string) => ({ keys: [...keys, name], caller: keys });

  const B: Row[] = [
    {
      source: 'constructor = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: 1, ...wrote('constructor') })),
      design: both('the blocklist'),
    },
    {
      source: '__proto__ = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('__proto__') }),
      js: both(native({ ...untouched, value: 1 })),
      design: both('the blocklist'),
    },
    {
      source: 'toString = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('toString') }),
      js: both(native({ ...untouched, value: 1, ...wrote('toString') })),
      design: both('the blocklist'),
    },
    {
      source: 'constructor += 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: 'function Object() { [native code] }1', ...wrote('constructor') })),
      design: both('the blocklist'),
    },
    {
      source: 'o.constructor = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: 1, o: ['constructor'] })),
      design: both('the blocklist'),
    },
    {
      source: 'o.__proto__ = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('__proto__') }),
      js: both(native({ ...untouched, value: 1 })),
      design: both('the blocklist'),
    },
    {
      source: 'o["__proto__"] = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('__proto__') }),
      js: both(native({ ...untouched, value: 1 })),
      design: both('the blocklist'),
    },
    {
      source: 'o.constructor++', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: NaN, o: ['constructor'] })),
      design: both('the blocklist'),
    },
    {
      // Writes onto the caller's object case-sensitive, and into the copy
      // under `caseInsensitive`. Step 3 refuses it (D8), by design after.
      source: 'constructor++', observe: blocked,
      today: {
        cs: { ...untouched, value: NaN, ...wrote('constructor') },
        ci: { ...untouched, value: NaN, ...intoCopy('constructor') },
      },
      js: both(native({ ...untouched, value: NaN, ...wrote('constructor') })),
      flips: both(3),
      design: { cs: 'the blocklist, from step 3', ci: `${copied}; the blocklist, from step 3` },
    },
    {
      // The caller's object is unchanged in both modes, as `caller` asserts.
      // Under `caseInsensitive` the copy is a `Registry`, which takes
      // `__proto__` as a map key like any other.
      source: '__proto__++', observe: blocked,
      today: { cs: { ...untouched, value: NaN }, ci: { ...untouched, value: NaN, ...intoCopy('__proto__') } },
      js: both(native({ ...untouched, value: NaN })),
      flips: both(3),
      design: { cs: 'the blocklist, from step 3', ci: `${copied}; the blocklist, from step 3` },
    },
    {
      source: 'toString++', observe: blocked,
      today: {
        cs: { ...untouched, value: NaN, ...wrote('toString') },
        ci: { ...untouched, value: NaN, ...intoCopy('toString') },
      },
      js: both(native({ ...untouched, value: NaN, ...wrote('toString') })),
      flips: both(3),
      design: { cs: 'the blocklist, from step 3', ci: `${copied}; the blocklist, from step 3` },
    },
    {
      // Not a blocklisted name, and the copy holds no `constructor` to match.
      source: 'CONSTRUCTOR = 1', observe: blocked,
      today: {
        cs: { ...untouched, value: 1, ...wrote('CONSTRUCTOR') },
        ci: { ...untouched, value: 1, ...intoCopy('CONSTRUCTOR') },
      },
      js: both(native({ ...untouched, value: 1, ...wrote('CONSTRUCTOR') })),
      design: { ci: copied },
    },
    {
      // Under `caseInsensitive` the lookup matches `constructor` on the
      // prototype, and the resolved-key check refuses it.
      source: 'o.CONSTRUCTOR = 1', observe: blocked, nativeAs: 'o.constructor = 1',
      today: {
        cs: { ...untouched, value: 1, o: ['CONSTRUCTOR'] },
        ci: { ...untouched, threw: dangerousProperty('constructor') },
      },
      js: {
        cs: native({ ...untouched, value: 1, o: ['CONSTRUCTOR'] }),
        ci: native({ ...untouched, value: 1, o: ['constructor'] }),
      },
      design: { ci: 'the resolved-key check' },
    },
    {
      source: 's.constructor = 1', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: 1 })),
      design: both('the primitive blocklist'),
    },
    {
      source: 's.x = 1', observe: blocked,
      today: both({ ...untouched, threw: nonObject('string') }),
      js: both(native({ ...untouched, value: 1 })),
      design: both("safeSetProperty's message"),
    },
    {
      // Under `caseInsensitive` `n` read as `undefined` up to 0.13.3, so the
      // message said `undefined` there (A52). It reads as `null` in both modes.
      source: 'n.x = 1', observe: blocked,
      today: both({ ...untouched, threw: nonObject('object') }),
      js: both(native({ ...untouched, threw: "Cannot set properties of null (setting 'x')" })),
      design: both("safeSetProperty's message"),
    },
    {
      source: 'u.x = 1', observe: blocked,
      today: both({ ...untouched, threw: nonObject('undefined') }),
      js: both(native({ ...untouched, threw: "Cannot set properties of undefined (setting 'x')" })),
      design: both("safeSetProperty's message"),
    },
    {
      // A function's key is never matched, on the read path either: the
      // lookup runs for an object only. So `X` is created beside `x` in both
      // modes, and the native arm is the row's own source.
      source: 'fn.X = 1', observe: blocked,
      today: both({ ...untouched, value: 1, fn: ['x', 'X'] }),
      js: both(native({ ...untouched, value: 1, fn: ['x', 'X'] })),
    },
    {
      source: 'o.__proto__ = f()', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('__proto__') }),
      js: both(native({ ...untouched, value: 5, calls: 1 })),
      design: both('the blocklist, before the right side'),
    },
    {
      source: 'o.constructor = f()', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: 5, calls: 1, o: ['constructor'] })),
      design: both('the blocklist, before the right side'),
    },
    {
      source: 'this.constructor = f()', observe: blocked,
      today: both({ ...untouched, threw: dangerousProperty('constructor') }),
      js: both(native({ ...untouched, value: 5, calls: 1, ...wrote('constructor') })),
      design: both('the blocklist, before the right side'),
    },
  ];

  // --- A (M1e, M1f's c.G = 1): the key a member write reaches ---------------

  /** `obj` holding `x`, and `c` an instance with a prototype accessor `g`. */
  const matched: Observe = (engine, source, options) => {
    const log: string[] = [];
    const obj: Record<string, unknown> = { x: 1 };
    const c = accessorInstance(log, 1);
    const ran = engine.run(source, { obj, c }, options);
    return { ...outcome(ran), obj: { ...obj }, c: Object.keys(c), log };
  };

  const plain = { obj: { x: 1 }, c: [], log: [] };
  const created = { ...plain, obj: { x: 1, X: 2 } };
  const corrected = { ...plain, obj: { x: 2 } };
  const readUndefined = "Cannot read properties of undefined (reading 'X')";

  const A: Row[] = [
    {
      source: 'OBJ.X = 2', observe: matched, nativeAs: 'obj.x = 2',
      today: { cs: { ...plain, threw: nonObject('undefined') }, ci: { ...created, value: 2 } },
      js: {
        cs: native({ ...plain, threw: "Cannot set properties of undefined (setting 'X')" }),
        ci: native({ ...corrected, value: 2 }),
      },
      flips: { ci: 3 },
      design: { cs: "safeSetProperty's message" },
    },
    {
      source: 'obj.X = 2', observe: matched, nativeAs: 'obj.x = 2',
      today: both({ ...created, value: 2 }),
      js: { cs: native({ ...created, value: 2 }), ci: native({ ...corrected, value: 2 }) },
      flips: { ci: 3 },
    },
    {
      source: 'obj["X"] = 2', observe: matched, nativeAs: 'obj["x"] = 2',
      today: both({ ...created, value: 2 }),
      js: { cs: native({ ...created, value: 2 }), ci: native({ ...corrected, value: 2 }) },
      flips: { ci: 3 },
    },
    {
      source: 'OBJ.X += 1', observe: matched, nativeAs: 'obj.x += 1',
      today: { cs: { ...plain, threw: nonObject('undefined') }, ci: { ...created, value: 2 } },
      js: { cs: native({ ...plain, threw: readUndefined }), ci: native({ ...corrected, value: 2 }) },
      flips: { ci: 3 },
      design: { cs: "safeSetProperty's message" },
    },
    {
      source: '++OBJ.X', observe: matched, nativeAs: '++obj.x',
      today: { cs: { ...plain, threw: nonObject('undefined') }, ci: { ...created, value: 2 } },
      js: { cs: native({ ...plain, threw: readUndefined }), ci: native({ ...corrected, value: 2 }) },
      flips: { ci: 3 },
      design: { cs: "safeSetProperty's message" },
    },
    {
      source: 'OBJ.X++', observe: matched, nativeAs: 'obj.x++',
      today: { cs: { ...plain, threw: nonObject('undefined') }, ci: { ...created, value: 1 } },
      js: { cs: native({ ...plain, threw: readUndefined }), ci: native({ ...corrected, value: 1 }) },
      flips: { ci: 3 },
      design: { cs: "safeSetProperty's message" },
    },
    {
      source: 'obj.X &&= 2', observe: matched, nativeAs: 'obj.x &&= 2',
      today: { cs: { ...plain, value: undefined }, ci: { ...created, value: 2 } },
      js: { cs: native({ ...plain, value: undefined }), ci: native({ ...corrected, value: 2 }) },
      flips: { ci: 3 },
    },
    {
      source: 'obj.X ||= 2', observe: matched, nativeAs: 'obj.x ||= 2',
      today: { cs: { ...created, value: 2 }, ci: { ...plain, value: 1 } },
      js: { cs: native({ ...created, value: 2 }), ci: native({ ...plain, value: 1 }) },
    },
    {
      source: 'obj.Y = 2', observe: matched,
      today: both({ ...plain, value: 2, obj: { x: 1, Y: 2 } }),
      js: both(native({ ...plain, value: 2, obj: { x: 1, Y: 2 } })),
    },
    {
      source: 'c.G = 1', observe: matched, nativeAs: 'c.g = 1',
      today: {
        cs: { ...plain, value: 1, c: ['G'] },
        ci: { ...plain, value: 1, c: ['G'], log: ['get g', 'get g'] },
      },
      js: {
        cs: native({ ...plain, value: 1, c: ['G'] }),
        ci: native({ ...plain, value: 1, log: ['set g=1'] }),
      },
      flips: { ci: 3 },
    },
    {
      source: 'obj.x = 2', observe: matched,
      today: both({ ...corrected, value: 2 }),
      js: both(native({ ...corrected, value: 2 })),
    },
  ];

  // --- R (M2): read events, node hooks and the trace ------------------------

  /**
   * Reads as `kind:key@path`, the dependency set, the node-hook sequence and
   * the trace's types, `Program` and `ExpressionStatement` left out.
   */
  const observed = (make: () => Record<string, unknown>): Observe => (engine, source, options) => {
    const reads: string[] = [];
    const nodes: string[] = [];
    const tracker = createDependencyTracker();
    let traced: EvalState | undefined;
    const kept = (type: string) => type !== 'Program' && type !== 'ExpressionStatement';
    const ran = engine.run(source, make(), options, (_context, state) => {
      if (!state) {
        return;
      }
      traced = state;
      state.hooks.onRead(event =>
        reads.push(`${event.kind}:${String(event.key)}@${event.path ?? '-'}${event.scoped ? ' scoped' : ''}`));
      state.hooks.on('before', '*', event => { if (kept(event.node.type)) nodes.push(`before ${event.node.type}`); });
      state.hooks.on('after', '*', event => { if (kept(event.node.type)) nodes.push(`after ${event.node.type}`); });
      tracker.install(state.hooks);
    });
    const trace = Array.from(traced?.result.trace ?? [], item => item.type).filter(kept);
    return { ...outcome(ran), reads, dependencies: [...tracker.dependencies], nodes, trace };
  };

  const onX = observed(() => ({ x: 0 }));
  const onAB = observed(() => ({ a: { b: 0 } }));
  const onABC = observed(() => ({ a: { b: { c: 0 } } }));
  const onAK = observed(() => ({ a: { b: 0 }, k: 'b' }));
  const noHooks = none('read events, node hooks and the trace are the evaluator\'s own; the plan\'s § 3.6 makes M2\'s prototype column the contract');

  const identifierWalked = {
    reads: ['identifier:x@x'],
    dependencies: ['x'],
    nodes: ['before AssignmentExpression', 'before Identifier', 'after Identifier',
      'before Literal', 'after Literal', 'after AssignmentExpression'],
    trace: ['Identifier', 'Literal', 'AssignmentExpression'],
  };
  const identifierUpdated = {
    reads: [],
    dependencies: [],
    nodes: ['before UpdateExpression', 'after UpdateExpression'],
    trace: ['UpdateExpression'],
  };
  const memberWalkedTwice = {
    reads: ['identifier:a@a', 'member:b@a.b', 'identifier:a@a', 'member:b@a.b'],
    dependencies: ['a', 'a.b'],
    nodes: ['before AssignmentExpression', 'before MemberExpression', 'before Identifier', 'after Identifier',
      'after MemberExpression', 'before Literal', 'after Literal', 'before Identifier', 'after Identifier',
      'after AssignmentExpression'],
    trace: ['Identifier', 'MemberExpression', 'Literal', 'Identifier', 'AssignmentExpression'],
  };
  const chainWalkedTwice = {
    reads: ['identifier:a@a', 'member:b@a.b', 'member:c@a.b.c', 'identifier:a@a', 'member:b@a.b', 'member:c@a.b.c'],
    dependencies: ['a', 'a.b', 'a.b.c'],
    nodes: ['before AssignmentExpression', 'before MemberExpression', 'before MemberExpression',
      'before Identifier', 'after Identifier', 'after MemberExpression', 'after MemberExpression',
      'before Literal', 'after Literal', 'before MemberExpression', 'before Identifier', 'after Identifier',
      'after MemberExpression', 'after AssignmentExpression'],
    trace: ['Identifier', 'MemberExpression', 'MemberExpression', 'Literal', 'Identifier', 'MemberExpression',
      'AssignmentExpression'],
  };
  const computedWalkedTwice = {
    reads: ['identifier:a@a', 'identifier:k@k', 'member:b@-', 'identifier:a@a', 'identifier:k@k', 'member:b@-'],
    dependencies: ['a', 'k'],
    nodes: ['before AssignmentExpression', 'before MemberExpression', 'before Identifier', 'after Identifier',
      'before Identifier', 'after Identifier', 'after MemberExpression', 'before Literal', 'after Literal',
      'before Identifier', 'after Identifier', 'before Identifier', 'after Identifier',
      'after AssignmentExpression'],
    trace: ['Identifier', 'Identifier', 'MemberExpression', 'Literal', 'Identifier', 'Identifier',
      'AssignmentExpression'],
  };
  /** A compound target read once and not walked: M2's prototype column. */
  const identifierRead = {
    reads: ['identifier:x@x'],
    dependencies: ['x'],
    nodes: ['before AssignmentExpression', 'before Literal', 'after Literal', 'after AssignmentExpression'],
    trace: ['Literal', 'AssignmentExpression'],
  };
  const memberReadOnce = {
    reads: ['identifier:a@a', 'member:b@a.b'],
    dependencies: ['a', 'a.b'],
    nodes: ['before AssignmentExpression', 'before Identifier', 'after Identifier', 'before Literal',
      'after Literal', 'after AssignmentExpression'],
    trace: ['Identifier', 'Literal', 'AssignmentExpression'],
  };
  const chainReadOnce = {
    reads: ['identifier:a@a', 'member:b@a.b', 'member:c@a.b.c'],
    dependencies: ['a', 'a.b', 'a.b.c'],
    nodes: ['before AssignmentExpression', 'before MemberExpression', 'before Identifier', 'after Identifier',
      'after MemberExpression', 'before Literal', 'after Literal', 'after AssignmentExpression'],
    trace: ['Identifier', 'MemberExpression', 'Literal', 'AssignmentExpression'],
  };
  const computedReadOnce = {
    reads: ['identifier:a@a', 'identifier:k@k', 'member:b@-'],
    dependencies: ['a', 'k'],
    nodes: ['before AssignmentExpression', 'before Identifier', 'after Identifier', 'before Identifier',
      'after Identifier', 'before Literal', 'after Literal', 'after AssignmentExpression'],
    trace: ['Identifier', 'Identifier', 'Literal', 'AssignmentExpression'],
  };

  const R: Row[] = [
    { source: 'x = 1', observe: onX, today: both({ value: 1, ...identifierWalked }), js: both(noHooks), flips: both(3) },
    { source: 'x += 1', observe: onX, today: both({ value: 1, ...identifierRead }), js: both(noHooks) },
    { source: 'x ||= 1', observe: onX, today: both({ value: 1, ...identifierRead }), js: both(noHooks) },
    { source: 'x++', observe: onX, today: both({ value: 0, ...identifierUpdated }), js: both(noHooks), flips: both(3) },
    { source: '++x', observe: onX, today: both({ value: 1, ...identifierUpdated }), js: both(noHooks), flips: both(3) },
    { source: 'a.b = 1', observe: onAB, today: both({ value: 1, ...memberWalkedTwice }), js: both(noHooks), flips: both(3) },
    { source: 'a.b += 1', observe: onAB, today: both({ value: 1, ...memberReadOnce }), js: both(noHooks) },
    { source: 'a.b ||= 1', observe: onAB, today: both({ value: 1, ...memberReadOnce }), js: both(noHooks) },
    {
      source: 'a.b++', observe: onAB,
      today: both({
        value: 0,
        reads: ['identifier:a@a', 'member:b@a.b'],
        dependencies: ['a', 'a.b'],
        nodes: ['before UpdateExpression', 'before Identifier', 'after Identifier', 'after UpdateExpression'],
        trace: ['Identifier', 'UpdateExpression'],
      }),
      js: both(noHooks),
    },
    { source: 'a.b.c = 1', observe: onABC, today: both({ value: 1, ...chainWalkedTwice }), js: both(noHooks), flips: both(3) },
    { source: 'a.b.c += 1', observe: onABC, today: both({ value: 1, ...chainReadOnce }), js: both(noHooks) },
    {
      source: 'a.b.c++', observe: onABC,
      today: both({
        value: 0,
        reads: ['identifier:a@a', 'member:b@a.b', 'member:c@a.b.c'],
        dependencies: ['a', 'a.b', 'a.b.c'],
        nodes: ['before UpdateExpression', 'before MemberExpression', 'before Identifier', 'after Identifier',
          'after MemberExpression', 'after UpdateExpression'],
        trace: ['Identifier', 'MemberExpression', 'UpdateExpression'],
      }),
      js: both(noHooks),
    },
    { source: 'a[k] = 1', observe: onAK, today: both({ value: 1, ...computedWalkedTwice }), js: both(noHooks), flips: both(3) },
    { source: 'a[k] += 1', observe: onAK, today: both({ value: 1, ...computedReadOnce }), js: both(noHooks) },
    {
      source: 'this.x = 1', observe: onX,
      today: both({
        value: 1,
        reads: ['member:x@-', 'member:x@-'],
        dependencies: [],
        nodes: ['before AssignmentExpression', 'before MemberExpression', 'before ThisExpression',
          'after ThisExpression', 'after MemberExpression', 'before Literal', 'after Literal',
          'before ThisExpression', 'after ThisExpression', 'after AssignmentExpression'],
        trace: ['ThisExpression', 'MemberExpression', 'Literal', 'ThisExpression', 'AssignmentExpression'],
      }),
      js: both(noHooks),
      flips: both(3),
    },
    {
      source: 'y = x', observe: observed(() => ({ x: 0, y: 0 })),
      today: both({
        value: 0,
        reads: ['identifier:y@y', 'identifier:x@x'],
        dependencies: ['y', 'x'],
        nodes: ['before AssignmentExpression', 'before Identifier', 'after Identifier', 'before Identifier',
          'after Identifier', 'after AssignmentExpression'],
        trace: ['Identifier', 'Identifier', 'AssignmentExpression'],
      }),
      js: both(noHooks),
      flips: both(3),
    },
  ];

  // --- S (M1d, M1h): `this.k`, and an `EvalScope` held as a value ------------

  /**
   * The context holds `k`. `stray` is an own `k` on the `caseInsensitive` copy,
   * beside its map, and `caller` the `k` of the caller's own object.
   */
  const throughThis: Observe = (engine, source, options) => {
    const data: Record<string, unknown> = { k: 1 };
    const ran = engine.run(source, data, options);
    return { ...outcome(ran), k: ran.read('k'), K: ran.read('K'), stray: ran.stray('k'), caller: data['k'] };
  };

  /**
   * The context holds `ns`, a global `EvalScope` over `{ k: 1 }`. `later` is
   * `ns.k` run afterwards on the same context, and `own` whether the write
   * left an own `k` on the instance. Natively the instance is all there is.
   */
  const throughScope: Observe = (engine, source, options) => {
    const ns = new EvalScope({ k: 1 }, { global: true });
    const ran = engine.run(source, { ns }, options);
    return { ...outcome(ran), later: ran.later('ns.k'), own: Object.prototype.hasOwnProperty.call(ns, 'k') };
  };

  const toData = { k: 1, K: undefined, stray: false, caller: 1 };
  const toCopy = { k: 1, K: 1, stray: true, caller: 1 };

  const S: Row[] = [
    {
      source: 'this.k = 5', observe: throughThis,
      today: { cs: { ...toData, value: 5, k: 5, caller: 5 }, ci: { ...toCopy, value: 5 } },
      js: both(native({ ...toData, value: 5, k: 5, caller: 5 })),
      held: { ci: { under: 'A50', after: { ...toCopy, value: 5 } } },
    },
    {
      source: 'this.k += 5', observe: throughThis,
      today: { cs: { ...toData, value: 6, k: 6, caller: 6 }, ci: { ...toCopy, value: 6 } },
      js: both(native({ ...toData, value: 6, k: 6, caller: 6 })),
      held: { ci: { under: 'A50', after: { ...toCopy, value: 6 } } },
    },
    {
      source: 'this.K = 5', observe: throughThis, nativeAs: 'this.k = 5',
      today: { cs: { ...toData, threw: contextWrite }, ci: { ...toCopy, value: 5 } },
      js: { cs: native({ ...toData, value: 5, K: 5 }), ci: native({ ...toData, value: 5, k: 5, caller: 5 }) },
      held: { ci: { under: 'A50', after: { ...toCopy, value: 5 } } },
      design: { cs: 'A42, a write to the context' },
    },
    {
      source: 'this.k++', observe: throughThis,
      today: { cs: { ...toData, value: 1, k: 2, caller: 2 }, ci: { ...toCopy, value: 1 } },
      js: both(native({ ...toData, value: 1, k: 2, caller: 2 })),
      held: { ci: { under: 'A50', after: { ...toCopy, value: 1 } } },
    },
    {
      source: 'this.z = 5', observe: throughThis,
      today: { cs: { ...toData, threw: contextWrite }, ci: { ...toCopy, stray: false, threw: contextWrite } },
      js: both(native({ ...toData, value: 5 })),
      design: both('A42, a write to the context'),
    },
    {
      source: 'ns.k = 5', observe: throughScope,
      today: both({ value: 5, later: 1, own: true }),
      js: both(native({ value: 5, later: 5, own: true })),
      held: both({ under: 'A51', after: { value: 5, later: 1, own: true } }),
    },
    {
      source: 'ns.k += 5', observe: throughScope,
      today: both({ value: 6, later: 1, own: true }),
      js: both(native({ value: NaN, later: NaN, own: true })),
      held: both({ under: 'A51', after: { value: 6, later: 1, own: true } }),
    },
  ];

  // --- G (M1g): an identifier target with an accessor on the context --------

  const onAccessorX = contextAccessor('x', 0);

  const G: Row[] = [
    {
      source: 'x = 1', observe: onAccessorX,
      today: { cs: { value: 1, get: 1, set: 1 }, ci: { value: 1, get: 0, set: 0 } },
      js: both(native({ value: 1, get: 0, set: 1 })),
      flips: { cs: 3 },
      design: { ci: copied },
    },
    {
      source: 'x += 1', observe: onAccessorX,
      today: { cs: { value: 1, get: 1, set: 1 }, ci: { value: 1, get: 0, set: 0 } },
      js: both(native({ value: 1, get: 1, set: 1 })),
      design: { ci: copied },
    },
    {
      source: 'x ||= 1', observe: onAccessorX,
      today: { cs: { value: 1, get: 1, set: 1 }, ci: { value: 1, get: 0, set: 0 } },
      js: both(native({ value: 1, get: 1, set: 1 })),
      design: { ci: copied },
    },
    {
      source: 'x++', observe: onAccessorX,
      today: { cs: { value: 0, get: 1, set: 1 }, ci: { value: 0, get: 0, set: 0 } },
      js: both(native({ value: 0, get: 1, set: 1 })),
      design: { ci: copied },
    },
  ];

  // --- P (M1f): a prototype accessor -----------------------------------------

  const onInstance: Observe = (engine, source, options) => {
    const log: string[] = [];
    const ran = engine.run(source, { c: accessorInstance(log, 1) }, options);
    return { ...outcome(ran), log };
  };

  const P: Row[] = [
    {
      source: 'c.g', observe: onInstance,
      today: { cs: { value: 1, log: ['get g'] }, ci: { value: 1, log: ['get g', 'get g'] } },
      js: both(native({ value: 1, log: ['get g'] })),
      held: { ci: { under: 'A48', after: { value: 1, log: ['get g', 'get g'] } } },
    },
    {
      source: 'c.g = 1', observe: onInstance,
      today: {
        cs: { value: 1, log: ['get g', 'get g', 'set g=1'] },
        ci: { value: 1, log: ['get g', 'get g', 'get g', 'get g', 'set g=1'] },
      },
      js: both(native({ value: 1, log: ['set g=1'] })),
      flips: both(3),
    },
    {
      source: 'c.g += 1', observe: onInstance,
      today: {
        cs: { value: 2, log: ['get g', 'set g=2'] },
        ci: { value: 2, log: ['get g', 'get g', 'set g=2'] },
      },
      js: both(native({ value: 2, log: ['get g', 'set g=2'] })),
      held: { ci: { under: 'A48', after: { value: 2, log: ['get g', 'get g', 'set g=2'] } } },
    },
    {
      source: 'c.g++', observe: onInstance,
      today: { cs: { value: 1, log: ['get g', 'set g=2'] }, ci: { value: 1, log: ['get g', 'get g', 'set g=2'] } },
      js: both(native({ value: 1, log: ['get g', 'set g=2'] })),
      held: { ci: { under: 'A48', after: { value: 1, log: ['get g', 'get g', 'set g=2'] } } },
    },
  ];

  // --- L (M1j): a lookup function answering the name --------------------------

  /**
   * The context is empty, and a lookup answers `x` and `X` with `0`, counting
   * its calls. A lookup is a resolver JavaScript has no counterpart for, so
   * the native arm stands an accessor in for it, on both spellings, counting
   * its reads: the calls JavaScript would make are the reads it makes.
   */
  const looked: Observe = (engine, source, options) => {
    let calls = 0;
    if (engine.native) {
      const data: Record<string, unknown> = {};
      for (const name of ['x', 'X']) {
        let held: unknown = 0;
        Object.defineProperty(data, name, {
          get: () => { calls += 1; return held; },
          set: (value: unknown) => { held = value; },
          enumerable: true,
        });
      }
      return { ...outcome(engine.run(source, data, options)), calls };
    }
    const ran = engine.run(source, {}, options, context => {
      context?.lookups.push(key => {
        calls += 1;
        return key === 'x' || key === 'X' ? 0 : undefined;
      });
    });
    return { ...outcome(ran), calls };
  };

  const L: Row[] = [
    {
      source: 'x = 1', observe: looked,
      today: { cs: { value: 1, calls: 1 }, ci: { value: 1, calls: 2 } },
      js: both(native({ value: 1, calls: 0 })),
      flips: both(3),
      held: { ci: { under: 'A49', after: { value: 1, calls: 1 } } },
    },
    {
      source: 'X = 1', observe: looked,
      today: { cs: { value: 1, calls: 1 }, ci: { value: 1, calls: 2 } },
      js: both(native({ value: 1, calls: 0 })),
      flips: both(3),
      held: { ci: { under: 'A49', after: { value: 1, calls: 1 } } },
    },
    {
      source: 'x += 1', observe: looked,
      today: { cs: { value: 1, calls: 1 }, ci: { value: 1, calls: 2 } },
      js: both(native({ value: 1, calls: 1 })),
      held: { ci: { under: 'A49', after: { value: 1, calls: 2 } } },
    },
  ];

  // --- C (M1j): an accessor on the context, through `this` ----------------------

  const onAccessorG = contextAccessor('g', 1);

  const C: Row[] = [
    {
      source: 'this.g = 1', observe: onAccessorG,
      today: { cs: { value: 1, get: 4, set: 1 }, ci: { value: 1, get: 0, set: 0 } },
      js: both(native({ value: 1, get: 0, set: 1 })),
      flips: { cs: 3 },
      held: {
        cs: { under: 'A49', after: { value: 1, get: 1, set: 1 } },
        ci: { under: 'A50', after: { value: 1, get: 0, set: 0 } },
      },
    },
    {
      source: 'g = 1', observe: onAccessorG,
      today: { cs: { value: 1, get: 1, set: 1 }, ci: { value: 1, get: 0, set: 0 } },
      js: both(native({ value: 1, get: 0, set: 1 })),
      flips: { cs: 3 },
      design: { ci: copied },
    },
    {
      source: 'this.g += 1', observe: onAccessorG,
      today: { cs: { value: 2, get: 2, set: 1 }, ci: { value: 2, get: 0, set: 0 } },
      js: both(native({ value: 2, get: 1, set: 1 })),
      held: {
        cs: { under: 'A49', after: { value: 2, get: 2, set: 1 } },
        ci: { under: 'A50', after: { value: 2, get: 0, set: 0 } },
      },
    },
  ];

  // --- N (M9, M11): an identifier holding `null` ------------------------------

  const onNull: Observe = (engine, source, options) => {
    const ran = engine.run(source, { x: null, o: { x: null } }, options);
    return { ...outcome(ran), x: ran.read('x') };
  };

  const N: Row[] = [
    {
      source: 'x += 1', observe: onNull,
      today: both({ value: 1, x: 1 }),
      js: both(native({ value: 1, x: 1 })),
    },
    {
      source: 'x++', observe: onNull,
      today: both({ value: 0, x: 1 }),
      js: both(native({ value: 0, x: 1 })),
    },
    {
      source: 'x === null', observe: onNull,
      today: both({ value: true, x: null }),
      js: both(native({ value: true, x: null })),
    },
  ];

  // --- T (M12): `this` as an identifier target ------------------------------

  /**
   * The row's source with `this` spelled `self` for the parser, which refuses
   * `this` as a target, and the target renamed back: an AST only a host builds.
   */
  const hostBuilt = (source: string): Program => {
    const program = programOf(source.replace('this', 'self')) as Program;
    const expression = (program.body[0] as ExpressionStatement).expression;
    const target = expression.type === 'UpdateExpression'
      ? expression.argument
      : (expression as AssignmentExpression).left;
    (target as Identifier).name = 'this';
    return program;
  };

  /**
   * The context is `{ k: 1 }`. `keys` is the store's keys, and `caller` the
   * caller's own object's, as group B reports them.
   */
  const thisTarget = (host: boolean): Observe => (engine, source, options) => {
    const data: Record<string, unknown> = { k: 1 };
    const ran = engine.run(host ? hostBuilt(source) : source, data, options);
    return { ...outcome(ran), keys: ran.keys(), caller: Object.keys(data) };
  };

  const thisRefused = 'Access to "this" outside a member access is blocked for security reasons';
  const alone = { keys: ['k'], caller: ['k'] };
  /** `name` written onto the caller's object, which is the store. */
  const beside = (name: string) => ({ keys: ['k', name], caller: ['k', name] });
  /** `name` written into the `caseInsensitive` copy, and the caller's object left as it was. */
  const besideInCopy = (name: string) => ({ keys: ['k', name], caller: ['k'] });
  const notATarget = none('`this` is not an assignment target in JavaScript: the parser refuses it');

  /**
   * Case-sensitive, `This` is an ordinary name. Under `caseInsensitive` it is
   * `this`, refused outside a member's object: by the operand walk today, and
   * by every identifier target path from steps 2 and 3 (D11). An update walks
   * nothing and refuses nothing up to 0.13.3. These marks are witnessed by
   * steps 2 and 3's probes, not by the pinned prototype, which predates D11.
   */
  const T: Row[] = [
    {
      source: 'This = 1', observe: thisTarget(false),
      today: { cs: { value: 1, ...beside('This') }, ci: { threw: thisRefused, ...alone } },
      js: both(native({ value: 1, ...beside('This') })),
      design: { ci: 'the this refusal' },
    },
    {
      source: 'This += 1', observe: thisTarget(false),
      today: { cs: { value: NaN, ...beside('This') }, ci: { threw: thisRefused, ...alone } },
      js: both(native({ value: NaN, ...beside('This') })),
      design: { ci: 'the this refusal' },
    },
    {
      source: 'This ||= 1', observe: thisTarget(false),
      today: { cs: { value: 1, ...beside('This') }, ci: { threw: thisRefused, ...alone } },
      js: both(native({ value: 1, ...beside('This') })),
      design: { ci: 'the this refusal' },
    },
    {
      source: 'This++', observe: thisTarget(false),
      today: { cs: { value: NaN, ...beside('This') }, ci: { value: NaN, ...besideInCopy('This') } },
      js: both(native({ value: NaN, ...beside('This') })),
      flips: { ci: 3 },
      design: { ci: `${copied}; the this refusal, from step 3` },
    },
    {
      source: '++This', observe: thisTarget(false),
      today: { cs: { value: NaN, ...beside('This') }, ci: { value: NaN, ...besideInCopy('This') } },
      js: both(native({ value: NaN, ...beside('This') })),
      flips: { ci: 3 },
      design: { ci: `${copied}; the this refusal, from step 3` },
    },
    {
      source: 'this = 1', observe: thisTarget(true),
      today: both({ threw: thisRefused, ...alone }),
      js: both(notATarget),
    },
    {
      source: 'this += 1', observe: thisTarget(true),
      today: both({ threw: thisRefused, ...alone }),
      js: both(notATarget),
    },
    {
      source: 'this++', observe: thisTarget(true),
      today: { cs: { value: NaN, ...beside('this') }, ci: { value: NaN, ...besideInCopy('this') } },
      js: both(notATarget),
      flips: both(3),
    },
  ];

  // --- V (step 2's review, W1): a foreign EvalContext as the target --------

  /**
   * `f`, and `o.f`, an `EvalContext` other than the walk's own, which the
   * funnel refuses wherever it is read. A compound or logical target is read
   * and not pushed from step 2, so these rows witness the funnel's context test
   * at that call site: a function test alone would let each one combine or
   * overwrite the context.
   */
  const foreignContext: Observe = (engine, source, options) => {
    const context = EvalContext.fromContext({ k: 1 }, {});
    const o: Record<string, unknown> = { f: context };
    const shown = (value: unknown) => value === context ? 'the foreign context' : value;
    const ran = engine.run(source, { f: context, o }, options);
    return { ...outcome(ran, shown), f: shown(ran.read('f')), oF: shown(o['f']) };
  };

  const foreign = 'the foreign context';
  const contextRead = 'Access to the evaluation context is blocked for security reasons';
  const foreignPlusOne = '[object Object]1';

  const V: Row[] = [
    {
      source: 'f += 1', observe: foreignContext,
      today: both({ threw: contextRead, f: foreign, oF: foreign }),
      js: both(native({ value: foreignPlusOne, f: foreignPlusOne, oF: foreign })),
      design: both('the funnel'),
    },
    {
      source: 'o.f += 1', observe: foreignContext,
      today: both({ threw: contextRead, f: foreign, oF: foreign }),
      js: both(native({ value: foreignPlusOne, f: foreign, oF: foreignPlusOne })),
      design: both('the funnel'),
    },
    {
      source: 'f &&= 2', observe: foreignContext,
      today: both({ threw: contextRead, f: foreign, oF: foreign }),
      js: both(native({ value: 2, f: 2, oF: foreign })),
      design: both('the funnel'),
    },
    {
      source: 'o.f &&= 2', observe: foreignContext,
      today: both({ threw: contextRead, f: foreign, oF: foreign }),
      js: both(native({ value: 2, f: foreign, oF: 2 })),
      design: both('the funnel'),
    },
  ];

  const GROUPS: [string, Row[]][] = [
    ['E (M1a): getters, setters, calls and order', E],
    ['F (M1b): a listed function as the target', F],
    ['B (M1c, M8a-M8c): blocklisted names and the resolver\'s edges', B],
    ['A (M1e, M1f): the key a member write reaches under caseInsensitive', A],
    ['R (M2): read events, node hooks and the trace', R],
    ['S (M1d, M1h): this.k, and an EvalScope held as a value', S],
    ['G (M1g): an identifier target with an accessor on the context', G],
    ['P (M1f): a prototype accessor', P],
    ['L (M1j): a lookup answering the name', L],
    ['C (M1j): an accessor on the context, through this', C],
    ['N (M9, M11): an identifier holding null', N],
    ['T (M12): this as an identifier target, written This or host-built', T],
    ['V (step 2, W1): a foreign EvalContext as a compound target', V],
  ];

  /** The row's source and its marks in `mode`, which name the case. */
  const title = (row: Row, mode: Mode): string => {
    const marks: string[] = [];
    const flips = row.flips?.[mode];
    const held = row.held?.[mode];
    const design = row.design?.[mode];
    if (flips) {
      marks.push(`flips at ${flips}`);
    }
    if (held) {
      marks.push(`held under ${held.under}`);
    }
    if (design) {
      marks.push(`design: ${design}`);
    }
    return [row.source, ...marks].join(' · ');
  };

  describe.each<[string, Mode, EvalKnownOptions]>([
    ['case-sensitive', 'cs', {}],
    ['caseInsensitive', 'ci', { caseInsensitive: true }],
  ])('%s', (_label, mode, options) => {

    describe.each(GROUPS)('%s', (_group, rows) => {

      it.each(rows.map(row => [title(row, mode), row] as [string, Row]))('%s', (_title, row) => {
        expect(row.observe(evaluator, row.source, options)).toEqual(row.today[mode]);

        const js = row.js[mode];
        if ('native' in js) {
          const source = mode === 'ci' && row.nativeAs ? row.nativeAs : row.source;
          expect(nativeArm(row, source, options)).toEqual(js.native);
        }
      });
    });
  });
});
