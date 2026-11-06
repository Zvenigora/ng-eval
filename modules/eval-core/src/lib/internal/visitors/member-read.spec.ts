import { AnyNode } from 'acorn';
import { EvalContext, EvalKnownOptions, EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * A characterisation of a member read: a getter's or a proxy trap's throw,
 * and how many times the read calls the object (`docs/backlog-retired.md`
 * A55 and A48; `docs/a48/plan.md` § 3.1 and § 8 q1).
 *
 * From 0.16.0 a throw from a getter or a proxy `get` trap reaches the caller,
 * as in JavaScript, in both case modes, where `safeGetProperty` read it as
 * `undefined` (A55); and under `caseInsensitive` a key that no own property
 * matches is tested with `in`, so an inherited accessor is read once where it
 * was read twice, and a proxy's `has` trap is called (A48). A key a proxy with
 * no `has` trap answers, but `in` misses, is then searched for a case variant
 * on its target's prototype, as `=` searches it: the variant is read, or
 * refused when it is a blocked name (step 2's carry-over, measured in step 3,
 * `docs/a48/plan.md` § 4). A null-ish object
 * still reads `undefined` by the early return. The `caseInsensitive` branch's
 * own `catch`, around its test of the key and its search of the prototype's
 * names, stays (§ 8 q1): it swallows a throw from a trap JavaScript's `x.k`
 * does not call, `has` and the prototype's `ownKeys`, and the read then falls
 * through to the `get` that JavaScript makes, whose throw reaches the caller.
 *
 * Every row runs in both case modes, each mode its own case, and carries per
 * mode `today`, the evaluator's outcome, and `js`, JavaScript's, checked
 * against a native run of the same source; `null` where JavaScript has no
 * counterpart, a case variant under `caseInsensitive`. A row whose `today`
 * differs from its `js` says why in `differs`, which is in the case's name.
 * Each run builds its own fixture (SR43). Expectations are recorded by hand,
 * from the plan's pinned measurements, and never computed from the
 * implementation.
 */
describe('a member read (A55, A48): a getter\'s throw, and one read', () => {

  type Mode = 'cs' | 'ci';
  type PerMode<T> = { cs: T; ci: T };
  type Outcome = Record<string, unknown>;

  /** A fixture: the data, what its accessors and traps logged, and what can be read of it afterwards. */
  interface Fixture {
    data: Record<string, unknown>;
    log: string[];
    /**
     * The value thrown by design. A throw of this very value is recorded as
     * `'boom'`; its message is another string, so a copy is told apart.
     */
    boom?: unknown;
    after?: () => Outcome;
  }

  interface Row {
    source: string;
    /** Names the fixture, where the source alone does not. */
    label?: string;
    fixture: () => Fixture;
    today: PerMode<Outcome>;
    js: PerMode<Outcome | null>;
    differs?: Partial<PerMode<string>>;
  }

  const both = <T>(value: T): PerMode<T> => ({ cs: value, ci: value });

  const run = (fixture: Fixture, go: () => unknown): Outcome => {
    let ran: Outcome;
    try {
      ran = { value: go() };
    } catch (error) {
      ran = { threw: error === fixture.boom ? 'boom' : error instanceof Error ? error.message : String(error) };
    }
    return { ...ran, log: fixture.log, ...fixture.after?.() };
  };

  const evaluator = (source: string, fixture: Fixture, options: EvalKnownOptions): Outcome => {
    const context = EvalContext.fromContext(fixture.data, options);
    const program = parse(source, { ecmaVersion: 2022, extractExpressions: false }) as AnyNode;
    return run(fixture, () => evaluate(program, EvalState.fromContext(context, options)));
  };

  /**
   * JavaScript's outcome: the source run by a direct `eval` in sloppy mode
   * under `with`, over a proxy that holds every name but `eval`, so a name
   * the data lacks reads as `undefined` and nothing reaches a global.
   */
  const native = (source: string, fixture: Fixture): Outcome => {
    const scope = new Proxy(fixture.data, { has: (_target, key) => typeof key === 'string' && key !== 'eval' });
    return run(fixture, () =>
      new Function('scope', `with (scope) { return eval(${JSON.stringify(source)}); }`).call(fixture.data, scope));
  };

  // --- A55: a getter's throw -------------------------------------------------

  /** `x.t`, a getter that logs and throws `boom`; own and enumerable, or on a class's prototype. */
  const throwing = (where: 'own' | 'inherited', boom: unknown = new Error('the getter threw')) => (): Fixture => {
    const log: string[] = [];
    const getter = { get(): never { log.push('get t'); throw boom; }, enumerable: true, configurable: true };
    const x = where === 'own'
      ? Object.defineProperty({}, 't', getter)
      : Object.create(Object.defineProperty({}, 't', getter));
    return { data: { x }, log, boom };
  };

  const thrown = { threw: 'boom', log: ['get t'] };

  const A55: Row[] = [
    ...(['own', 'inherited'] as const).flatMap((where): Row[] => [
      ...['x.t', 'x["t"]', 'x.t += 1', 'x.t++', 'x.t || 1', 'let {t} = x; 1'].map((source): Row => ({
        source, label: where, fixture: throwing(where), today: both(thrown), js: both(thrown),
      })),
      {
        // A case variant: case-sensitively a missing name, read nowhere;
        // under `caseInsensitive` the variant is matched and read once.
        source: 'x.T', label: where, fixture: throwing(where),
        today: { cs: { log: [] }, ci: thrown },
        js: { cs: { log: [] }, ci: null },
      },
    ]),
    {
      source: 'x.t', label: 'a throw that is not an Error', fixture: throwing('inherited', { notAnError: 1 }),
      today: both(thrown), js: both(thrown),
    },
  ];

  /** The same name, read where no getter throws: the contrasts the fix leaves as they are. */
  const contrasts = (): Fixture => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    return { data: { u: undefined, n: null, x: proxy }, log: [] };
  };

  const A55_CONTRASTS: Row[] = [
    {
      source: 'u.t', label: 'undefined', fixture: contrasts,
      today: both({ log: [] }),
      js: both({ threw: 'Cannot read properties of undefined (reading \'t\')', log: [] }),
      differs: both('a null-ish object reads undefined, the early return'),
    },
    {
      source: 'n.t', label: 'null', fixture: contrasts,
      today: both({ log: [] }),
      js: both({ threw: 'Cannot read properties of null (reading \'t\')', log: [] }),
      differs: both('a null-ish object reads undefined, the early return'),
    },
    {
      source: 'x.t', label: 'a revoked proxy', fixture: contrasts,
      today: both({ threw: 'Cannot perform \'getPrototypeOf\' on a proxy that has been revoked', log: [] }),
      js: both({ threw: 'Cannot perform \'get\' on a proxy that has been revoked', log: [] }),
      differs: both('a revoked proxy throws first at the evaluator\'s own getPrototypeOf'),
    },
  ];

  // --- A48: one read under caseInsensitive -----------------------------------

  /** `c.g`, an accessor on a class's prototype holding 1, logging each call. */
  const onInstance = (): Fixture => {
    const log: string[] = [];
    let held: unknown = 1;
    class C {
      get g(): unknown { log.push('get g'); return held; }
      set g(value: unknown) { log.push(`set g=${String(value)}`); held = value; }
    }
    return { data: { c: new C() }, log };
  };

  /** `o.g`, the same accessor as the object's own. */
  const onObject = (): Fixture => {
    const log: string[] = [];
    let held: unknown = 1;
    const o = {
      get g(): unknown { log.push('get g'); return held; },
      set g(value: unknown) { log.push(`set g=${String(value)}`); held = value; },
    };
    return { data: { o }, log };
  };

  /**
   * `p.foo`: the prototype's prototype holds `foo: undefined`, and the
   * prototype an accessor `Foo`, whose setter records what it is given.
   */
  const undefinedInherited = (): Fixture => {
    class P {
      get Foo(): string { return 'variant'; }
      set Foo(value: unknown) { (this as Record<string, unknown>)['wroteFoo'] = value; }
    }
    Object.setPrototypeOf(P.prototype, { foo: undefined });
    const p = new P() as unknown as Record<string, unknown>;
    return { data: { p }, log: [], after: () => ({ own: Object.keys(p).sort(), wroteFoo: p['wroteFoo'] }) };
  };

  /** `px`, a proxy over `{ q: 1 }` logging its `get`, `has` and `set` traps by key. */
  const loggingProxy = (): Fixture => {
    const log: string[] = [];
    const named = (trap: string, key: PropertyKey) => {
      if (typeof key === 'string') {
        log.push(`${trap}:${key}`);
      }
    };
    const px = new Proxy<Record<string, unknown>>({ q: 1 }, {
      get: (target, key, receiver) => { named('get', key); return Reflect.get(target, key, receiver); },
      has: (target, key) => { named('has', key); return Reflect.has(target, key); },
      set: (target, key, value) => { named('set', key); target[key as string] = value; return true; },
    });
    return { data: { px }, log };
  };

  /** `px`, a proxy with a `get` trap only, answering `q` with 1. */
  const getOnlyProxy = (): Fixture => {
    const log: string[] = [];
    const px = new Proxy({}, {
      get: (_target, key) => {
        if (typeof key === 'string') {
          log.push(`get:${key}`);
        }
        return key === 'q' ? 1 : undefined;
      },
    });
    return { data: { px }, log };
  };

  /**
   * `px`, a proxy whose `get` trap answers every key, `answer:<key>`, with no
   * `has` trap, so `in` finds only what its target holds: over `{}`, or over an
   * instance of a class with a method `getX`. Its `set` trap logs.
   */
  const answeringProxy = (over: 'empty' | 'instance') => (): Fixture => {
    const log: string[] = [];
    class T { getX(): string { return 'method'; } }
    const px = new Proxy<Record<string, unknown>>(over === 'empty' ? {} : new T() as unknown as Record<string, unknown>, {
      get: (_target, key) => {
        if (typeof key !== 'string') {
          return undefined;
        }
        log.push(`get:${key}`);
        return `answer:${key}`;
      },
      set: (_target, key, value) => { log.push(`set:${String(key)}=${String(value)}`); return true; },
    });
    return { data: { px }, log };
  };

  const answering = 'a get trap answering every key';

  const A48: Row[] = [
    {
      source: 'c.g ||= 5', fixture: onInstance,
      today: both({ value: 1, log: ['get g'] }), js: both({ value: 1, log: ['get g'] }),
    },
    {
      source: '`${c.g}`', fixture: onInstance,
      today: both({ value: '1', log: ['get g'] }), js: both({ value: '1', log: ['get g'] }),
    },
    {
      source: 'c.G', fixture: onInstance,
      today: { cs: { log: [] }, ci: { value: 1, log: ['get g'] } },
      js: { cs: { log: [] }, ci: null },
    },
    {
      source: 'c.G += 1', fixture: onInstance,
      today: { cs: { value: NaN, log: [] }, ci: { value: 2, log: ['get g', 'set g=2'] } },
      js: { cs: { value: NaN, log: [] }, ci: null },
    },
    {
      source: 'o.g', label: 'an own accessor', fixture: onObject,
      today: both({ value: 1, log: ['get g'] }), js: both({ value: 1, log: ['get g'] }),
    },
    {
      source: 'p.foo', fixture: undefinedInherited,
      today: both({ log: [], own: [] }), js: both({ log: [], own: [] }),
    },
    {
      source: 'p.foo = 1', fixture: undefinedInherited,
      today: both({ value: 1, log: [], own: ['foo'] }), js: both({ value: 1, log: [], own: ['foo'] }),
    },
    {
      source: 'p.foo += 1', fixture: undefinedInherited,
      today: both({ value: NaN, log: [], own: ['foo'] }), js: both({ value: NaN, log: [], own: ['foo'] }),
    },
    {
      source: 'p.FOO', fixture: undefinedInherited,
      today: { cs: { log: [], own: [] }, ci: { value: 'variant', log: [], own: [] } },
      js: { cs: { log: [], own: [] }, ci: null },
    },
    {
      source: 'px.q', fixture: loggingProxy,
      today: both({ value: 1, log: ['get:q'] }), js: both({ value: 1, log: ['get:q'] }),
    },
    {
      source: 'px.q += 1', fixture: loggingProxy,
      today: both({ value: 2, log: ['get:q', 'set:q'] }), js: both({ value: 2, log: ['get:q', 'set:q'] }),
    },
    {
      source: 'px.zz', fixture: loggingProxy,
      today: { cs: { log: ['get:zz'] }, ci: { log: ['has:zz', 'get:zz'] } },
      js: both({ log: ['get:zz'] }),
      differs: { ci: 'the key tested with in, as = tests it' },
    },
    {
      source: 'px.q', label: 'a get trap only', fixture: getOnlyProxy,
      today: both({ value: 1, log: ['get:q'] }), js: both({ value: 1, log: ['get:q'] }),
    },
    // A key the proxy answers but `in` does not find is searched for a case
    // variant on its target's prototype, as `=` already searched it. Up to
    // 0.15.1 the read tested the key by reading it, read it again as spelled,
    // and never searched.
    {
      source: 'px.q', label: `${answering}, over {}`, fixture: answeringProxy('empty'),
      today: both({ value: 'answer:q', log: ['get:q'] }), js: both({ value: 'answer:q', log: ['get:q'] }),
    },
    {
      source: 'px.tostring', label: `${answering}, over {}`, fixture: answeringProxy('empty'),
      today: {
        cs: { value: 'answer:tostring', log: ['get:tostring'] },
        ci: { threw: 'Access to dangerous property "toString" is blocked for security reasons', log: [] },
      },
      js: both({ value: 'answer:tostring', log: ['get:tostring'] }),
      differs: { ci: 'in misses the key, and its case variant on the prototype, toString, is blocked' },
    },
    {
      source: 'px.getx', label: `${answering}, over an instance with a method getX`, fixture: answeringProxy('instance'),
      today: { cs: { value: 'answer:getx', log: ['get:getx'] }, ci: { value: 'answer:getX', log: ['get:getX'] } },
      js: both({ value: 'answer:getx', log: ['get:getx'] }),
      differs: { ci: 'in misses the key, and its case variant on the prototype, getX, is read' },
    },
    {
      source: 'px.getx += 1', label: `${answering}, over an instance with a method getX`, fixture: answeringProxy('instance'),
      today: {
        cs: { value: 'answer:getx1', log: ['get:getx', 'set:getx=answer:getx1'] },
        ci: { value: 'answer:getX1', log: ['get:getX', 'set:getX=answer:getX1'] },
      },
      js: both({ value: 'answer:getx1', log: ['get:getx', 'set:getx=answer:getx1'] }),
      differs: { ci: 'in misses the key, and its case variant on the prototype, getX, is read and written' },
    },
    {
      // The contrast: `=` searched so up to 0.15.1 already.
      source: 'px.getx = 1', label: `${answering}, over an instance with a method getX`, fixture: answeringProxy('instance'),
      today: { cs: { value: 1, log: ['set:getx=1'] }, ci: { value: 1, log: ['set:getX=1'] } },
      js: both({ value: 1, log: ['set:getx=1'] }),
      differs: { ci: 'in misses the key, and its case variant on the prototype, getX, is written' },
    },
  ];

  // --- § 8 q1: the caseInsensitive branch's own catch -------------------------

  type Trap = 'get' | 'has' | 'getPrototypeOf' | 'ownKeys';

  /**
   * A proxy over `target` whose `throws` trap throws `boom`, logging its
   * `get` and `has` traps by key, and the throwing trap by name.
   */
  const trapping = (target: object, throws: Trap, log: string[], boom: unknown, tag = ''): object =>
    new Proxy(target, Object.fromEntries((['get', 'has', 'getPrototypeOf', 'ownKeys'] as Trap[]).map(trap => [
      trap,
      (...args: unknown[]) => {
        const key = args[1];
        if ((trap === 'get' || trap === 'has') && typeof key === 'string') {
          log.push(`${tag}${trap}:${key}`);
        } else if (trap === throws) {
          log.push(`${tag}${trap}`);
        }
        if (trap === throws) {
          throw boom;
        }
        return (Reflect[trap] as (...a: unknown[]) => unknown)(...args);
      },
    ])));

  /** `px`, such a proxy over `{ k: 1 }`. */
  const proxyThrowing = (throws: Trap) => (): Fixture => {
    const log: string[] = [];
    const boom = new Error('the trap threw');
    return { data: { px: trapping({ k: 1 }, throws, log, boom) }, log, boom };
  };

  /** `o`, a plain object whose prototype is such a proxy over `{ g: 2 }`. */
  const prototypeThrowing = (throws: Trap) => (): Fixture => {
    const log: string[] = [];
    const boom = new Error('the trap threw');
    return { data: { o: Object.create(trapping({ g: 2 }, throws, log, boom, 'proto.')) }, log, boom };
  };

  const Q1: Row[] = [
    {
      source: 'px.zz', label: 'its has trap throws', fixture: proxyThrowing('has'),
      today: { cs: { log: ['get:zz'] }, ci: { log: ['has:zz', 'get:zz'] } },
      js: both({ log: ['get:zz'] }),
      differs: { ci: 'the catch swallows the has trap\'s throw, and the read falls through to get' },
    },
    {
      source: 'px.zz', label: 'its get trap throws', fixture: proxyThrowing('get'),
      today: { cs: { threw: 'boom', log: ['get:zz'] }, ci: { threw: 'boom', log: ['has:zz', 'get:zz'] } },
      js: both({ threw: 'boom', log: ['get:zz'] }),
      differs: { ci: 'the key tested with in, as = tests it' },
    },
    {
      source: 'o.zz', label: 'its prototype\'s ownKeys trap throws', fixture: prototypeThrowing('ownKeys'),
      today: {
        cs: { log: ['proto.get:zz'] },
        ci: { log: ['proto.has:zz', 'proto.ownKeys', 'proto.get:zz'] },
      },
      js: both({ log: ['proto.get:zz'] }),
      differs: { ci: 'the catch swallows the throw of the search of the prototype\'s names' },
    },
    {
      source: 'o.zz', label: 'its prototype\'s has trap throws', fixture: prototypeThrowing('has'),
      today: { cs: { log: ['proto.get:zz'] }, ci: { log: ['proto.has:zz', 'proto.get:zz'] } },
      js: both({ log: ['proto.get:zz'] }),
      differs: { ci: 'the catch swallows the has trap\'s throw, and the read falls through to get' },
    },
    {
      source: 'px.k', label: 'its getPrototypeOf trap throws', fixture: proxyThrowing('getPrototypeOf'),
      today: both({ threw: 'boom', log: ['getPrototypeOf'] }),
      js: both({ value: 1, log: ['get:k'] }),
      differs: both('outside the catch: the evaluator\'s own getPrototypeOf, before the read'),
    },
    {
      source: 'px.k', label: 'its ownKeys trap throws', fixture: proxyThrowing('ownKeys'),
      today: { cs: { value: 1, log: ['get:k'] }, ci: { threw: 'boom', log: ['ownKeys'] } },
      js: both({ value: 1, log: ['get:k'] }),
      differs: { ci: 'outside the catch: the lookup cache lists the own names' },
    },
  ];

  const GROUPS: [string, Row[]][] = [
    ['A55: a getter\'s throw', A55],
    ['A55: the contrasts', A55_CONTRASTS],
    ['A48: one read under caseInsensitive', A48],
    ['§ 8 q1: the caseInsensitive branch\'s own catch', Q1],
  ];

  /** The row's source, its fixture and why it differs from JavaScript in `mode`, which name the case. */
  const title = (row: Row, mode: Mode): string =>
    [row.source, row.label, row.differs?.[mode] && `differs: ${row.differs[mode]}`].filter(Boolean).join(' · ');

  describe.each<[string, Mode, EvalKnownOptions]>([
    ['case-sensitive', 'cs', {}],
    ['caseInsensitive', 'ci', { caseInsensitive: true }],
  ])('%s', (_label, mode, options) => {

    describe.each(GROUPS)('%s', (_group, rows) => {

      it.each(rows.map(row => [title(row, mode), row] as [string, Row]))('%s', (_title, row) => {
        const js = row.js[mode];

        // The table's own claim, before anything is run: a row that does not
        // say why it differs from JavaScript has JavaScript's outcome.
        if (js && !row.differs?.[mode]) {
          expect(row.today[mode]).toEqual(js);
        }

        expect(evaluator(row.source, row.fixture(), options)).toEqual(row.today[mode]);

        if (js) {
          expect(native(row.source, row.fixture())).toEqual(js);
        }
      });
    });
  });
});
