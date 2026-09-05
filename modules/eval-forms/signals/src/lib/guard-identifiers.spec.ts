import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, Schema, form, schema } from '@angular/forms/signals';
import { createExpressionRules } from './rules';

// The registration-time rejection of prototype-shadowed identifiers (plan
// S 3.8), asserted through the path a consumer actually takes rather than by
// calling `guardIdentifiers` directly: the deliverable is that *every*
// registrar refuses the expression, and a direct call on the module-private
// function would be equally green with the guard wired into none of them.
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
    // revision 8 left undecided. An arrow's own frame is genuinely safe -
    // `EvalContext.get` resolves `scopes` before `original`, so a bound
    // `valueOf` shadows `Object.prototype` - and the guard rejects it anyway,
    // because the scope-aware alternative is a second copy of `eval-core`'s
    // frame logic that fails by *under*-rejecting when it drifts. A
    // scope-aware guard passes every other case in this file.
    it('should throw on a name the expression binds itself', () => {
      expect(buildWith('evalVisible', '[1].map(valueOf => valueOf)')).toThrow(/valueOf/);
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

    // A property of the borrowed walker rather than a decision (S 3.8.1):
    // `base.Function` walks parameters under the "Pattern" override, which
    // `simple` suppresses, so a **binding** is never visited as an
    // `Identifier` while a **reference** is. Pinned so that a hand-rolled
    // scan - which rejects both this and the throwing case above - fails the
    // step rather than shipping.
    it('should register a bound name that is never referenced', () => {
      expect(buildWith('evalVisible', '[1].map(valueOf => 1)')).not.toThrow();
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
