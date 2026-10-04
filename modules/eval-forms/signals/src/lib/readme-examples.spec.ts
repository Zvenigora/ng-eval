import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Injector, WritableSignal, signal } from '@angular/core';
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

/** The fenced blocks under `modules/eval-forms/README.md`'s `## Signal Forms — /signals`, any language. */
const README_SIGNALS_BLOCKS = 5;

/** The fenced blocks under the same file's `### Expressions are validated too`, a `/reactive` section. */
const README_ASYMMETRY_BLOCKS = 1;

/** The ` ```ts ` fences in `docs/forms/worked-example-signals.md`. */
const WORKED_EXAMPLE_TS_BLOCKS = 10;

/**
 * Executes the runnable snippets in `modules/eval-forms/README.md`'s
 * **`/signals`** sections, every block under `## Signal Forms — /signals`
 * (`README_SIGNALS_BLOCKS`), plus the `/reactive` block under
 * `### Expressions are validated too` (`README_ASYMMETRY_BLOCKS`), whose whole
 * subject is the two entry points answering one authored string the same way.
 * Up to 0.2.x it was the difference between them, under
 * `### Expressions are not validated`.
 *
 * And every ` ```ts ` block in `docs/forms/worked-example-signals.md`
 * (`WORKED_EXAMPLE_TS_BLOCKS`), all executed (`docs/backlog-retired.md` D11).
 * S 1's model runs as constructed inside S 3's service, which is where the
 * document says it is built; S 1's interface and S 2's two blocks are
 * transcribed verbatim; S 3 is the service; and the six blocks of SS 4-7 run
 * as one program in one case. S 5's template is `html`, not counted, and not
 * executed.
 *
 * **Why this exists.** The counterpart file under `reactive/src/lib/` records
 * it: Phase 1 step 5 found two documented snippets that did not run as
 * printed and Phase 3 found three more, all five shipped because nothing
 * executed them. This is the same gate for the entry point Phase 6 adds.
 *
 * **What it is not.** It reads the markdown only to count the blocks in those
 * two sections and in the worked example, in the last cases below
 * (`docs/backlog.md` F13) - nothing
 * connects these cases to the blocks they transcribe except a human keeping
 * them in step, so it is strictly narrower than `ROADMAP.md`'s deferred
 * documented-symbol drift gate. It gates *whether what the README says runs*,
 * not *what it says*.
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
 * 3. The worked example's `model` and `f` handles in SS 4-7, which the
 *    document introduces as members of its service and then refers to bare.
 *    Taken from the service here, which is what its own S 4 note says they
 *    are.
 * 4. The injection context for the worked example's SS 6-7, whose blocks call
 *    `form()` again. The document states it in prose, in S 4's note; here it
 *    is `TestBed.runInInjectionContext`, as in item 1.
 *
 * Nothing else was invented. Where a block was a fragment the fix went into
 * the document rather than into this file - the `caseInsensitive` block
 * declares its own model and prints its own result for that reason.
 *
 * **The import deviation.** The README and the worked example show
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

    it('should reject a bound parameter, whether or not the expression reads it', () => {
      // The README's pair, in one case because up to 0.2.x the two differed:
      // a binding is a `VariablePattern` to `acorn-walk`, so one never read was
      // never seen, and the second registered - then threw on every
      // evaluation, as `eval-core` refuses to bind the name.
      const m = model();
      const rules = createExpressionRules(m);

      const read = schema<Order>((p) => {
        rules.evalVisible(p.state, '[1].map(valueOf => valueOf)');
      });

      expect(() => buildForm(m, read)).toThrow(/identifier 'valueOf'/);

      const unread = schema<Order>((p) => {
        rules.evalVisible(p.state, '[1].map(valueOf => 1)');
      });

      expect(() => buildForm(model(), unread)).toThrow(/identifier 'valueOf'/);
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

  describe('README - caseInsensitive per registration', () => {

    interface Profile {
      country: string;
      address: { name: string };
      label: string;
    }

    it('should correct the identifier and the property name alike', () => {
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

      // Both halves are load-bearing: `US` says the *identifier* key was
      // corrected through the memo and the context, and `HQ` that the
      // *property* name was corrected by the walk. Up to 0.3.0 this read
      // `'undefinedHQ'` and the README section was "caseInsensitive is in
      // practice a factory option" (`docs/backlog-retired.md` D3).
      expect(buildForm(profile, profileSchema).label().metadata(TEXT)?.())
        .toBe('USHQ');
    });

    it('should resolve both when the option is set on the factory', () => {
      // A factory-wide setting still reaches all three places, which is what
      // the README advised up to 0.3.0. Kept because the registration case
      // above passes just as well against a factory whose own `eval` reached
      // nothing.
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

    it('should rethrow an assignment nested inside a call too', () => {
      // The boundary the README stated up to eval-core 0.6.x: `safeCall`
      // re-raised whatever a callee threw as a plain `Error`, so the class
      // the bypass matches on did not survive the call frame, and the
      // default policy blanked the field. Since 0.7.0 the call leaves the
      // error as thrown (`docs/backlog-retired.md` A6), and the README says
      // the guarantee holds through a call.
      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });

      const rules = createExpressionRules(model);

      const f = buildForm(
        model,
        schema<Order>((p) => {
          rules.evalText(p.state, '[1].map(x => (country = "CA"))');
        })
      );

      expect(() => f.state().metadata(TEXT)?.()).toThrow(SignalContextWriteError);
    });
  });

  describe('README - Expressions are validated too (/reactive)', () => {

    // The one `/reactive` block in this file, and it is here rather than in
    // the `/reactive` spec because its subject is the *pair*: the same
    // authored string at both entry points. Split across two files, either
    // half could drift without the pair failing, and the pair is the sentence.
    //
    // **Changed deliberately in 0.3.0** (`docs/backlog-retired.md` D2). Up to
    // 0.2.x this case pinned the asymmetry the README documented - `/reactive`
    // bound `visible: 'constructor'` and `visible()` was `true` - and it was
    // D2's known-gap pin in all but name. `/reactive` now refuses the string
    // at bind time, as `/signals` refuses it at `form()`.

    let injector: Injector;

    beforeEach(() => {
      injector = TestBed.inject(Injector);
    });

    it('should throw under /reactive and under /signals alike', () => {
      const group = new FormGroup({ country: new FormControl('CA') });

      // `/reactive`: refused at bind time, with `/signals`' message.
      expect(() =>
        bindFieldProperties(
          [{ name: 'city', visible: 'constructor' }],
          group,
          { injector }
        )
      ).toThrow(/Expression 'constructor': identifier 'constructor' is a member of Object\.prototype/);

      // `/signals`, same authored string.
      const model = signal<Order>({ country: 'CA', state: '', zip: '', orderTotal: 0 });
      const rules = createExpressionRules(model);

      const s = schema<Order>((p) => {
        rules.evalVisible(p.state, 'constructor');
      });

      expect(() => buildForm(model, s)).toThrow(/Object\.prototype/);
    });
  });

  describe('worked example (docs/forms/worked-example-signals.md)', () => {

    // S 1's interface, and S 2's two blocks, verbatim.
    interface Checkout {
      country: string;
      state: string;
      orderTotal: number;
      promoCode: string;
      region?: string;
    }

    interface CheckoutRules {
      stateVisible: string;
      promoCodeVisible: string;
      promoCodeDisabled: string;
      shippingNote: string;
    }

    const RULES: CheckoutRules = {
      stateVisible: "country === 'US'",
      promoCodeVisible: 'orderTotal >= 100',
      promoCodeDisabled: "country !== 'US'",
      shippingNote: "orderTotal >= 100 ? 'Free shipping' : 'Shipping calculated at checkout'",
    };

    const checkoutSchema = (rules: ExpressionRules, text: CheckoutRules) =>
      schema<Checkout>((p) => {
        rules.evalVisible(p.state, text.stateVisible);
        rules.evalVisible(p.promoCode, text.promoCodeVisible);
        rules.evalDisabled(p.promoCode, text.promoCodeDisabled, {
          reason: 'Promo codes apply to US orders',
        });
        rules.evalText(p.orderTotal, text.shippingNote);
      });

    // S 1 and S 3. The model is not declared separately here, because the
    // document builds it *in* the service: a spec that built a bare signal
    // would leave the shape the document recommends - model, factory and form
    // built together in field initializers - unexecuted.
    @Injectable()
    class CheckoutFormService {
      readonly model = signal<Checkout>({ country: 'CA', state: '', orderTotal: 80, promoCode: '' });

      readonly form = form(this.model, checkoutSchema(createExpressionRules(this.model), RULES));
    }

    let model: WritableSignal<Checkout>;
    let f: FieldTree<Checkout>;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [CheckoutFormService] });

      const checkout = TestBed.inject(CheckoutFormService);
      model = checkout.model;
      f = checkout.form;
    });

    // **One case, because the document is one program**, as `/reactive`'s
    // worked example is: SS 4-7 run in order, each block starting where the
    // previous one left the model. Split behind a resetting `beforeEach`,
    // S 6 would run against `country: 'CA'` and the order would stop being
    // the document's. Inside one injection context, which S 4's note gives
    // the program because SS 6 and 7 call `form()`.
    it('should run SS 4-7 as one program', () => {
      TestBed.runInInjectionContext(() => {

        // S 4, straight after construction.
        expect(f.state().hidden()).toBe(true);
        expect(f.promoCode().hidden()).toBe(true);
        expect(f.promoCode().disabled()).toBe(true);
        expect(f.promoCode().disabledReasons().map((r) => r.message))
          .toEqual(['Promo codes apply to US orders']);
        expect(f.orderTotal().metadata(TEXT)?.()).toBe('Shipping calculated at checkout');

        // S 4, after a write through the field and one through the model.
        f.country().value.set('US');
        model.update((m) => ({ ...m, orderTotal: 120 }));

        expect(f.state().hidden()).toBe(false);
        expect(f.promoCode().hidden()).toBe(false);
        expect(f.promoCode().disabled()).toBe(false);
        expect(f.orderTotal().metadata(TEXT)?.()).toBe('Free shipping');

        // S 6 - a key the model does not hold yet.
        const region = form(
          model,
          schema<Checkout>((p) => {
            createExpressionRules(model).evalText(p.state, "region ? 'Ships from ' + region : ''");
          })
        );

        expect(region.state().metadata(TEXT)?.()).toBe('');

        model.update((m) => ({ ...m, region: 'EU' }));

        expect(region.state().metadata(TEXT)?.()).toBe('Ships from EU');

        // S 7, first block - the default swallows a rule that throws.
        const broken = form(
          model,
          schema<Checkout>((p) => {
            createExpressionRules(model).evalText(p.state, 'customer.address.line1()');
          })
        );

        expect(broken.state().metadata(TEXT)?.()).toBe('');

        // S 7, second block - a function policy substitutes a value.
        const reported = form(
          model,
          schema<Checkout>((p) => {
            createExpressionRules(model, { onError: () => '(rule error)' })
              .evalText(p.state, 'customer.address.line1()');
          })
        );

        expect(reported.state().metadata(TEXT)?.()).toBe('(rule error)');

        // S 7, third block - a rule that does not parse. The schema builds
        // silently and `form()` throws; the silent half is asserted because
        // the document says it, and an implementation throwing from
        // `schema()` would pass the second half alone.
        let unparsable: Schema<Checkout> | undefined;

        expect(() => {
          unparsable = schema<Checkout>((p) => {
            createExpressionRules(model).evalText(p.state, 'orderTotal ===');
          });
        }).not.toThrow();

        expect(() => form(model, unparsable as Schema<Checkout>))
          .toThrow(/Unexpected|Unterminated|SyntaxError/);
      });
    });

    it('should really throw from the rule S 7 calls broken', () => {
      // The probe for S 7's first block, kept as its own case: without it that
      // block passes against an expression that never failed, and the
      // document's point there is that a *broken* rule renders empty.
      const strict = TestBed.runInInjectionContext(() =>
        form(
          model,
          schema<Checkout>((p) => {
            createExpressionRules(model, { onError: 'throw' })
              .evalText(p.state, 'customer.address.line1()');
          })
        )
      );

      expect(() => strict.state().metadata(TEXT)?.())
        .toThrow('Cannot call undefined or null function');
    });

    it('should re-evaluate a rule for the key it named and not for another (S 4)', () => {
      // S 4's closing sentence - `orderTotal` moving leaves `state`'s
      // visibility alone - is about re-evaluation, which no printed value can
      // show: `hidden()` reads the same either way. The counter sits inside
      // the derivation, as in the quick start's case: `onError` fires once per
      // evaluation that throws, so a rule that reads `country` and then throws
      // turns "did this re-evaluate" into a number. The positive arm is what
      // proves the counter live.
      let evaluations = 0;

      const counted = TestBed.runInInjectionContext(() =>
        form(
          model,
          schema<Checkout>((p) => {
            createExpressionRules(model, {
              onError: () => {
                evaluations++;
                return 'threw';
              },
            }).evalText(p.state, 'country + missing.fn()');
          })
        )
      );

      expect(counted.state().metadata(TEXT)?.()).toBe('threw');
      expect(evaluations).toBe(1);

      // A key the rule never named.
      model.update((m) => ({ ...m, orderTotal: 120 }));

      expect(counted.state().metadata(TEXT)?.()).toBe('threw');
      expect(evaluations).toBe(1);

      // The key it named, written through the service's own form.
      f.country().value.set('US');

      expect(counted.state().metadata(TEXT)?.()).toBe('threw');
      expect(evaluations).toBe(2);
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
 * Every fenced block in a markdown text, with the headings it sits under.
 *
 * A fence opens on three or more backticks or tildes at **any** indentation,
 * so one inside a list item counts, and closes on the next bare run of the
 * same character at least as long. Lines inside a block are neither fences
 * nor headings, so a `#` comment in a shell block opens no section. The same
 * reader as `eval-core`'s `readme-examples.spec.ts`, copied because no spec
 * may import out of another project (`src/export-list.spec.ts` records why).
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
  const linesUnder = (heading: string): string[] =>
    fencedBlocks(fs.readFileSync(path.join(__dirname, '../../../README.md'), 'utf8'))
      .filter((block) => block.headings.includes(heading))
      .map((block) => `README.md:${block.line}`);

  it('should hold README_SIGNALS_BLOCKS blocks under the /signals section', () => {
    expect(linesUnder('Signal Forms — `/signals`')).toHaveLength(README_SIGNALS_BLOCKS);
  });

  it('should hold README_ASYMMETRY_BLOCKS block under Expressions are validated too', () => {
    expect(linesUnder('Expressions are validated too')).toHaveLength(README_ASYMMETRY_BLOCKS);
  });

  it('should hold WORKED_EXAMPLE_TS_BLOCKS ts blocks in the worked example', () => {
    const ts = fencedBlocks(
      fs.readFileSync(path.join(__dirname, '../../../../../docs/forms/worked-example-signals.md'), 'utf8')
    )
      .filter((block) => block.language === 'ts')
      .map((block) => `worked-example-signals.md:${block.line}`);

    expect(ts).toHaveLength(WORKED_EXAMPLE_TS_BLOCKS);
  });
});
