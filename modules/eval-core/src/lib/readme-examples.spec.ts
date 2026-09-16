import { TestBed } from '@angular/core/testing';
import {
  ASYNC_HOOK_MESSAGE,
  CompilerService,
  DiscoveryService,
  EMPTY_COMPLETION,
  EvalContext,
  EvalHooks,
  EvalScope,
  EvalScopeOptions,
  EvalService,
  ParserService,
  createTimingHook,
} from '../public-api';

/**
 * Executes the snippets in `modules/eval-core/README.md`.
 *
 * **Not** the root `README.md`, which `docs/gates/plan.md` step 4 assessed and
 * **dropped**. The two files fail differently and the verdict is per file: 0 of
 * the root's 11 `javascript` blocks are runnable as printed and 9 do not parse
 * at all — a bare `...` line and `private service: EvalService;` outside a class
 * body. Gating it would mean rewriting the opening style of 9 of those 11
 * blocks — a whole-file documentation rewrite plan § 8.3 holds open as its own
 * question — or else putting the entire program into every case's substitution
 * list, which is F3's "considered and rejected" shape. This file needed a style
 * rewrite in **4** of its 12 blocks, three of them introduced by step 2 itself,
 * and bindings the document already implied in five more. See
 * `docs/gates/step-4-summary.md` § 1 and § 3 for the inventory and the ground.
 *
 * Follows `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts`, which
 * is the pattern, and `modules/eval-signals/src/lib/readme-examples.spec.ts`,
 * which is the same gate one package over.
 *
 * **What it is not.** It does not read the markdown; nothing keeps a case and
 * the block it mirrors in step but a human. `src/public-api.spec.ts` is the
 * other half — that one gates *what the README says*, this one gates *whether
 * what it says runs*.
 *
 * ## Coverage — all 14 ` ```javascript ` blocks
 *
 * Counted 2026-09-08 at twelve, **including the indented fence** inside the
 * `onHookError` bullet, which a `^```` scan misses; that miss is why both the
 * plan's "8" and step 2's corrected "11" were one short. **Step 6 added two**,
 * for the two options Phase 2 shipped, and both are covered rather than
 * excused — so the count is now fourteen blocks under twelve cases. Sections
 * whose later blocks continue an earlier one are a single case, split only
 * where the document declares a fresh start by re-declaring its own bindings.
 *
 * | Case | Blocks |
 * | --- | --- |
 * | Parsing | `### Parsing` |
 * | Discovery | `### Discovery` |
 * | Scopes | `### Scopes` |
 * | Per-node timing | `### Per-node timing` |
 * | An adopted registry | the `createTimingHook` block — its own state, because its sentence is about a registry the caller built |
 * | Iteration budget | `### Iteration budget` — **step 6** |
 * | The empty-completion sentinel | the `EMPTY_COMPLETION` block under `#### Statements and the empty-completion sentinel` — **step 6** |
 * | Evaluation hooks | `### Evaluation hooks` **+** the `onRead` block **+** the `ASYNC_HOOK_MESSAGE` block, all against one `state` |
 * | Hook errors | the `onHookError: 'collect'` block |
 * | An owned registry's policy | the indented `EvalHooks` block |
 * | A failed evaluation | the `boom` block |
 * | An abandoned child | the `compiler.call` block |
 *
 * **The count is hand-transcribed and nothing keeps it honest but this line.**
 * It has now been wrong twice and corrected three times, which is the argument
 * for the gate this file is not: `docs/backlog.md` F10 and F11 carry what the
 * drift gate next door cannot see, and a block-count gate is neither of them.
 *
 * Nothing is uncovered. There are no `sh` or `json` blocks in this file, and no
 * ` ```ts ` fence — this document and the root are `javascript` throughout,
 * which is what makes a `ts`-scanning spec find zero blocks here and read that
 * as ungateability.
 *
 * ## What this step changed in the README, and how far it went
 *
 * Twelve blocks, of which **four did not parse as printed** before this step:
 * the `### Per-node timing` block, and the three `### Parsing` / `### Discovery`
 * / `### Scopes` blocks that **step 2 itself added** in the file's prevailing
 * fragment style. All four opened `private service: X;` followed by a bare
 * `...`. Each now opens `const service = inject(X);` instead. Of the eight that
 * already parsed, **five** gained the `service` / `context` / `compiler`
 * bindings their sections had been assuming from earlier prose; the other three
 * — `createTimingHook`, `onRead`, `ASYNC_HOOK_MESSAGE` — are continuations and
 * gained nothing. The `createTimingHook` block was later given its own state
 * anyway, for the reason its case records.
 *
 * **This touched the fragments' prevailing style, which is reportable rather
 * than free.** It went exactly as far as making each block a program and no
 * further: no prose was rewritten, no example was replaced, and the
 * injected-service opening survives as `inject(…)` rather than being dropped.
 * What it left: the root README, whose identical opening is the reason that file
 * was dropped rather than converted.
 *
 * ## Substitutions — everything this file supplies that the README does not
 * print
 *
 * 1. **The import specifier.** The README prints
 *    `from '@zvenigora/ng-eval-core'`; from inside this project that line is an
 *    `@nx/enforce-module-boundaries` error, so the imports above read
 *    `../public-api` (plan § 1.2, measured there).
 * 2. **`TestBed.inject` for the README's `inject(…)`.** The document shows
 *    Angular's `inject`, which needs an injection context; the cases take the
 *    same services from `TestBed`.
 * 3. **`nodeTimings`' `total` is not asserted as printed.** The block prints
 *    `{ count: 2, total: 0.081 }`; `count` is exact and asserted, `total` is
 *    wall-clock and is asserted only as a number. The README now says so on the
 *    line above, so this is a disclosed limit of the example rather than a
 *    silent weakening.
 * 4. **The `EvalHooks` block's behavioural claim.** That block prints no value.
 *    Its point is the sentence above it — a registry you own keeps the policy it
 *    was built with — so the case asserts that a hook error from that state
 *    throws, which is what `onHookError: 'throw'` means.
 * 5. **A faulty observer** in the `Hook errors` case. `state.hookErrors` cannot
 *    be non-empty unless some hook throws, and the README's block now registers
 *    one — that line was added to the document, not kept here.
 * 6. **An async hook** in the `ASYNC_HOOK_MESSAGE` case, for the same reason:
 *    the block tests `hookErrors.some(…)`, which is vacuously `false` unless a
 *    hook returned a promise.
 *
 * 7. **An arrow-parameter read** in the `onRead` case. The block prints
 *    `event.scoped; // true for arrow-function parameters - not dependencies`,
 *    and its own program contains no arrow function, so the only half reachable
 *    from it is the other one — where `scoped` is `undefined`, not `false`. The
 *    case asserts that as printed *and* evaluates `list.map(x => x + 1)` to
 *    assert the `true` the comment is actually about. Without it the sentence's
 *    content would be ungated.
 *
 * 8. **Two type narrowings.** The README prints `ast.type` and
 *    `expressions.length`; both accessors return `… | undefined` under this
 *    library's `strict`, so the cases read `ast?.type` and
 *    `expressions?.length`. And `compiler.call`'s result is cast to
 *    `() => Promise<unknown>` where the block calls `arrow()` directly. Neither
 *    changes a claim, and both are here because the enumeration is worth more
 *    than its tidiness.
 *
 * Items 3 to 8 are the same class — a value, a precondition or a narrowing the
 * block does not print — and are listed separately because the enumeration is
 * the only thing standing against an unlisted one (plan § 7, risk 3, accepted
 * rather than gated).
 */
