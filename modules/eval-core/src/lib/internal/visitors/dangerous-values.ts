import { DANGEROUS_FUNCTIONS } from './call-expression';

/**
 * Security: the realm's dangerous functions, matched by value rather than by
 * the name they are reached under (`docs/a35/plan.md` § 3.1).
 *
 * The call list's names are checked as written by the call sandbox; that
 * check does not see `eval` bound as `run`, read as `tools.run`, returned by
 * a call or spelt `EVAL` under `caseInsensitive` (`docs/backlog.md` A35). The
 * set below holds the values themselves, so a callee is refused whatever it
 * is called.
 *
 * `DANGEROUS_FUNCTIONS` is imported from `call-expression.ts`, which imports
 * this module in turn. The list is read only at the first capture, never
 * while either module is loading, so the cycle is safe. It has to be: the
 * flattened bundle declares this module's code before the list, so a read at
 * load would be a temporal-dead-zone `ReferenceError` on import.
 */

/** The three function constructors no global names. */
export type FunctionConstructorName = 'AsyncFunction' | 'GeneratorFunction' | 'AsyncGeneratorFunction';

/** What {@link captureFunctionConstructors} read, by name. */
export interface FunctionConstructorCapture {
  /** Each constructor read that is a function and not `Function` itself. */
  readonly captured: ReadonlyMap<FunctionConstructorName, object>;
  /** Each name whose constructor was not captured, in the source's order. */
  readonly notCaptured: readonly FunctionConstructorName[];
}

/**
 * The prototype of a function literal of each kind, read from this module's
 * own literals. Never built from source text through `Function` or `eval`:
 * that fails under a CSP without `unsafe-eval`, and a sandbox must not
 * construct code to defend itself.
 */
const literalPrototypes = (): Readonly<Record<FunctionConstructorName, unknown>> => ({
  AsyncFunction: Object.getPrototypeOf(async function () { /* an async function literal */ }),
  GeneratorFunction: Object.getPrototypeOf(function* () { /* a generator literal */ }),
  AsyncGeneratorFunction: Object.getPrototypeOf(async function* () { /* an async generator literal */ }),
});

/**
 * Reads the constructor off each prototype in `prototypes`.
 *
 * A constructor that is `Function` itself is not captured, and is recorded
 * as such: a realm whose bundler downlevels async functions - Jest's, or an
 * Angular zone.js build - makes an async literal a plain function, and the
 * real constructor is no global there. An expression reaches it only through
 * some value's `constructor`, which the guard refuses, so only a host could
 * put it in the context.
 *
 * @param prototypes - The prototype of each kind; this module's literals by
 *   default. A spec injects its own.
 */
export const captureFunctionConstructors = (
  prototypes: Readonly<Partial<Record<FunctionConstructorName, unknown>>> = literalPrototypes()
): FunctionConstructorCapture => {

  const captured = new Map<FunctionConstructorName, object>();
  const notCaptured: FunctionConstructorName[] = [];

  for (const name of Object.keys(prototypes) as FunctionConstructorName[]) {
    const prototype = prototypes[name];
    const constructor = prototype ? (prototype as { constructor?: unknown }).constructor : undefined;
    if (typeof constructor === 'function' && constructor !== Function) {
      captured.set(name, constructor);
    } else {
      notCaptured.push(name);
    }
  }

  return { captured, notCaptured };
};

/** The prefix `Function.prototype.bind` gives a bound function's `name`. */
const BOUND_PREFIX = 'bound ';

/** The realm, read by name. */
const realmGlobals = globalThis as unknown as Record<string, unknown>;

/**
 * The prefix under which zone.js keeps the original of a global it patched:
 * the realm's `__Zone_symbol_prefix` when that is a string, as zone.js reads
 * it, and `__zone_symbol__` otherwise.
 */
const zoneOriginalPrefix = (): string => {
  const prefix = realmGlobals['__Zone_symbol_prefix'];
  return typeof prefix === 'string' ? prefix : '__zone_symbol__';
};

/**
 * Weak, so a function that was once a listed global - a test's fake timer, a
 * patcher's wrapper - is not kept alive by having been captured.
 */
let dangerousValues: WeakSet<object> | undefined;
let listedNames: ReadonlySet<string> | undefined;

/** The `setTimeout` the set last captured: the sentinel. */
let capturedSetTimeout: unknown;

/**
 * Adds each call-list name's current global value, and zone.js's saved
 * original of it where there is one. Adds only: a value captured earlier
 * stays, so a context that took it before a replacement is still refused.
 */
const addGlobals = (set: WeakSet<object>): void => {
  const zonePrefix = zoneOriginalPrefix();
  for (const name of DANGEROUS_FUNCTIONS) {
    for (const value of [realmGlobals[name], realmGlobals[zonePrefix + name]]) {
      if (typeof value === 'function') {
        set.add(value);
      }
    }
  }
  capturedSetTimeout = realmGlobals['setTimeout'];
};

/**
 * The identity set, captured at the first check and never at module load: an
 * eval-core module evaluated before zone.js would otherwise hold the native
 * timers and miss the wrappers every later context holds.
 *
 * Each check compares the last captured `setTimeout` with the current one.
 * When `setTimeout` has been replaced - zone.js loaded late, or any other
 * patcher - the current value of every listed global is added. Another listed
 * global replaced on its own is not seen until `setTimeout` changes.
 *
 * Assigned only once it is filled, so a throw part-way through leaves no
 * half-captured set behind; the next check captures again.
 */
const dangerousValueSet = (): WeakSet<object> => {
  if (!dangerousValues) {
    const set = new WeakSet<object>();
    addGlobals(set);
    for (const constructor of captureFunctionConstructors().captured.values()) {
      set.add(constructor);
    }
    dangerousValues = set;
  } else if (realmGlobals['setTimeout'] !== capturedSetTimeout) {
    addGlobals(dangerousValues);
  }
  return dangerousValues;
};

/**
 * The names the bound-function rule refuses: the call list, `import`
 * included, and the three function constructors.
 */
const boundListedNames = (): ReadonlySet<string> =>
  (listedNames ??= new Set<string>([
    ...DANGEROUS_FUNCTIONS, 'AsyncFunction', 'GeneratorFunction', 'AsyncGeneratorFunction',
  ]));

/**
 * Whether `fn` is a bound function whose name, stripped of every `bound `
 * prefix, is a listed name: `eval.bind(null)` is named `"bound eval"`, and
 * binding it again gives `"bound bound eval"`. A heuristic: a host's own
 * function bound under a listed name is refused as well. An unbound function
 * is never refused by its name here.
 *
 * A `name` that cannot be read - a revoked proxy - is not a listed name; the
 * call sandbox's source test refuses a function it cannot read.
 */
const isBoundListedFunction = (fn: unknown): boolean => {
  let name: unknown;
  try {
    name = (fn as { name?: unknown }).name;
  } catch {
    return false;
  }
  if (typeof name !== 'string' || !name.startsWith(BOUND_PREFIX)) {
    return false;
  }
  let target = name;
  while (target.startsWith(BOUND_PREFIX)) {
    target = target.slice(BOUND_PREFIX.length);
  }
  return boundListedNames().has(target);
};

/**
 * Whether `value` is a dangerous function: a member of the realm's identity
 * set, or a bound function of a listed name. Anything that is not a function
 * is not.
 */
export const isDangerousValue = (value: unknown): boolean => {
  if (typeof value !== 'function') {
    return false;
  }
  return dangerousValueSet().has(value) || isBoundListedFunction(value);
};
