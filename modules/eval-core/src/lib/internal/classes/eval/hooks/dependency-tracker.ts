import type { EvalHooks, EvalReadEvent, Unsubscribe } from '../eval-hooks';

/**
 * Collects the context reads an evaluation made, as a set of dotted paths.
 *
 * This is Phase 3's input: install it, evaluate, and read {@link dependencies}
 * back in the same synchronous turn - which is what wrapping a `computed()`
 * needs. Hooks are synchronous by design, so that ordering always holds.
 */
export interface EvalDependencyTracker {
  /**
   * Registers the read hook on `hooks`.
   *
   * @param hooks The registry to register on.
   * @returns A function that removes it.
   */
  install(hooks: EvalHooks): Unsubscribe;

  /**
   * The dotted paths this tracker considers dependencies, filtered per the
   * rules on {@link createDependencyTracker}. Live: it fills as reads arrive.
   */
  readonly dependencies: ReadonlySet<string>;

  /**
   * Every read seen, unfiltered and in emission order - including the scope
   * bindings, method references and computed members {@link dependencies}
   * drops. A consumer that wants to key on `target` identity rather than on
   * path strings works from here.
   */
  readonly reads: EvalReadEvent[];

  /** Empties {@link dependencies}, {@link reads} and the scope-binding names. */
  reset(): void;
}

/** The first segment of a dotted path: `a.b.c` -> `a`. */
const rootOf = (path: string): string => {
  const dot = path.indexOf('.');
  return dot < 0 ? path : path.slice(0, dot);
};

/**
 * Creates a dependency tracker.
 *
 * `reads` keeps everything. `dependencies` is the filtered view, and three
 * rules do the filtering:
 *
 * 1. **Scope bindings are not dependencies.** A read flagged `scoped` resolved
 *    from a scope pushed during the walk - an arrow-function parameter. Only
 *    the walker can tell one from a real context read, which is why the flag
 *    exists; a consumer using this tracker inherits the filtering for free.
 * 2. **Nor is anything reached *through* one.** `item` being a binding makes
 *    `item.name` one too, and that read carries no flag of its own: `scoped` is
 *    set at identifier resolution, and the member hop resolves against the
 *    bound object rather than against a scope. So the bound names are
 *    remembered and any path rooted at one is dropped.
 * 3. **A method reached through a member hop is a call target, not data.**
 *    `list.map` in `list.map(item => item.name)` resolves to
 *    `Array.prototype.map`; recording it would put a built-in in the dependency
 *    set, while `list` - already recorded - is the thing whose change actually
 *    matters. Bare identifiers are exempt, function-valued or not: a
 *    context-level callable was named directly rather than reached through an
 *    object, and there is no already-recorded object standing in for it.
 *
 * Two limits, both consequences of keying on path strings:
 *
 * - **A computed member contributes nothing.** `obj[expr]` has no
 *   reconstructible path, and its resolved key alone is not a usable key
 *   without one. It is in `reads` with an exact `key` and `target`, for a
 *   consumer willing to key on identity.
 * - **Names collide.** Rule 2 keys on the *name*, so once `item` has been an
 *   arrow parameter anywhere in the expression, a genuine `item.x` elsewhere in
 *   it is dropped too. Path strings from different arrow bodies collide the
 *   same way. § 9 hands the identity-versus-paths question to Phase 3; this is
 *   the paths half of it.
 *
 * ```ts
 * const tracker = createDependencyTracker();
 * const state = evalService.createState({ a: { b: 1 }, c: 2 });
 * const off = tracker.install(state.hooks);
 *
 * evalService.eval('a.b + c', state);
 * tracker.dependencies;   // Set { 'a', 'a.b', 'c' }
 *
 * tracker.reset();
 * off();
 * ```
 *
 * @returns A tracker; nothing is collected until {@link EvalDependencyTracker.install}
 *   is called.
 */
export const createDependencyTracker = (): EvalDependencyTracker => {
  const dependencies = new Set<string>();
  const reads: EvalReadEvent[] = [];
  const bindings = new Set<string>();

  const record = (event: EvalReadEvent): void => {
    reads.push(event);

    const path = event.path;

    if (event.scoped) {
      // Rule 1, and the source of rule 2's name set.
      if (path !== undefined) {
        bindings.add(path);
      }
      return;
    }

    if (path === undefined) {
      return;
    }

    if (bindings.has(rootOf(path))) {
      return;                                    // rule 2
    }

    if (event.kind === 'member' && typeof event.value === 'function') {
      return;                                    // rule 3
    }

    dependencies.add(path);
  };

  return {
    install(hooks: EvalHooks): Unsubscribe {
      return hooks.onRead(record);
    },

    dependencies,
    reads,

    reset(): void {
      dependencies.clear();
      reads.length = 0;
      bindings.clear();
    }
  };
};
