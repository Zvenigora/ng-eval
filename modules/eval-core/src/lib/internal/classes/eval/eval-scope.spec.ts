import { EvalScope } from './eval-scope';

describe('EvalScope', () => {
  let evalScope: EvalScope;

  beforeEach(() => {
    evalScope = new EvalScope({}, {global: true});
  });

  it('should create an instance', () => {
    expect(evalScope).toBeTruthy();
  });

  it('should have the correct type', () => {
    expect(evalScope.type).toBe('EvalScope');
  });

  it('should have the default context and options', () => {
    expect(evalScope.context).toEqual({});
    expect(evalScope.options).toMatchObject({
      caseInsensitive: false,
      namespace: undefined,
    });
  });

  it('should get the value of a key', () => {
    evalScope.set('name', 'John');
    expect(evalScope.get('name')).toBe('John');
  });

  it('should return undefined for a non-existing key', () => {
    expect(evalScope.get('age')).toBeUndefined();
  });

  it('should set the value of a key', () => {
    evalScope.set('age', 25);
    expect(evalScope.get('age')).toBe(25);
  });
});
