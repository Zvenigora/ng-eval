import { EvalContext, type EvalMemberWrite } from '@zvenigora/ng-eval-core';

/**
 * The run's context: the Phase 12 plan's § 3.5 line 3 and finding 1. A
 * subclass of `eval-core`'s `EvalContext` over the facts, whose two write
 * hooks refuse: `set`, an assignment to a name no pushed scope binds, which
 * is a fact or an unknown name; and `checkMemberWrite`, an assignment to a
 * member, or a built-in method in `eval-core`'s table of writers that writes,
 * unless the walk created the object (finding 16). `eval-signals`' signal context has the same two
 * overrides; this package writes its own, since its main entry depends on
 * `eval-core` alone ([SR29](../../../../docs/standing-rules.md#sr29)).
 *
 * What it does not refuse, by `eval-core`'s design: a write through a
 * function the host supplied, among the facts or among the functions, which
 * is the host's own code; `delete`, which deletes nothing (finding 8);
 * `Reflect`'s writers and `Atomics`', which no expression reaches unless the
 * host supplies them (finding 17); a built-in of the table that native code
 * calls, as `[1].forEach(list.push, list)` calls `push`; and a built-in that
 * changes what it is handed and is not in `eval-core`'s table of writers:
 * `test` and `exec` moving a regex's `lastIndex`, `RegExp#compile`, a
 * `DataView`'s setters, `ArrayBuffer#transfer` and `resize`, an array
 * iterator's `next`, and `getOrInsert` on a `Map` or a `WeakMap`, among them.
 * `checkMemberWrite` is asked about none of these (A64,
 * `docs/backlog.md#a64`). A pushed scope's binding is not behind `set`
 * (finding 7): `compileRule` refuses every write to one first.
 */
export class RuleWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleWriteError';
    Object.setPrototypeOf(this, RuleWriteError.prototype);
  }
}

/** What to write instead of a built-in method that writes, by `eval-core`'s name for it. */
const instead = (method: string): string => {
  const dot = method.lastIndexOf('.');
  const owner = method.slice(0, dot);
  const name = method.slice(dot + 1);
  if (owner === 'Array.prototype' || owner === '%TypedArray%.prototype') {
    const copies: Record<string, string> = {
      sort: 'toSorted',
      reverse: 'toReversed',
      splice: 'toSpliced',
    };
    const copy = copies[name];
    return copy === undefined
      ? ' Spread it into an array literal and change the copy instead.'
      : ` Use ${copy} instead, which returns a changed copy.`;
  }
  if (owner === 'Object' || owner === 'Map.prototype' || owner === 'Set.prototype') {
    return ' Spread it into a literal and change the copy instead.';
  }
  return '';
};

class RuleEvalContext extends EvalContext {
  public override set(key: unknown): void {
    throw new RuleWriteError(`Cannot assign to '${String(key)}': a rule's facts are read-only.`);
  }

  public override checkMemberWrite(write: EvalMemberWrite): void {
    if (write.createdByEvaluation) {
      return;
    }
    if (write.method !== undefined) {
      throw new RuleWriteError(
        `Cannot call ${write.method}: a rule's expression may write only into objects it created.` +
          instead(write.method)
      );
    }
    throw new RuleWriteError(
      `Cannot assign to member '${String(write.key)}': a rule's expression may write only into ` +
        'objects it created. A calculation gives a new value; it does not change an old one.'
    );
  }
}

/** The run's context over checked facts, with no option: `eval-core` gets `colonIdentifiers` at the parse only. */
export const createRuleContext = (facts: Record<string, unknown>): EvalContext =>
  new RuleEvalContext(facts, {});

/**
 * The shape of a value, as a message names it: what the facts check (§ 8 q7,
 * finding 26) says it was given. It reads the prototype's `constructor` for a
 * class's name, guarded, since a host's prototype can throw.
 */
export const describeShape = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (typeof value === 'function') {
    return 'a function';
  }
  if (typeof value !== 'object') {
    return value === undefined ? 'undefined' : `a ${typeof value}`;
  }
  if (value instanceof EvalContext) {
    return 'an EvalContext';
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype === null) {
    return 'an object with a null prototype';
  }
  if (prototype === Object.prototype) {
    return 'a plain object';
  }
  if (Object.getPrototypeOf(prototype) === null) {
    return "an object of another realm, whose prototype is not this realm's Object.prototype";
  }
  let name: unknown;
  try {
    name = (prototype as { constructor?: { name?: unknown } }).constructor?.name;
  } catch {
    name = undefined;
  }
  if (typeof name === 'string' && name !== '' && name !== 'Object') {
    return `an instance of ${name}`;
  }
  return 'an object whose prototype is another object';
};

/**
 * Checks the facts, before any field runs (§ 3.5 line 2): an object whose
 * prototype is this realm's `Object.prototype` (§ 8 q7, P-1). A literal, what
 * `JSON.parse` and `structuredClone` return, a frozen object, a `Proxy` over
 * a plain object, and an object with an own getter pass; everything else
 * throws a `TypeError` that names the shape. `eval-core` reads nothing from a
 * null-prototype object, an object of another realm, an array, a `Map`, a
 * `Date` or a function (finding 26), so refusing them loses nothing; a class
 * instance, a `Registry` and an object whose prototype is another object it
 * reads, and a later minor can admit them.
 */
export const checkFacts = (facts: unknown, caller: string): Record<string, unknown> => {
  if (typeof facts === 'object' && facts !== null && Object.getPrototypeOf(facts) === Object.prototype) {
    return facts as Record<string, unknown>;
  }
  throw new TypeError(
    `${caller} takes facts that are a plain object, whose prototype is Object.prototype: ` +
      `these are ${describeShape(facts)}.`
  );
};
