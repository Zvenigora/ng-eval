import { compileRule } from './compile-rule';
import { defineRule } from './define-rule';

describe('defineRule', () => {
  it('returns the rule it is given, unchanged', () => {
    const rule = { id: 'r', calculations: [{ name: 'x', value: '1' }] };
    expect(defineRule(rule)).toBe(rule);
    expect(defineRule(rule)).toEqual({ id: 'r', calculations: [{ name: 'x', value: '1' }] });
  });

  it('checks nothing at run time: compileRule does', () => {
    // A cast past the type, as a rule read from JSON can be.
    const rule = defineRule({ id: 'r', descripton: 'x' } as never);
    expect(compileRule(rule).problems.map((problem) => problem.code)).toEqual(['unknown-field']);
  });
});
