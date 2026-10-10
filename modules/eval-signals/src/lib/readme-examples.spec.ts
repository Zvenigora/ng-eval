import * as fs from 'fs';
import * as path from 'path';
import { Component, OnDestroy, computed, inject, resource, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalService } from '@zvenigora/ng-eval-core';
// Through `../public-api` rather than `@zvenigora/ng-eval-signals`. See the
// import-substitution note in the docstring below: the published specifier is
// what the README prints and is a boundary error from inside this project.
import {
  EvalSignalService,
  SignalContextWriteError,
  createEvalSignal,
  createEvalSignalAsync,
  createSignalContext,
} from '../public-api';

/** The ` ```ts ` fences in `modules/eval-signals/README.md`. */
const README_TS_BLOCKS = 14;

/** The ` ```sh ` fences in the same file. */
const README_SH_BLOCKS = 2;

/** A promise whose settlement the case orders itself (substitution 9). */
interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

/** Microtasks and one macrotask (substitution 9). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

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
 * **What it is not.** It reads the markdown only to count its fenced blocks, in
 * the last case below. Nothing keeps a case and the block it mirrors in step
 * but a human. The drift gate in
 * `src/public-api.spec.ts` is the other half and neither supersedes the other:
 * that one gates *what the README says*, this one gates *whether what it says
 * runs*.
 *
 * ## Coverage — every ` ```ts ` block accounted for
 *
 * The README has `README_TS_BLOCKS` `ts` blocks and `README_SH_BLOCKS` `sh`
 * blocks (install commands and the `nx` targets, which are not covered). The
 * last case below reads the file and counts both (`docs/backlog.md` F13), so
 * neither constant can go stale silently. What is gated is the count. Which
 * case covers which block, the lists below, is still kept in step by hand.
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
 * 5. `## Writes are not supported`, both blocks - one case each: the key
 *    write, and the spread copy written into.
 * 6. `## Async expressions`, four of its five blocks, one case each: the
 *    primitive; the two-signal form; `abortSignalKey`; and the sync path's
 *    promise with the `resource` composition in its `params` spelling.
 * 7. `## Using the adapter directly`.
 *
 * Not covered, with the reason in each case:
 *
 * - **`## Options`.** An options *illustration*, not a program: `user`,
 *   `isDeepEqual` and `injector` are undeclared, and completing it would mean
 *   inventing an example the document does not make. Each option it names is
 *   covered by `eval-signal.spec.ts` against the option's own behaviour.
 * - **The Angular 19 spelling of the `resource` composition** (`request`, in
 *   `## Async expressions`). The workspace runs Angular 22, where `resource`
 *   has no `request` option, so the block cannot compile here. The spelling is
 *   read from 19.2.25's published typings (`docs/signals/phase-5-plan.md`
 *   § 1.2 finding 6); § 8 q1's matrix ran the async signal's own specs at 19,
 *   not this block. The `params` spelling beside it is executed: up to 0.4.0
 *   this file left the whole composition out, which is how
 *   `docs/backlog-retired.md` C6 went unseen.
 * - The `sh` blocks: `npm install`, and the three `nx` targets.
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
 * 5. **`id`, `loadUser` and `fetch`** in the async cases. The first three async
 *    blocks each declare their own `id`, so each is a fresh start in fact; the
 *    sync-path block declares none, and its case supplies one. Only the
 *    cancellation block declares `loadUser`, and it calls `fetch`, which that
 *    case declares as a stub — recording each request's `AbortSignal` and
 *    answering with a deferred — so nothing reaches a network. What a real
 *    `loadUser` returns is not something the document says.
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
 * 8. **The sync-path block's values.** It prints nothing either: that the
 *    promise resolves to `{ id: 7 }`, and that `userResource` reloads to
 *    `{ id: 8 }` when `id` changes — the prose's claim for a read in `params` —
 *    follow from substitution 5's bindings rather than from anything the
 *    document states.
 * 9. **The settlement the async blocks mark with a comment**
 *    (`// … once loadUser(1) resolves`). The case resolves its own deferred,
 *    then flushes microtasks and one macrotask before the next printed line —
 *    `eval-signal-async.spec.ts`'s `deferred` and `flush`, copied above because
 *    importing a spec would run its cases here. Every line printed before that
 *    comment is asserted before anything is resolved
 *    (`docs/signals/phase-5-plan.md` § 6.1).
 * 10. **`TestBed.tick()`** in the `resource` case: `resource` loads from an
 *    effect, and the case runs it.
 * 11. **`User`**, the type the `resource` block names and does not declare.
 * 12. **The cancellation block's behaviour.** It prints nothing; the case
 *    asserts the prose under it — each run's own `AbortSignal` reaches `fetch`,
 *    is aborted at the read that supersedes its run and not at the change, and
 *    the new run's is not, nor once that run has settled ("it is not aborted
 *    when the run settles") — and the settled value, `{ id: 2 }`, which follows
 *    from the stub's reply.
 * 13. **Load counts** in the primitive and two-signal cases. "This read starts
 *    the run" and "no new run of `user`" are behavioural, as substitution 6's
 *    claim is, and a value cannot carry them.
 * 14. **The two-signal case's tail.** After the printed lines, `id.set(2)`, then
 *    `'loading'` and `'Grace (owner)'`: the section's claim that the second
 *    signal tracks the first "like any other", which the printed `role` change
 *    alone does not show.
 * 15. **The promise in the sync-path case.** `user()` is asserted to be a
 *    `Promise` from the prose — "its value is the promise itself, unresolved" —
 *    which the block does not print.
 *
 * Items 6, 7, 8 and 12–15 are all the same class — a value or a behaviour
 * asserted that the block does not print — and they are listed separately
 * because the enumeration is the only thing standing against an unlisted one
 * (`docs/gates/plan.md` § 7, risk 3, which is accepted rather than gated).
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

    it('should write into a spread copy and leave the source alone', () => {
      const user = signal({ name: 'Ada', tags: ['a'] });

      const renamed = TestBed.runInInjectionContext(() =>
        createEvalSignal('let u = { ...user }; u.name = "Bob"; u', { user })
      );
      expect(renamed()).toEqual({ name: 'Bob', tags: ['a'] });
      expect(user()).toEqual({ name: 'Ada', tags: ['a'] });

      const marked = TestBed.runInInjectionContext(() =>
        createEvalSignal('let t = [...user.tags.map(s => s + "!")]; t[0] = "x"; t', { user })
      );
      expect(marked()).toEqual(['x']);
    });
  });

  describe('Async expressions', () => {

    interface Named {
      readonly id: number;
      readonly name: string;
    }

    /**
     * `loadUser` (substitution 5): a deferred per call, settled by the case,
     * and the key each call was given.
     */
    const loadUsers = () => {
      const keys: number[] = [];
      const loads: Deferred<Named>[] = [];
      const loadUser = (key: number): Promise<Named> => {
        const next = deferred<Named>();
        keys.push(key);
        loads.push(next);
        return next.promise;
      };
      return { keys, loads, loadUser };
    };

    it('should read undefined and loading, then the value, and start a run at the read after a change', async () => {
      const { keys, loads, loadUser } = loadUsers();

      // The README's block, from `const id` on, in an injection context.
      const id = signal(1);
      const user = TestBed.runInInjectionContext(() =>
        createEvalSignalAsync('loadUser(id)', { id, loadUser })
      );

      expect(user()).toBeUndefined();
      expect(user.status()).toBe('loading');

      // "… once loadUser(1) resolves" (substitution 9).
      loads[0].resolve({ id: 1, name: 'Ada' });
      await flush();
      expect(user()).toEqual({ id: 1, name: 'Ada' });
      expect(user.status()).toBe('resolved');

      id.set(2);
      // "This read starts the run for id 2": nothing has before it
      // (substitution 13).
      expect(keys).toEqual([1]);
      expect(user()).toBeUndefined();
      expect(keys).toEqual([1, 2]);
      expect(user.status()).toBe('loading');
    });

    it('should derive from the async signal in a second one, tracking both', async () => {
      const { keys, loads, loadUser } = loadUsers();

      const { id, label, role } = TestBed.runInInjectionContext(() => {
        // The README's block, as printed.
        const id = signal(1);
        const user = createEvalSignalAsync('loadUser(id)', { id, loadUser });
        const role = signal('admin');

        const label = createEvalSignal('user ? user.name + " (" + role + ")" : "loading"', { user, role });

        return { id, label, role };
      });

      expect(label()).toBe('loading');

      // "… once loadUser(id) resolves" (substitution 9).
      loads[0].resolve({ id: 1, name: 'Ada' });
      await flush();
      expect(label()).toBe('Ada (admin)');

      role.set('owner');
      expect(label()).toBe('Ada (owner)');
      // "No new run of `user`" (substitution 13).
      expect(keys).toEqual([1]);

      // And the async signal is tracked through the second: a change it read
      // reaches `label`.
      id.set(2);
      expect(label()).toBe('loading');
      expect(keys).toEqual([1, 2]);
      loads[1].resolve({ id: 2, name: 'Grace' });
      await flush();
      expect(label()).toBe('Grace (owner)');
    });

    it('should hand each run its own AbortSignal, aborted by the read that supersedes the run', async () => {
      // `fetch` is this case's (substitution 5): a stub that keeps each
      // request's signal and answers with a deferred the case settles.
      const requests: { url: string; signal: AbortSignal; reply: Deferred<{ json(): unknown }> }[] = [];
      const fetch = (url: string, init: { signal: AbortSignal }): Promise<{ json(): unknown }> => {
        const reply = deferred<{ json(): unknown }>();
        requests.push({ url, signal: init.signal, reply });
        return reply.promise;
      };

      // The README's block, as printed.
      const id = signal(1);
      const loadUser = (userId: number, abort: AbortSignal) =>
        fetch(`/api/users/${userId}`, { signal: abort }).then((response) => response.json());

      const user = TestBed.runInInjectionContext(() =>
        createEvalSignalAsync('loadUser(id, abort)', { id, loadUser }, {
          abortSignalKey: 'abort',
        })
      );

      // The prose under it (substitution 12).
      expect(user()).toBeUndefined();
      expect(requests.map((request) => request.url)).toEqual(['/api/users/1']);
      expect(requests[0].signal.aborted).toBe(false);

      id.set(2);
      expect(requests[0].signal.aborted).toBe(false);

      expect(user()).toBeUndefined();
      expect(requests.map((request) => request.url)).toEqual(['/api/users/1', '/api/users/2']);
      expect(requests[0].signal.aborted).toBe(true);
      expect(requests[1].signal.aborted).toBe(false);

      requests[1].reply.resolve({ json: () => ({ id: 2 }) });
      await flush();
      expect(user()).toEqual({ id: 2 });
      expect(requests[1].signal.aborted).toBe(false);
    });

    it('should carry the promise as the value, and reload a resource that reads it in params', async () => {
      // `User` (substitution 11), and `id` and `loadUser` (substitution 5).
      interface User {
        readonly id: number;
      }
      const id = signal(7);
      const loadUser = (key: number): Promise<User> => Promise.resolve({ id: key });

      const { user, userResource } = TestBed.runInInjectionContext(() => {
        // The README's block, as printed.
        const user = createEvalSignal('loadUser(id)', { id, loadUser });

        // Angular 20 and later. The read goes in `params`, never in `loader`.
        const userResource = resource({
          params: () => user() as Promise<User>,
          loader: ({ params }) => params,
        });

        return { user, userResource };
      });

      // The section's claim is that the walk returns the promise *unresolved*,
      // so state that directly before resolving it.
      expect(user()).toBeInstanceOf(Promise);

      // Substitutions 8 and 10: the resource loads, and reloads on a change
      // its `params` read.
      TestBed.tick();
      await flush();
      expect(userResource.value()).toEqual({ id: 7 });

      id.set(8);
      TestBed.tick();
      await flush();
      expect(userResource.value()).toEqual({ id: 8 });
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
 * so one inside a list item counts, and closes on the next bare run of the
 * same character at least as long. Lines inside a block are neither fences
 * nor headings. The same reader as `eval-core`'s `readme-examples.spec.ts`,
 * copied because no spec may import out of another project
 * (`export-list.spec.ts` records why).
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

  // Lines, not bare numbers, so a failure names the blocks it counted.
  const linesIn = (language: string): string[] =>
    fencedBlocks(fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf8'))
      .filter((block) => block.language === language)
      .map((block) => `README.md:${block.line}`);

  it('should hold README_TS_BLOCKS ts blocks', () => {
    expect(linesIn('ts')).toHaveLength(README_TS_BLOCKS);
  });

  it('should hold README_SH_BLOCKS sh blocks', () => {
    expect(linesIn('sh')).toHaveLength(README_SH_BLOCKS);
  });
});
