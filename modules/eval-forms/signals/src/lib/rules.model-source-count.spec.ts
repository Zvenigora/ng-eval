import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, schema } from '@angular/forms/signals';
import { TEXT } from './text-key';

// The counter is declared before `jest.mock` deliberately. `jest.mock`
// factories hoist above every declaration in the file, but the factory only
// **reads** this object when the wrapped function runs, which is after the
// module body has evaluated (plan S 6.1.1, mechanic 2). The `mock` prefix is
// what keeps the hoisting transformer from rejecting the out-of-scope
// reference outright.
const mockCalls = { createModelSource: 0 };

// A **delegating** mock, not a bare one: `jest.mock('./model-source')` with no
// factory auto-mocks `createModelSource` to a function returning `undefined`,
// and `createExpressionRules` would then hold nothing while this file's
// assertions - which only count calls - passed unchanged. `requireActual`
// goes inside the factory for the same hoisting reason (mechanic 2).
//
// This file exists only to carry this mock. `jest.mock` hoists to **file**
// scope and cannot be confined to one `describe` (W7), so the rest of the
// factory's coverage lives beside the source it exercises.
jest.mock('./model-source', () => {
  const actual = jest.requireActual<typeof import('./model-source')>('./model-source');
  return {
    ...actual,
    createModelSource: (...args: Parameters<typeof actual.createModelSource>) => {
      mockCalls.createModelSource++;
      return actual.createModelSource(...args);
    },
  };
});

import { createExpressionRules } from './rules';

interface Model {
  city: string;
  country?: string;
  zip?: string;
}

// S 3.6's one-memo-per-factory count. The defect this file exists to catch is
// a factory calling `createModelSource` **per registrar** instead of once,
// which would satisfy every behavioural criterion in this phase while quietly
// making the memo per rule.
//
// **The two arms measure different things, and neither covers for the other**
// (plan S 0.2.3, corrected in step 5):
//
// - the **first** arm registers three real rules through a `schema()` and a
//   `form()`, so the count is taken *after* the registrars have run. Through
//   step 4 neither arm did, and the file's own comment claimed a
//   discrimination it no longer performed: when it was written the registrars
//   were stubs that threw, so "per registrar" had no reachable form other
//   than a second call at construction time. Step 4 shipped the bodies and
//   `createModelSource` came within `prepare`'s reach for the first time - a
//   probe stops discriminating when the space of reachable wrong
//   implementations grows around it, with nothing red in between;
// - the **second** arm is the counter's calibration: two factories must read
//   2, or a `createModelSource` hoisted to module scope and called once for
//   the whole file would read 1 and pass. It registers nothing deliberately -
//   coupling it to a form would make one case answer two questions.
describe('createExpressionRules', () => {

  beforeEach(() => {
    mockCalls.createModelSource = 0;
    TestBed.configureTestingModule({});
  });

  it('should build exactly one model source per factory across three registrations', () => {
    const model = signal<Model>({ city: 'Boston', country: 'US', zip: '10001' });
    const rules = createExpressionRules(model);

    const f = TestBed.runInInjectionContext(() =>
      form(
        model,
        schema<Model>((p) => {
          rules.evalVisible(p.city, 'country === "US"');
          rules.evalText(p.city, 'country');
          rules.evalDisabled(p.zip, 'country !== "US"');
        })
      )
    );

    // A read, so every registered rule has actually derived. Without it the
    // count would be taken over registration alone, and a `createModelSource`
    // moved into the returned closure rather than into `prepare` would still
    // read 1.
    expect(f.city().hidden()).toBe(false);
    expect(f.city().metadata(TEXT)?.()).toBe('US');
    expect(f.zip().disabled()).toBe(false);

    // One per factory - not one per registrar, which would read 3, and not
    // one per derivation.
    expect(mockCalls.createModelSource).toBe(1);
  });

  it('should build one model source per factory and no more', () => {
    const model = signal<Model>({ city: 'Boston', country: 'US' });

    createExpressionRules(model);
    createExpressionRules(model);

    expect(mockCalls.createModelSource).toBe(2);
  });
});
