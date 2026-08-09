import { AnyNode } from 'acorn';
import { AnyNodeTypes } from '../../interfaces';
import { EvalOptions } from './eval-options';
import type { EvalState } from './eval-state';

/**
 * The two points at which a visitor brackets its body.
 */
export type EvalHookPhase = 'before' | 'after';

/**
 * Payload handed to a node hook.
 */
export interface EvalNodeHookEvent {
  readonly phase: EvalHookPhase;
  readonly node: AnyNode;
  readonly state: EvalState;
  /** Value pushed by the visitor; only present on 'after'. */
  readonly value?: unknown;
  /** False when this 'after' event was synthesised during error unwinding. */
  readonly completed: boolean;
  /** The error that aborted evaluation; only present when `completed` is false. */
  readonly error?: unknown;
}

/**
 * A node hook. Hooks are observers: they are called for their side effects and
 * their return value is discarded. A hook that returns a promise is *not*
 * awaited - see {@link ASYNC_HOOK_MESSAGE}.
 */
export type EvalNodeHook = (event: EvalNodeHookEvent) => void;

/**
 * Removes the hook that returned it. Calling it more than once is a no-op.
 */
export type Unsubscribe = () => void;

/**
 * What to do with an error raised by a hook.
 *
 * - `collect` (default) - wrap it, append it to `hooks.errors`, keep evaluating.
 * - `throw` - rethrow it into the visitor, failing the evaluation.
 * - `ignore` - swallow it silently.
 */
export type EvalHookErrorPolicy = 'collect' | 'throw' | 'ignore';

/**
 * An error raised by a hook, recorded under the 'collect' policy.
 */
export interface EvalHookError {
  readonly phase: EvalHookPhase;
  readonly nodeType: AnyNodeTypes;
  readonly error: unknown;
}

const DEFAULT_POLICY: EvalHookErrorPolicy = 'collect';

const POLICIES: readonly EvalHookErrorPolicy[] = ['collect', 'throw', 'ignore'];

export const ASYNC_HOOK_MESSAGE =
  'async hook returned a promise; it will not be awaited';

/**
 * Reads the error policy out of the evaluation options. `EvalOptions` is a union
 * and does not index directly, so the read goes through a cast - the same one
 * `before-visitor.ts` performs.
 */
const readPolicy = (options?: EvalOptions): EvalHookErrorPolicy => {
  const value = (options as Record<string, unknown>)?.['onHookError'];
  return POLICIES.includes(value as EvalHookErrorPolicy)
    ? (value as EvalHookErrorPolicy)
    : DEFAULT_POLICY;
};

const isPromiseLike = (value: unknown): boolean =>
  !!value &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as PromiseLike<unknown>).then === 'function';

/**
 * A per-evaluation registry of node hooks, keyed by node type with wildcard
 * support, plus the open-node stack that keeps `before` and `after` balanced
 * when a visitor throws.
 *
 * Hooks are synchronous by design: the walk in `evaluate` is synchronous even
 * under `evaluateAsync`, so there is no point at which a hook could be awaited.
 */
export class EvalHooks {
  private readonly _before = new Map<string, EvalNodeHook[]>();
  private readonly _after = new Map<string, EvalNodeHook[]>();
  private readonly _open: { node: AnyNode; state: EvalState }[] = [];
  private readonly _errors: EvalHookError[] = [];
  private readonly _policy: EvalHookErrorPolicy;
  private _size = 0;

  /**
   * @param options The evaluation options; `onHookError` selects the error policy.
   */
  constructor(options?: EvalOptions) {
    this._policy = readPolicy(options);
  }

  /**
   * Errors raised by hooks and collected under the 'collect' policy.
   */
  public get errors(): readonly EvalHookError[] {
    return this._errors;
  }

  /**
   * True while no hook is registered. Read on the hot path, so it is a counter
   * rather than a walk of the registries.
   */
  public get isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Registers a node hook.
   * @param phase Whether to fire before or after the visitor body.
   * @param type A concrete node type, or '*' for every node.
   * @param hook The hook to register.
   * @returns A function that removes this hook.
   */
  public on(phase: EvalHookPhase, type: AnyNodeTypes | '*', hook: EvalNodeHook): Unsubscribe {
    const registry = this.registry(phase);
    const hooks = registry.get(type);

    if (hooks) {
      hooks.push(hook);
    } else {
      registry.set(type, [hook]);
    }
    this._size++;

    let unsubscribed = false;
    return () => {
      if (unsubscribed) {
        return;
      }
      unsubscribed = true;
      this.off(phase, type, hook);
    };
  }

