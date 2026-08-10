import { AnyNode } from 'acorn';
import { EvalContext, EvalHooks, EvalReadEvent, EvalScope, EvalScopeOptions, EvalState } from '../classes/eval';
import { Context } from '../classes/common';
import { evaluate, parse } from '../functions';

/**
 * Parses a single expression down to its root node, the way the services do.
 */
const nodeOf = (source: string): AnyNode =>
  parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode;

/**
 * Records every read event fired during one evaluation.
 */
class ReadRecorder {
  readonly hooks = new EvalHooks();
  readonly reads: EvalReadEvent[] = [];

  constructor() {
    this.hooks.onRead((e) => this.reads.push(e));
  }

  run(source: string,
      context: Context | EvalContext = {},
      options: Record<string, unknown> = {}): EvalState {

    const state = EvalState.fromContext(context, { hooks: this.hooks, ...options });
    evaluate(nodeOf(source), state);
    return state;
  }

  get kinds(): string[] {
    return this.reads.map((e) => e.kind);
  }

  get keys(): (string | number | symbol)[] {
    return this.reads.map((e) => e.key);
  }

  get paths(): (string | undefined)[] {
    return this.reads.map((e) => e.path);
  }

  get values(): unknown[] {
    return this.reads.map((e) => e.value);
  }
}

