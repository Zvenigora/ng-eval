import { TestBed } from '@angular/core/testing';
import { AnyNode, BinaryExpression, ExpressionStatement, Program } from 'acorn';
import { EvalService } from '../../actual/services';
import { EvalContext, EvalHooks, EvalNodeHookEvent, EvalOptions, EvalState } from '../classes/eval';
import { Context } from '../classes/common';
import { evaluate, evaluateAsync, parse } from '../functions';

/**
 * `await`, pinned case by case before A25 and A24 change it
 * (`docs/a24/plan.md` step 2, [SR27](../../../../../../docs/standing-rules.md#sr27)).
 *
 * Every case carries a mark in its title: `[3]` for a case step 3 (A25, the
 * pass-through) rewrote, `[4]` for one step 4 (A24, the accepted position)
 * rewrote, both, or `[-]` for neither. A case marked `4` asserts the refusal
 * since step 4, one marked `3` alone the value since step 3, and one marked
 * `-` the value measured at d62eee4. The marks were measured, not taken from
 * the decisions: each was read off the red set of a prototype of that step,
 * applied alone (the plan's step 2 outcome).
 *
 * - **P**, the positions: twelve places an `await` can sit, each on the sync
 *   and the async path, case-sensitive and under `caseInsensitive`. Under
 *   `caseInsensitive` the context's keys are upper-case, so every row whose
 *   value depends on a binding reads it through the case correction rather
 *   than by its exact key. Eight of the twelve are refused since step 4 (A24),
 *   with the whole message; up to then P4, P6 and P7 gave 1, 1 and `NaN`
 *   whether or not `p` resolved.
 * - **A**, `async` ignored, and a non-thenable operand.
 * - **T**, the timer: one `setTimeout` per evaluation of an `await`, up to
 *   0.14.1, and none since.
 * - **K**, the `__awaitTimeout` key, read off the context's `original` up to
 *   0.14.1, and read by nothing since.
 * - **S**, the position suffix, appended to the caller's own `Error` up to
 *   0.14.1, and to nothing since.
 * - **C**, the conversion of a rejection that is not an `Error`: the visitor's
 *   own up to 0.14.1, and `evaluateAsync`'s `ensureError` since.
 * - **R**, **Q** and **H**, added by step 4: the accepted `await` belongs to
 *   the walk, not to the node; parentheses under `preserveParens` neither
 *   refuse an accepted one nor accept an operand; and a refused one opens no
 *   hook bracket.
 *
 * **A sync case pins a pass-through by identity, never by type**
 * (`docs/a24/plan.md` § 0 rule 2): a promise is a `Promise` whether or not the
 * visitor re-wrapped it, so each one whose value is or holds a promise
 * asserts it *is* `p`. A2's operand, `1`, is not thenable, so it asserts `1`.
 *
 * **The native arm.** Each async P case also runs the same bindings through
 * JavaScript itself, in an `AsyncFunction` built from the row's source, so its
 * value is a second producer and not the evaluator's. A script has no top-level
 * `await` and an async function has no completion value, so the root and
 * program rows' native bodies `return` the last statement's expression - the
 * completion value `eval` gives a script. Where the native value differs from
 * the evaluator's, the evaluator's answer is not JavaScript's. A refused
 * position keeps its native arm: it records what JavaScript gives where
 * `eval-core` refuses.
 *
 * Top-level `await` needs `allowAwaitOutsideFunction`, which the services'
 * default parser options leave off, so every case parses its source itself.
 */
