import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, Schema, form, schema } from '@angular/forms/signals';

// Both counters are declared before the `jest.mock` calls deliberately.
// Factories hoist above every declaration in the file, but each one only
// **reads** this object when the wrapped function runs - after the module body
// has evaluated (plan S 6.1.1, mechanic 2). The `mock` prefix is what keeps the
// hoisting transformer from rejecting the out-of-scope reference outright.
const mockCalls = {
  applyErrorPolicy: 0,
  parse: 0,
  compile: 0,
  createModelSource: 0,
  createRuleContext: 0,
};

// **The `LogicFn` invocation instrument** (S 6.1.1). It cannot wrap the
// closure - `rules.ts` builds the `LogicFn` and hands it straight to
// `hidden()` - so the count is taken at the one call every body makes.
//
// `applyErrorPolicy` rather than `evaluateRule` or `call`, and the difference
// is not cosmetic: M6 measured a rule that skips the walk when its key is
// absent at ground truth **1**, `applyErrorPolicy` **1**, `evaluateRule` **0**.
// A negative case built on the lower instrument would compare 0 to 0 and pass
// *while the rule was running*. Counting walks is not counting invocations.
//
// A **delegating** mock: `jest.mock` with no factory auto-mocks
// `createFieldContext` too, and registration then throws
// `TypeError: Cannot read properties of undefined (reading 'lookups')` before
// any `LogicFn` exists. `requireActual` goes inside the factory for the
// hoisting reason above.
jest.mock('@zvenigora/ng-eval-forms', () => {
  const actual = jest.requireActual<typeof import('@zvenigora/ng-eval-forms')>(
    '@zvenigora/ng-eval-forms'
  );
  return {
    ...actual,
    applyErrorPolicy: (...args: Parameters<typeof actual.applyErrorPolicy>) => {
      mockCalls.applyErrorPolicy++;
      return actual.applyErrorPolicy(...args);
    },
  };
});

// **The compile-once instrument**, the same shape one barrel over. Two
// delegating barrel mocks coexist in one file - measured, S 6.1.1 mechanic 4 -
// which is why these two share a file and why the file exists at all:
// `jest.mock` hoists to **file** scope and cannot be confined to a `describe`,
// so stacked beside the read-back cases it would put all of them through a
// mocked core entry point to serve these two.
jest.mock('@zvenigora/ng-eval-core', () => {
  const actual = jest.requireActual<typeof import('@zvenigora/ng-eval-core')>(
    '@zvenigora/ng-eval-core'
  );
  return {
    ...actual,
    parse: (...args: Parameters<typeof actual.parse>) => {
      mockCalls.parse++;
      return actual.parse(...args);
    },
    compile: (...args: Parameters<typeof actual.compile>) => {
      mockCalls.compile++;
      return actual.compile(...args);
    },
  };
});

// **The lifetime instrument**, and it is the only thing that can see S 3.6's
// two remaining counts: one memo per **factory**, one `EvalContext` per rule
// per `form()`. Both are established by `createExpressionRules` and by
// `prepare`, and neither is observable from a read-back or from the invocation
// count - hoisting the `createRuleContext()` call to factory scope (so every
// rule on a form shares one context) or sinking it into the returned closure
// (so a fresh one is built per derivation) leaves every other case in this
// package green.
//
// The first of those is the `/signals` reviewer checklist's item-3 hazard
// exactly: `scopes` is step 1 of `EvalContext.get`'s resolution order, so a
// residual left by one rule's arrow body would be read by every *other* rule
// on the form rather than by one. It also looks like a tidy-up - one call
// instead of N - which is what makes it likely.
jest.mock('./model-source', () => {
  const actual = jest.requireActual<typeof import('./model-source')>('./model-source');
  return {
    ...actual,
    createModelSource: (...args: Parameters<typeof actual.createModelSource>) => {
      mockCalls.createModelSource++;
      const source = actual.createModelSource(...args);

      return {
        ...source,
        createRuleContext: () => {
          mockCalls.createRuleContext++;
          return source.createRuleContext();
        },
      };
    },
  };
});

import { createExpressionRules } from './rules';

interface Model {
  city: string;
  country?: string;
  zip?: string;
}

