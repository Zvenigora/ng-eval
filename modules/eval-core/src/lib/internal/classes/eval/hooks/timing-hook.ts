import type { AnyNodeTypes } from '../../../interfaces';
import type { EvalHooks, EvalNodeHookEvent, Unsubscribe } from '../eval-hooks';
import type { EvalState } from '../eval-state';

/**
 * A timing hook, ready to install on a registry.
 *
 * It carries no totals of its own: they are written to the `EvalState` being
 * evaluated and read back as `EvalState.nodeTimings`. That is what lets the
 * `trackTime` option install one from inside the `EvalState` constructor, where
 * the caller never sees this handle - and it is what keeps two evaluations
 * through a shared registry from accumulating into each other.
 */
export interface EvalTimingHook {
  /**
   * Registers the 'before'/'after' pair on `hooks`.
   *
   * @param hooks The registry to register on.
   * @returns A function that removes both halves of the pair.
   */
  install(hooks: EvalHooks): Unsubscribe;
}

/**
 * Creates a timing hook that accumulates inclusive per-node-type totals.
 *
 * Replaces the `console.time` / `console.timeEnd` pair the old `trackTime`
 * emitted, which mismatched its labels and produced no readable figure. The
 * readings are `performance.now()`, and nothing is written to the console.
 *
 * ```ts
 * const state = evalService.createState(context);
 * const off = createTimingHook().install(state.hooks);
 * evalService.eval('a + b * c', state);
 * state.nodeTimings.get('BinaryExpression');   // { count: 2, total: 0.081 }
 * off();
 * ```
 *
 * Equivalent to passing `{ trackTime: true }`, which installs one of these on
 * the state's own registry.
 *
 * @returns A handle whose `install` registers the pair on a registry.
 */
export const createTimingHook = (): EvalTimingHook => {

  /**
   * Start times for the nodes this handle currently has open, per state.
   *
   * Keyed by state because one handle may be installed on a registry that
   * several evaluations dispatch through, and a shared stack would interleave
   * them. Weak, so a finished evaluation's state is collectable while the
   * consumer holds the handle. Per *handle* rather than module-level, so two
   * handles installed on one state cannot pop each other's readings.
   *
   * A stack works because `EvalHooks` guarantees exactly one 'after' *frame*
   * per 'before' frame, innermost first, on every exit path - including the
   * synthesised events `exit` flushes for stranded frames and the ones
   * `unwindTo` emits when a visitor throws. It has to be a stack rather than a
   * map keyed by node: an arrow-function body is re-walked on every call, so
   * the same node can be open more than once.
   *
   * The guarantee is about frames, not about hook *invocations*. Under the
   * 'throw' policy an earlier hook can abort `dispatch`'s emit loop after
   * `enter` has already run, so this push is skipped while the frame stays
   * open; the `unwindTo` that follows then pops an enclosing node's reading and
   * attributes it to the wrong type. Pops never outnumber pushes, so nothing
   * strands into a later run on the same state - and the evaluation has failed
   * regardless, which is why the totals are left as they fall.
   */
  const starts = new WeakMap<EvalState, number[]>();

  const stackFor = (state: EvalState): number[] => {
    const existing = starts.get(state);
    if (existing) {
      return existing;
    }
    const created: number[] = [];
    starts.set(state, created);
    return created;
  };

  const before = (event: EvalNodeHookEvent): void => {
    stackFor(event.state).push(performance.now());
  };

  const after = (event: EvalNodeHookEvent): void => {
    const started = starts.get(event.state)?.pop();
    if (started === undefined) {
      // No matching 'before'. Reachable when this handle was installed midway
      // through a walk, or when a throwing hook skipped the push above;
      // recording a total from an unknown start would be worse than skipping.
      return;
    }

    record(event.state, event.node.type as AnyNodeTypes, performance.now() - started);
  };

  return {
    install(hooks: EvalHooks): Unsubscribe {
      const offBefore = hooks.on('before', '*', before);
      const offAfter = hooks.on('after', '*', after);

      return () => {
        offBefore();
        offAfter();
      };
    }
  };
};

const record = (state: EvalState, type: AnyNodeTypes, elapsed: number): void => {
  const timings = state.hookBookkeeping.timings;
  const current = timings.get(type);

  timings.set(type, current
    ? { count: current.count + 1, total: current.total + elapsed }
    : { count: 1, total: elapsed });
};
