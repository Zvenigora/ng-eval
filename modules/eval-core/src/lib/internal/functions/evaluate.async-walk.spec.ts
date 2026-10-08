import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalService } from '../../actual/services';
import { EvalContext, EvalState, defaultParserOptions } from '../classes/eval';
import { callAsync, compileAsync, evaluateAsync, parse } from '.';

interface Fixture {
  readonly context: EvalContext;
  /** Every key resolved through the lookup, in order and with repeats. */
  readonly reads: unknown[];
  /** What `fail` throws. */
  readonly boom: Error;
}

/**
 * A context whose own record is empty, so every identifier the walk resolves
 * falls through to the lookup - the last step of `EvalContext.get`'s order -
 * and is counted there.
 */
const fixture = (): Fixture => {
  const reads: unknown[] = [];
  const boom = new Error('boom');
  const values = new Map<unknown, unknown>([
    ['a', 2],
    ['b', 3],
    ['c', 4],
    ['load', (n: number) => Promise.resolve(n * 10)],
    ['fail', () => { throw boom; }],
  ]);

  const context = new EvalContext({}, {});
  context.lookups.push((key: unknown) => {
    reads.push(key);
    return values.get(key);
  });

  return { context, reads, boom };
};

interface Outcome {
  readonly rejected: boolean;
  readonly value?: unknown;
  readonly error?: unknown;
}

const settle = (promise: Promise<unknown>): Promise<Outcome> =>
  promise.then(
    (value) => ({ rejected: false, value }),
    (error: unknown) => ({ rejected: true, error }));

const programOf = (expression: string) => parse(expression, defaultParserOptions);

type StateEntryPoint = (expression: string, state: EvalState) => Promise<unknown>;
type ContextEntryPoint = (expression: string, context: EvalContext) => Promise<unknown>;

/** The four entry points that take their state from the caller. */
const stateEntryPoints: [string, StateEntryPoint][] = [
  ['evaluateAsync', (expression, state) =>
    evaluateAsync(programOf(expression), state)],
  ['callAsync', (expression, state) =>
    callAsync(compileAsync(programOf(expression)), state)],
  ['CompilerService.callAsync', (expression, state) => {
    const compiler = TestBed.inject(CompilerService);
    return compiler.callAsync(compiler.compileAsync(expression), state);
  }],
  ['EvalService.evalAsync', (expression, state) =>
    TestBed.inject(EvalService).evalAsync(expression, state)],
];

/**
 * All six. The two that build their own state are handed the `EvalContext`
 * itself, which `EvalContext.fromContext` returns by identity, so the lookup
 * and the scope stack observed are the ones their walk used.
 */
const entryPoints: [string, ContextEntryPoint][] = [
  ...stateEntryPoints.map(([name, enter]): [string, ContextEntryPoint] =>
    [name, (expression, context) => enter(expression, EvalState.fromContext(context))]),
  ['CompilerService.simpleCallAsync', (expression, context) => {
    const compiler = TestBed.inject(CompilerService);
    return compiler.simpleCallAsync(compiler.compileAsync(expression), context);
  }],
  ['EvalService.simpleEvalAsync', (expression, context) =>
    TestBed.inject(EvalService).simpleEvalAsync(expression, context)],
];

/**
 * Every async entry point has finished the walk by the time it returns its
 * promise, and a walk that threw has already recorded the failure.
 *
 * `evaluateAsync` is an `async` function whose first `await` comes after
 * `walk.recursive`, so calling it runs the whole traversal synchronously and
 * defers only the resolution of promises left in the result. The README says
 * so ("The walk is synchronous even under `evalAsync`"), but every other async
 * case in the suite awaits before it asserts, so an `await` added ahead of the
 * walk would leave the suite green. The async signal planned for
 * `@zvenigora/ng-eval-signals` rests on it (`docs/signals/phase-5-plan.md`
 * § 1.2 finding 1, and its step 1).
 *
 * The failure case pins one direction only. An arrow's body runs a nested
 * walk on the same state, which writes the same `state.result`, so a failure
 * recorded at return does not on its own mean the promise will reject.
 *
 * Every observation is taken in the synchronous instant after the call
 * returns, kept, and asserted only once the promise has settled. A deferred
 * walk then fails on the assertion that names it, rather than on a rejection
 * nobody was listening to.
 */
describe('the async entry points', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it.each(entryPoints)('%s: should have made every read of the walk by the time it returns',
    async (_, enter) => {
      const { context, reads } = fixture();

      // `load` returns a promise, so there is something left to resolve after
      // the walk - and something a suspending walk could wait on.
      const returned = enter('[load(a), b]', context);
      const readAtReturn = [...reads];
      const outcome = await settle(returned);

      // The distinct keys, not the sequence: how many times resolution consults
      // a lookup per identifier is not what this pins. A walk that read nothing
      // fails here, and settling adding a read fails the count below.
      expect(new Set(readAtReturn)).toEqual(new Set(['a', 'b', 'load']));
      expect(reads.length).toBe(readAtReturn.length);
      expect(outcome).toEqual({ rejected: false, value: [20, 3] });
    });

  it.each(entryPoints)('%s: should have run and popped an arrow called during the walk by the time it returns',
    async (_, enter) => {
      const { context, reads } = fixture();
      // A caller's scope underneath, binding nothing the expression reads, so
      // that a walk which popped more than it pushed would show as well.
      context.push({ unrelated: 0 });
      const depthBefore = context.scopes.length;

      const returned = enter('load((x => x + c)(a))', context);
      const readAtReturn = [...reads];
      const depthAtReturn = context.scopes.length;
      const outcome = await settle(returned);

      // `c` is read only by the arrow's body. The read is what makes the depth
      // check discriminate: a walk that has not started leaves the depth where
      // it was too.
      expect(readAtReturn).toContain('c');
      expect(depthAtReturn).toBe(depthBefore);
      expect(outcome).toEqual({ rejected: false, value: 60 });
    });

  it.each(stateEntryPoints)('%s: should have recorded a walk failure by the time it returns',
    async (_, enter) => {
      const { context, boom } = fixture();
      const state = EvalState.fromContext(context);

      // A valid expression whose walk throws, from inside a call. A syntax
      // error would not do: `evalAsync` parses before it evaluates, so one
      // would throw out of the call and never reach the promise.
      const returned = enter('b + fail()', state);
      const isErrorAtReturn = state.result.isError;
      const errorAtReturn = state.result.error;
      const outcome = await settle(returned);

      expect(isErrorAtReturn).toBe(true);
      expect(outcome.rejected).toBe(true);
      // One object throughout: the call passes a function's own throw on
      // unwrapped, and the result records what it is given.
      expect(outcome.error).toBe(errorAtReturn);
      expect(errorAtReturn).toBe(boom);
    });
});
