import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalService } from '@zvenigora/ng-eval-core';
// Through `../public-api` rather than `@zvenigora/ng-eval-signals`. See the
// import-substitution note in the docstring below: the published specifier is
// what the README prints and is a boundary error from inside this project.
import {
  EvalSignalService,
  SignalContextWriteError,
  createEvalSignal,
  createSignalContext,
} from '../public-api';

/**
 * Executes the snippets in `modules/eval-signals/README.md`.
 *
 * **Why this exists.** Two documented snippets shipped broken in `eval-core`'s
 * documentation in Phase 1 and three in this library's in Phase 3, all five
 * caught by a later session that happened to be reading documentation. That is
 * the review practice `docs/backlog.md` F4 exists to replace, and this file is
 * its `eval-signals` half. It follows
 * `modules/eval-forms/reactive/src/lib/readme-examples.spec.ts`, which is the
 * pattern, including this docstring's discipline.
 *
 * **What it is not.** It does not read the markdown. Nothing keeps a case and
 * the block it mirrors in step but a human. The drift gate in
 * `src/public-api.spec.ts` is the other half and neither supersedes the other:
 * that one gates *what the README says*, this one gates *whether what it says
 * runs*.
 *
 * ## Coverage — all 9 ` ```ts ` blocks accounted for
 *
 * The README has **9** `ts` blocks and **2** `sh` blocks (install commands and
 * the `nx` targets, which are not covered). Counted 2026-09-08, after this step
 * completed four fragments in the document itself.
 *
 * Executed here, in document order:
 *
 * 1. `## Quick start`, both blocks — **one case**. The second reads
 *    `this.total()` against the class the first declares, so they are one
 *    program; splitting them would not pass wrongly, it would fail to run.
 * 2. `## Dependency introspection` — a genuine fresh start, since this step
 *    gave it its own declarations. See the defect note below.
 * 3. `## Contexts that are not signal-backed`.
 * 4. `## Lifetime`, the `PriceComponent` block.
 * 5. `## Writes are not supported`.
 * 6. `## Async expressions`, its **first statement only**.
 * 7. `## Using the adapter directly`.
 *
 * Not covered, with the reason in each case:
 *
 * - **`## Options`.** An options *illustration*, not a program: `user`,
 *   `isDeepEqual` and `injector` are undeclared, and completing it would mean
 *   inventing an example the document does not make. Each option it names is
 *   covered by `eval-signal.spec.ts` against the option's own behaviour.
 * - **The `resource(…)` composition in `## Async expressions`.** It documents
 *   Angular's API rather than this library's, and a runnable version would be a
 *   `resource` example this document does not otherwise make. The statement
 *   above it — the promise arriving as the signal's value — is the part that is
 *   this library's claim, and it *is* executed.
 * - The two `sh` blocks: `npm install`, and the three `nx` targets.
 *
 * ## The defect this step fixed in the README, rather than around
 *
 * `## Dependency introspection` printed `// 30` against bare `price` /
 * `quantity` / `shipping` that the document never declared. Read as one program
 * with `## Quick start` — which sets `quantity` to 4 — the true value is 40 and
 * the printed one was wrong; read as a fresh start it was right, but only by
 * conceding the per-block reset that hides exactly this class of error. The
 * block now declares its own three signals, so it is a fresh start in fact and
 * `// 30` is true. `docs/gates/plan.md` § 1.3 predicted this; it was not
 * discovered here.
 *
 * ## Substitutions — everything this file supplies that the README does not
 * print
 *
 * Enumerated rather than summarised as "self-contained", because an unlisted
 * substitution is how a transcription passes for a document that does not run.
 *
 * 1. **The import specifier.** The README prints
 *    `from '@zvenigora/ng-eval-signals'`, which is what a consumer writes; from
 *    inside this project that exact line is an `@nx/enforce-module-boundaries`
 *    error, so the imports above read `../public-api`. Measured, not assumed —
 *    `docs/gates/plan.md` § 1.2 records the probe. It is the one line where
 *    this file's "as a consumer writes it" claim stops being true.
 * 2. **A component instance for `this.`.** The Quick start's second block is
 *    written from inside the component; the case holds the instance the first
 *    block's class produces and reads `component.total()`.
 * 3. **A real `@Component` argument.** The README elides it as an object
 *    literal containing only an ellipsis comment. The case supplies
 *    `{ template: '' }`, the minimum that compiles.
 * 4. **Injection contexts.** Where the document's prose says a call sits in one
 *    — the free function in a field initializer, `inject(EvalSignalService)`,
 *    `inject(EvalService)` — the case supplies `TestBed.createComponent`,
 *    `TestBed.runInInjectionContext` or `TestBed.inject`.
 * 5. **`id` and `loadUser`** in the async case. The block declares neither, and
 *    what a real `loadUser` returns is not something the document says.
 * 6. **A recompute counter**, which the README prints nowhere and which is here
 *    deliberately. `## Quick start` prints `// 40  — not recomputed` for the
 *    read after `shipping.set(0)`, and the value `40` cannot discriminate that
 *    claim: a signal that *did* recompute would produce 40 as well. The claim is
 *    behavioural, so the assertion has to be. `createState` is called exactly
 *    once per recompute, so spying on it counts walks — the idiom
 *    `eval-signal.spec.ts` already uses. A later reader should read this as the
 *    printed comment being asserted, not as drift from the README.
 * 7. **The Lifetime block's two values.** That block prints nothing at all. The
 *    case asserts `30` for the service-created signal, and `undefined` after
 *    `ngOnDestroy()` — the second from the section's prose ("a destroyed signal
 *    reads `undefined` from that moment"), not from the block.
 * 8. **The async block's resolved value.** It prints nothing either; that the
 *    promise resolves to `{ id: 7 }` follows from substitution 5's bindings
 *    rather than from anything the document states.
 *
 * Items 6, 7 and 8 are all the same class — a value asserted that the block
 * does not print — and they are listed separately because the enumeration is
 * the only thing standing against an unlisted one (`docs/gates/plan.md` § 7,
 * risk 3, which is accepted rather than gated).
 */
