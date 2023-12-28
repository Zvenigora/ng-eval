import { BaseContext } from '../classes/common';
import { call, callAsync, compile, compileAsync } from './compile';
import { parse } from './parse';
import { EvalState } from '../classes/eval';

describe('compile', () => {

  it('should call the provided function and return a value', () => {

    // Arrange
    const expr = 'one + two';
    const node = parse(expr, { ecmaVersion: 2020 });
    const fn = compile(node);

    // Act
    const context: BaseContext = {
      one: 1,
      two: 2
    };

    const state = EvalState.fromContext(context);
    const result = call(fn, state);

    const result2 = fn.call(null, state);

    // Assert
    expect(result).toBeDefined();
    expect(result).toBe(3);
    expect(result2).toBe(3);
  });

  it('should call the provided async function and return a promise', async () => {

    // Arrange
    const expr = 'promiseFunc(one, two)';
    const node = parse(expr, { ecmaVersion: 2020 });
    const fn = compileAsync(node);

    // Act
    const context: BaseContext = {
      one: 1,
      two: 2,
      promiseFunc: (a: number, b: number) => {
            return new Promise((resolve) => {
              setTimeout(() => {
                return resolve(a + b);
              }, 1000);
            });
          }
    };

    const state = EvalState.fromContext(context);
    const resultPromise = callAsync(fn, state);

    // Assert
    expect(resultPromise).toBeInstanceOf(Promise);
    await expect(resultPromise).resolves.toBe(3);
  });



});
