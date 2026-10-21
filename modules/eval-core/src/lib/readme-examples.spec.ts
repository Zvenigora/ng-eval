import * as fs from 'fs';
import * as path from 'path';
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
  provideColonIdentifiers,
} from '../public-api';

/** The ` ```javascript ` fences in `modules/eval-core/README.md`, indented ones included. */
const README_JAVASCRIPT_BLOCKS = 25;

/** The ` ```sh ` fences: `## Install`'s. */
const README_SH_BLOCKS = 1;

/** The ` ```json ` fences: `### Parsing`'s AST. */
const README_JSON_BLOCKS = 1;

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
 * **What it is not.** It reads the markdown only to count its blocks, in the
 * last case below; nothing keeps a case and the block it mirrors in step but a
 * human. `src/public-api.spec.ts` is the other half — that one gates *what the
 * README says*, this one gates *whether what it says runs*.
 *
 * ## Coverage — every ` ```javascript ` block, `README_JAVASCRIPT_BLOCKS` of them
 *
 * Counted 2026-09-08 at twelve, **including the indented fence** inside the
 * `onHookError` bullet, which a `^```` scan misses; that miss is why both the
 * plan's "8" and step 2's corrected "11" were one short. **Step 6 added two**,
 * for the two options Phase 2 shipped, and both are covered rather than
 * excused. **A12's documentation added two more**, the `### Bounding the
 * trace` blocks, with no case, and this docblock went on claiming full
 * coverage until the count case below first read the file; both are covered
 * now. **Phase 9 step 3 added one**, `### Colon-joined names`, covered in a
 * `describe` of its own because it declares its own root providers, and
 * **step 7 a second**, the section's writing rules, which continues the
 * first's `service` and so is the same case. **Phase 10 step 3 added seven**,
 * the root README's API sections moved here, each covered by a case of its
 * own. Sections
 * whose later blocks continue an earlier one are a single case, split only
 * where the document declares a fresh start by re-declaring its own bindings.
 *
 * | Case | Blocks |
 * | --- | --- |
 * | Parsing | `### Parsing` **+** the AST `json` block under it — **Phase 10 step 3** |
 * | Evaluation | `### Evaluation`'s first block — **Phase 10 step 3** |
 * | Built-ins | the built-ins block, which re-declares `context` — **Phase 10 step 3** |
 * | Compilation | `### Compilation` — **Phase 10 step 3** |
 * | Async evaluation | the `simpleEvalAsync` block — **Phase 10 step 3** |
 * | Async compilation | the `simpleCallAsync` block, which re-declares `service` — **Phase 10 step 3** |
 * | Discovery | `### Discovery` |
 * | Scopes | `### Scopes` |
 * | Case-insensitive evaluation | `### Case-insensitive evaluation` — **Phase 10 step 3** |
 * | Evaluation with state | `### Evaluation with state` — **Phase 10 step 3** |
 * | Colon-joined names | `### Colon-joined names` — **Phase 9 step 3** **+** the section's second block, the consequent and the quoted key — **step 7** |
 * | Per-node timing | `### Per-node timing` |
 * | An adopted registry | the `createTimingHook` block — its own state, because its sentence is about a registry the caller built |
 * | Iteration budget | `### Iteration budget` — **step 6** |
 * | Bounding the trace | the first `### Bounding the trace` block — **F13** |
 * | A truncated trace | the second, which re-declares `state` and so starts fresh — **F13** |
 * | The empty-completion sentinel | the `EMPTY_COMPLETION` block under `#### Statements and the empty-completion sentinel` — **step 6** |
 * | Evaluation hooks | `### Evaluation hooks` **+** the `onRead` block **+** the `ASYNC_HOOK_MESSAGE` block, all against one `state` |
 * | Hook errors | the `onHookError: 'collect'` block |
 * | An owned registry's policy | the indented `EvalHooks` block |
 * | A failed evaluation | the `boom` block |
 * | A synchronous throw under `await` | the `compiler.call` block |
 *
 * **The count is `README_JAVASCRIPT_BLOCKS`, and the last case holds it to the
 * file** (`docs/backlog.md` F13): it reads the README and counts its
 * ` ```javascript ` fences at any indentation. Hand-transcribed, it was wrong
 * three times. What is gated is the count. Which case covers which block, the
 * table above, is still kept in step by hand.
 *
 * Nothing is uncovered. Besides the `javascript` blocks there are
 * `README_SH_BLOCKS` `sh` block, `## Install`'s command, which a case has
 * nothing to run against, and `README_JSON_BLOCKS` `json` block, the AST under
 * `### Parsing`, which the Parsing case asserts whole. The count case holds both
 * numbers and fails on a fence in any other language, an unlabelled one
 * included. There is no ` ```ts ` fence — this document and the root are
 * `javascript` throughout, which is what makes a `ts`-scanning spec find zero
 * blocks here and read that as ungateability.
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
 * **Phase 10 step 3 converted it**, by moving its API sections here under the
 * same rule, and went further than the step above in one respect: three moved
 * examples changed, because a wrong implementation the plan names could not
 * fail against them as printed. The case-insensitive block gained a member
 * read, each async block a nested promise, and the state block options that
 * are not the defaults. The promise example's `setTimeout` waits 10 ms, not
 * 1000, and the built-ins block gained the line that uses them. Each claim is
 * the root's. `docs/documentation/phase-10-plan.md`, Revision 4, records why.
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
 * 7. **An arrow-parameter read** in the `onRead` case. The block's comment on
 *    `event.scoped` says it is true when a scope on the context's stack binds
 *    the name - an arrow parameter, a let or const, or a scope pushed with
 *    `EvalContext.push` - and its own program binds none, so the only half
 *    reachable from it is the other one — where `scoped` is `undefined`, not
 *    `false`. The case asserts that as printed *and* evaluates
 *    `list.map(x => x + 1)` to assert the `true` for an arrow parameter, the
 *    first of the three. The other two are asserted in `read-hooks.spec.ts`,
 *    under "the scoped flag": a `let` and a block-scoped `const` read, and a
 *    name bound by a scope the caller pushed, each walked from its `Program`.
 *
 * 8. **Two type narrowings.** The README prints `ast.type` and
 *    `expressions.length`; both accessors return `… | undefined` under this
 *    library's `strict`, so the cases read `ast?.type` and
 *    `expressions?.length`. And `compiler.call`'s result is cast to
 *    `() => Promise<unknown>` where the block calls `arrow()` directly. Neither
 *    changes a claim, and both are here because the enumeration is worth more
 *    than its tidiness.
 *
 * 9. **`TestBed`'s providers for `appConfig`.** The `### Colon-joined names`
 *    block declares the application's root providers; the case hands the same
 *    object to `TestBed.configureTestingModule`, whose injector is the root its
 *    services resolve from, as the application's would be.
 *
 * 10. **The `### Parsing` prose, asserted alongside its blocks.** The `json`
 *    block is compared with `toEqual`, which does not check that acorn's nodes
 *    are instances of its `Node` class. The sentence after it names
 *    `ParserService`'s defaults, read from `parserOptions`, and the `Program`
 *    the other three services parse into, which no block prints. The case
 *    supplies the expression `1 + foo`, the context `{ foo: 2 }` and the value
 *    `3` it evaluates to, reads the `Program` through an `after` hook of its own
 *    for `EvalService` and `CompilerService`, and for `DiscoveryService` extracts
 *    it.
 *
 *    The Compilation and async-compilation cases name `CompilerService`
 *    `compiler` where its blocks name it `service`, since `service` is this
 *    file's `EvalService`; the bindings are otherwise the blocks'.
 *
 * 11. **The built-ins block's first half.** The block prints only the call
 *    the added built-ins make possible. The sentence above it says the default
 *    context holds none, so the case also evaluates the same expression with no
 *    context and asserts the call sandbox's refusal of an undefined callee.
 *
 * Items 3 to 8, 10 and 11 are the same class — a value, a precondition or a
 * narrowing the block does not print — and are listed separately because the enumeration is
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

    // The `json` block under it, whole (substitution 10).
    expect(ast).toEqual({
      type: 'BinaryExpression',
      start: 0,
      end: 7,
      left: { type: 'Literal', start: 0, end: 1, value: 1, raw: '1' },
      operator: '+',
      right: { type: 'Identifier', start: 4, end: 7, name: 'foo' },
    });

    // The sentence after it: the parser's defaults, and the `Program` the
    // other services parse into, seen as the walk's outermost node.
    expect(parser.parserOptions).toEqual(
      expect.objectContaining({ ecmaVersion: 2020, cacheSize: 100, extractExpressions: true })
    );
    const state = service.createState({ foo: 2 });
    const outermost: string[] = [];
    state.hooks.on('after', 'Program', (event) => { outermost.push(event.node.type); });
    expect(service.eval('1 + foo', state)).toBe(3);
    expect(outermost).toEqual(['Program']);

    const compiler = TestBed.inject(CompilerService);
    expect(compiler.call(compiler.compile('1 + foo'), state)).toBe(3);
    expect(outermost).toEqual(['Program', 'Program']);

    const discovery = TestBed.inject(DiscoveryService);
    expect(discovery.extract('1 + foo', 'Program')?.length).toBe(1);
  });

  it('should evaluate an expression against the given context', () => {
    // `### Evaluation — EvalService`'s first block.
    const expression = '2 + 3 * a';
    const context = { a: 10 };

    expect(service.simpleEval(expression, context)).toBe(32);
  });

  it('should reach the built-ins the context holds and no others', () => {
    // The built-ins block, and both halves of the sentence above it: the
    // default context holds none, and the ones added are callable
    // (substitution 11).
    const context = {
      Date,
      Array,
      Object,
      encodeURI,
      decodeURI,
      isFinite,
      isNaN,
      JSON,
      Math,
      parseFloat,
      parseInt,
      RegExp,
    };

    expect(service.simpleEval('Math.max(1, 2) + parseInt("40")', context)).toBe(42);
    expect(() => service.simpleEval('Math.max(1, 2) + parseInt("40")'))
      .toThrow('Cannot call undefined or null function');
  });

  it('should compile once and call against a context', () => {
    // `### Compilation — CompilerService`.
    const compiler = TestBed.inject(CompilerService);

    const fn = compiler.compile('x + y');
    const context = { x: 1, y: 2 };
    const options = { caseInsensitive: false };

    expect(compiler.simpleCall(fn, context, options)).toBe(3);
  });

  it('should await a promise the result holds, at the top or nested', async () => {
    // The first `### Async evaluation and compilation` block.
    const context = {
      one: 1,
      two: 2,
      asyncFunc: async (a: number, b: number) => { return await (a + b); }
    };

    expect(await service.simpleEvalAsync('asyncFunc(one, two)', context)).toBe(3);
    expect(await service.simpleEvalAsync('[asyncFunc(one, two), two]', context)).toEqual([3, 2]);
  });

  it('should await a compiled expression\'s promise, at the top or nested', async () => {
    // The second block. Its `setTimeout` waits 10 ms, where the root README's
    // waited 1000 (plan § 3.4).
    const compiler = TestBed.inject(CompilerService);
    const context = {
      one: 1,
      two: 2,
      promiseFunc: (a: number, b: number) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            return resolve(a + b);
          }, 10);
        });
      }
    };

    const fn = compiler.compileAsync('promiseFunc(one, two)');
    expect(await compiler.simpleCallAsync(fn, context)).toBe(3);

    const nested = compiler.compileAsync('({ sum: promiseFunc(one, two) })');
    expect(await compiler.simpleCallAsync(nested, context)).toEqual({ sum: 3 });
  });

  it('should extract every node of a given type', () => {
    const discovery = TestBed.inject(DiscoveryService);

    const expressions = discovery.extract('1 + 2 * a', 'BinaryExpression');

    expect(expressions?.length).toBe(2);
  });

  it('should evaluate through a prior scope with its own namespace', () => {
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
      thisArg: { name: 'Mister Whiskers' }
    };
    evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

    const result = service.simpleEval('cat.action(args, cat.num, "times")', evalContext);

    // A `thisArg` other than the scope's object, so the output depends on it:
    // with `thisArg: cat`, as up to 0.6.x, the case passed whether or not it
    // was applied (`docs/backlog-retired.md` A7).
    expect(result).toBe('Mister Whiskers says meow 3 times');
  });

  it('should resolve identifiers and member names case-insensitively', () => {
    // `### Case-insensitive evaluation`. The member read is what the walk's
    // own options decide; an identifier is resolved by the context's.
    const options = { caseInsensitive: true };

    expect(service.simpleEval('2 + 3 * A', { a: 10 }, options)).toBe(32);
    expect(service.simpleEval('User.NAME', { user: { name: 'Ann' } }, options)).toBe('Ann');
  });

  it('should evaluate against a state and keep its execution history', () => {
    // `### Evaluation with state`. Its options are not the defaults, so a
    // state that dropped them would read `A` as nothing.
    const state = service.createState({ a: 10 }, { caseInsensitive: true });

    expect(service.eval('2 + 3 * A', state)).toBe(32);
    expect(state.result.trace.map((item) => `${item.expression} = ${item.value}`)).toEqual([
      '2 = 2', '3 = 3', 'A = 10', '3 * A = 30', '2 + 3 * A = 32', '2 + 3 * A = 32', '2 + 3 * A = 32',
    ]);
    expect(state.result.traceTruncated).toBe(false);
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

  it('should keep the whole trace of a walk under the default bound', () => {
    // The first `### Bounding the trace` block, which A12's documentation
    // added with no case (docs/backlog.md F13).
    const state = service.createState({ a: 10 });
    service.eval('2 + 3 * a', state);

    expect(state.result.trace.length).toBe(7);
    expect(state.result.traceTruncated).toBe(false);
    expect(state.result.tracePushCount).toBe(7);
  });

  it('should keep the head of a trace past the default bound and count every push', () => {
    // The second block. It re-declares `state`, so it is a fresh start and its
    // own case. Nothing sets `maxTraceItems`, so the 10000 is the default.
    const state = service.createState({}, { maxIterations: Infinity });
    service.eval('for (let i = 0; i < 100000; i++) { i }', state);

    expect(state.result.trace.length).toBe(10000);
    expect(state.result.traceTruncated).toBe(true);
    expect(state.result.tracePushCount).toBe(700007);
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

  it('should synthesise completed: false with an error for a synchronous throw under await', () => {
    const compiler = TestBed.inject(CompilerService);

    const state = service.createState({ obj: {} });
    const seen: [string, boolean][] = [];

    state.hooks.on('after', '*', (e) => {
      if (!e.completed) seen.push([e.node.type, 'error' in e]);
    });

    const fn = compiler.compile('async () => await obj.__proto__');
    const arrow = compiler.call(fn, state) as () => Promise<unknown>;

    expect(seen).toEqual([]);

    expect(() => arrow()).toThrow(/dangerous property/);

    expect(seen).toEqual([['MemberExpression', true], ['AwaitExpression', true]]);
  });
});

// The `### Colon-joined names` blocks, under a root injector of their own: the
// first block's root providers are this case's `TestBed` providers
// (substitution 9).
describe('documented examples, under the root providers they declare', () => {

  it('should read a colon-joined name under provideColonIdentifiers()', () => {
    const appConfig = { providers: [provideColonIdentifiers()] };
    TestBed.configureTestingModule(appConfig);

    const parser = TestBed.inject(ParserService);
    expect(parser.parserOptions.colonIdentifiers).toBe(true);

    const service = TestBed.inject(EvalService);
    expect(service.simpleEval('Q1:1 + 1', { 'Q1:1': 2 })).toBe(3);
    expect(service.simpleEval('Q1:1 + 1', { Q1: 100 })).toBeNaN();

    // The section's second block, which continues the first's `service`.
    const ctx = { c: true, 'Q1:1': 5 };

    expect(service.simpleEval('c ? (Q1:1) : 0', ctx)).toBe(5);
    expect(() => service.simpleEval('c ? Q1:1 : 0', ctx)).toThrow(SyntaxError);
    expect(() => service.simpleEval('c ? Q1:1 : 0', ctx)).toThrow(
      'Unexpected token: a colon-joined name in the consequent of a conditional ' +
      'needs parentheses: (Q1:1) (1:9)');
    expect(service.simpleEval("({ 'Q1:1': 2 })['Q1:1']")).toBe(2);
    expect(() => service.simpleEval('({a:1}).a')).toThrow(SyntaxError);
    // The fix the comment prints.
    expect(service.simpleEval('({a: 1}).a')).toBe(1);
  });
});

interface FencedBlock {
  readonly language: string;
  /** 1-based line of the opening fence. */
  readonly line: number;
  /** The headings the block sits under, indexed by level - 1. */
  readonly headings: readonly string[];
}

/**
 * Every fenced block in a markdown text.
 *
 * A fence opens on three or more backticks or tildes at **any** indentation,
 * so the one inside the `onHookError` bullet counts, and closes on the next
 * bare run of the same character at least as long. Lines inside a block are
 * neither fences nor headings.
 */
const fencedBlocks = (markdown: string): readonly FencedBlock[] => {
  const blocks: FencedBlock[] = [];
  const headings: string[] = [];
  let closing: RegExp | undefined;

  markdown.split(/\r?\n/).forEach((line, index) => {
    if (closing) {
      if (closing.test(line)) {
        closing = undefined;
      }
      return;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      headings.length = heading[1].length - 1;
      headings[heading[1].length - 1] = heading[2].trim();
      return;
    }
    const fence = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
    if (fence) {
      closing = new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`);
      blocks.push({ language: fence[2], line: index + 1, headings: [...headings] });
    }
  });

  return blocks;
};

describe('README block count (docs/backlog.md F13)', () => {

  it('should hold README_JAVASCRIPT_BLOCKS javascript blocks, and only sh and json besides', () => {
    const readme = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf8');

    // Lines, not a bare number, so a failure names the blocks it counted.
    const linesIn = (language: string) => fencedBlocks(readme)
      .filter((block) => block.language === language)
      .map((block) => `README.md:${block.line}`);

    expect(linesIn('javascript')).toHaveLength(README_JAVASCRIPT_BLOCKS);
    expect(linesIn('sh')).toHaveLength(README_SH_BLOCKS);
    expect(linesIn('json')).toHaveLength(README_JSON_BLOCKS);

    // Any other fence, unlabelled included, is a block no case covers.
    const other = fencedBlocks(readme)
      .filter((block) => !['javascript', 'sh', 'json'].includes(block.language))
      .map((block) => `README.md:${block.line} (${block.language || 'unlabelled'})`);
    expect(other).toEqual([]);
  });
});
