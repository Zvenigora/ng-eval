import { EnvironmentProviders, Injector, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { FieldTree, Schema, form, schema } from '@angular/forms/signals';
import { provideColonIdentifiers } from '@zvenigora/ng-eval-core';
import { bindFieldProperties } from '@zvenigora/ng-eval-forms/reactive';
import { createExpressionRules } from './rules';

// The registration-time rejection of prototype-shadowed identifiers (plan
// S 3.8), asserted through the path a consumer actually takes rather than by
// calling `guardIdentifiers` directly: the deliverable is that *every*
// registrar refuses the expression, and a direct call on the function - shared
// from the core since 0.3.0, where `/reactive` calls it too and
// `field-schema.spec.ts` covers that wiring - would be equally green with the
// guard wired into none of them.
//
// So this file uses S 6.1's **first** harness with one substitution - it never
// reads field state, because in every rejecting case there is no field to
// read. `form()` is the assertion.
interface Model {
  city: string;
  country?: string;
  constructorName?: string;
  user?: { name: string };
}

type RegistrarName = 'evalVisible' | 'evalText' | 'evalDisabled';

describe('guardIdentifiers', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const buildForm = (model: WritableSignal<Model>, s: Schema<Model>): FieldTree<Model> =>
    TestBed.runInInjectionContext(() => form(model, s));

  const fixture = (): WritableSignal<Model> =>
    signal<Model>({ city: 'Boston', country: 'US', user: { name: 'ada' } });

  // One expression, registered through the named registrar, returned as the
  // thunk the assertion runs. The three registrars are dispatched by name
  // rather than folded into a call on one of them: the miss this step exists
  // to prevent is a guard wired into `evalVisible` alone (plan S 4, step 6),
  // and a fixture that registers a single registrar cannot see it.
  const buildWith = (name: RegistrarName, expression: string): (() => FieldTree<Model>) => {
    const model = fixture();
    const rules = createExpressionRules(model);
    const s = schema<Model>((p) => {
      if (name === 'evalVisible') {
        rules.evalVisible(p.city, expression);
      } else if (name === 'evalText') {
        rules.evalText(p.city, expression);
      } else {
        rules.evalDisabled(p.city, expression);
      }
    });

    return () => buildForm(model, s);
  };

  describe('rejected names', () => {

    // `constructor` is Q11's case, and it is asserted through all three
    // registrars because the *worst* shape it has is not `evalVisible`'s: an
    // implementation guarding `evalVisible` alone still lets
    // `evalText(p.city, 'constructor')` render
    // "function Object() { [native code] }" into the field through `toText`.
    describe.each<RegistrarName>(['evalVisible', 'evalText', 'evalDisabled'])('%s', (name) => {

      it('should throw on constructor', () => {
        expect(buildWith(name, 'constructor')).toThrow(/Object\.prototype/);
      });
    });

    // Both halves of the message, over an expression whose text is **not**
    // the identifier - which `'constructor'` above could not test, since
    // there the two strings are the same and either half satisfies both
    // assertions. Naming the identifier alone is the plausible near-miss, and
    // it is the expression that tells an author which of a dozen registered
    // rules to fix.
    it('should name both the expression and the identifier', () => {
      const build = buildWith('evalVisible', 'country === "US" && toString');

      expect(build).toThrow(/country === "US" && toString/);
      expect(build).toThrow(/identifier 'toString'/);
    });

    // The other names the illustrative list of seven carries and an author
    // might plausibly type (plan S 3.8.1, revision 18 item 2).
    it.each(['toString', 'valueOf', 'hasOwnProperty'])('should throw on %s', (name) => {
      expect(buildWith('evalVisible', name)).toThrow(/Object\.prototype/);
    });

    // The arm that makes the **predicate** the deliverable rather than the
    // list (revision 18 item 2). `Object.getOwnPropertyNames(Object.prototype)`
    // is twelve names and S 3.8.1's list is seven of them, so an
    // implementation hard-coding the seven satisfies every other criterion in
    // this step and fails only here.
    it('should throw on a name the illustrative seven omit', () => {
      expect(buildWith('evalVisible', '__defineGetter__')).toThrow(/__defineGetter__/);
    });

    // S 3.8.1's decision, and the arm that separates the two implementations
    // revision 8 left undecided: a scope-aware guard passes every other case
    // in this file but the three below. S 3.8.1 called the refusal an
    // over-rejection, reasoning that a bound `valueOf` shadows
    // `Object.prototype`. Measured 2026-10-03,
    // it does not get that far - `eval-core` refuses to bind the name and the
    // expression throws on every evaluation (`docs/backlog-retired.md` D2) -
    // so the guard moves that failure to registration, and rejects nothing that
    // worked.
    it('should throw on a name the expression binds itself', () => {
      expect(buildWith('evalVisible', '[1].map(valueOf => valueOf)')).toThrow(/valueOf/);
    });

    // The same names bound and never read. `acorn-walk` reports a binding as a
    // `VariablePattern`, never as an `Identifier`, so until 0.3.0 the guard did
    // not see one and each of these registered - then threw `Access to
    // dangerous property` on every evaluation, `eval-core`'s refusal to bind
    // the name (`docs/backlog-retired.md` D2). An arrow parameter, a `let`,
    // and a destructured name: three of `base.Pattern`'s routes to it.
    it.each([
      ['[1].map(valueOf => 1)', 'valueOf'],
      ['let toString = 1; 2', 'toString'],
      ['(({ valueOf }) => 1)({})', 'valueOf'],
    ])('should throw on %s, which binds a name it never reads', (expression, name) => {
      expect(buildWith('evalVisible', expression)).toThrow(`identifier '${name}'`);
    });
  });

  describe('accepted expressions', () => {

    // The negative arm that proves the check is on the identifier's exact
    // name. A `String.includes` implementation passes every case above and
    // fails all three of these.
    it.each(['CONSTRUCTOR', 'country', 'constructorName'])('should register %s', (name) => {
      expect(buildWith('evalVisible', name)).not.toThrow();
    });

    // The stated upper bound (S 3.8's residual). A member expression is
    // `eval-core`'s prototype-pollution guard and not this one, and without
    // this arm the check has no ceiling and the next revision widens it into
    // territory this phase does not own.
    //
    // It is also what pins the borrow: `acorn-walk`'s base walker descends
    // into `node.property` only when `node.computed`
    // (`acorn-walk/dist/walk.js:397-400`), so an `Identifier` visitor cannot
    // see `user.constructor` - while a hand-rolled scan over every node
    // would, and would fail here.
    it('should register a member expression naming a shadowed property', () => {
      expect(buildWith('evalVisible', 'user.constructor')).not.toThrow();
    });
  });

  // Q8 measured the schema body running **zero** times at `schema()`, so the
  // throw cannot surface there. Asserted rather than assumed: an
  // implementation that guarded eagerly - or a future Angular that ran the
  // body at `schema()` - would move where a consumer sees the error, and
  // every case above would still pass, because `buildWith` calls `schema()`
  // outside the thunk the assertion runs.
  it('should surface the throw from form(), not from schema()', () => {
    const model = fixture();
    const rules = createExpressionRules(model);

    let s: Schema<Model> | undefined;

    expect(() => {
      s = schema<Model>((p) => {
        rules.evalVisible(p.city, 'constructor');
      });
    }).not.toThrow();

    expect(() => buildForm(model, s as Schema<Model>)).toThrow(/Object\.prototype/);
  });
});