describe('await - its position, the timer, the key, the suffix and the conversion', () => {

  const programOf = (source: string): AnyNode =>
    parse(source, { ecmaVersion: 2020, allowAwaitOutsideFunction: true }) as AnyNode;

  /**
   * `parse` under `extractExpressions`: for `await p`, the `AwaitExpression`
   * itself. Checked, not assumed: were it the `Program`, P1 would be P3's shape,
   * and a program's last-statement `await` is accepted too, so nothing else
   * would notice.
   */
  const expressionOf = (source: string): AnyNode => {
    const node = parse(source, { ecmaVersion: 2020, allowAwaitOutsideFunction: true, extractExpressions: true }) as AnyNode;
    expect(node.type).toBe('AwaitExpression');
    return node;
  };

  interface Bindings {
    readonly p: Promise<number>;
    readonly c: boolean;
    readonly f: (x: unknown) => unknown;
  }

  const bindings = (): Bindings => ({ p: Promise.resolve(2), c: true, f: (x: unknown) => x });

  interface Mode {
    readonly name: string;
    readonly options: EvalOptions;
    readonly context: (b: Bindings) => Context;
  }

  const modes: Mode[] = [
    { name: 'case-sensitive', options: {}, context: ({ p, c, f }) => ({ p, c, f }) },
    { name: 'caseInsensitive', options: { caseInsensitive: true }, context: ({ p, c, f }) => ({ P: p, C: c, F: f }) },
  ];

  type SyncExpectation = (value: unknown, b: Bindings) => Promise<void>;

  /** The operand itself: `p`, by identity. */
  const theOperand: SyncExpectation = async (value, { p }) => {
    expect(value).toBe(p);
  };

  /**
   * Step 4's refusal (A24), written out rather than imported, so that a
   * changed message fails here ([SR18](../../../../../../docs/standing-rules.md#sr18)).
   */
  const REFUSAL = 'Unsupported await position: an await is evaluated only as the result of the expression - the whole expression, an arrow function\'s expression body, or the last statement of a program or of an arrow function\'s block body.';

  /** A position step 4 refuses: both paths throw {@link REFUSAL}. */
  const REFUSED = Symbol('refused');

  type Mark = '-' | '3' | '4' | '3, 4';

  interface Position {
    readonly id: string;
    readonly source: string;
    readonly node: (source: string) => AnyNode;
    readonly sync: SyncExpectation | typeof REFUSED;
    readonly syncMark: Mark;
    readonly async: unknown;
    readonly asyncMark: Mark;
    /** The body of the native `AsyncFunction`, over `p`, `c` and `f`. */
    readonly native: string;
    /** JavaScript's value: what the native arm resolves to. */
    readonly js: unknown;
  }

  const positions: Position[] = [
    {
      id: 'P1 root', source: 'await p', node: expressionOf,
      sync: theOperand, syncMark: '3', async: 2, asyncMark: '-',
      native: 'return await p', js: 2,
    },
    {
      id: 'P2 expression body', source: '(async () => await p)()', node: programOf,
      sync: theOperand, syncMark: '3', async: 2, asyncMark: '-',
      native: 'return (async () => await p)()', js: 2,
    },
    {
      id: 'P3 program, last', source: '1; await p', node: programOf,
      sync: theOperand, syncMark: '3', async: 2, asyncMark: '-',
      native: '1; return await p', js: 2,
    },
    {
      id: 'P4 program, not last', source: 'await p; 1', node: programOf,
      sync: REFUSED, syncMark: '4', async: REFUSED, asyncMark: '4',
      native: 'await p; return 1', js: 1,
    },
    {
      id: 'P5 block, last', source: '(async () => { 1; await p })()', node: programOf,
      sync: theOperand, syncMark: '3', async: 2, asyncMark: '-',
      native: 'return (async () => { 1; await p })()', js: undefined,
    },
    {
      id: 'P6 block, not last', source: '(async () => { await p; 1 })()', node: programOf,
      sync: REFUSED, syncMark: '4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => { await p; 1 })()', js: undefined,
    },
    {
      id: 'P7 operand', source: '(async () => (await p) * 10)()', node: programOf,
      sync: REFUSED, syncMark: '4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => (await p) * 10)()', js: 20,
    },
    {
      id: 'P8 element', source: '(async () => [await p])()', node: programOf,
      sync: REFUSED, syncMark: '3, 4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => [await p])()', js: [2],
    },
    {
      id: 'P9 argument', source: '(async () => f(await p))()', node: programOf,
      sync: REFUSED, syncMark: '3, 4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => f(await p))()', js: 2,
    },
    {
      id: 'P10 initializer', source: '(async () => { let x = await p; x })()', node: programOf,
      sync: REFUSED, syncMark: '3, 4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => { let x = await p; x })()', js: undefined,
    },
    {
      id: 'P11 branch', source: '(async () => c ? await p : 0)()', node: programOf,
      sync: REFUSED, syncMark: '3, 4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => c ? await p : 0)()', js: 2,
    },
    {
      id: 'P12 nested', source: '(async () => await await p)()', node: programOf,
      sync: REFUSED, syncMark: '3, 4', async: REFUSED, asyncMark: '4',
      native: 'return (async () => await await p)()', js: 2,
    },
  ];

  type NativeBody = (p: Promise<number>, c: boolean, f: (x: unknown) => unknown) => Promise<unknown>;

  // Taken from source the engine compiles, not from an `async` arrow in this
  // file: the spec's own `async` is down-levelled through `tslib`'s
  // `__awaiter`, so its `constructor` is plain `Function`.
  const AsyncFunction = new Function('return (async () => undefined).constructor')() as
    new (...parameters: string[]) => NativeBody;

  const runNatively = (row: Position, { p, c, f }: Bindings): Promise<unknown> =>
    new AsyncFunction('p', 'c', 'f', row.native)(p, c, f);

  describe.each(modes)('P, the positions, $name', (mode) => {

    it.each(positions)('$id, sync [$syncMark]: $source', async (row) => {
      const b = bindings();
      const state = EvalState.fromContext(mode.context(b), mode.options);

      const run = (): unknown => evaluate(row.node(row.source), state);

      if (row.sync === REFUSED) {
        expect(run).toThrow(new Error(REFUSAL));
      } else {
        await row.sync(run(), b);
      }
    });

    it.each(positions)('$id, async [$asyncMark]: $source', async (row) => {
      const b = bindings();
      const state = EvalState.fromContext(mode.context(b), mode.options);

      const value = evaluateAsync(row.node(row.source), state);

      if (row.async === REFUSED) {
        await expect(value).rejects.toThrow(new Error(REFUSAL));
      } else {
        expect(await value).toEqual(row.async);
      }
      expect(await runNatively(row, b)).toEqual(row.js);
    });
  });

  describe('R, the accepted await is the walk\'s, not the node\'s', () => {

    // At the top level, `(await p) * 10`'s `await` is an operand: the
    // program's last statement is a multiplication. Walked alone, the same
    // node is the walk's root and its value is the result.
    const treeAndOperand = (): { tree: AnyNode, operand: AnyNode } => {
      const tree = programOf('(await p) * 10');
      const statement = (tree as Program).body[0] as ExpressionStatement;
      const operand = (statement.expression as BinaryExpression).left as AnyNode;
      expect(operand.type).toBe('AwaitExpression');
      return { tree, operand };
    };

    it('R1 the same node as a root, then as an operand [4]: accepted, then refused', () => {
      const { p } = bindings();
      const { tree, operand } = treeAndOperand();

      expect(evaluate(operand, EvalState.fromContext({ p }))).toBe(p);
      expect(() => evaluate(tree, EvalState.fromContext({ p }))).toThrow(new Error(REFUSAL));
    });

    it('R2 the same node as an operand, then as a root [4]: refused, then accepted', () => {
      const { p } = bindings();
      const { tree, operand } = treeAndOperand();

      expect(() => evaluate(tree, EvalState.fromContext({ p }))).toThrow(new Error(REFUSAL));
      expect(evaluate(operand, EvalState.fromContext({ p }))).toBe(p);
    });
  });

  describe('Q, under preserveParens', () => {

    // Parentheses arrive as `ParenthesizedExpression` nodes under the option,
    // so a check on the root's or the last statement's type sees the wrapper.
    // Each case runs one source on both paths.
    const parenthesised = (source: string, extractExpressions = false): AnyNode =>
      parse(source, { ecmaVersion: 2020, allowAwaitOutsideFunction: true, preserveParens: true, extractExpressions }) as AnyNode;

    const accepted = async (node: () => AnyNode): Promise<void> => {
      const { p } = bindings();

      expect(evaluate(node(), EvalState.fromContext({ p }))).toBe(p);
      expect(await evaluateAsync(node(), EvalState.fromContext({ p }))).toBe(2);
    };

    it('Q1 an expression body, (async () => (await p))() [4]: accepted', async () => {
      await accepted(() => parenthesised('(async () => (await p))()'));
    });

    it('Q2 a block\'s last statement, (async () => { 1; ((await p)) })() [4]: accepted', async () => {
      await accepted(() => parenthesised('(async () => { 1; ((await p)) })()'));
    });

    it('Q3 the root, (await p) [4]: accepted', async () => {
      await accepted(() => {
        const node = parenthesised('(await p)', true);
        expect(node.type).toBe('ParenthesizedExpression');
        return node;
      });
    });

    it('Q4 an operand, (async () => ((await p)) * 10)() [4]: refused', async () => {
      const { p } = bindings();
      const node = (): AnyNode => parenthesised('(async () => ((await p)) * 10)()');

      expect(() => evaluate(node(), EvalState.fromContext({ p }))).toThrow(new Error(REFUSAL));
      await expect(evaluateAsync(node(), EvalState.fromContext({ p }))).rejects.toThrow(new Error(REFUSAL));
    });
  });

  describe('H, a refused await under a hook', () => {

    it('H1 (await p) * 10 [4]: no before for the await, and every node opened above it unwound', () => {
      const hooks = new EvalHooks();
      const before: EvalNodeHookEvent[] = [];
      const after: EvalNodeHookEvent[] = [];
      hooks.on('before', '*', (e) => before.push(e));
      hooks.on('after', '*', (e) => after.push(e));
      const state = EvalState.fromContext({ p: bindings().p }, { hooks });

      expect(() => evaluate(programOf('(await p) * 10'), state)).toThrow(new Error(REFUSAL));

      // The hook fired, so the absence below is the refusal's and not a hook
      // that never ran.
      const opened = before.map((e) => e.node.type);
      expect(opened).toContain('BinaryExpression');
      expect(opened).not.toContain('AwaitExpression');
      expect(after.map((e) => e.node.type)).toEqual([...opened].reverse());
      for (const event of after) {
        expect(event.completed).toBe(false);
        expect((event.error as Error).message).toBe(REFUSAL);
      }
      expect(hooks.depth(state)).toBe(0);
    });
  });

  describe('A, async ignored, and a non-thenable', () => {

    it('A1 (async () => 1)(), sync [-]: 1', () => {
      expect(evaluate(programOf('(async () => 1)()'), EvalState.fromContext({}))).toBe(1);
    });

    it('A1 (async () => 1)(), async [-]: 1', async () => {
      expect(await evaluateAsync(programOf('(async () => 1)()'), EvalState.fromContext({}))).toBe(1);
    });

    it('A2 (async () => await 1)(), sync [3]: 1', () => {
      expect(evaluate(programOf('(async () => await 1)()'), EvalState.fromContext({}))).toBe(1);
    });

    it('A2 (async () => await 1)(), async [-]: 1', async () => {
      expect(await evaluateAsync(programOf('(async () => await 1)()'), EvalState.fromContext({}))).toBe(1);
    });
  });

  describe('through EvalService', () => {
    let service: EvalService;

    interface Outcome {
      readonly rejected: boolean;
      readonly value?: unknown;
      readonly error?: unknown;
    }

    const settle = (promise: Promise<unknown>): Promise<Outcome> =>
      promise.then(
        (value) => ({ rejected: false, value }),
        (error: unknown) => ({ rejected: true, error }));

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(EvalService);
    });

    describe('T and K, the timer and the key', () => {
      // Replaced, not wrapped, so no case arms a real timer. Up to 0.14.1 the
      // race then settled with its operand, as it did whenever the operand
      // settled first; since step 3 nothing arms one.
      let setTimeoutSpy: jest.SpyInstance;
      let clearTimeoutSpy: jest.SpyInstance;

      /** The delay of every `setTimeout` armed since the case began, in order. */
      const delays = (): unknown[] => setTimeoutSpy.mock.calls.map((call) => call[1]);

      beforeEach(() => {
        setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout')
          .mockImplementation((() => 0) as unknown as typeof setTimeout);
        clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout')
          .mockImplementation(() => undefined);
      });

      afterEach(() => {
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
      });

      it('T1 one await through evalAsync [3]: no timer', async () => {
        const p = Promise.resolve(2);

        await expect(service.evalAsync(programOf('await p'), service.createState({ p }))).resolves.toBe(2);

        expect(delays()).toEqual([]);
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
      });

      it('T2 one await through eval [3]: no timer', async () => {
        const p = Promise.resolve(2);

        const value = service.eval(programOf('await p'), service.createState({ p }));

        await expect(value).resolves.toBe(2);
        expect(delays()).toEqual([]);
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
      });

      it('T3 one expression evaluated twice [3]: no timer for either', async () => {
        const p = Promise.resolve(2);
        const node = programOf('await p');

        await expect(service.evalAsync(node, service.createState({ p }))).resolves.toBe(2);
        await expect(service.evalAsync(node, service.createState({ p }))).resolves.toBe(2);

        expect(delays()).toEqual([]);
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
      });

      it('K1 __awaitTimeout on a plain object [3]: no timer', async () => {
        const p = Promise.resolve(2);

        await expect(service.evalAsync(programOf('await p'),
          service.createState({ p, __awaitTimeout: 1 }))).resolves.toBe(2);

        expect(delays()).toEqual([]);
      });

      it('K2 __awaitTimeout on an EvalContext\'s original [3]: no timer', async () => {
        const p = Promise.resolve(2);
        const context = new EvalContext({ p, __awaitTimeout: 1 }, {});

        await expect(service.evalAsync(programOf('await p'), service.createState(context))).resolves.toBe(2);

        expect(delays()).toEqual([]);
      });

      it('K3 __awaitTimeout under caseInsensitive [3]: no timer', async () => {
        // Up to 0.14.1 `fromContext`'s `Registry` copy hid the key, which the
        // visitor read off `original` by index, so the timer was 30 000.
        const p = Promise.resolve(2);
        const context = { p, __awaitTimeout: 1 };

        await expect(service.evalAsync(programOf('await p'),
          service.createState(context, { caseInsensitive: true }))).resolves.toBe(2);

        expect(delays()).toEqual([]);
      });
    });

    describe('S, the suffix', () => {

      it('S1 one rejection of the caller\'s Error [3]: the same Error, its message unchanged', async () => {
        const e = new Error('later');
        const context = { rejecting: () => Promise.reject(e) };

        const outcome = await settle(service.evalAsync(programOf('await rejecting()'), service.createState(context)));

        expect(outcome.rejected).toBe(true);
        expect(outcome.error).toBe(e);
        expect(e.message).toBe('later');
      });

      it('S2 the same Error through two evaluations [3]: unchanged by either', async () => {
        const e = new Error('later');
        const context = { rejecting: () => Promise.reject(e) };
        const node = programOf('await rejecting()');

        const first = await settle(service.evalAsync(node, service.createState(context)));
        const second = await settle(service.evalAsync(node, service.createState(context)));

        expect(first.error).toBe(e);
        expect(second.error).toBe(e);
        expect(e.message).toBe('later');
      });
    });

    describe('C, the conversion of a rejection that is not an Error', () => {

      it.each([
        ['C1 a string', 'x', 'x'],
        ['C2 an object', { k: 1 }, 'Promise rejected with object: {"k":1}'],
        ['C3 undefined', undefined, 'Promise rejected with undefined'],
      ])('%s [3]: evaluateAsync\'s ensureError, as with no await', async (_name, rejection, message) => {
        const context = { rejecting: () => Promise.reject(rejection) };

        const outcome = await settle(service.evalAsync(programOf('await rejecting()'), service.createState(context)));

        expect(outcome.rejected).toBe(true);
        expect(outcome.error).toBeInstanceOf(Error);
        expect((outcome.error as Error).message).toBe(message);
      });
    });
  });
});