// S 6.1's **second** harness - the `LogicFn` invocation count - plus the
// compile count that risk 8 has named as its mitigation since revision 1.
//
// The read-back cannot stand in for either. Angular's value equality makes a
// re-derivation returning the same boolean indistinguishable from no
// re-derivation, so a rule that re-runs on every keystroke passes
// `rules.spec.ts` unchanged.
describe('createExpressionRules invocation counts', () => {

  beforeEach(() => {
    mockCalls.applyErrorPolicy = 0;
    mockCalls.parse = 0;
    mockCalls.compile = 0;
    mockCalls.createModelSource = 0;
    mockCalls.createRuleContext = 0;
    TestBed.configureTestingModule({});
  });

  const buildForm = (model: WritableSignal<Model>, s: Schema<Model>): FieldTree<Model> =>
    TestBed.runInInjectionContext(() => form(model, s));

  it('should re-invoke only for a key its expression names, and compile once', () => {
    const model = signal<Model>({ city: 'Boston', country: 'US', zip: '10001' });
    const rules = createExpressionRules(model);

    const f = buildForm(
      model,
      schema<Model>((p) => {
        rules.evalVisible(p.city, 'country === "US"');
      })
    );

    // Registration compiles; nothing has run a walk yet. `form()` construction
    // invokes the `LogicFn` **zero** times (M1), which is why step 1 below is
    // a read and why step 2's `>= 1` is a real assertion rather than one
    // construction already satisfied.
    expect(mockCalls.parse).toBe(1);
    expect(mockCalls.compile).toBe(1);
    expect(mockCalls.applyErrorPolicy).toBe(0);

    // 1. Read the counted derivation, forcing the first invocation.
    expect(f.city().hidden()).toBe(false);

    // 2. Record the count, and assert it moved at all. A recorded 0 means
    //    nothing has run and the rest of this case measures an absence it
    //    created.
    const afterFirstRead = mockCalls.applyErrorPolicy;
    expect(afterFirstRead).toBeGreaterThanOrEqual(1);

    // 3. Write a model key the expression never names.
    model.set({ city: 'Boston', country: 'US', zip: '90210' });

    // 4. Read the field state again. Angular's graph is pull-based, so
    //    without this the count cannot move whether the rule over-subscribes
    //    or not - and the case would compare 0 to 0 and pass against a rule
    //    wired to the wrong field, or never registered at all.
    expect(f.city().hidden()).toBe(false);

    // 5. The count is the assertion; 1 and 4 are setup.
    expect(mockCalls.applyErrorPolicy).toBe(afterFirstRead);

    // 6. The calibration arm. Without it a counter incremented at
    //    registration, or wrapping the wrong closure, or sitting outside the
    //    `LogicFn` body, satisfies step 2 and then reports "unchanged" for
    //    every negative case there is.
    model.set({ city: 'Boston', country: 'CA', zip: '90210' });

    expect(f.city().hidden()).toBe(true);
    expect(mockCalls.applyErrorPolicy).toBeGreaterThan(afterFirstRead);

    // The same sequence pinned **absolutely**, which is how step 4 states it:
    // 1 -> 1 -> 2. The relative assertions above are S 6.1's generic form and
    // are what the six steps are about; this line is what additionally rejects
    // a registrar that invoked the rule twice per read, which every relative
    // comparison above would accept.
    expect(afterFirstRead).toBe(1);
    expect(mockCalls.applyErrorPolicy).toBe(2);

    // Risk 8, and the N is the sequence above rather than a loop: three reads
    // and two writes, one compile. `CompilerService`'s LRU would have masked a
    // `compile()` that drifted into the `LogicFn` body; S 3.1 drops the
    // service, so nothing else would catch it.
    expect(mockCalls.parse).toBe(1);
    expect(mockCalls.compile).toBe(1);
  });

  it('should reach the wrapper even when the key its expression names is absent', () => {
    // **M7, and it is the guard half of S 3.5's invariant** - the half the
    // read-back and the sequence above both miss. A branch hoisted *above*
    // `applyErrorPolicy` - the shape a later "skip the walk when the key is
    // absent" optimisation would take - satisfies every other assertion in
    // this file, because it only trips on a fixture like this one.
    //
    // M7 measured that arrangement at ground truth **1**, instrument **0**.
    // So this number is what makes every negative case above capable of
    // failing: with the wrapper no longer outermost they would all degrade to
    // a count of 0 that reads as "the rule did not re-run".
    const model = signal<Model>({ city: 'Boston' });
    const rules = createExpressionRules(model);

    const f = buildForm(
      model,
      schema<Model>((p) => {
        rules.evalVisible(p.city, 'country === "US"');
      })
    );

    expect(f.city().hidden()).toBe(true);

    expect(mockCalls.applyErrorPolicy).toBeGreaterThanOrEqual(1);
  });

  it('should hold one memo per factory and one context per rule per form', () => {
    // S 3.6's retained counts, as numbers rather than as a sentence. The
    // fixture registers **two** rules deliberately: with one rule, "one
    // context per rule" and "one context per form" produce the same number,
    // and no other case in this package builds a two-rule schema.
    const model = signal<Model>({ city: 'Boston', country: 'US', zip: '10001' });
    const rules = createExpressionRules(model);

    const s = schema<Model>((p) => {
      rules.evalVisible(p.city, 'country === "US"');
      rules.evalText(p.city, 'zip');
    });

    // Q8's sequencing, and it is the reason the source has to be closed over
    // at registration: the schema body does not run at `schema()` time at all.
    expect(mockCalls.createModelSource).toBe(1);
    expect(mockCalls.createRuleContext).toBe(0);

    buildForm(model, s);

    // One per rule, minted when Angular ran the schema body - not one per
    // form, and not one per derivation: nothing has read field state yet.
    expect(mockCalls.createModelSource).toBe(1);
    expect(mockCalls.createRuleContext).toBe(2);

    buildForm(model, s);

    // The calibration arm, and Q8's measurement from the other side: Angular
    // re-invokes the schema body once per `form()`, so a second form mints two
    // more contexts - while the memo stays on the factory and is not rebuilt.
    expect(mockCalls.createModelSource).toBe(1);
    expect(mockCalls.createRuleContext).toBe(4);
  });
});
