import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, Schema, form, schema } from '@angular/forms/signals';
// A spec-only import (plan S 5, whose import list governs **non-spec** files).
// The adapter must not name this class - S 3.4.1 put the bypass in the core so
// `/signals` cannot grow its own - but asserting that an assigning expression
// escapes `onError` cannot be done without naming it.
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';
import { ExpressionRules, createExpressionRules } from './rules';
import { TEXT } from './text-key';

// The registrars, through the path a consumer actually takes: a real
// `schema()`, a real `form()`, and a read of field state (plan S 4, step 4).
// This is S 6.1's **first** harness - it proves the rule is registered with
// Angular, that its value reaches the field's state, and that the polarity is
// right. It proves nothing about tracking: Angular's value equality makes a
// re-derivation returning the same boolean indistinguishable from no
// re-derivation, so every count lives in `rules.invocation-count.spec.ts`.
//
// The model type carries **optional** members deliberately. The case S 3.2.1
// exists for is an expression naming a key the model does not hold yet, and a
// closed interface would make that fixture unwritable - which is exactly how
// the plan's earlier revisions ended up with criteria no fixture could reach.
interface Model {
  city: string;
  country?: string;
  zip?: string;
  address?: { name: string };
  boom?: () => unknown;
}

describe('createExpressionRules', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  // `form()` resolves an `Injector` from the ambient injection context when it
  // is not handed one (`FormOptions.injector`, `_structure-chunk.d.ts:1815`),
  // so every construction here goes through `TestBed`.
  const buildForm = (model: WritableSignal<Model>, s: Schema<Model>): FieldTree<Model> =>
    TestBed.runInInjectionContext(() => form(model, s));

  describe('evalVisible', () => {

    it('should register hidden inverted and follow the model', () => {
      // The polarity assertion S 3.5.1 asks for, and it is the first line:
      // a **true** expression must leave the field **visible**. `evalVisible`
      // registers Angular's `hidden`, and the inversion lives inside the
      // library precisely so no consumer's expression carries it - so a sign
      // flip here is invisible to every other case in this file, which would
      // simply read the opposite booleans and still pass in pairs.
      const model = signal<Model>({ city: 'Boston', country: 'US' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'country === "US"');
        })
      );

      expect(f.city().hidden()).toBe(false);

      model.set({ city: 'Boston', country: 'CA' });

      expect(f.city().hidden()).toBe(true);
    });

    it('should follow a key the model does not hold when the form is built', () => {
      // Q3, end to end. Step 2 asserts this at the source; here it runs
      // through a real `form()`, which is where a regression in the resolver
      // would actually reach a consumer.
      //
      // The read is what subscribes, and it happens even though `country`
      // resolves to nothing: `EvalContext.get` treats `undefined` as absent at
      // every step, so `keySignal('country')()` has still been *called* inside
      // Angular's derivation. A source that simply lacked the key would read
      // nothing, subscribe to nothing, and stay frozen for the life of the
      // form.
      const model = signal<Model>({ city: 'Boston' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'country === "US"');
        })
      );

      expect(f.city().hidden()).toBe(true);

      model.set({ city: 'Boston', country: 'US' });

      expect(f.city().hidden()).toBe(false);
    });

    it('should still resolve a case-variant key on the second read', () => {
      // Q4, end to end, and the **second** read is the whole case. The first
      // passes under the withdrawn shape too - it is the read after a write
      // that freezes there, because a memo written back into the source record
      // becomes an exact match that shadows the model's own key. A spec that
      // read once would be the setup failure rather than the assertion
      // failure, and this is the one case that separated the two candidate
      // sources.
      const model = signal<Model>({ city: 'Boston', country: 'US' });
      const rules = createExpressionRules(model, { eval: { caseInsensitive: true } });

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'Country === "US"');
        })
      );

      expect(f.city().hidden()).toBe(false);

      model.set({ city: 'Boston', country: 'CA' });

      expect(f.city().hidden()).toBe(true);
    });
  });

  describe('evalText', () => {

    it('should register metadata under TEXT and follow the model', () => {
      // `text` has no dedicated primitive, so it is `metadata(path, TEXT, …)`
      // against a module-scope key (S 1.2.8) - Angular's own mechanism rather
      // than a second one beside it. The read-back is two calls and an
      // optional chain: `metadata()` returns `Signal<string | undefined> |
      // undefined` (`_structure-chunk.d.ts:406`).
      const model = signal<Model>({ city: 'Boston', country: 'US' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalText(p.city, 'country + " office"');
        })
      );

      expect(f.city().metadata(TEXT)?.()).toBe('US office');

      model.set({ city: 'Boston', country: 'CA' });

      expect(f.city().metadata(TEXT)?.()).toBe('CA office');
    });
  });

  describe('evalDisabled', () => {

    it('should register disabled uninverted and follow the model', () => {
      // Unlike `evalVisible`, there is no inversion here (S 3.5.1):
      // `/reactive` ships no `disabled`, so nothing has to port, and Angular's
      // polarity is already the one an author expects. A true expression
      // disables.
      const model = signal<Model>({ city: 'Boston', country: 'US', zip: '10001' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, 'country !== "US"');
        })
      );

      expect(f.zip().disabled()).toBe(false);

      model.set({ city: 'Boston', country: 'CA', zip: '10001' });

      expect(f.zip().disabled()).toBe(true);
    });

    it('should surface the authored reason through disabledReasons', () => {
      // S 3.5.2's whole point, stated positively before the trap cases below
      // state it negatively: the reason is a **static option**, authored
      // beside the expression and never derived from it.
      const model = signal<Model>({ city: 'Boston', country: 'CA', zip: '10001' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, 'country !== "US"', { reason: 'ZIP is US-only' });
        })
      );

      expect(f.zip().disabled()).toBe(true);
      expect(f.zip().disabledReasons().map((r) => r.message)).toEqual(['ZIP is US-only']);
    });

    it('should not disable on a falsy expression even when a reason is authored', () => {
      // **The `on &&` conjunct of the registrar's return, which nothing else
      // here asserts.** The reason is static, so a registrar returning it
      // whenever one was supplied - dropping the conjunct - would disable
      // every field carrying a `reason` unconditionally, for the life of the
      // form, with the authored message. Every other case in this describe
      // registers a reason only alongside a *truthy* expression, so all of
      // them stay green against that.
      const model = signal<Model>({ city: 'Boston', country: 'US', zip: '10001' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, 'country !== "US"', { reason: 'ZIP is US-only' });
        })
      );

      expect(f.zip().disabled()).toBe(false);
      expect(f.zip().disabledReasons()).toEqual([]);
    });

    // **The two trap cases, and they assert on `disabledReasons()` rather than
    // on `disabled()`** - which is the only assertion that can tell the trap
    // from a correctly-disabled field. Angular's `when` returns
    // `boolean | string` and a truthy string is *both* "disabled" and "the
    // reason" (1.2.7), so a registrar handing the expression's value straight
    // to `when` produces `disabled() === true` exactly as a correct one does.
    // `disabled()` is true under both arms; the **message** is where the
    // leak shows.
    //
    // `toVisible` is `!!value` (`coercion.ts:27`), so the string `'false'` is
    // truthy: the field really is disabled, and the question is only what the
    // reason says.
    it('should disable on a rule yielding the string false, without it becoming the reason', () => {
      const model = signal<Model>({ city: 'Boston', zip: '10001' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, '"false"');
        })
      );

      expect(f.zip().disabled()).toBe(true);

      // No reason was authored, so there is no message - **not** the message
      // `"false"`. This is the assertion a registrar returning `evaluated()`
      // raw would fail while passing the line above.
      expect(f.zip().disabledReasons().map((r) => r.message)).toEqual([undefined]);
    });

    it('should use the authored reason and never the expression value', () => {
      const model = signal<Model>({ city: 'Boston', zip: '10001' });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, '"false"', { reason: 'ZIP is US-only' });
        })
      );

      expect(f.zip().disabled()).toBe(true);

      const messages = f.zip().disabledReasons().map((r) => r.message);

      expect(messages).toEqual(['ZIP is US-only']);
      expect(messages).not.toContain('false');
    });
  });

  describe('the error policy, through a registered rule', () => {

    // Step 3 proves `applyErrorPolicy` as a function. These arms prove the
    // registrars actually **call** it: `onError` is published surface
    // (S 5), and without them nothing tests that anything reads it.
    const throwingModel = (): WritableSignal<Model> =>
      signal<Model>({
        city: 'Boston',
        boom: () => {
          throw new Error('boom');
        },
      });

    it('should resolve an ordinary error per onError and still render the field', () => {
      const model = throwingModel();
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalText(p.city, 'boom()', { onError: () => 'handled' });
        })
      );

      expect(f.city().metadata(TEXT)?.()).toBe('handled');
    });

    it('should throw a write error out of the field state, bypassing onError', () => {
      // An assigning expression is illegal on every recompute with every
      // dataset - a bug in the rule's own syntax - so routing it through this
      // module's default of `'undefined'` would render a permanently blank
      // field with nothing in the console (1.2.11). The policy here is an
      // explicit handler, which is the mode a form-builder consumer is most
      // likely to configure and the one a fast path would swallow it under.
      const model = signal<Model>({ city: 'Boston', country: 'US' });
      const rules = createExpressionRules(model, { onError: () => 'handled' });

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'country = "CA"');
        })
      );

      expect(() => f.city().hidden()).toThrow(SignalContextWriteError);
    });

    it('should throw a write error out of the metadata reducer, bypassing onError', () => {
      // **Step 4 covered the bypass through `evalVisible` only**, on the
      // argument that `prepare` is structurally shared - which is an argument
      // that this would pass, not evidence that it does (plan revision 16,
      // S 0.2). `metadata` is a different Angular primitive with its own
      // reducer and its own memoisation, so "the wrapper is shared" is a claim
      // about our code and not about Angular's: nothing here rules out a
      // reducer that catches what a `hidden` derivation lets through.
      //
      // It is also the registrar whose failure renders a *wrong string*
      // rather than hiding a field, which is the harder one for a consumer to
      // notice - so swallowing this throw would produce a permanently blank
      // label with nothing in the console.
      const model = signal<Model>({ city: 'Boston', country: 'US' });
      const rules = createExpressionRules(model, { onError: () => 'handled' });

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalText(p.city, 'country = "CA"');
        })
      );

      expect(() => f.city().metadata(TEXT)?.()).toThrow(SignalContextWriteError);
    });

    it('should resolve an ordinary error per onError in evalDisabled too', () => {
      // The third registrar's policy path. Without `applyErrorPolicy` in the
      // body the throw would escape `f.zip().disabled()` and take the
      // derivation down; with it, the handler's value is what `toVisible`
      // coerces and the authored reason still applies.
      const model = signal<Model>({
        city: 'Boston',
        zip: '10001',
        boom: () => {
          throw new Error('boom');
        },
      });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, 'boom()', {
            onError: () => true,
            reason: 'rule failed',
          });
        })
      );

      expect(f.zip().disabled()).toBe(true);
      expect(f.zip().disabledReasons().map((r) => r.message)).toEqual(['rule failed']);
    });

    it('should throw a write error out of disabled, bypassing onError', () => {
      // **The third registrar's bypass, and the reason it is not inherited
      // from the two above is the argument this file already makes twenty
      // lines up** (S 0.2): "the wrapper is shared" is a claim about our code,
      // not about Angular's. `disabled` goes through `addDisabledReasonRule`
      // and its result is reduced into `disabledReasons` rather than read as a
      // boolean, so it is a third wrapper around our `LogicFn` and not
      // `hidden`'s.
      //
      // Under this module's default of `'undefined'` a swallowed write error
      // would leave the field permanently **enabled** with nothing logged,
      // which is the quietest of the three failures: a blank label is visible
      // and a hidden field is visible, an absent disable is not.
      const model = signal<Model>({ city: 'Boston', country: 'US', zip: '10001' });
      const rules = createExpressionRules(model, { onError: () => true });

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalDisabled(p.zip, 'country = "CA"');
        })
      );

      expect(() => f.zip().disabled()).toThrow(SignalContextWriteError);
    });

    it('should coerce outside the policy, so a thrown rule reads as hidden', () => {
      // C4, and it is the only assertion that separates the two nestings
      // S 3.5 chooses between. `!toVisible(applyErrorPolicy(walk, policy))`
      // coerces the policy's `undefined` to `false` and inverts it to `true`;
      // `applyErrorPolicy(() => !toVisible(walk()), policy)` returns
      // `undefined` and the field is **not** hidden. Both satisfy every other
      // error-policy criterion in this step, which is why risk 12's stated
      // mitigation did not gate the thing it named.
      const model = throwingModel();
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'boom()', { onError: 'undefined' });
        })
      );

      expect(f.city().hidden()).toBe(true);
    });
  });

  describe('schema reuse', () => {

    it('should evaluate the factory model when one schema value is reused (characterisation)', () => {
      // **A characterisation test: it records a limitation, not a
      // guarantee** (Q9). Angular re-invokes the schema body once per
      // `form()`, so a reused schema mints fresh contexts per form - but the
      // registrars close over the **factory's** model, and the factory is
      // bound to one. Form B therefore renders against form A's data,
      // silently, with no error and a fully functional form.
      //
      // Its job is that a future change to Angular's re-invocation, or to the
      // factory's binding, goes red here instead of quietly changing which
      // data a form reads.
      const modelA = signal<Model>({ city: 'A', country: 'US' });
      const modelB = signal<Model>({ city: 'B', country: 'CA' });
      const rules = createExpressionRules(modelA);

      const s = schema<Model>((p) => {
        rules.evalVisible(p.city, 'country === "US"');
      });

      const fA = buildForm(modelA, s);
      const fB = buildForm(modelB, s);

      // B holds `country: 'CA'` and should be hidden. It is not: it read A.
      expect(fA.city().hidden()).toBe(false);
      expect(fB.city().hidden()).toBe(false);

      modelA.set({ city: 'A', country: 'FR' });

      // And flipping A moves **both** fields.
      expect(fA.city().hidden()).toBe(true);
      expect(fB.city().hidden()).toBe(true);
    });

    it('should give each form its own model when the schema is a function of the rules', () => {
      // The **supported** shape, asserted positively. Without this arm
      // S 3.6's reuse guidance is a paragraph: the characterisation above
      // records what goes wrong and nothing records what to do instead.
      const makeSchema = (rules: ExpressionRules): Schema<Model> =>
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'country === "US"');
        });

      const modelA = signal<Model>({ city: 'A', country: 'US' });
      const modelB = signal<Model>({ city: 'B', country: 'CA' });

      const fA = buildForm(modelA, makeSchema(createExpressionRules(modelA)));
      const fB = buildForm(modelB, makeSchema(createExpressionRules(modelB)));

      expect(fA.city().hidden()).toBe(false);
      expect(fB.city().hidden()).toBe(true);
    });
  });

  describe('option resolution', () => {

    it('should take a per-registration onError over the factory\'s', () => {
      const model = signal<Model>({
        city: 'Boston',
        boom: () => {
          throw new Error('boom');
        },
      });
      const rules = createExpressionRules(model, { onError: () => 'factory' });

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalText(p.city, 'boom()', { onError: () => 'registration' });
        })
      );

      expect(f.city().metadata(TEXT)?.()).toBe('registration');
    });

    it('should apply a per-registration caseInsensitive to properties and not to identifiers (characterisation)', () => {
      // **A characterisation test** (S 3.5.3, plan revision 15), on the same
      // footing as the schema-reuse case above: this records behaviour that is
      // wrong and shipping.
      //
      // Registration wins per key - but `caseInsensitive` has to reach three
      // places and a registration moves exactly **one** of them, the walk.
      // S 3.6 binds the memo *and* the rule's context to the factory
      // (`createRuleContext` closes over `createModelSource`'s options), so
      // `readProperty` is case-sensitive for the life of this form. The
      // walk's options are per rule, so the member visitor *does* correct
      // property names.
      //
      // The result is one expression obeying two casing rules: `Country`
      // resolves to nothing while `address.NAME` resolves fine. Both halves
      // are asserted in one read - the property half is what stops this case
      // from passing against a registration whose `eval` was dropped on the
      // floor entirely.
      const model = signal<Model>({
        city: 'Boston',
        country: 'US',
        address: { name: 'HQ' },
      });
      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Model>((p) => {
          rules.evalText(p.city, 'Country + "/" + address.NAME', {
            eval: { caseInsensitive: true },
          });
        })
      );

      expect(f.city().metadata(TEXT)?.()).toBe('undefined/HQ');
    });
  });
});
