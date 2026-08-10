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
  /** False when this 'after' event was synthesised rather than dispatched by a visitor. */
  readonly completed: boolean;
  /**
   * The error that aborted evaluation.
   *
   * Present only on events synthesised by `unwindTo`, where evaluation really
   * did fail. Frames closed by `exit` - because an enclosing visitor moved on
   * without them - also carry `completed: false`, but no error: nothing threw,
   * and the evaluation may well succeed. Test for the property rather than
   * assuming `completed: false` implies one.
   */
  readonly error?: unknown;
}

/**
 * A node hook. Hooks are observers: they are called for their side effects and
 * their return value is discarded. A hook that returns a promise is *not*
 * awaited - see {@link ASYNC_HOOK_MESSAGE}.
 */
export type EvalNodeHook = (event: EvalNodeHookEvent) => void;

/**
 * Which resolution produced a read event.
 */
export type EvalReadKind = 'identifier' | 'member';

/**
 * Payload handed to a read hook: one resolved context read.
 *
 * Node hooks cannot report *which key* an expression read - the AST node alone
 * is not enough once case correction and computed members are in play - so this
 * is the event a dependency tracker actually needs.
 */
export interface EvalReadEvent {
  readonly kind: EvalReadKind;
  readonly node: AnyNode;
  readonly state: EvalState;
  /** The key as resolved against the context (case-corrected when caseInsensitive). */
  readonly key: string | number | symbol;
  /** The object the key was read from - the context, an EvalScope, or a plain object. */
  readonly target: unknown;
  /**
   * Dotted path when statically reconstructible (`a.b.c`), else undefined.
   *
   * Reconstructed from the source spelling, so it is *not* case-corrected even
   * when {@link key} is. Computed members (`obj[expr]`) yield undefined; their
   * `key` is still exact.
   */
  readonly path?: string;
  readonly value: unknown;
}

/**
 * A read hook. Like a node hook it is an observer: its return value is
 * discarded and a returned promise is not awaited.
 */
export type EvalReadHook = (event: EvalReadEvent) => void;

/**
 * Removes the hook that returned it. Calling it more than once is a no-op.
 */
export type Unsubscribe = () => void;

/**
 * What to do with an error raised by a hook.
 *
 * - `collect` (default) - wrap it, append it to `state.hookErrors`, keep evaluating.
 * - `throw` - rethrow it into the visitor, failing the evaluation.
 * - `ignore` - swallow it silently.
 */
export type EvalHookErrorPolicy = 'collect' | 'throw' | 'ignore';

/**
 * An error raised by a hook, recorded under the 'collect' policy.
 *
 * `phase` is `'read'` for an error raised by a read hook: a read is neither of
 * the two node phases, and reporting one as 'before' or 'after' would mislead a
 * consumer reading the log.
 */
export interface EvalHookError {
  readonly phase: EvalHookPhase | 'read';
  readonly nodeType: AnyNodeTypes;
  readonly error: unknown;
}

/**
 * The bookkeeping an `EvalHooks` accumulates over a single evaluation.
 *
 * It is grouped behind one accessor on `EvalState` rather than spread across
 * several members, and it lives on the state rather than on the registry: an
 * `EvalHooks` is consumer-owned and may be handed to several evaluations, so
 * anything whose lifetime is one run belongs to the run.
 *
 * @internal Not part of the published API; `EvalHooks` is its only writer.
 */
export interface EvalHookBookkeeping {
  /** Nodes whose 'before' has fired but whose 'after' has not, outermost first. */
  readonly open: AnyNode[];
  /** Hook errors recorded under the 'collect' policy. */
  readonly errors: EvalHookError[];
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
 * A registry of node hooks, keyed by node type with wildcard support, and the
 * dispatcher that keeps `before` and `after` balanced when a visitor throws.
 *
 * It holds *registration* only. Everything whose lifetime is a single
 * evaluation - the open-node stack and the collected errors - lives on the
 * `EvalState` instead, because a consumer may hand one `EvalHooks` to several
 * evaluations and expect each to observe both.
 *
 * Hooks are synchronous by design: the walk in `evaluate` is synchronous even
 * under `evaluateAsync`, so there is no point at which a hook could be awaited.
 */
export class EvalHooks {
  private readonly _before = new Map<string, EvalNodeHook[]>();
  private readonly _after = new Map<string, EvalNodeHook[]>();
  private _read: EvalReadHook[] = [];
  private readonly _policy: EvalHookErrorPolicy;
  private _size = 0;
  private _active = false;

