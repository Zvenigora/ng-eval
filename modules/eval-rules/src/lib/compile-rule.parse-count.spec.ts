import { compileRule } from './compile-rule';
import { evaluateInit, evaluateRule } from './evaluate-rule';

// Finding 24's mechanism, as `eval-forms`' `rules.invocation-count.spec.ts`
// built it: a delegating `jest.mock` of `eval-core`'s barrel that records
// each text `parse` is given. The record is declared before the mock under a
// name starting `mock`, since the factory hoists above every declaration and
// reads the record only when `parse` runs. `jest.mock` hoists to file scope,
// so these rows have a file of their own: beside the other specs it would
// put all of them through a mocked barrel.
const mockParsed: string[] = [];

jest.mock('@zvenigora/ng-eval-core', () => {
  const actual = jest.requireActual<typeof import('@zvenigora/ng-eval-core')>(
    '@zvenigora/ng-eval-core'
  );
  return {
    ...actual,
    parse: (...args: Parameters<typeof actual.parse>) => {
      mockParsed.push(args[0]);
      return actual.parse(...args);
    },
  };
});

describe('compileRule parses each field once', () => {
  beforeEach(() => {
    mockParsed.length = 0;
  });

  it('parses each of a rule\'s eleven fields once, and each name it probes once', () => {
    const fields = [
      'region == "EU"',
      'setVisible("banner", false)',
      'order.total >= 100',
      'flag',
      'order.total * 0.1',
      '0',
      'tier == "gold" && calc.eligible',
      'setValue("discount", calc.discount)',
      'setVisible("banner", true)',
      'setValue("error", error.message)',
      'twice(order.total)',
    ];
    const result = compileRule(
      {
        id: 'r',
        triggers: [{ event: 'valueChanged' }],
        filter: { when: fields[0] },
        onInit: [fields[1]],
        calculations: [
          { name: 'eligible', value: fields[2] },
          { name: 'discount', when: fields[3], value: fields[4] },
          { name: 'discount', value: fields[5] },
          { name: 'doubled', value: fields[10] },
        ],
        decisions: [{ name: 'offer', cases: [{ if: fields[6], value: 'apply' }, { value: 'clear' }] }],
        outputs: [{ on: { decision: 'offer', is: 'apply' }, items: [fields[7], fields[8]] }],
        onError: [fields[9]],
      },
      { functions: ['twice'], effects: { setValue: {}, setVisible: {} } }
    );
    expect(result.problems).toEqual([]);

    // The probes (finding 11): one call per declaration, one read per
    // distinct calculation name. `discount` is assigned twice and probed once.
    const probes = ['twice()', 'setValue()', 'setVisible()', 'calc.eligible', 'calc.discount', 'calc.doubled'];
    expect([...mockParsed].sort()).toEqual([...fields, ...probes].sort());
    expect(mockParsed).toHaveLength(17);
  });

  it('parses nothing for a rule with no field and no declaration', () => {
    expect(compileRule({ id: 'r' }).ok).toBe(true);
    expect(mockParsed).toEqual([]);
  });
});

describe('evaluateRule parses nothing (the plan\'s step 4)', () => {
  it('parses no text across two runs and an init of a rule with every kind of field', () => {
    const result = compileRule(
      {
        id: 'r',
        filter: { when: 'total > 0' },
        onInit: ['setValue("a", 1)'],
        calculations: [{ name: 'doubled', when: 'total > 1', value: 'twice(total)' }],
        decisions: [{ name: 'offer', cases: [{ if: 'calc.doubled > 10', value: 'apply' }, { value: 'clear' }] }],
        outputs: [{ on: { decision: 'offer', is: 'apply' }, items: ['setValue("b", calc.doubled)'] }],
      },
      { functions: ['twice'], effects: { setValue: {} } }
    );
    if (!result.ok) {
      throw new Error(JSON.stringify(result.problems));
    }
    mockParsed.length = 0;
    const functions = { twice: (n: number) => n * 2 };
    expect(evaluateRule(result.rule, { facts: { total: 9 }, functions }).status).toBe('completed');
    expect(evaluateRule(result.rule, { facts: { total: 1 }, functions }).status).toBe('completed');
    expect(evaluateInit(result.rule, { facts: { total: 9 }, functions }).effects).toHaveLength(1);
    expect(mockParsed).toEqual([]);
  });
});
