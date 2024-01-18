import { AnyNode } from 'acorn';
import { EvalTrace } from './eval-trace';

describe('EvalTrace', () => {
  let evalTrace: EvalTrace;

  beforeEach(() => {
    evalTrace = new EvalTrace();
  });

  it('should add an item to the trace', () => {
    const node: AnyNode = { type: 'Identifier', start: 0, end: 4, name: 'Test' };
    const value = 'Test';
    const expression = 'Test Expression';

    evalTrace.add(node, value, expression);

    expect(evalTrace.length).toBe(1);
    expect(evalTrace[0]).toEqual({
      type: 'Identifier',
      value: 'Test',
      expression: 'Test'
    });
  });

  it('should add an item without an expression to the trace', () => {
    const node: AnyNode = { type: 'Identifier', start: 0, end: 4, name: 'Test' };
    const value = 'Test';

    evalTrace.add(node, value);

    expect(evalTrace.length).toBe(1);
    expect(evalTrace[0]).toEqual({
      type: 'Identifier',
      value: 'Test'
    });
  });
});
