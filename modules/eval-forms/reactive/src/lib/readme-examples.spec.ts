import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
// Through the published specifier, which is legal from *this* folder only for
// the core: `@nx/enforce-module-boundaries` exempts a self-import that crosses
// entry points and rejects one that does not. So the two core symbols below
// appear here exactly as a consumer writes them, and the `/reactive` ones
// cannot - see the note on `../public-api` below.
import { applyErrorPolicy, toText, toVisible } from '@zvenigora/ng-eval-forms';
// Not on the core's allowed import list, and legal here for the reason
// `field-schema.spec.ts` records: plan S 5's list governs `src/lib/` and
// `reactive/src/lib/`, explicitly not specs. Load-bearing rather than
// convenient - the README names this type, so a bare `toThrow()` would assert
// less than the sentence it gates.
import { SignalContextWriteError } from '@zvenigora/ng-eval-signals';
import {
  FieldSchema,
  FormBinding,
  bindFieldProperties,
} from '../public-api';

/**
 * Executes the snippets in `modules/eval-forms/README.md` and
 * `docs/forms/worked-example.md`.
 *
 * **Why this exists.** Phase 1's step 5 found two documented snippets that did
 * not run as printed and Phase 3 found three more; all five had shipped because
 * nothing executed them. `ROADMAP.md`'s "review practice rather than a gate" is
 * the practice that missed them, five times, so this step promotes it to a
 * gate for this package.
 *
 * **What it is not.** It does not read the markdown. Nothing connects these
 * cases to the files they name except a human keeping them in step, so this is
 * strictly **narrower** than `ROADMAP.md`'s deferred documented-symbol drift
 * gate, which scans the fenced blocks and would catch a symbol renamed out from
 * under a README. The two are not substitutes and neither supersedes the other:
 * that one gates *what the README says*, this one gates *whether what it says
 * runs*.
 *
 * It also does not cover every block. Covered: the `/reactive` `ts` blocks
 * that are runnable, and the shared core's two `Coercion` blocks - which live
 * here rather than under `src/lib/` because a spec there could not import
 * `bindFieldProperties` to sit beside them, and splitting two blocks into a
 * third file buys nothing. Not covered: the `html` template blocks, the `json`
 * manifest block, and the `interface FieldSchema` declaration - none of which
 * executes, and a transcription that padded them into something that did would
 * be asserting against code the README does not contain.
 *
 * **One `/reactive` block is deliberately covered elsewhere**, and this
 * sentence exists because the file's location would otherwise imply it is
 * here (Phase 6 step 7, plan revision 19 item 2). The README's "Expressions
 * are not validated" block - `visible: "constructor"` binding cleanly and
 * rendering a data-less field - is executed by
 * `signals/src/lib/readme-examples.spec.ts`, paired in one case with the
 * `/signals` registration that throws on the same authored string. The claim
 * is the *asymmetry*, so the pair is the assertion: split across two files,
 * either half could drift without the pair failing.
 *
 * **What this file supplies that the documents do not print**, listed in full
 * because `ROADMAP.md`'s rejection of transcribed snippets turns on exactly
 * this - "anyone turning those fragments into a runnable test declares the
 * missing bindings without noticing":
 *
 * 1. `injector`. Every documented block that binds uses a free `injector`; the
 *    documents say in prose that it is the one the surrounding service
 *    injected, and this file takes it from `TestBed`.
 * 2. The `form` / `binding` handles in the worked example's SS 4-8, which the
 *    document introduces as members of its service and then refers to bare.
 *    Taken from the service here, which is what the document's own S 4 note
 *    says they are.
 * 3. The import specifier, below.
 * 4. `SignalContextWriteError`'s binding, in the `applyErrorPolicy` case. The
 *    README's block names the class's package in a **comment** rather than
 *    printing an import for it, because an import line from another package's
 *    specifier is scanned by no gate - `docs/backlog.md` F11 - so this file
 *    supplies the import from `@zvenigora/ng-eval-signals` instead. The block
 *    is therefore not runnable exactly as printed, which is the one place in
 *    this file that is true and is why it is listed here.
 *
 * Nothing else was invented, and where a block *was* a fragment the fix went
 * into the document rather than into this file - the README's two reactivity
 * blocks each declare their own form and binding for that reason. That is the
 * constraint the deviation from the plan's "by hand" exit criterion rests on,
 * and it is a constraint on the documents, not on this spec.
 *
 * **The import deviation.** The documents show
 * `import { … } from '@zvenigora/ng-eval-forms/reactive'`, which is what a
 * consumer writes and what `field-context.spec.ts` proves resolves. From
 * `reactive/src/lib/` that same line is a boundary error, so the imports above
 * read `../public-api` - the same substitution, for the same reason, that
 * `field-schema.spec.ts` records.
 */