describe('documented examples', () => {

  let compiler: CompilerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    compiler = TestBed.inject(CompilerService);
  });

  describe('Quick start', () => {

    // The README's first block, as printed apart from the decorator argument.
    @Component({ template: '' })
    class OrderComponent {
      readonly price = signal(10);
      readonly quantity = signal(3);
      readonly shipping = signal(5);

      readonly total = createEvalSignal('price * quantity', {
        price: this.price,
        quantity: this.quantity,
        shipping: this.shipping,
      });
    }

    it('should recompute for a key the expression read and not for one it did not', () => {
      const walks = jest.spyOn(compiler, 'createState');
      const component = TestBed.createComponent(OrderComponent).componentInstance;

      // The README's second block. `this.` is the instance above.
      expect(component.total()).toBe(30);
      expect(walks).toHaveBeenCalledTimes(1);

      component.quantity.set(4);
      expect(component.total()).toBe(40);          // recomputed
      expect(walks).toHaveBeenCalledTimes(2);

      component.shipping.set(0);
      expect(component.total()).toBe(40);          // not recomputed
      // The printed `40` alone would pass had it recomputed; this is the
      // assertion that carries "not recomputed" (substitution 6).
      expect(walks).toHaveBeenCalledTimes(2);
    });
  });

  describe('Dependency introspection', () => {

    it('should report what the last recompute read', () => {
      const price = signal(10);
      const quantity = signal(3);
      const shipping = signal(5);

      const total = TestBed.runInInjectionContext(() =>
        createEvalSignal('price * quantity', { price, quantity, shipping },
          { trackDependencies: true })
      );

      expect(total()).toBe(30);
      expect(total.dependencies).toEqual(new Set(['price', 'quantity']));
    });
  });

  describe('Contexts that are not signal-backed', () => {

    it('should re-evaluate on the next read after invalidate()', () => {
      const plainObject = { price: 10, quantity: 3 };

      const total = TestBed.runInInjectionContext(() =>
        createEvalSignal('price * quantity', plainObject)
      );

      expect(total()).toBe(30);

      plainObject.quantity = 4;
      total.invalidate();
      expect(total()).toBe(40);
    });
  });

  describe('Lifetime', () => {

    // The README's block, as printed. `inject` in a field initializer needs an
    // injection context, which the case supplies (substitution 4).
    class PriceComponent implements OnDestroy {
      private readonly signals = inject(EvalSignalService);
      readonly price = signal(10);
      readonly quantity = signal(3);

      readonly total = this.signals.create('price * quantity', {
        price: this.price,
        quantity: this.quantity,
      });

      ngOnDestroy(): void {
        this.total.destroy();
      }
    }

    it('should evaluate through the service and tear down in ngOnDestroy', () => {
      const component = TestBed.runInInjectionContext(() => new PriceComponent());

      expect(component.total()).toBe(30);

      // "a destroyed signal reads `undefined` from that moment" — the prose
      // this block is under.
      component.ngOnDestroy();
      expect(component.total()).toBeUndefined();
    });
  });

  describe('Writes are not supported', () => {

    it('should throw SignalContextWriteError naming the key and the expression', () => {
      const count = signal(1);

      const broken = TestBed.runInInjectionContext(() =>
        createEvalSignal('count = 5', { count })
      );

      try {
        broken();
        throw new Error('expected the read to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(SignalContextWriteError);
        if (error instanceof SignalContextWriteError) {
          expect(error.key).toBe('count');
          expect(error.expression).toBe('count = 5');
        }
      }
    });
  });

  describe('Async expressions', () => {

    it('should carry the promise as the value', async () => {
      // `id` and `loadUser` are this file's (substitution 5); the block
      // declares neither, and the `resource(…)` composition below it is not
      // covered — see the coverage list above.
      const id = signal(7);
      const loadUser = (key: number): Promise<{ id: number }> =>
        Promise.resolve({ id: key });

      const user = TestBed.runInInjectionContext(() =>
        createEvalSignal('loadUser(id)', { id, loadUser })
      );

      // The section's claim is that the walk returns the promise *unresolved*,
      // so state that directly before resolving it.
      expect(user()).toBeInstanceOf(Promise);
      await expect(user() as Promise<{ id: number }>).resolves.toEqual({ id: 7 });
    });
  });

  describe('Using the adapter directly', () => {

    // Named for what it asserts. The section's claim — that the adapter keeps
    // native per-key tracking — is gated by `signal-context.spec.ts`, and
    // adding it here would mean asserting lines this block does not print.
    it('should evaluate an expression through EvalService over a signal context', () => {
      const price = signal(10);
      const quantity = signal(3);
      const evalService = TestBed.inject(EvalService);

      const context = createSignalContext({ price, quantity });
      const total = computed(() =>
        evalService.simpleEval('price * quantity', context)
      );

      expect(total()).toBe(30);
    });
  });
});
