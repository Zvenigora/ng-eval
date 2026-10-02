import { AnyNode } from 'acorn';
import { Context, Registry } from '../common';
import { evaluate, parse } from '../../functions';
import { EvalContext } from './eval-context';
import { EvalLookup } from './eval-lookup';
import { EvalOptions } from './eval-options';
import { EvalScope } from './eval-scope';
import { EvalState } from './eval-state';

/**
 * `getKey` answers the spelling `get` resolved, from the source `get` resolved
 * it from, and nothing when `get` finds nothing (`docs/backlog-retired.md` A4
 * and A10). Each `describe` below is a measured row from before the fix, as it
 * should be; the last is the invariant over a grid of contexts and keys.
 */
describe('EvalContext.getKey', () => {

  const insensitive: EvalOptions = { caseInsensitive: true };

  /** A `Registry` that matches keys exactly, whatever the context's options. */
  const caseSensitiveRegistry = (entries: Record<string, unknown>): Registry<unknown, unknown> =>
    Registry.fromObject(entries, { caseInsensitive: false }) as Registry<unknown, unknown>;

  describe('a plain-object scope pushed (A10)', () => {

    const build = (): EvalContext => {
      const context = new EvalContext(caseSensitiveRegistry({ a: 'A' }), {});
      context.push({});
      return context;
    };

    it('should answer nothing for a key no source holds', () => {
      const context = build();

      expect(context.get('zzz')).toBeUndefined();
      expect(context.getKey('zzz')).toBeUndefined();
    });

    it('should answer nothing for an Object.prototype name', () => {
      const context = build();

      expect(context.get('toString')).toBeUndefined();
      expect(context.getKey('toString')).toBeUndefined();
    });

    it('should still answer a key the original holds', () => {
      const context = build();

      expect(context.get('a')).toBe('A');
      expect(context.getKey('a')).toBe('a');
    });

    it('should answer a key the scope binds, even to undefined', () => {
      const context = build();
      context.push({ u: undefined });

      expect(context.hasInScopes('u')).toBe(true);
      expect(context.getKey('u')).toBe('u');
    });
  });

  describe('a case-sensitive original under caseInsensitive (A4, absent value)', () => {

    it('should answer nothing where get finds nothing', () => {
      const context = new EvalContext(caseSensitiveRegistry({ a: 1 }), insensitive);

      expect(context.get('A')).toBeUndefined();
      expect(context.getKey('A')).toBeUndefined();
    });

    it('should not report a plain original matched case-insensitively that get reads exactly', () => {
      // Constructed directly, so `fromContext` does not copy it into a
      // case-insensitive `Registry`, and `get` reads it as `obj['A']`.
      const context = new EvalContext({ a: 1 }, insensitive);

      expect(context.get('A')).toBeUndefined();
      expect(context.getKey('A')).toBeUndefined();
    });

    it('should report the spelling of the source that resolved the value', () => {
      const context = new EvalContext(caseSensitiveRegistry({ a: 1 }), insensitive);
      context.lookups.push((key) => key === 'A' ? 'from lookup' : undefined);

      expect(context.get('A')).toBe('from lookup');
      expect(context.getKey('A')).toBe('A');
    });
  });

  describe('a namespaced prior scope (A4, namespace)', () => {

    const dog = { says: () => 'woof' };

    const build = (): EvalContext => {
      const context = new EvalContext({}, insensitive);
      context.priorScopes.push(
        EvalScope.fromObject(dog, { global: false, caseInsensitive: true, namespace: 'dog' })
      );
      return context;
    };

    it('should correct the namespace to its declared spelling', () => {
      const context = build();

      expect(context.get('Dog')).toBe(dog);
      expect(context.getKey('Dog')).toBe('dog');
    });

    it('should not correct a namespace the scope matches case-sensitively', () => {
      const context = new EvalContext({}, insensitive);
      context.priorScopes.push(
        EvalScope.fromObject(dog, { global: false, caseInsensitive: false, namespace: 'dog' })
      );

      expect(context.get('Dog')).toBeUndefined();
      expect(context.getKey('Dog')).toBeUndefined();
      expect(context.getKey('dog')).toBe('dog');
    });
  });

  describe('a key only a lookup resolves (A4, lookups)', () => {

    const build = (): EvalContext => {
      const context = new EvalContext({}, insensitive);
      context.lookups.push((key) => typeof key === 'string' && key.toLowerCase() === 'count'
        ? 5
        : undefined);
      return context;
    };

    it('should answer the key as written, since a lookup returns no key', () => {
      const context = build();

      expect(context.get('COUNT')).toBe(5);
      expect(context.getKey('COUNT')).toBe('COUNT');
    });

    it('should answer nothing when the lookup resolves nothing', () => {
      const context = build();

      expect(context.get('other')).toBeUndefined();
      expect(context.getKey('other')).toBeUndefined();
    });
  });

  describe('a non-global prior scope', () => {

    it('should not report a key held inside it, which get never resolves', () => {
      const context = new EvalContext({}, insensitive);
      context.priorScopes.push(
        EvalScope.fromObject({ inner: 1 }, { global: false, namespace: 'ns' })
      );

      expect(context.get('inner')).toBeUndefined();
      expect(context.getKey('inner')).toBeUndefined();
    });

    it('should report a key held inside a global scope, which get does resolve', () => {
      const context = new EvalContext({}, insensitive);
      context.priorScopes.push(
        EvalScope.fromObject(
          Registry.fromObject({ Inner: 1 }, insensitive) as Registry<unknown, unknown>,
          { global: true })
      );

      expect(context.get('INNER')).toBe(1);
      expect(context.getKey('INNER')).toBe('Inner');
    });
  });

  /**
   * `member-expression.ts` reads a member of the context itself as
   * `get(getKey(key))` under `caseInsensitive`, so where `getKey` answered
   * nothing the member read `get(undefined)`. Up to 0.7.x both of these
   * evaluated to undefined.
   */
  describe('a member of the context itself, read through getKey', () => {

    const run = (source: string, context: EvalContext): unknown =>
      evaluate(
        parse(source, { ecmaVersion: 2020, extractExpressions: true }) as AnyNode,
        EvalState.fromContext(context, insensitive));

    it('should resolve a key only a lookup resolves', () => {
      const context = new EvalContext({}, insensitive);
      context.lookups.push((key) => key === 'COUNT' ? 5 : undefined);

      expect(run('This.COUNT', context)).toBe(5);
    });

    it('should resolve a namespace spelled in another case', () => {
      const dog = { says: 'woof' };
      const context = new EvalContext({}, insensitive);
      context.priorScopes.push(EvalScope.fromObject(dog, { caseInsensitive: true, namespace: 'dog' }));

      expect(run('This.Dog', context)).toBe(dog);
    });
  });

  describe('a case-insensitive scope pushed', () => {

    it('should report the spelling the scope binds', () => {
      const context = new EvalContext({}, insensitive);
      context.push({ Count: 1 }, insensitive);

      expect(context.get('COUNT')).toBe(1);
      expect(context.getKey('COUNT')).toBe('Count');
    });
  });

  /**
   * The invariant the two methods share since they share a resolver: `getKey`
   * answers nothing exactly when `get` finds nothing, and what it answers
   * resolves to the same value.
   *
   * "Finds" is not `get(k) !== undefined`: a pushed scope that binds a key to
   * `undefined` is found, and `hasInScopes` is the presence question for that
   * step. Every other step treats `undefined` as absent, so the oracle is the
   * two together.
   *
   * What the grid would look like if the invariant were false, and that it is
   * reachable: before the fix, a pushed plain scope answered every key (A10), a
   * non-global prior scope answered keys `get` never reads, a case-sensitive
   * source answered a wrong-case key `get` misses, and a lookup-only key
   * answered nothing. Each of those is a cell here.
   */
  describe('the invariant over a grid of contexts and keys', () => {

    type Build = { name: string; build: () => Context };
    type Apply = { name: string; apply: (context: EvalContext, options: EvalOptions) => void };

    const originals: Build[] = [
      { name: 'plain', build: () => ({ a: 1, Bee: 2 }) },
      { name: 'Registry (case-sensitive)', build: () => caseSensitiveRegistry({ a: 1, Bee: 2 }) },
      {
        name: 'Registry (case-insensitive)',
        build: () => Registry.fromObject({ a: 1, Bee: 2 }, insensitive) as Registry<unknown, unknown>
      },
    ];

    const pushes: Apply[] = [
      { name: 'no scope pushed', apply: () => undefined },
      // As `arrow-function-expression.ts` pushes: no options, so a plain record.
      { name: 'plain scope pushed', apply: (context) => context.push({ p: 1, u: undefined }) },
      // As `program.ts` pushes: the walk's options.
      { name: 'scope pushed with options', apply: (context, options) => context.push({ Q: 1 }, options) },
    ];

    const priors: Apply[] = [
      { name: 'no prior scope', apply: () => undefined },
      {
        name: 'global prior scope',
        apply: (context) => context.priorScopes.push(
          EvalScope.fromObject({ g: 1 }, { global: true }))
      },
      {
        name: 'namespaced prior scope',
        apply: (context) => context.priorScopes.push(
          EvalScope.fromObject({ inner: 1 }, { namespace: 'ns', caseInsensitive: true }))
      },
      {
        name: 'global namespaced prior scope',
        apply: (context) => context.priorScopes.push(
          EvalScope.fromObject({ g: 1 }, { global: true, namespace: 'Gns' }))
      },
    ];

    const lookup: EvalLookup = (key) =>
      typeof key === 'string' && key.toLowerCase() === 'look' ? 'looked' : undefined;

    const lookups: Apply[] = [
      { name: 'no lookup', apply: () => undefined },
      { name: 'a lookup', apply: (context) => context.lookups.push(lookup) },
    ];

    const keys = [
      'a', 'A', 'Bee', 'bee', 'p', 'u', 'q', 'Q', 'g', 'G', 'ns', 'NS', 'Gns', 'gns',
      'inner', 'look', 'LOOK', 'zzz', 'toString', 'constructor'
    ];

    it('should answer nothing from getKey exactly when get finds nothing', () => {
      const failures: string[] = [];
      let cells = 0;

      for (const caseInsensitive of [false, true]) {
        const options: EvalOptions = { caseInsensitive };
        for (const original of originals) {
          for (const push of pushes) {
            for (const prior of priors) {
              for (const look of lookups) {
                for (const key of keys) {
                  const context = new EvalContext(original.build(), options);
                  push.apply(context, options);
                  prior.apply(context, options);
                  look.apply(context, options);

                  const value = context.get(key);
                  const found = value !== undefined || context.hasInScopes(key);
                  const answered = context.getKey(key);
                  cells++;

                  const where = `caseInsensitive=${caseInsensitive}, ${original.name}, `
                    + `${push.name}, ${prior.name}, ${look.name}, key '${key}'`;

                  if ((answered === undefined) === found) {
                    failures.push(`${where}: get ${found ? 'found' : 'found nothing'}, `
                      + `getKey answered ${String(answered)}`);
                  } else if (answered !== undefined && context.get(answered) !== value) {
                    failures.push(`${where}: getKey answered '${String(answered)}', `
                      + `which get resolves to a different value`);
                  }
                }
              }
            }
          }
        }
      }

      expect(cells).toBe(2 * originals.length * pushes.length * priors.length
        * lookups.length * keys.length);
      expect(failures).toEqual([]);
    });
  });
});