describe('documented examples', () => {

  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('should parse an expression into an ESTree AST', () => {
    const parser = TestBed.inject(ParserService);

    const ast = parser.parse('1 + foo');

    expect(ast?.type).toBe('BinaryExpression');
  });

  it('should extract every node of a given type', () => {
    const discovery = TestBed.inject(DiscoveryService);

    const expressions = discovery.extract('1 + 2 * a', 'BinaryExpression');

    expect(expressions?.length).toBe(2);
  });

  it('should evaluate through a prior scope with its own namespace and thisArg', () => {
    const cat = {
      name: 'Miss Kitty',
      num: 3,
      action: function (args: string[], n: number, t: string) {
        return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;
      }
    };

    const evalContext = new EvalContext({ args: ['says', 'meow'] }, {});

    const catOptions: EvalScopeOptions = {
      global: false,
      caseInsensitive: false,
      namespace: 'cat',
      thisArg: cat
    };
    evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

    const result = service.simpleEval('cat.action(args, cat.num, "times")', evalContext);

    expect(result).toBe('Miss Kitty says meow 3 times');
  });

  it('should accumulate per-node-type timings for a state that owns its registry', () => {
    const context = { a: 2, b: 3, c: 4 };
    const state = service.createState(context, { trackTime: true });

    const result = service.eval('a + b * c', state);

    expect(result).toBe(14);

    // `count` as printed; `total` is wall-clock (substitution 3).
    expect(state.nodeTimings.get('BinaryExpression')?.count).toBe(2);
    expect(typeof state.nodeTimings.get('BinaryExpression')?.total).toBe('number');
    expect(state.nodeTimings.get('Identifier')?.count).toBe(3);
    expect(typeof state.nodeTimings.get('Identifier')?.total).toBe('number');
  });

  it('should bound a loop at the configured iteration budget', () => {
    // The `### Iteration budget` block, added by step 6.
    expect(service.simpleEval('for (let i = 0; i < 3; i++) { i }')).toBe(2);

    const state = service.createState({}, { maxIterations: 10 });

    // The block prints the message from a `catch`; asserting the throw and the
    // message together is the same claim without the control flow.
    expect(() => service.eval('for (let i = 0; i < 100; i++) { i }', state))
      .toThrow('Iteration budget exhausted after 10 iterations');
  });

  it('should show the empty-completion sentinel to an after hook on a declaration', () => {
    // The `#### Statements and the empty-completion sentinel` block, added by
    // step 6.
    //
    // **What makes this non-vacuous is the sentinel's *identity*, not the
    // hook firing.** `event.value !== EMPTY_COMPLETION` is `true` for every
    // node in the walk except the ones that produced nothing, so a hook
    // registered on `'*'` would push a list of mostly `true` and prove
    // nothing. It is registered on `VariableDeclaration` alone, which is the
    // one node type in this expression whose completion value is the sentinel.
    const state = service.createState({ a: 1 });
    const produced: boolean[] = [];

    state.hooks.on('after', 'VariableDeclaration', (event) => {
      produced.push(event.value !== EMPTY_COMPLETION);
    });

    expect(service.eval('let x = 1; x + a', state)).toBe(2);
    expect(produced).toEqual([false]);

    // The prose above the block, which the block itself does not print: the
    // sentinel is not `undefined`, so a statement that genuinely produced
    // `undefined` still wins over an earlier value.
    expect(service.simpleEval('a; noop()', { a: 'A', noop: () => undefined }))
      .toBeUndefined();
  });

  it('should leave an adopted registry unconfigured until the hook is installed', () => {
    // The `createTimingHook` block. Its own state, because the sentence it
    // illustrates is about a registry the *caller* built — `trackTime` must not
    // reach it. Asserting `install` returns a function would have gated
    // nothing: the signature already says so.
    const context = { a: 2, b: 3, c: 4 };
    const hooks = new EvalHooks();
    const state = service.createState(context, { hooks, trackTime: true });

    service.eval('a + b * c', state);

    expect(state.nodeTimings.size).toBe(0);

    const off = createTimingHook().install(state.hooks);
    service.eval('a + b * c', state);

    expect(state.nodeTimings.get('BinaryExpression')?.count).toBe(2);
    off();
  });

  it('should report node events and resolved reads through the state hooks', () => {
    const state = service.createState({ a: 2, b: 3 });
    const events: { type: string; value: unknown }[] = [];

    const off = state.hooks.on('after', 'BinaryExpression', (event) => {
      events.push({ type: event.node.type, value: event.value });
    });

    expect(service.eval('a + b', state)).toBe(5);
    expect(events).toEqual([{ type: 'BinaryExpression', value: 5 }]);

    // `off(); // every on returns its unsubscribe` — asserted by the fact that
    // the second evaluation below adds no further event.
    off();

    // The `onRead` block, against the same state.
    const reads: {
      kind: string;
      key: unknown;
      path: unknown;
      scoped: boolean | undefined;
    }[] = [];
    state.hooks.onRead((event) => {
      reads.push({
        kind: event.kind,
        key: event.key,
        path: event.path,
        scoped: event.scoped,
      });
    });

    service.eval('a + b', state);

    // `scoped` is `undefined` for an ordinary read, not `false`. The printed
    // comment states only what `true` means, so that is the half asserted
    // below (substitution 7).
    expect(reads).toEqual([
      { kind: 'identifier', key: 'a', path: 'a', scoped: undefined },
      { kind: 'identifier', key: 'b', path: 'b', scoped: undefined },
    ]);
    expect(events).toHaveLength(1);   // `off()` above really unsubscribed

    const scopedState = service.createState({ list: [1, 2] });
    const scopedReads: (boolean | undefined)[] = [];
    scopedState.hooks.onRead((event) => {
      if (event.key === 'x') scopedReads.push(event.scoped);
    });

    service.eval('list.map(x => x + 1)', scopedState);

    expect(scopedReads.length).toBeGreaterThan(0);
    expect(scopedReads.every((scoped) => scoped === true)).toBe(true);

    // The `ASYNC_HOOK_MESSAGE` block. A promise-returning hook is this file's
    // (substitution 6): `some(…)` is vacuously false without one.
    state.hooks.on('after', 'Identifier', () => Promise.resolve());
    service.eval('a + b', state);

    expect(
      state.hookErrors.some(
        (e) => e.error instanceof Error && e.error.message === ASYNC_HOOK_MESSAGE
      )
    ).toBe(true);
  });

  it('should collect a faulty hook error rather than propagate it', () => {
    const context = { a: 2, b: 3 };

    const state = service.createState(context, { onHookError: 'collect' });
    state.hooks.on('after', 'Identifier', () => { throw new Error('faulty observer'); });

    service.eval('a + b', state);

    expect(state.hookErrors.length).toBeGreaterThan(0);
    // `phase` and `nodeType` are known from the registration above, so they are
    // asserted rather than matched by type — a mis-attributed phase is a real
    // failure mode elsewhere in this file's hook layer.
    expect(state.hookErrors[0]).toEqual(
      expect.objectContaining({
        phase: 'after',
        nodeType: 'Identifier',
        error: expect.any(Error),
      })
    );
  });

  it('should keep the policy an owned registry was constructed with', () => {
    const context = { a: 2, b: 3 };

    const hooks = new EvalHooks({ onHookError: 'throw' });
    // `onHookError` is passed here too, which is the trap the section is about:
    // an adopted registry keeps the policy it was *built* with and options
    // never reconfigure it. Without this argument the case would pass on an
    // implementation where they did (substitution 4).
    const state = service.createState(context, { hooks, onHookError: 'collect' });

    // The block prints no value; this is its sentence.
    state.hooks.on('after', 'Identifier', () => { throw new Error('faulty observer'); });

    expect(() => service.eval('a + b', state)).toThrow('faulty observer');
  });

  it('should synthesise completed: false with an error when the walk fails', () => {
    const boom = () => { throw new Error('kaboom'); };
    const state = service.createState({ boom });
    const seen: [string, boolean][] = [];

    state.hooks.on('after', '*', (e) => {
      if (!e.completed) seen.push([e.node.type, 'error' in e]);
    });

    try { service.eval('1 + boom()', state); } catch { /* rethrown */ }

    // Two entries before Phase 2 step 1, four after: `ExpressionStatement` and
    // `Program` are walked nodes now, so the unwinder closes them too. The
    // README block above carries the same four.
    expect(seen).toEqual([
      ['CallExpression', true], ['BinaryExpression', true],
      ['ExpressionStatement', true], ['Program', true],
    ]);
  });

  it('should synthesise completed: false without an error for an abandoned child', async () => {
    const compiler = TestBed.inject(CompilerService);

    const state = service.createState({ obj: {} });
    const seen: [string, boolean][] = [];

    state.hooks.on('after', '*', (e) => {
      if (!e.completed) seen.push([e.node.type, 'error' in e]);
    });

    const fn = compiler.compile('async () => await obj.__proto__');
    const arrow = compiler.call(fn, state) as () => Promise<unknown>;

    expect(seen).toEqual([]);

    await arrow().catch(() => undefined);

    expect(seen).toEqual([['MemberExpression', false]]);
  });
});