  /**
   * @param options The evaluation options; `onHookError` selects the error policy.
   */
  constructor(options?: EvalOptions) {
    this._policy = readPolicy(options);
  }

  /**
   * True while no hook is registered. Read on the hot path, so it is a counter
   * rather than a walk of the registries.
   */
  public get isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * The dispatch guard, behind `EvalState.hasHooks`.
   *
   * Unlike {@link isEmpty} this *latches*: it turns true on the first
   * registration and only `clear` turns it off again. The guard wraps the
   * open-node stack as well as the hooks themselves, so a value that changed
   * mid-walk would leave `enter` and `exit` unpaired - which is exactly what
   * one-shot and self-unsubscribing hooks would otherwise cause.
   *
   * Calling `clear` during a walk is therefore unsupported.
   */
  public get isActive(): boolean {
    return this._active;
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
    this._active = true;

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
   * Registers a read hook, fired once per resolved context read.
   *
   * Read hooks are not keyed by node type: there are only two emission points
   * and a consumer filters on {@link EvalReadEvent.kind} if it cares.
   *
   * Registration latches {@link isActive} exactly as {@link on} does, because
   * the visitors reach their emission points through the same
   * `EvalState.hasHooks` guard.
   *
   * @param hook The hook to register.
   * @returns A function that removes this hook.
   */
  public onRead(hook: EvalReadHook): Unsubscribe {
    this._read.push(hook);
    this._size++;
    this._active = true;

    let unsubscribed = false;
    return () => {
      if (unsubscribed) {
        return;
      }
      unsubscribed = true;
      this.offRead(hook);
    };
  }

  /**
   * Removes one read hook, or every read hook when `hook` is omitted.
   */
  public offRead(hook?: EvalReadHook): void {
    if (hook === undefined) {
      this._size -= this._read.length;
      this._read = [];
      return;
    }

    const index = this._read.indexOf(hook);
    if (index < 0) {
      return;
    }

    this._read.splice(index, 1);
    this._size--;
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
   * Removes every hook from both phases and unlatches {@link isActive}.
   *
   * Per-run bookkeeping is untouched: the open-node stack and the collected
   * errors belong to the `EvalState`, not to this registry. Errors in
   * particular are a record of what already happened.
   */
  public clear(): void {
    this._before.clear();
    this._after.clear();
    this._read = [];
    this._size = 0;
    this._active = false;
  }

  /**
   * Fires the hooks registered for a node, keyed first and wildcard second.
   *
   * Bookkeeping runs before user code on both edges: 'before' pushes the node
   * onto the open-node stack and *then* emits, 'after' pops and *then* emits.
   * The shared rule is that hook code only ever runs once the stack already
   * tells the truth about this node, because `emit` can throw - under the
   * 'throw' policy a hook's error propagates out of it. Emitting first on the
   * 'before' edge would leave a node that some hooks had already been told
   * about missing from the stack, and therefore invisible to `unwindTo`.
   *
   * @param value The value the visitor pushed; meaningful on 'after' only.
   */
  public dispatch(phase: EvalHookPhase, node: AnyNode, state: EvalState, value?: unknown): void {
    if (phase === 'after') {
      this.exit(state, node);
      this.emit({ phase, node, state, value, completed: true }, false);
      return;
    }

    this.enter(node, state);
    this.emit({ phase, node, state, completed: true }, false);
  }

  /**
   * Fires the read hooks for one resolved context read.
   *
   * The event is built by the caller rather than assembled from positional
   * arguments here, so the visitors allocate nothing on the no-hooks path: the
   * whole construction sits inside their `st.hasHooks` guard.
   *
   * Touches no bookkeeping. A read is not a frame - it happens *within* a
   * node's before/after pair, so the open-node stack is none of its business.
   */
  public dispatchRead(event: EvalReadEvent): void {
    if (this._read.length === 0) {
      return;
    }
    // Iterated as a copy so a hook that unsubscribes itself does not shift the
    // list out from under the loop.
    for (const hook of this._read.slice()) {
      this.invokeRead(hook, event);
    }
  }

  /**
   * Records a node as open on the state. Called by the 'before' dispatcher
   * before its hooks fire.
   */
  public enter(node: AnyNode, state: EvalState): void {
    state.hookBookkeeping.open.push(node);
  }

  /**
   * Closes `node`, matching it by **identity** rather than by position. Called
   * by the 'after' dispatcher before its hooks fire.
   *
   * Three cases:
   *
   * 1. `node` is on top - pop it. The ordinary path, one reference comparison.
   * 2. `node` is open but not on top - some visitor between here and there
   *    never closed itself. Flush those frames innermost-first as
   *    `completed: false`, then pop `node`.
   * 3. `node` is not open at all - pop nothing and emit nothing.
   *
   * Case 3 is what keeps a stray `exit` from draining the stack: the naive
   * "pop until you find it" would walk to the bottom, synthesise an event for
   * every genuinely-open enclosing frame, and leave a later real failure with
   * nothing to unwind.
   *
   * Popping positionally instead would be correct only if every visitor
   * bracketed its body exactly. `await-expression.ts` does not - it catches a
   * child's synchronous throw and continues to its own `afterVisitor` - so a
   * positional pop closes the child's frame under the parent's name, drops the
   * child's `after` entirely, and leaks one frame onto the state for good.
   *
   * The synthesised events carry no `value` (the node never pushed one) and no
   * `error` (nothing threw; the frames are being closed because an enclosing
   * visitor moved on without them).
   *
   * They are emitted under the collect policy even when the consumer chose
   * 'throw'. That is required, not merely lenient: a rethrow here would escape
   * the flush loop before it finished popping, re-creating the leak this
   * identity check exists to prevent. A 'throw'-policy consumer sees these in
   * `state.hookErrors` instead.
   */
  public exit(state: EvalState, node: AnyNode): void {
    const open = state.hookBookkeeping.open;

    if (open.length > 0 && open[open.length - 1] === node) {
      open.pop();
      return;
    }

    // The innermost occurrence is the one being closed: a node can legitimately
    // be open twice, since an arrow-function body is re-walked on every call.
    const index = open.lastIndexOf(node);
    if (index < 0) {
      return;
    }

    while (open.length > index + 1) {
      const stranded = open.pop();
      if (!stranded) {
        break;
      }
      this.emit({ phase: 'after', node: stranded, state, completed: false }, true);
    }

    open.pop();
  }

  /**
   * How many nodes the state has open. Captured as a mark before a walk, since
   * `evaluate` is re-entered with the same state from an arrow-function body.
   *
   * This is a method rather than a getter because the stack it measures lives
   * on the state, not on this registry.
   */
  public depth(state: EvalState): number {
    return state.hookBookkeeping.open.length;
  }

  /**
   * Fires 'after' for every node the state has open above `mark`, innermost
   * first, marked incomplete. Invoked from the catch in `evaluate`, so that a
   * visitor which throws still leaves every 'before' matched by exactly one
   * 'after'.
   *
   * Unwinding to a mark rather than to the bottom is what keeps a nested
   * `evaluate` from draining the enclosing walk's open nodes when a host
   * function swallows the nested throw.
   *
   * Idempotent, so the sync and async entry points can both call it.
   *
   * A hook that throws here cannot stop the drain: while unwinding, the 'throw'
   * policy is downgraded to 'collect' - evaluation has already failed, and the
   * original error is the one worth propagating.
   */
  public unwindTo(mark: number, error: unknown, state: EvalState): void {
    const open = state.hookBookkeeping.open;

    while (open.length > mark) {
      const node = open.pop();
      if (!node) {
        break;
      }
      this.emit({ phase: 'after', node, state, completed: false, error }, true);
    }
  }

  /**
   * Drains the state's whole open-node stack. Equivalent to `unwindTo(0, ...)`,
   * for callers that own the entire walk.
   */
  public unwind(error: unknown, state: EvalState): void {
    this.unwindTo(0, error, state);
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
      this.handleError(event.state, event.phase, event.node.type, error, unwinding);
      return;
    }

    if (isPromiseLike(result)) {
      this.handleError(event.state, event.phase, event.node.type,
        new Error(ASYNC_HOOK_MESSAGE), unwinding);
    }
  }

  /**
   * The read counterpart of {@link invoke}. There is no unwinding equivalent
   * for reads - a read never opens a frame - so the policy always applies in
   * full.
   */
  private invokeRead(hook: EvalReadHook, event: EvalReadEvent): void {
    let result: unknown;

    try {
      result = hook(event);
    } catch (error) {
      this.handleError(event.state, 'read', event.node.type, error, false);
      return;
    }

    if (isPromiseLike(result)) {
      this.handleError(event.state, 'read', event.node.type,
        new Error(ASYNC_HOOK_MESSAGE), false);
    }
  }

  private handleError(state: EvalState,
    phase: EvalHookPhase | 'read',
    nodeType: AnyNodeTypes,
    error: unknown,
    unwinding: boolean): void {

    if (this._policy === 'ignore') {
      return;
    }
    if (this._policy === 'throw' && !unwinding) {
      throw error;
    }
    state.hookBookkeeping.errors.push({ phase, nodeType, error });
  }
}
