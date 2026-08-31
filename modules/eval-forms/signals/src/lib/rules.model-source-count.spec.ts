import { signal } from '@angular/core';

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

// Every other case in this step constructs the source directly, so nothing
// there exercises the factory's own wiring (C1). A factory calling
// `createModelSource` **per registrar** instead of once would satisfy all of
// them - and every step-4 criterion - while quietly making the memo per rule
// rather than per factory, which is S 3.6's count silently wrong.
describe('createExpressionRules', () => {

  beforeEach(() => {
    mockCalls.createModelSource = 0;
  });

  it('should build exactly one model source per factory', () => {
    const model = signal<Record<string, unknown>>({ country: 'US' });

    createExpressionRules(model);

    expect(mockCalls.createModelSource).toBe(1);
  });

  it('should build one model source per factory and no more', () => {
    // The calibration arm for the count above: without it, a `createModelSource`
    // hoisted to module scope and called once for the whole file would read as
    // 1 and pass.
    const model = signal<Record<string, unknown>>({ country: 'US' });

    createExpressionRules(model);
    createExpressionRules(model);

    expect(mockCalls.createModelSource).toBe(2);
  });
});
