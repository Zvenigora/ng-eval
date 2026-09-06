import { Injector, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { FieldTree, Schema, form, schema } from '@angular/forms/signals';
// Through the published specifier, and legal from *this* folder for the reason
// step 1 recorded: `@nx/enforce-module-boundaries` exempts a self-import that
// **crosses** entry points and rejects one that does not. So `/reactive`
// appears here exactly as a consumer writes it, and `/signals`' own symbols
// cannot - see `../public-api` below.
import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
// A spec-only import (plan S 5, whose import list governs **non-spec** files).
// The adapter must not name this class - S 3.4.1 put the bypass in the core so
// `/signals` cannot grow its own - but the README states the guarantee *and*
// its boundary in terms of the class, so a bare `toThrow()` would assert less
// than the sentences it gates.
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';
import { ExpressionRules, TEXT, createExpressionRules } from '../public-api';

/**
 * Executes the runnable snippets in `modules/eval-forms/README.md`'s
 * **`/signals`** sections, plus the one `/reactive` block whose whole subject
 * is the difference between the two entry points.
 *
 * **Why this exists.** The counterpart file under `reactive/src/lib/` records
 * it: Phase 1 step 5 found two documented snippets that did not run as
 * printed and Phase 3 found three more, all five shipped because nothing
 * executed them. This is the same gate for the entry point Phase 6 adds.
 *
 * **What it is not.** It does not read the markdown - nothing connects these
 * cases to the blocks they transcribe except a human keeping them in step, so
 * it is strictly narrower than `ROADMAP.md`'s deferred documented-symbol drift
 * gate. It gates *whether what the README says runs*, not *what it says*.
 *
 * **What this file supplies that the document does not print**, listed in full
 * because `ROADMAP.md`'s rejection of transcribed snippets turns on exactly
 * this - "anyone turning those fragments into a runnable test declares the
 * missing bindings without noticing":
 *
 * 1. The injection context. The README's blocks call `form()` at top level;
 *    `form()` resolves an `Injector` from the ambient context when it is not
 *    handed one (`FormOptions.injector`), which a spec has only inside
 *    `TestBed.runInInjectionContext`. `buildForm` below is that wrapper and
 *    nothing else.
 * 2. `injector` in the `/reactive` case, which the `/reactive` half of the
 *    README documents in prose as the one the surrounding service injected.
 *
 * Nothing else was invented. Where a block was a fragment the fix went into
 * the document rather than into this file - the `caseInsensitive` block
 * declares its own model and prints its own result for that reason.
 *
 * **The import deviation.** The README shows
 * `import { … } from '@zvenigora/ng-eval-forms/signals'`, which is what a
 * consumer writes and what the build's `exports` map proves resolves. From
 * `signals/src/lib/` that same line is a boundary error, so the import above
 * reads `../public-api` - the same substitution, for the same reason, that
 * `reactive/src/lib/readme-examples.spec.ts` records.
 */
describe('documented examples - /signals', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const buildForm = <T extends object>(
    model: WritableSignal<T>,
    s: Schema<T>
  ): FieldTree<T> => TestBed.runInInjectionContext(() => form(model, s));

  // The README's Quick start interface, verbatim.
  interface Order {
    country: string;
    state: string;
    zip: string;
    orderTotal: number;
  }

  describe('README - Signal Forms quick start', () => {

    it('should answer the eight values the README prints', () => {
      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 80 });

      const rules = createExpressionRules(model);

      const orderSchema = schema<Order>((p) => {
        rules.evalVisible(p.state, "country === 'US'");
        rules.evalText(p.zip, "orderTotal >= 100 ? 'Free shipping' : 'Standard'");
        rules.evalDisabled(p.zip, "country !== 'US'", { reason: 'ZIP is US-only' });
      });

      const f = buildForm(model, orderSchema);

      expect(f.state().hidden()).toBe(true);
      expect(f.zip().metadata(TEXT)?.()).toBe('Standard');
      expect(f.zip().disabled()).toBe(true);
      expect(f.zip().disabledReasons().map((r) => r.message)).toEqual(['ZIP is US-only']);

      model.set({ country: 'US', state: '', zip: '', orderTotal: 120 });

      expect(f.state().hidden()).toBe(false);
      expect(f.zip().metadata(TEXT)?.()).toBe('Free shipping');
      expect(f.zip().disabled()).toBe(false);
    });

    it('should recompute only for the key a rule named', () => {
      // The Quick start's closing sentence - "a rule that named `country`
      // re-evaluates when `country` changes and not when any other key does".
      // No value the README prints can show it: `hidden()` reads the same
      // either way, so watching the value cannot tell a per-key memo from a
      // whole-model one.
      //
      // The counter goes where it sits *inside* the derivation: `onError`
      // fires once per evaluation that throws, so a rule that reads its key
      // and then throws turns "did this re-evaluate" into a number. The
      // middle arm is what proves the counter is live - without it,
      // "unchanged" would be equally true of a counter that never moved.
      let evaluations = 0;

      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 80 });

      const rules = createExpressionRules(model, {
        onError: () => {
          evaluations++;
          return 'threw';
        },
      });

      const f = buildForm(
        model,
        schema<Order>((p) => {
          rules.evalText(p.state, 'country + missing.fn()');
        })
      );

      expect(f.state().metadata(TEXT)?.()).toBe('threw');
      expect(evaluations).toBe(1);

      // A key the rule named.
      model.set({ country: 'US', state: '', zip: '', orderTotal: 80 });

      expect(f.state().metadata(TEXT)?.()).toBe('threw');
      expect(evaluations).toBe(2);

      // A key it never named.
      model.set({ country: 'US', state: '', zip: '', orderTotal: 500 });

      expect(f.state().metadata(TEXT)?.()).toBe('threw');
      expect(evaluations).toBe(2);
    });
  });

  describe('README - Reuse a schema function, not a schema value', () => {

    it('should give each form its own model through makeSchema', () => {
      const makeSchema = (rules: ExpressionRules) =>
        schema<Order>((p) => {
          rules.evalVisible(p.state, "country === 'US'");
        });

      const modelA = signal<Order>({ country: 'US', state: '', zip: '', orderTotal: 0 });
      const modelB = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });

      const fA = buildForm(modelA, makeSchema(createExpressionRules(modelA)));
      const fB = buildForm(modelB, makeSchema(createExpressionRules(modelB)));

      // Two models with **different** values for the key the rule names, so
      // the two arms are distinct producers: a `makeSchema` that leaked one
      // factory across both forms would answer the same boolean twice, and
      // that is the defect the block exists to steer around.
      expect(fA.state().hidden()).toBe(false);
      expect(fB.state().hidden()).toBe(true);

      // And each stays on its own model afterwards, which is what "bound to
      // one" means - the construction-time reading above would also pass if
      // the rules resolved against whichever model was passed to `form()`.
      modelA.set({ country: 'CA', state: '', zip: '', orderTotal: 0 });

      expect(fA.state().hidden()).toBe(true);
      expect(fB.state().hidden()).toBe(true);
    });

    it('should render form B against form A data when a schema value is shared', () => {
      // The README's negative claim - "compiles, runs, and is wrong" - and it
      // is asserted rather than described because a reader who does not
      // believe it will do exactly this. `rules.spec.ts` pins the same
      // behaviour as a characterisation case; here it gates the sentence.
      const modelA = signal<Order>({ country: 'US', state: '', zip: '', orderTotal: 0 });
      const modelB = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });

      const shared = schema<Order>((p) => {
        createExpressionRules(modelA).evalVisible(p.state, "country === 'US'");
      });

      const fB = buildForm(modelB, shared);

      // Model B says `CA`, so an adapter reading form B's own model would
      // hide the field. It reads model A's `US` instead, and shows it.
      expect(fB.state().hidden()).toBe(false);
    });
  });

  describe('README - Prototype-shadowed identifiers are rejected', () => {

    const model = () => signal<Order>({ country: 'US', state: '', zip: '', orderTotal: 0 });

    it('should build the schema silently and throw from form()', () => {
      const m = model();
      const rules = createExpressionRules(m);

      let bad: Schema<Order> | undefined;

      // The README's "the throw arrives from `form()`, not from `schema()`",
      // and the silent half is the load-bearing one: without it the case
      // would pass against an implementation that threw from `schema()`,
      // which is a different sentence.
      expect(() => {
        bad = schema<Order>((p) => {
          rules.evalVisible(p.state, 'constructor');
        });
      }).not.toThrow();

      expect(() => buildForm(m, bad as Schema<Order>))
        .toThrow(/identifier 'constructor' is a member of Object\.prototype/);
    });

    it('should reject a bound parameter it could have resolved, and accept an unreferenced one', () => {
      // The README's parenthetical pair, and they are one case because the
      // claim is the *difference*: a hand-rolled scan over every node would
      // reject both, so asserting only the throwing half would be equally
      // true of the implementation the README says this is not.
      const m = model();
      const rules = createExpressionRules(m);

      const rejected = schema<Order>((p) => {
        rules.evalVisible(p.state, '[1].map(valueOf => valueOf)');
      });

      expect(() => buildForm(m, rejected)).toThrow(/identifier 'valueOf'/);

      const accepted = schema<Order>((p) => {
        rules.evalVisible(p.state, '[1].map(valueOf => 1)');
      });

      expect(() => buildForm(model(), accepted)).not.toThrow();
    });

    it('should leave a member expression to eval-core', () => {
      // The README's first bound: `user.constructor` is not this check's
      // business. Registering is the whole claim.
      const m = model();
      const rules = createExpressionRules(m);

      const s = schema<Order>((p) => {
        rules.evalVisible(p.state, 'user.constructor');
      });

      expect(() => buildForm(m, s)).not.toThrow();
    });
  });

  describe('README - caseInsensitive is in practice a factory option', () => {

    interface Profile {
      country: string;
      address: { name: string };
      label: string;
    }

    it('should correct the property name and leave the identifier uncorrected', () => {
      const profile = signal<Profile>({
        country: 'US',
        address: { name: 'HQ' },
        label: '',
      });

      const rules = createExpressionRules(profile);

      const profileSchema = schema<Profile>((p) => {
        rules.evalText(p.label, 'Country + address.NAME', {
          eval: { caseInsensitive: true },
        });
      });

      // `undefinedHQ` is the whole point and both halves of it are
      // load-bearing: `HQ` says the *property* name was corrected by the
      // walk, and `undefined` says the *identifier* key was not. A result of
      // `'USHQ'` would mean the option reached the factory's memo after all,
      // and `'undefinedundefined'` that it reached nothing.
      expect(buildForm(profile, profileSchema).label().metadata(TEXT)?.())
        .toBe('undefinedHQ');
    });

    it('should resolve both when the option is set on the factory', () => {
      // The README's advice - "set `caseInsensitive` on the factory" - and
      // without this arm the case above asserts only that something is
      // broken, not that the fix the sentence recommends works.
      const profile = signal<Profile>({
        country: 'US',
        address: { name: 'HQ' },
        label: '',
      });

      const rules = createExpressionRules(profile, { eval: { caseInsensitive: true } });

      const profileSchema = schema<Profile>((p) => {
        rules.evalText(p.label, 'Country + address.NAME');
      });

      expect(buildForm(profile, profileSchema).label().metadata(TEXT)?.())
        .toBe('USHQ');
    });
  });

  describe('README - When a rule fails: the assignment boundary', () => {

    it('should rethrow a direct assignment whatever the policy says', () => {
      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });

      // `'undefined'` is already the default; it is passed explicitly because
      // the README's claim is that the policy is *bypassed*, and a case run
      // under the default alone cannot tell a bypass from a policy that was
      // never asked.
      const rules = createExpressionRules(model, { onError: 'undefined' });

      const f = buildForm(
        model,
        schema<Order>((p) => {
          rules.evalText(p.state, 'country = "CA"');
        })
      );

      expect(() => f.state().metadata(TEXT)?.()).toThrow(SignalContextWriteError);
    });

    it('should route an assignment nested inside a call through onError instead', () => {
      // The boundary the README states next to the guarantee: `safeCall`
      // re-raises whatever a callee threw as a plain `Error`, so the class
      // the bypass matches on does not survive the call frame, and the
      // default policy blanks the field.
      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });

      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Order>((p) => {
          rules.evalText(p.state, '[1].map(x => (country = "CA"))');
        })
      );

      // No throw, and the blank field the README warns about.
      expect(f.state().metadata(TEXT)?.()).toBe('');
    });
  });

  describe('README - Expressions are not validated (/reactive)', () => {

    // The one `/reactive` block in this file, and it is here rather than in
    // the `/reactive` spec because its subject is the *asymmetry*: the same
    // authored string throws at one entry point and renders at the other.
    // Split across two files, either half could drift without the pair
    // failing, and the pair is the sentence.

    let injector: Injector;

    beforeEach(() => {
      injector = TestBed.inject(Injector);
    });

    it('should render the field under /reactive and throw under /signals', () => {
      const group = new FormGroup({ country: new FormControl('CA') });

      const binding = bindFieldProperties(
        [{ name: 'city', visible: 'constructor' }],
        group,
        { injector }
      );

      // `/reactive`: no throw at bind time, and a field with no data visible.
      expect(binding.fields['city'].visible?.()).toBe(true);

      binding.destroy();

      // `/signals`, same authored string.
      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });
      const rules = createExpressionRules(model);

      const s = schema<Order>((p) => {
        rules.evalVisible(p.state, 'constructor');
      });

      expect(() => buildForm(model, s)).toThrow(/Object\.prototype/);
    });
  });
});
