import { TestBed } from '@angular/core/testing';
import { AnyNode, Literal } from 'acorn';
import { EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';
import { CompilerService } from '../../actual/services/compiler.service';
import { EvalService } from '../../actual/services/eval.service';

/**
 * A regex literal evaluates to a new `RegExp` each time, as in JavaScript.
 *
 * Acorn builds one `RegExp` per regex literal at parse time, and the visitor
 * used to push that object itself, so every evaluation of one parsed tree
 * shared it. The rows that matter are the ones where the tree is reused:
 * `EvalService` caches the parse of a string, and `CompilerService` compiles
 * once for any number of calls. A global regex carries `lastIndex` between
 * `test` calls, so on a shared object the second evaluation of
 * `r.test("a")` started at index 1 and answered false.
 */
describe('literal visitor - regex literals', () => {

  const SOURCE = 'let r = /a/g; r.test("a")';

  it('should answer the same through simpleEval twice on one string', () => {
    const service = TestBed.inject(EvalService);

    expect(service.simpleEval(SOURCE, {})).toBe(true);
    expect(service.simpleEval(SOURCE, {})).toBe(true);
  });

  it('should answer the same from one compiled expression called twice', () => {
    const compiler = TestBed.inject(CompilerService);
    const fn = compiler.compile(SOURCE);

    expect(compiler.simpleCall(fn, {})).toBe(true);
    expect(compiler.simpleCall(fn, {})).toBe(true);
  });

  it('should evaluate one regex literal to a new object each time', () => {
    const value = evaluate(
      parse('let f = () => /a/; f() === f()', { ecmaVersion: 2020 }) as AnyNode,
      EvalState.fromContext({}));

    expect(value).toBe(false);
  });

  it('should keep the pattern and flags, and start at lastIndex 0', () => {
    const value = evaluate(
      parse('/a+/gi', { ecmaVersion: 2020 }) as AnyNode,
      EvalState.fromContext({})) as RegExp;

    expect(value).toBeInstanceOf(RegExp);
    expect(value.source).toBe('a+');
    expect(value.flags).toBe('gi');
    expect(value.lastIndex).toBe(0);
  });

  it('should push a null value through when acorn could not build the regex', () => {
    // What acorn leaves when the environment rejects the pattern or flags:
    // `value` null, `regex` describing what was written.
    const node = {
      type: 'Literal', start: 0, end: 5, value: null, raw: '/a/zz',
      regex: { pattern: 'a', flags: 'zz' },
    } as unknown as Literal;

    expect(evaluate(node as AnyNode, EvalState.fromContext({}))).toBeNull();
  });
});
