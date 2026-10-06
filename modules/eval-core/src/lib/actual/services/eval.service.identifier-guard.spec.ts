import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext, EvalOptions, EvalScope } from '../../internal/classes/eval';
import { Context, Registry } from '../../internal/classes/common';

/**
 * Cover for `docs/backlog-retired.md` B6: an expression never resolves a name
 * on the prototype-pollution blocklist against its context.
 *
 * Two routes resolve a name against the context rather than against an object
 * the expression holds: an identifier, through `EvalContext.get`, and a member
 * of `this` - `this.k` or `this["k"]` - through `member-expression.ts`'s
 * context branch. A plain object is read on both with a bare property access,
 * so up to 0.10.0 each resolved whatever the context inherits from
 * `Object.prototype`; the blocklist guarded member access to other objects
 * only. Both now refuse a blocklisted name before any lookup, with the member
 * visitor's own error. Under `caseInsensitive` both also refuse when the key
 * the lookup matched is blocklisted, as the member visitor re-checks
 * `foundKey` for another object.
 *
 * The blocklist is spelled out rather than imported, so a name dropped from it
 * fails here. Each row builds its context fresh. A signal context's rows are in
 * `eval-signals`' `signal-context.spec.ts`, since this package cannot import
 * it.
 */
describe('EvalService - the blocklist against the context', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  const NAMES = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toString',
    'valueOf',
    'toLocaleString'
  ];

  const blocked = (name: string): string =>
    `Access to dangerous property "${name}" is blocked for security reasons`;

  const optionsOf = (caseInsensitive: boolean): EvalOptions => ({ caseInsensitive });

  class Holder {
    a = 1;
  }

  /** Gives `target` an own, enumerable data property `key`, `__proto__` included. */
  const withOwn = <T extends object>(target: T, key?: string): T => {
    if (key !== undefined) {
      Object.defineProperty(target, key, { value: 'own', enumerable: true, writable: true, configurable: true });
    }
    return target;
  };

  interface Kind {
    readonly label: string;
    /** Whether a case variant of a key the context holds resolves under `caseInsensitive`. */
    readonly corrects: boolean;
    /** A context holding `a: 1`, and `key: 'own'` when a key is given. */
    readonly build: (caseInsensitive: boolean, key?: string) => EvalContext | Context;
  }

  const KINDS: readonly Kind[] = [
    {
      label: 'a plain object',
      corrects: true,
      build: (_, key) => withOwn({ a: 1 }, key)
    },
    {
      label: 'a Registry',
      corrects: true,
      build: (caseInsensitive, key) => {
        const registry = Registry.fromObject<string, unknown>({ a: 1 }, { caseInsensitive });
        if (key !== undefined) {
          registry.set(key, 'own');
        }
        return registry as Context;
      }
    },
    {
      label: 'a class instance',
      corrects: true,
      build: (_, key) => withOwn(new Holder(), key) as unknown as Context
    },
    {
      // Built by the caller, so `caseInsensitive` on the walk does not turn
      // the plain object into a Registry: the original is read as written.
      label: 'an EvalContext over a plain object',
      corrects: false,
      build: (_, key) => new EvalContext(withOwn({ a: 1 }, key), {})
    },
    {
      label: 'a global prior scope',
      corrects: false,
      build: (_, key) => {
        const context = new EvalContext(new Registry<unknown, unknown>(), {});
        context.priorScopes.push(EvalScope.fromObject(withOwn({ a: 1 }, key), { global: true }));
        return context;
      }
    }
  ];

  /** Each way an expression names a key of the context. */
  const FORMS: ReadonlyArray<readonly [string, (name: string) => string]> = [
    ['an identifier', (name) => name],
    ['a member of this', (name) => `this.${name}`],
    ['a computed member of this', (name) => `this["${name}"]`]
  ];

  const CASES = [false, true];

  describe('a blocklisted name, before any lookup', () => {

    const rows = KINDS.flatMap((kind) => CASES.flatMap((caseInsensitive) =>
      FORMS.flatMap(([form, write]) => NAMES.map((name) =>
        [name, form, kind.label, caseInsensitive, kind, write(name)] as const))));

    it.each(rows)('should refuse %s as %s, over %s, caseInsensitive %s',
      (name, _form, _label, caseInsensitive, kind, expression) => {
        expect(() => service.simpleEval(expression, kind.build(caseInsensitive), optionsOf(caseInsensitive)))
          .toThrow(blocked(name));
      });

    // An `EvalScope` the caller put in the context as a value is the member
    // visitor's third branch, and a global one reads its object as the context
    // does, with a bare property access.
    const scopeRows = CASES.flatMap((caseInsensitive) => NAMES.flatMap((name) =>
      [`s.${name}`, `s["${name}"]`].map((expression) => [expression, caseInsensitive, name] as const)));

    it.each(scopeRows)('should refuse %s on an EvalScope in the context, caseInsensitive %s',
      (expression, caseInsensitive, name) => {
        const context = { s: EvalScope.fromObject({ a: 1 }, { global: true }) };
        expect(service.simpleEval('s.a', context, optionsOf(caseInsensitive))).toEqual(1);
        expect(() => service.simpleEval(expression, context, optionsOf(caseInsensitive)))
          .toThrow(blocked(name));
      });
  });

  describe('a case variant whose matched key is blocklisted, caseInsensitive', () => {

    const rows = KINDS.filter((kind) => kind.corrects).flatMap((kind) =>
      FORMS.flatMap(([form, write]) => NAMES.map((name) =>
        [name.toUpperCase(), form, kind.label, name, kind, write(name.toUpperCase())] as const)));

    it.each(rows)('should refuse %s as %s, over %s holding %s',
      (_variant, _form, _label, name, kind, expression) => {
        expect(() => service.simpleEval(expression, kind.build(true, name), optionsOf(true)))
          .toThrow(blocked(name));
      });

    /** A context whose prior scope is namespaced `namespace`, matched without regard to case. */
    const namespaced = (namespace: string): EvalContext => {
      const context = new EvalContext(new Registry<unknown, unknown>(), {});
      context.priorScopes.push(EvalScope.fromObject({ a: 1 }, { namespace, caseInsensitive: true }));
      return context;
    };

    const namespaceRows = FORMS.flatMap(([form, write]) => NAMES.map((name) =>
      [name.toUpperCase(), form, name, write(name.toUpperCase())] as const));

    it.each(namespaceRows)('should refuse %s as %s, matching a prior scope namespaced %s',
      (_variant, _form, name, expression) => {
        expect(() => service.simpleEval(expression, namespaced(name), optionsOf(true)))
          .toThrow(blocked(name));
      });

    // A namespace is matched with `localeCompare` at base sensitivity, which
    // also ignores accents, so a variant need not lower-case to the key it
    // matches. `ö` lower-cases to itself and matches `o`.
    it.each(FORMS)('should refuse an accented variant as %s, matching a prior scope namespace',
      (_form, write) => {
        expect(service.simpleEval(write('cönstructor'), namespaced('cönstructor'), optionsOf(true)))
          .toEqual({ a: 1 });
        expect(() => service.simpleEval(write('cönstructor'), namespaced('constructor'), optionsOf(true)))
          .toThrow(blocked('constructor'));
      });
  });

  describe('an ordinary name still resolves', () => {

    const rows = KINDS.flatMap((kind) => CASES.map((caseInsensitive) =>
      [kind.label, caseInsensitive, kind] as const));

    it.each(rows)('should resolve a key of %s, caseInsensitive %s', (_label, caseInsensitive, kind) => {
      expect(service.simpleEval('a', kind.build(caseInsensitive), optionsOf(caseInsensitive))).toEqual(1);
      expect(service.simpleEval('this.a', kind.build(caseInsensitive), optionsOf(caseInsensitive))).toEqual(1);
      expect(service.simpleEval('this["a"]', kind.build(caseInsensitive), optionsOf(caseInsensitive))).toEqual(1);
    });

    // A near miss: a different spelling of a blocklisted name is the caller's
    // own key. Under `caseInsensitive` it is matched as itself, so a check that
    // compared the matched key without regard to case would refuse it.
    it.each(rows)('should resolve a key spelled Constructor on %s, caseInsensitive %s', (_label, caseInsensitive, kind) => {
      const options = optionsOf(caseInsensitive);
      expect(service.simpleEval('Constructor', kind.build(caseInsensitive, 'Constructor'), options)).toEqual('own');
      expect(service.simpleEval('this.Constructor', kind.build(caseInsensitive, 'Constructor'), options)).toEqual('own');
    });

    it.each(rows)('should resolve names that contain a blocklisted one, over %s, caseInsensitive %s', (_label, caseInsensitive, kind) => {
      const options = optionsOf(caseInsensitive);
      expect(service.simpleEval('myConstructor', kind.build(caseInsensitive, 'myConstructor'), options)).toEqual('own');
      expect(service.simpleEval('toStringValue', kind.build(caseInsensitive, 'toStringValue'), options)).toEqual('own');
    });

    const correcting = KINDS.filter((kind) => kind.corrects).map((kind) => [kind.label, kind] as const);

    it.each(correcting)('should resolve a case variant of a key of %s, caseInsensitive', (_label, kind) => {
      expect(service.simpleEval('A', kind.build(true), optionsOf(true))).toEqual(1);
      expect(service.simpleEval('this.A', kind.build(true), optionsOf(true))).toEqual(1);
    });

    it('should still resolve the literal names, caseInsensitive', () => {
      expect(service.simpleEval('[NULL, TRUE, False, Undefined]', {}, optionsOf(true)))
        .toEqual([null, true, false, undefined]);
    });
  });
});