/**
 * `docs/colon-identifiers/phase-9-plan.md` step 6: a rule that parses as a
 * labeled statement is refused at registration, and one rule string is refused
 * at both entry points or evaluated at both, given the same setting (plan
 * S 3.8). Each adapter has its own switch: `eval-core`'s
 * `provideColonIdentifiers()` for `/reactive`, whose check and compile both
 * parse through the root `ParserService`, and the `colonIdentifiers` rule
 * option for `/signals`, which has no injector.
 *
 * Through both adapters' public paths, and in this file because it is the
 * guard's: `/reactive` is reached through its subpath, as
 * `readme-examples.spec.ts` beside this file reaches it. Every form and model
 * holds `Q1:1` and `x` as `1`, so an evaluated rule reads `true` and a blank -
 * what a label rendered before the refusal (F1) - reads `false`.
 */
describe('guardIdentifiers over colon-joined names, at both entry points', () => {

  interface ColonModel {
    city: string;
    'Q1:1': number;
    x: number;
  }

  /** What one adapter did with one rule: its value, or what it threw. */
  type Outcome = { visible: boolean | undefined } | { thrown: string };

  const thrown = (error: unknown): Outcome =>
    ({ thrown: `${(error as Error).name}: ${(error as Error).message}` });

  const labeled = (expression: string, label: string): string =>
    `Error: Expression '${expression}': it parses as a statement labeled '${label}', ` +
    `which never evaluates. A colon-joined key needs colonIdentifiers on and no space ` +
    `around the colon - provideColonIdentifiers() in the application's root providers ` +
    `for /reactive, or the colonIdentifiers rule option for /signals.`;

  // The switch is the provider, configured per block below; the binding is
  // released before the outcome is returned.
  const viaReactive = (expression: string): Outcome => {
    const form = new FormGroup({ 'Q1:1': new FormControl(1), x: new FormControl(1) });

    try {
      const binding = bindFieldProperties(
        [{ name: 'city', visible: expression }],
        form,
        { injector: TestBed.inject(Injector) }
      );
      const visible = binding.fields['city'].visible?.();

      binding.destroy();

      return { visible };
    } catch (error) {
      return thrown(error);
    }
  };

  // The switch is the factory's option. The provider is configured in the
  // `on` block too, and reaches nothing here: `/signals` parses with the free
  // `parse`, which sees only the options it is given.
  const viaSignals = (expression: string, colonIdentifiers: boolean): Outcome => {
    const model = signal<ColonModel>({ city: 'Boston', 'Q1:1': 1, x: 1 });
    const rules = createExpressionRules(model, colonIdentifiers ? { colonIdentifiers } : undefined);

    try {
      const f = TestBed.runInInjectionContext(() =>
        form(model, schema<ColonModel>((p) => {
          rules.evalVisible(p.city, expression);
        }))
      );

      return { visible: !f.city().hidden() };
    } catch (error) {
      return thrown(error);
    }
  };

  describe.each<[string, boolean, EnvironmentProviders[]]>([
    ['on', true, [provideColonIdentifiers()]],
    ['off', false, []],
  ])('with the switch %s', (_label, on, providers) => {

    beforeEach(() => {
      TestBed.configureTestingModule({ providers });
    });

    // Criterion 5. Each row names its outcome, and both adapters must reach
    // it - which is "refused at both or evaluated at both", stated as the
    // value or the error each one produced.
    it.each<[string, Outcome, Outcome]>([
      ['Q1:1 == 1', { visible: true }, { thrown: labeled('Q1:1 == 1', 'Q1') }],
      ['x + Q1:1 > 0', { visible: true }, { thrown: 'SyntaxError: Unexpected token (1:6)' }],
      [
        'Q1:1 && constructor',
        {
          thrown: "Error: Expression 'Q1:1 && constructor': identifier 'constructor' is a " +
            'member of Object.prototype and cannot be resolved reliably: it reads the ' +
            "prototype's value whenever the model holds no such key, so the rule sees a " +
            'function - which is truthy - rather than the absence it was written for. ' +
            'Rename the model key, or the parameter that binds it.',
        },
        // The label is checked first, so with the switch off this is the
        // label's message rather than the identifier's: the switch is the
        // first thing wrong with it.
        { thrown: labeled('Q1:1 && constructor', 'Q1') },
      ],
    ])('should treat %s alike at both entry points', (expression, whenOn, whenOff) => {
      const expected = on ? whenOn : whenOff;

      expect(viaReactive(expression)).toEqual(expected);
      expect(viaSignals(expression, on)).toEqual(expected);
    });

    // Criterion 4's row added at the gate: with a space, a label is a label
    // under the switch too, and refused with the same message.
    it('should refuse a spaced label at both entry points', () => {
      expect(viaReactive('L: 1')).toEqual({ thrown: labeled('L: 1', 'L') });
      expect(viaSignals('L: 1', on)).toEqual({ thrown: labeled('L: 1', 'L') });
    });

    // A label among the program's statements, not only its first: every
    // top-level statement runs.
    it('should refuse a label that is not the first statement', () => {
      expect(viaReactive('x; L: 1')).toEqual({ thrown: labeled('x; L: 1', 'L') });
      expect(viaSignals('x; L: 1', on)).toEqual({ thrown: labeled('x; L: 1', 'L') });
    });

    // Criterion 4's bound: a label inside a function body is left alone, since
    // the function may never be called. This one is - `map` calls it, and the
    // label throws there, under the default policy a blank - but whether a
    // nested statement runs is not the guard's to decide.
    it('should not refuse a label nested in a function body', () => {
      expect(viaReactive('[1].map(() => { L: 1 })')).toEqual({ visible: false });
      expect(viaSignals('[1].map(() => { L: 1 })', on)).toEqual({ visible: false });
    });

    // A pinned known limit, not a design: a block at the top level always
    // runs, and the label in it throws there, but only the program's own
    // statements are checked - so this registers and renders blank, as every
    // other statement `eval-core` refuses does (`docs/backlog.md` D13).
    it('should leave a label inside a top-level block to D13', () => {
      expect(viaReactive('{ L: 1 }')).toEqual({ visible: false });
      expect(viaSignals('{ L: 1 }', on)).toEqual({ visible: false });
    });
  });

  // Criterion 4, through every rule each adapter registers: the refusal is
  // the shared guard's, and each adapter calls it once per rule.
  describe('without the switch, through every rule', () => {

    beforeEach(() => {
      TestBed.configureTestingModule({});
    });

    it.each(['visible', 'text'] as const)('should refuse a label as /reactive %s', (property) => {
      const form = new FormGroup({ 'Q1:1': new FormControl(1) });

      expect(() =>
        bindFieldProperties(
          [{ name: 'city', [property]: 'Q1:1 == 1' }],
          form,
          { injector: TestBed.inject(Injector) }
        )
      ).toThrow(labeled('Q1:1 == 1', 'Q1').slice('Error: '.length));
    });

    it.each<RegistrarName>(['evalVisible', 'evalText', 'evalDisabled'])(
      'should refuse a label through %s',
      (name) => {
        const model = signal<ColonModel>({ city: 'Boston', 'Q1:1': 1, x: 1 });
        const rules = createExpressionRules(model);
        const s = schema<ColonModel>((p) => {
          if (name === 'evalVisible') {
            rules.evalVisible(p.city, 'Q1:1 == 1');
          } else if (name === 'evalText') {
            rules.evalText(p.city, 'Q1:1 == 1');
          } else {
            rules.evalDisabled(p.city, 'Q1:1 == 1');
          }
        });

        expect(() => TestBed.runInInjectionContext(() => form(model, s)))
          .toThrow(labeled('Q1:1 == 1', 'Q1').slice('Error: '.length));
      }
    );
  });
});
