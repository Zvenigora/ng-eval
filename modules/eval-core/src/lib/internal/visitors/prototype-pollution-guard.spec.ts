import { AnyNode } from 'acorn';
import { EvalState } from '../classes/eval';
import { evaluate, parse } from '../functions';

/**
 * A member write assigns - `docs/backlog-retired.md` A23.
 *
 * `safeSetProperty` is the write half of the prototype-pollution guard, and its
 * refusals are pinned by `eval.service.prototype-pollution.spec.ts`. This file
 * covers what happens *after* them. Up to 0.9.x the write was
 * `Object.defineProperty` with a writable, enumerable, configurable
 * descriptor, which differs from an assignment in every row below: it
 * replaced an own accessor and hid an inherited one without running either
 * setter, made a non-enumerable property enumerable, refused every
 * non-configurable property, and silently replaced an accessor that has no
 * setter.
 *
 * The frozen-object row is the one that does not discriminate: a frozen
 * object refuses a definition as it refuses an assignment. It pins the message.
 */
describe('safeSetProperty - a member write assigns', () => {

  const run = (source: string, context: Record<string, unknown> = {}): unknown =>
    evaluate(parse(source, { ecmaVersion: 2020 }) as AnyNode, EvalState.fromContext(context));

  it('should write a regex literal\'s lastIndex', () => {
    expect(run('let r = /a/g; r.lastIndex = 3; r.lastIndex')).toBe(3);
  });

  it('should truncate an array through its length', () => {
    expect(run('let a = [1, 2]; a.length = 0; a')).toEqual([]);
  });

  it('should run an own setter on the caller\'s object, and leave it an accessor', () => {
    const calls: unknown[] = [];
    let store: unknown = 1;
    const o = {};
    Object.defineProperty(o, 'v', {
      get: () => store,
      set: (x: unknown) => { calls.push(x); store = x; },
      enumerable: true,
      configurable: true,
    });

    expect(run('o.v = 5', { o })).toBe(5);

    expect(calls).toEqual([5]);
    expect(store).toBe(5);
    const after = Object.getOwnPropertyDescriptor(o, 'v');
    expect(typeof after?.set).toBe('function');
    expect(after && 'value' in after).toBe(false);
  });

  it('should run an inherited setter, through an assignment and an update', () => {
    class Box {
      readonly calls: number[] = [];
      private stored = 1;
      get v(): number { return this.stored; }
      set v(x: number) { this.calls.push(x); this.stored = x; }
    }
    const b = new Box();

    run('b.v = 5', { b });
    run('b.v++', { b });

    expect(b.calls).toEqual([5, 6]);
    expect(b.v).toBe(6);
    expect(Object.getOwnPropertyDescriptor(b, 'v')).toBeUndefined();
  });

  it('should keep a non-enumerable property non-enumerable', () => {
    const o: Record<string, unknown> = {};
    Object.defineProperty(o, 'h', { value: 1, writable: true, enumerable: false, configurable: true });

    run('o.h = 2', { o });

    expect(o['h']).toBe(2);
    expect(Object.getOwnPropertyDescriptor(o, 'h')?.enumerable).toBe(false);
    expect(Object.keys(o)).toEqual([]);
  });

  it('should write a writable, non-configurable own property', () => {
    const o: Record<string, unknown> = {};
    Object.defineProperty(o, 'f', { value: 1, writable: true, enumerable: true, configurable: false });

    run('o.f = 2', { o });

    expect(o['f']).toBe(2);
    expect(Object.getOwnPropertyDescriptor(o, 'f')?.configurable).toBe(false);
  });

  it('should throw with the prefix for a frozen object, and write nothing', () => {
    const o = Object.freeze({ a: 1 });

    expect(() => run('o.a = 2', { o })).toThrow(/^Failed to set property "a": /);

    expect(o.a).toBe(1);
  });

  it('should throw with the prefix for an accessor that has no setter', () => {
    const o = {};
    Object.defineProperty(o, 'g', { get: () => 1, enumerable: true, configurable: true });

    expect(() => run('o.g = 2', { o })).toThrow(/^Failed to set property "g": /);

    expect(typeof Object.getOwnPropertyDescriptor(o, 'g')?.get).toBe('function');
  });
});