describe('read hooks', () => {

  describe('identifier reads', () => {

    it('should emit one read per identifier resolved against the context', () => {
      const recorder = new ReadRecorder();
      const state = recorder.run('a + b', { a: 1, b: 2 });

      expect(recorder.kinds).toEqual(['identifier', 'identifier']);
      expect(recorder.keys).toEqual(['a', 'b']);
      expect(recorder.values).toEqual([1, 2]);
      expect(recorder.reads.map((e) => e.target)).toEqual([state.context, state.context]);
    });

    it('should report the identifier name as the path', () => {
      const recorder = new ReadRecorder();

      recorder.run('a + b', { a: 1, b: 2 });

      expect(recorder.paths).toEqual(['a', 'b']);
    });

    it('should carry the node that resolved the read', () => {
      const recorder = new ReadRecorder();

      recorder.run('a', { a: 1 });

      expect(recorder.reads[0].node.type).toBe('Identifier');
    });

    it('should emit a read for an identifier that resolves to undefined', () => {
      const recorder = new ReadRecorder();

      recorder.run('missing', {});

      expect(recorder.keys).toEqual(['missing']);
      expect(recorder.values).toEqual([undefined]);
    });

    it('should emit nothing once the only read hook has unsubscribed', () => {
      const recorder = new ReadRecorder();
      const late: EvalReadEvent[] = [];
      const off = recorder.hooks.onRead((e) => late.push(e));

      off();
      const state = recorder.run('a + 1', { a: 1 });

      // `isActive` stays latched, so the visitors still reach the emission
      // points; the removed hook must simply not hear about them.
      expect(state.hasHooks).toBe(true);
      expect(late).toEqual([]);
      expect(state.hookErrors).toEqual([]);
      expect(recorder.keys).toEqual(['a']);
    });
  });

  describe('member reads', () => {

    it('should emit the dotted path for a static member chain', () => {
      const recorder = new ReadRecorder();
      const context = { a: { b: { c: 7 } } };

      recorder.run('a.b.c', context);

      expect(recorder.kinds).toEqual(['identifier', 'member', 'member']);
      expect(recorder.keys).toEqual(['a', 'b', 'c']);
      expect(recorder.paths).toEqual(['a', 'a.b', 'a.b.c']);
      expect(recorder.values).toEqual([context.a, context.a.b, 7]);
    });

    it('should report the object the key was read from as the target', () => {
      const recorder = new ReadRecorder();
      const context = { foo: { bar: 'baz' } };

      recorder.run('foo.bar', context);

      expect(recorder.reads[1].kind).toBe('member');
      expect(recorder.reads[1].target).toBe(context.foo);
    });

    it('should report an exact key and no path for a computed member', () => {
      const recorder = new ReadRecorder();

      recorder.run('list[1 + 1]', { list: [10, 20, 30] });

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.kind).toBe('member');
      expect(member.key).toBe(2);
      expect(member.path).toBeUndefined();
      expect(member.value).toBe(30);
    });

    it('should report an exact key and no path for a computed literal member', () => {
      const recorder = new ReadRecorder();

      recorder.run('foo["bar"]', { foo: { bar: 'baz' } });

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.key).toBe('bar');
      expect(member.path).toBeUndefined();
      expect(member.value).toBe('baz');
    });

    it('should emit reads for the callee of a method call', () => {
      const recorder = new ReadRecorder();
      const counter = { value: 0, increment: function () { return ++this.value; } };

      recorder.run('counter.increment()', { counter });

      expect(recorder.kinds).toEqual(['identifier', 'member']);
      expect(recorder.keys).toEqual(['counter', 'increment']);
      expect(recorder.reads[1].target).toBe(counter);
    });

    it('should emit a read for a member of the context itself', () => {
      const recorder = new ReadRecorder();
      const state = recorder.run('this.a', { a: 1 });

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.kind).toBe('member');
      expect(member.key).toBe('a');
      expect(member.target).toBe(state.context);
      expect(member.value).toBe(1);
      // The chain terminates at a ThisExpression rather than an Identifier, so
      // there is no static path to reconstruct.
      expect(member.path).toBeUndefined();
    });
  });

  describe('case-insensitive key correction', () => {

    const options = { caseInsensitive: true };

    it('should report the corrected key for an identifier read', () => {
      const recorder = new ReadRecorder();

      recorder.run('THREE', { three: 3 }, options);

      expect(recorder.keys).toEqual(['three']);
      expect(recorder.values).toEqual([3]);
    });

    it('should keep the source spelling in the path', () => {
      const recorder = new ReadRecorder();

      recorder.run('THREE', { three: 3 }, options);

      expect(recorder.paths).toEqual(['THREE']);
    });

    it('should report the corrected key for a member read', () => {
      const recorder = new ReadRecorder();

      recorder.run('Foo.Bar', { foo: { bar: 'baz' } }, options);

      expect(recorder.kinds).toEqual(['identifier', 'member']);
      expect(recorder.keys).toEqual(['foo', 'bar']);
      expect(recorder.paths).toEqual(['Foo', 'Foo.Bar']);
      expect(recorder.values).toEqual([{ bar: 'baz' }, 'baz']);
    });

    it('should report the corrected key for a member of the context itself', () => {
      const recorder = new ReadRecorder();

      recorder.run('This.Three', { three: 3 }, options);

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.key).toBe('three');
      expect(member.value).toBe(3);
    });
  });

  describe('the this identifier', () => {

    it('should emit no read for an identifier that resolves to the context', () => {
      const recorder = new ReadRecorder();

      recorder.run('This.Three', { three: 3 }, { caseInsensitive: true });

      // `This` resolves to the context object itself rather than to a key
      // within it, so it is not a read. The member read of `three` is the real
      // dependency.
      expect(recorder.kinds).toEqual(['member']);
      expect(recorder.keys).toEqual(['three']);
    });
  });

  describe('literal registry resolutions', () => {

    const options = { caseInsensitive: true };

    it('should emit a read for a literal resolved off the context', () => {
      const recorder = new ReadRecorder();

      recorder.run('TrUe', {}, options);

      expect(recorder.kinds).toEqual(['identifier']);
      expect(recorder.values).toEqual([true]);
    });

    it('should report the source spelling when the context cannot correct the key', () => {
      const recorder = new ReadRecorder();

      recorder.run('Undefined', {}, options);

      // The literal registry is not part of the context, so `getKey` cannot
      // correct the spelling and the read falls back to the source name.
      expect(recorder.keys).toEqual(['Undefined']);
      expect(recorder.values).toEqual([undefined]);
    });
  });

  describe('EvalScope reads', () => {

    /**
     * The `object instanceof EvalScope` branch of `evaluateMember` is NOT
     * reachable from `eval.service.scope.spec.ts` or
     * `eval.service.global-scope.spec.ts`: a namespaced `EvalScope.get` returns
     * its wrapped `context` object, never the scope itself, so those
     * expressions land in the plain-object branch (asserted below). The branch
     * is only reached when a context *value* is itself an `EvalScope`, which is
     * what this context builds. Do not delete it as redundant with the
     * namespaced cases - it is the only cover for that branch.
     */
    it('should report the scope as the target when a context value is an EvalScope', () => {
      const recorder = new ReadRecorder();
      const scope = EvalScope.fromObject({ x: 42 }, { global: true, namespace: 'inner' });

      recorder.run('scope.x', { scope });

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.kind).toBe('member');
      expect(member.target).toBe(scope);
      expect(member.target).toBeInstanceOf(EvalScope);
      expect(member.key).toBe('x');
      expect(member.value).toBe(42);
      expect(member.path).toBe('scope.x');
    });
  });

  describe('the paths eval.service.scope.spec.ts exercises', () => {

    const args = ['says', 'meow'];

    const cat = {
      type: 'Cat',
      name: 'Miss Kitty',
      num: 3,
      action: function (a: string[], n: number, t: string) { return this.name + ' ' + a.join(' ') + ' ' + n + ' ' + t; },
    };

    const dog = {
      type: 'Dog',
      name: 'Ralph',
      says: function () { return this.type + ' ' + this.name + ' says woof'; },
    };

    const build = (): EvalContext => {
      const evalContext = new EvalContext({ args }, { caseInsensitive: true });

      const catOptions: EvalScopeOptions = {
        global: false, caseInsensitive: false, namespace: 'cat', thisArg: cat
      };
      evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

      const dogOptions: EvalScopeOptions = {
        global: false, caseInsensitive: true, namespace: 'dog', thisArg: dog
      };
      evalContext.priorScopes.push(EvalScope.fromObject(dog, dogOptions));

      return evalContext;
    };

    it('should emit reads for a namespaced scope call', () => {
      const recorder = new ReadRecorder();

      recorder.run('cat.action(args, cat.num, "times")', build());

      // `callExpressionVisitor` evaluates the arguments before the callee, so
      // the callee's own reads arrive last.
      expect(recorder.kinds).toEqual([
        'identifier', 'identifier', 'member', 'identifier', 'member'
      ]);
      expect(recorder.keys).toEqual(['args', 'cat', 'num', 'cat', 'action']);
      expect(recorder.values[0]).toBe(args);
      expect(recorder.values[2]).toBe(3);
      expect(recorder.values[4]).toBe(cat.action);
    });

    it('should report the wrapped object rather than the EvalScope as the target', () => {
      const recorder = new ReadRecorder();

      recorder.run('cat.action(args, cat.num, "times")', build());

      const members = recorder.reads.filter((e) => e.kind === 'member');
      for (const member of members) {
        expect(member.target).toBe(cat);
        expect(member.target).not.toBeInstanceOf(EvalScope);
      }
    });

    it('should emit reads for a case-insensitive namespaced scope call', () => {
      const recorder = new ReadRecorder();

      recorder.run('Dog.Says()', build(), { caseInsensitive: true });

      expect(recorder.kinds).toEqual(['identifier', 'member']);
      expect(recorder.keys).toEqual(['Dog', 'says']);
      expect(recorder.values[0]).toBe(dog);
      expect(recorder.values[1]).toBe(dog.says);
    });

    it('should leave a namespace identifier uncorrected', () => {
      const recorder = new ReadRecorder();

      recorder.run('Dog.Says()', build(), { caseInsensitive: true });

      // `EvalContext.getKey` searches inside each prior scope's context, not
      // its namespace, so the namespace itself cannot be case-corrected and the
      // read reports the source spelling.
      expect(recorder.keys[0]).toBe('Dog');
    });
  });

  describe('the paths eval.service.global-scope.spec.ts exercises', () => {

    const globalScope = {
      PI: Math.PI,
      pow: function (base: number, exponent: number) { return Math.pow(base, exponent); }
    };

    const build = (): EvalContext => {
      const evalContext = new EvalContext({}, { caseInsensitive: true });
      evalContext.priorScopes.push(
        EvalScope.fromObject(globalScope, { global: true, namespace: 'global' })
      );
      return evalContext;
    };

    it('should emit a read for a bare global-scope identifier', () => {
      const recorder = new ReadRecorder();

      recorder.run('2 * PI', build(), { caseInsensitive: true });

      expect(recorder.kinds).toEqual(['identifier']);
      expect(recorder.keys).toEqual(['PI']);
      expect(recorder.values).toEqual([Math.PI]);
    });

    it('should emit a read for a namespaced global-scope member', () => {
      const recorder = new ReadRecorder();

      recorder.run('global.pow(2, 3)', build(), { caseInsensitive: true });

      expect(recorder.kinds).toEqual(['identifier', 'member']);
      expect(recorder.keys).toEqual(['global', 'pow']);
      expect(recorder.values[1]).toBe(globalScope.pow);
    });
  });

  describe('the paths eval.service.case-insesitive.spec.ts exercises', () => {

    const options = { caseInsensitive: true };

    const context = {
      three: 3,
      foo: { bar: 'baz' },
      numMap: { 10: 'ten', 3: 'three' },
      list: [1, 2, 3, 4, 5],
      isArray: Array.isArray,
      sub: { sub2: { Date } },
    };

    it('should report the corrected key for a case-varied identifier call', () => {
      const recorder = new ReadRecorder();

      recorder.run('IsArray([1,2,3])', context, options);

      expect(recorder.keys).toEqual(['isArray']);
    });

    it('should report an exact numeric key for a computed index', () => {
      const recorder = new ReadRecorder();

      recorder.run('LiSt[3]', context, options);

      expect(recorder.keys).toEqual(['list', 3]);
      expect(recorder.paths).toEqual(['LiSt', undefined]);
      expect(recorder.values[1]).toBe(4);
    });

    it('should report the resolved key of a computed expression index', () => {
      const recorder = new ReadRecorder();

      recorder.run('NumMap[1 + 2]', context, options);

      expect(recorder.keys).toEqual(['numMap', 3]);
      expect(recorder.values[1]).toBe('three');
    });

    it('should correct every hop of a nested member chain', () => {
      const recorder = new ReadRecorder();

      recorder.run('SUB.SUB2.DATE', context, options);

      expect(recorder.keys).toEqual(['sub', 'sub2', 'Date']);
      expect(recorder.paths).toEqual(['SUB', 'SUB.SUB2', 'SUB.SUB2.DATE']);
    });

    it('should correct a key found on the prototype chain', () => {
      const recorder = new ReadRecorder();

      recorder.run('list.FIND(v => v === 3)', context, options);

      const member = recorder.reads.filter((e) => e.kind === 'member')[0];
      expect(member.key).toBe('find');
      expect(member.target).toBe(context.list);
      expect(member.value).toBe(Array.prototype.find);
    });

    it('should report an arrow-function parameter as an ordinary context read', () => {
      const recorder = new ReadRecorder();
      const state = recorder.run('list.FIND(v => v === 3)', context, options);

      // An arrow function pushes its parameters as a scope on the *same*
      // EvalContext, so a read of `v` is indistinguishable in shape from a read
      // of a real context key. A dependency tracker will therefore record
      // loop-local bindings unless it filters them; Phase 3 needs to know.
      const scopeRead = recorder.reads.filter((e) => e.key === 'v');
      expect(scopeRead.length).toBeGreaterThan(0);
      expect(scopeRead[0].kind).toBe('identifier');
      expect(scopeRead[0].target).toBe(state.context);
      expect(scopeRead[0].path).toBe('v');
    });

    it('should emit a read through an optional member on a present object', () => {
      const recorder = new ReadRecorder();

      recorder.run('Foo?.Bar', context, options);

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.key).toBe('bar');
      expect(member.target).toBe(context.foo);
      expect(member.value).toBe('baz');
      // The optional marker is not represented in the reconstructed path.
      expect(member.path).toBe('Foo.Bar');
    });

    it('should report a synthetic target for an optional member on a nullish base', () => {
      const recorder = new ReadRecorder();

      recorder.run('UnKnown?.x', context, options);

      const member = recorder.reads[recorder.reads.length - 1];
      expect(member.key).toBe('x');
      expect(member.value).toBeUndefined();
      // `evaluateMember` substitutes a fresh `{}` for a nullish optional base,
      // so the target is an object that never existed in the caller's data and
      // differs on every evaluation. Identity-based tracking cannot match it
      // across runs; `path` is the only stable handle here.
      expect(member.target).toEqual({});
      expect(member.target).not.toBe(context);
      expect(member.path).toBe('UnKnown.x');
    });
  });

  describe('target identity across evaluations', () => {

    it('should report the same object identity for a member read of a reused context', () => {
      const context = { foo: { bar: 'baz' } };
      const first = new ReadRecorder();
      const second = new ReadRecorder();

      first.run('foo.bar', context);
      second.run('foo.bar', context);

      expect(first.reads[1].target).toBe(second.reads[1].target);
      expect(first.reads[1].target).toBe(context.foo);
    });

    it('should report the same object identity under a case-insensitive context copy', () => {
      const context = { foo: { bar: 'baz' } };
      const first = new ReadRecorder();
      const second = new ReadRecorder();

      first.run('foo.bar', context, { caseInsensitive: true });
      second.run('foo.bar', context, { caseInsensitive: true });

      // A case-insensitive plain context is copied into a fresh Registry per
      // evaluation, but the entries still reference the caller's objects.
      expect(first.reads[1].target).toBe(context.foo);
      expect(second.reads[1].target).toBe(context.foo);
    });

    it('should report a fresh EvalContext identity per evaluation for identifier reads', () => {
      const context = { a: 1 };
      const first = new ReadRecorder();
      const second = new ReadRecorder();

      first.run('a', context);
      second.run('a', context);

      // Identifier reads target the per-evaluation EvalContext, which is
      // rebuilt for every state when the caller passes a plain object. Only
      // reads whose target is a caller-owned object have a stable identity.
      expect(first.reads[0].target).not.toBe(second.reads[0].target);
    });

    it('should report a stable EvalContext identity when the caller reuses one', () => {
      const evalContext = new EvalContext({ a: 1 }, {});
      const first = new ReadRecorder();
      const second = new ReadRecorder();

      first.run('a', evalContext);
      second.run('a', evalContext);

      expect(first.reads[0].target).toBe(evalContext);
      expect(second.reads[0].target).toBe(evalContext);
    });
  });

  describe('cost when unused', () => {

    it('should not build read events when no hook is registered', () => {
      const hooks = new EvalHooks();
      const seen: EvalReadEvent[] = [];
      const off = hooks.onRead((e) => seen.push(e));
      off();
      hooks.clear();

      const state = EvalState.fromContext({ a: { b: 1 } }, { hooks });
      evaluate(nodeOf('a.b'), state);

      expect(seen).toEqual([]);
      expect(state.hasHooks).toBe(false);
    });
  });
});