  /**
   * Removes one hook, or every hook registered for a key when `hook` is omitted.
   */
  public off(phase: EvalHookPhase, type: AnyNodeTypes | '*', hook?: EvalNodeHook): void {
    const registry = this.registry(phase);
    const hooks = registry.get(type);

    if (!hooks) {
      return;
    }

    if (hook === undefined) {
      registry.delete(type);
      this._size -= hooks.length;
      return;
    }

    const index = hooks.indexOf(hook);
    if (index < 0) {
      return;
    }

    hooks.splice(index, 1);
    this._size--;
    if (hooks.length === 0) {
      registry.delete(type);
    }
  }

  /**
   * Removes every hook from both phases and discards the open-node stack.
   * Collected errors are kept - they are a record of what already happened.
   */
  public clear(): void {
    this._before.clear();
    this._after.clear();
    this._open.length = 0;
    this._size = 0;
  }

  /**
   * Fires the hooks registered for a node, keyed first and wildcard second.
   *
   * On 'before' the node is pushed onto the open-node stack *after* the hooks
   * run; on 'after' it is popped *before* they run, so a hook that throws cannot
   * corrupt the stack.
   *
   * @param value The value the visitor pushed; meaningful on 'after' only.
   */
  public dispatch(phase: EvalHookPhase, node: AnyNode, state: EvalState, value?: unknown): void {
    if (phase === 'after') {
      this.exit();
      this.emit({ phase, node, state, value, completed: true }, false);
      return;
    }

    this.emit({ phase, node, state, completed: true }, false);
    this.enter(node, state);
  }

  /**
   * Records a node as open. Called by the 'before' dispatcher after its hooks fire.
   */
  public enter(node: AnyNode, state: EvalState): void {
    this._open.push({ node, state });
  }

  /**
   * Closes the innermost open node. Called by the 'after' dispatcher before its
   * hooks fire.
   */
  public exit(): void {
    this._open.pop();
  }

  /**
   * Fires 'after' for every node still open, innermost first, marked incomplete.
   * Invoked from the catch in `evaluate`, so that a visitor which throws still
   * leaves every 'before' matched by exactly one 'after'.
   *
   * Idempotent, so the sync and async entry points can both call it.
   *
   * A hook that throws here cannot stop the drain: while unwinding, the 'throw'
   * policy is downgraded to 'collect' - evaluation has already failed, and the
   * original error is the one worth propagating.
   */
  public unwind(error: unknown): void {
    while (this._open.length > 0) {
      const open = this._open.pop();
      if (!open) {
        break;
      }
      this.emit(
        { phase: 'after', node: open.node, state: open.state, completed: false, error },
        true
      );
    }
  }

  private registry(phase: EvalHookPhase): Map<string, EvalNodeHook[]> {
    return phase === 'before' ? this._before : this._after;
  }

  private emit(event: EvalNodeHookEvent, unwinding: boolean): void {
    const registry = this.registry(event.phase);
    if (registry.size === 0) {
      return;
    }
    this.invokeAll(registry.get(event.node.type), event, unwinding);
    this.invokeAll(registry.get('*'), event, unwinding);
  }

  /**
   * Iterates a copy so that a hook which unsubscribes itself does not shift the
   * list out from under the loop.
   */
  private invokeAll(hooks: EvalNodeHook[] | undefined, event: EvalNodeHookEvent, unwinding: boolean): void {
    if (!hooks || hooks.length === 0) {
      return;
    }
    for (const hook of hooks.slice()) {
      this.invoke(hook, event, unwinding);
    }
  }

  private invoke(hook: EvalNodeHook, event: EvalNodeHookEvent, unwinding: boolean): void {
    let result: unknown;

    try {
      result = hook(event);
    } catch (error) {
      this.handleError(event, error, unwinding);
      return;
    }

    if (isPromiseLike(result)) {
      this.handleError(event, new Error(ASYNC_HOOK_MESSAGE), unwinding);
    }
  }

  private handleError(event: EvalNodeHookEvent, error: unknown, unwinding: boolean): void {
    if (this._policy === 'ignore') {
      return;
    }
    if (this._policy === 'throw' && !unwinding) {
      throw error;
    }
    this._errors.push({ phase: event.phase, nodeType: event.node.type, error });
  }
}