describe('documented examples', () => {

  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  // A real `FormGroup` throughout (plan S 6.1). The index-signature type is
  // the worked example's own, and it is not a test-only convenience: a
  // server-supplied schema implies a control set assembled at runtime, and
  // `addControl` on a group typed from an object literal will not accept a key
  // the literal did not have.
  type DynamicGroup = FormGroup<{ [key: string]: AbstractControl }>;

  describe('README - Quick start', () => {

    @Injectable()
    class OrderFormService implements OnDestroy {
      private readonly injector = inject(Injector);

      readonly form = new FormGroup({
        country: new FormControl('CA'),
        state: new FormControl(''),
      });

      readonly binding = bindFieldProperties(
        [{ name: 'state', visible: "country === 'US'" }],
        this.form,
        { injector: this.injector }
      );

      ngOnDestroy() {
        this.binding.destroy();
      }
    }

    // The outer `beforeEach` has already instantiated the test module by
    // injecting from it, and `configureTestingModule` refuses to run after
    // that. Reset and reconfigure, rather than hoisting the provider into the
    // outer block, so this snippet keeps its own module the way a consumer's
    // application keeps its own.
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [OrderFormService] });
    });

    it('should answer the two values the README prints', () => {
      // Injecting the service is what executes the snippet's shape as well as
      // its values: the binding is built in a *field initializer*, which is an
      // injection context and not a reactive one, so a README recommending
      // "construct it in a service" is checked here rather than only asserted.
      const service = TestBed.inject(OrderFormService);
      const { form, binding } = service;

      expect(binding.fields['state'].visible?.()).toBe(false);

      form.controls.country.setValue('US');

      expect(binding.fields['state'].visible?.()).toBe(true);

      service.ngOnDestroy();
    });

  });

  describe('README - Coercion', () => {

    it('should answer the toVisible lines', () => {
      expect(toVisible(undefined)).toBe(false);
      expect(toVisible(0)).toBe(false);
      expect(toVisible('false')).toBe(true);
    });

    it('should answer the toText lines', () => {
      expect(toText(null)).toBe('');
      expect(toText(undefined)).toBe('');
      expect(toText(0)).toBe('0');
      expect(toText(false)).toBe('false');
    });

    it('should read false for an empty control, as the README claims', () => {
      // `visible: "promoCode"` on an empty `promoCode` is `false` - the
      // README's sentence about an empty control reading as absent, which is
      // prose there rather than a block, and is the one claim in that section
      // a reader is most likely to rely on.
      const form = new FormGroup({ promoCode: new FormControl('') });

      const binding = bindFieldProperties(
        [{ name: 'promoCode', visible: 'promoCode' }],
        form,
        { injector }
      );

      expect(binding.fields['promoCode'].visible?.()).toBe(false);

      // The discriminating half. `false` on its own is what a mirror that
      // resolved *nothing* would also answer - an empty source, a broken
      // accessor, a key that never opened - so the empty arm alone does not
      // say "empty reads as absent", it says "this is falsy for some reason".
      form.controls.promoCode.setValue('SAVE10');

      expect(binding.fields['promoCode'].visible?.()).toBe(true);

      binding.destroy();
    });
  });

  describe('README - Reactivity', () => {

    it('should go stale under emitEvent false and recover on invalidate', () => {
      const form = new FormGroup({ country: new FormControl('CA') });

      const binding = bindFieldProperties(
        [{ name: 'country', text: 'country' }],
        form,
        { injector }
      );

      // The first read is load-bearing and the README's block omitted it in
      // its first draft: a `computed()` that has never been read has nothing
      // cached, so a *first* read after the suppressed write returns the new
      // value and the snippet's "stale" comment was false as printed. Found by
      // running it, which is this file's whole purpose.
      expect(binding.fields['country'].text?.()).toBe('CA');

      form.controls.country.setValue('US', { emitEvent: false });

      expect(binding.fields['country'].text?.()).toBe('CA');

      binding.fields['country'].text?.invalidate();

      expect(binding.fields['country'].text?.()).toBe('US');

      binding.destroy();
    });

    it('should need invalidate to see a removed key', () => {
      const form: DynamicGroup = new FormGroup<{ [key: string]: AbstractControl }>({
        age: new FormControl(30),
      });

      const binding = bindFieldProperties(
        [{ name: 'age', text: 'age' }],
        form,
        { injector }
      );

      expect(binding.fields['age'].text?.()).toBe('30');

      form.removeControl('age');

      expect(binding.fields['age'].text?.()).toBe('30');

      binding.fields['age'].text?.invalidate();

      expect(binding.fields['age'].text?.()).toBe('');

      binding.destroy();
    });
  });

  describe('README - When a rule fails', () => {

    // The `applyErrorPolicy` block (docs/backlog.md D10). It lives in this file
    // rather than under `signals/` for the reason the two `Coercion` cases do:
    // `applyErrorPolicy` is the shared core's surface, and this spec already
    // reaches it through the published specifier.
    it('should answer the applyErrorPolicy lines', () => {
      const boom = () => { throw new Error('bad rule'); };

      expect(applyErrorPolicy(boom)).toBeUndefined();
      expect(applyErrorPolicy(boom, 'undefined')).toBeUndefined();
      expect(applyErrorPolicy(boom, () => '—')).toBe('—');
      expect(() => applyErrorPolicy(boom, 'throw')).toThrow('bad rule');
      expect(applyErrorPolicy(() => 'fine')).toBe('fine');
    });

    it('should rethrow a write violation from applyErrorPolicy whatever the policy says', () => {
      // The block's last two lines, and the half a reader would not predict:
      // every other failure is policed, this one is not. `'undefined'` is the
      // policy that would otherwise swallow it.
      const write = () => {
        throw new SignalContextWriteError('country', 'country = "CA"');
      };

      expect(() => applyErrorPolicy(write, 'undefined')).toThrow(
        SignalContextWriteError
      );
    });

    it('should throw from the bind itself for an expression that does not parse', () => {
      const form = new FormGroup({ country: new FormControl('CA') });

      // Matched rather than bare: a bare `toThrow()` would also pass on a
      // schema-validation rejection, which is a different documented rule and
      // a different section of the README.
      expect(() =>
        bindFieldProperties(
          [{ name: 'country', visible: 'country ===' }],
          form,
          { injector }
        )
      ).toThrow(/Unexpected|Unterminated|SyntaxError/);
    });

    it('should throw a write violation in the default mode', () => {
      const form = new FormGroup({ country: new FormControl('CA') });

      const binding = bindFieldProperties(
        [{ name: 'country', text: 'country = 5' }],
        form,
        { injector }
      );

      // The README names the type, so the type is what is asserted: a bare
      // `toThrow()` here would be satisfied by the ordinary error policy
      // failing to swallow anything at all.
      expect(() => binding.fields['country'].text?.())
        .toThrow(SignalContextWriteError);

      binding.destroy();
    });
  });

  describe('README - The field schema', () => {

    it('should reject a field name off Object.prototype', () => {
      const form = new FormGroup({ country: new FormControl('CA') });

      expect(() =>
        bindFieldProperties(
          [{ name: 'constructor', visible: 'country' }],
          form,
          { injector }
        )
      ).toThrow(/Object\.prototype/);
    });

    it('should accept a field that names no control, resolving it to undefined', () => {
      const form = new FormGroup({ country: new FormControl('CA') });

      // The rule *names* the missing field, which is what the README's claim is
      // about. Asserting only that `fields['state']` exists would pass against
      // any schema entry at all - the record is written unconditionally.
      const binding = bindFieldProperties(
        [{ name: 'state', visible: 'state', text: 'state' }],
        form,
        { injector }
      );

      expect(binding.fields['state'].visible?.()).toBe(false);
      expect(binding.fields['state'].text?.()).toBe('');

      binding.destroy();
    });
  });

  describe('worked example', () => {

    // S 2 of the document, verbatim.
    const SCHEMA: FieldSchema[] = [
      { name: 'state', visible: "country === 'US'" },
      { name: 'promoCode', visible: 'orderTotal >= 100' },
      {
        name: 'shippingNote',
        text: "orderTotal >= 100 ? 'Free shipping' : 'Shipping calculated at checkout'",
      },
    ];

    // S 1 and S 3, and the service is why S 1's form is not declared separately
    // here: the document builds the form *in* the service, so a spec that built
    // a bare `FormGroup` would leave the one shape the document actually
    // recommends - constructed in a field initializer, destroyed from
    // `ngOnDestroy` - unexecuted.
    @Injectable()
    class CheckoutFormService implements OnDestroy {
      private readonly injector = inject(Injector);

      readonly form = new FormGroup<{ [key: string]: AbstractControl }>({
        country: new FormControl('CA'),
        orderTotal: new FormControl(80),
        promoCode: new FormControl(''),
      });

      readonly binding = bindFieldProperties(SCHEMA, this.form, {
        injector: this.injector,
      });

      ngOnDestroy() {
        this.binding.destroy();
      }
    }

    let checkout: CheckoutFormService;
    let form: DynamicGroup;
    let binding: FormBinding;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [CheckoutFormService] });

      checkout = TestBed.inject(CheckoutFormService);
      injector = TestBed.inject(Injector);
      form = checkout.form;
      binding = checkout.binding;
    });

    afterEach(() => checkout.ngOnDestroy());

    // **One case, because the document is one program.** SS 4-8 run in order
    // against a single service, each block starting where the previous one left
    // the form - which is exactly what the document says it does.
    //
    // Splitting them into a case apiece behind a resetting `beforeEach` was the
    // first draft, and it hid a defect rather than finding one: S 6 printed
    // `false` for a rule S 4 had already driven to `true`, and every split case
    // ran against a pristine `country: 'CA'` where `false` is right. A
    // transcription that restructures the program is not executing the document,
    // and the restructuring is what made the wrong value look correct. Found in
    // review, after the split version was green.
    it('should run SS 4-8 as one program', () => {

      // S 4, straight after binding.
      expect(binding.fields['state'].visible?.()).toBe(false);
      expect(binding.fields['promoCode'].visible?.()).toBe(false);
      expect(binding.fields['shippingNote'].text?.())
        .toBe('Shipping calculated at checkout');

      // S 4, after the two edits.
      form.controls['country'].setValue('US');
      form.controls['orderTotal'].setValue(120);

      expect(binding.fields['state'].visible?.()).toBe(true);
      expect(binding.fields['promoCode'].visible?.()).toBe(true);
      expect(binding.fields['shippingNote'].text?.()).toBe('Free shipping');

      // S 6, first block. `country` is still 'US' from S 4, so the value the
      // document prints is `true` - the point being that it did not *move*
      // when the `state` control arrived, not that it is false.
      form.addControl('state', new FormControl('TX'));

      expect(binding.fields['state'].visible?.()).toBe(true);

      // S 6, second block - a rule that does name the key.
      const stateLabel = bindFieldProperties(
        [{ name: 'stateLabel', text: 'state' }],
        form,
        { injector }
      );

      expect(stateLabel.fields['stateLabel'].text?.()).toBe('TX');

      form.removeControl('state');

      expect(stateLabel.fields['stateLabel'].text?.()).toBe('TX');

      stateLabel.fields['stateLabel'].text?.invalidate();

      expect(stateLabel.fields['stateLabel'].text?.()).toBe('');

      stateLabel.destroy();

      // S 7, first block - the default swallows a rule that throws.
      const broken = bindFieldProperties(
        [{ name: 'taxNote', text: 'customer.address.line1()' }],
        form,
        { injector }
      );

      expect(broken.fields['taxNote'].text?.()).toBe('');

      broken.destroy();

      // S 7, second block - a function policy substitutes a value.
      const reported = bindFieldProperties(
        [{ name: 'taxNote', text: 'customer.address.line1()' }],
        form,
        { injector, onError: () => '(rule error)' }
      );

      expect(reported.fields['taxNote'].text?.()).toBe('(rule error)');

      reported.destroy();

      // S 7, third block - a rule that does not parse throws from the bind.
      expect(() =>
        bindFieldProperties(
          [{ name: 'taxNote', text: 'orderTotal ===' }],
          form,
          { injector }
        )
      ).toThrow(/Unexpected|Unterminated|SyntaxError/);

      // S 8.
      binding.destroy();
      binding.destroy();
    });

    it('should really throw from the rule S 7 calls broken', () => {
      // The probe for S 7's first block, kept as its own case: without it that
      // block passes against an expression that never failed, and the
      // document's whole point there is that a *broken* rule renders empty.
      const strict = bindFieldProperties(
        [{ name: 'taxNote', text: 'customer.address.line1()' }],
        form,
        { injector, onError: 'throw' }
      );

      expect(() => strict.fields['taxNote'].text?.())
        .toThrow('Cannot call undefined or null function');

      strict.destroy();
    });

    it('should recompute only for the control a rule named (S 4)', () => {
      // S 4's closing sentence - `orderTotal` moving "leaves `state.visible`
      // untouched" - is a claim about *recomputes*, and no value the document
      // prints can show one: `state.visible` reads the same either way, so
      // watching the value cannot discriminate a per-key mirror from a
      // per-group one.
      //
      // The counter goes where it can sit *inside* the recompute: `onError` is
      // invoked once per evaluation that throws, so a rule that reads its key
      // and then throws turns "did this recompute" into a number. The positive
      // arm is what proves the counter is live - without it, "unchanged" would
      // be equally true of a counter that never moved at all.
      let recomputes = 0;

      const counted = bindFieldProperties(
        [{ name: 'probe', text: 'country + missing.fn()' }],
        form,
        {
          injector,
          onError: () => {
            recomputes++;
            return 'threw';
          },
        }
      );

      expect(counted.fields['probe'].text?.()).toBe('threw');
      expect(recomputes).toBe(1);

      // A control the rule named.
      form.controls['country'].setValue('US');

      expect(counted.fields['probe'].text?.()).toBe('threw');
      expect(recomputes).toBe(2);

      // A control it never named.
      form.controls['orderTotal'].setValue(120);

      expect(counted.fields['probe'].text?.()).toBe('threw');
      expect(recomputes).toBe(2);

      counted.destroy();
    });
  });
});
