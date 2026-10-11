import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { Identifier } from 'acorn';
import { EvalService } from './eval.service';
import { CompilerService } from './compiler.service';
import { DiscoveryService } from './discovery.service';
import { ParserService } from './parser.service';
import { provideColonIdentifiers } from './colon-identifiers.provider';
import { EvalOptions, createDependencyTracker } from '../../internal/classes/eval';
import { Context } from '../../internal/classes/common';

/**
 * `docs/colon-identifiers/phase-9-plan.md` step 3: `provideColonIdentifiers()`
 * read by the root `ParserService`, and through it by every service (§ 3.1),
 * with hooks, dependencies (§ 3.7) and every prototype-pollution refusal
 * (§ 3.6) carried over to colon names. Each case configures its own root
 * injector, so its own `ParserService` and caches.
 *
 * Every evaluation row that reads a context key runs over a context that holds
 * it and one that does not (§ 6.1): a colon name read as `undefined` is
 * indistinguishable from one never joined if the fixture only ever omits it.
 * The second holds the name split at its colon - `Q1`, `obj.Q2`, `sheet.A1` -
 * so a split name would read it. The arrow row reads only its own parameter.
 */

const LABEL_ERROR = 'Unsupported statement type: LabeledStatement';
const DANGEROUS = 'Access to dangerous property "constructor" is blocked for security reasons';

const withProvider = () =>
  TestBed.configureTestingModule({ providers: [provideColonIdentifiers()] });
const withoutProvider = () => TestBed.configureTestingModule({});

const label = {
  type: 'Program',
  body: [{ type: 'LabeledStatement', label: { type: 'Identifier', name: 'Q1' } }],
};

describe('colon-joined names through the services (Phase 9 step 3)', () => {

  describe('criterion 1: every service reaches the provider', () => {

    describe('under provideColonIdentifiers()', () => {
      beforeEach(withProvider);

      it('EvalService.simpleEval reads the colon key', () => {
        const service = TestBed.inject(EvalService);
        expect(service.simpleEval('Q1:1 + 1', { 'Q1:1': 2 })).toBe(3);
        expect(service.simpleEval('Q1:1 + 1', { Q1: 100 })).toBeNaN();
      });

      it('CompilerService.compile then simpleCall reads the colon key', () => {
        const compiler = TestBed.inject(CompilerService);
        const fn = compiler.compile('Q1:1 + 1');
        expect(compiler.simpleCall(fn, { 'Q1:1': 2 })).toBe(3);
        expect(compiler.simpleCall(fn, { Q1: 100 })).toBeNaN();
      });

      it('CompilerService.compileAsync then simpleCallAsync reads the colon key', async () => {
        const compiler = TestBed.inject(CompilerService);
        const fn = compiler.compileAsync('Q1:1 + 1');
        expect(await compiler.simpleCallAsync(fn, { 'Q1:1': 2 })).toBe(3);
        expect(await compiler.simpleCallAsync(fn, { Q1: 100 })).toBeNaN();
      });

      it('DiscoveryService.extract names the colon name and x', () => {
        const discovery = TestBed.inject(DiscoveryService);
        const names = discovery.extract('Q1:1 + x', 'Identifier')
          ?.map((node) => (node as Identifier).name);
        expect(names).toEqual(['Q1:1', 'x']);
      });
    });

    // Today's results, row by row. The parse is not an error: `Q1:1 + 1` is the
    // label `Q1` over `1 + 1`, so `compile` and `compileAsync` succeed and the
    // error arrives with the call; `extract` throws nothing at all (Revision 5).
    describe('without the provider', () => {
      beforeEach(withoutProvider);

      it('EvalService.simpleEval throws the label error', () => {
        const service = TestBed.inject(EvalService);
        expect(() => service.simpleEval('Q1:1 + 1', { 'Q1:1': 2 })).toThrow(LABEL_ERROR);
      });

      it('CompilerService.compile succeeds and simpleCall throws the label error', () => {
        const compiler = TestBed.inject(CompilerService);
        const fn = compiler.compile('Q1:1 + 1');
        expect(fn).toBeDefined();
        expect(() => compiler.simpleCall(fn, { 'Q1:1': 2 })).toThrow(LABEL_ERROR);
      });

      it('CompilerService.compileAsync succeeds and simpleCallAsync rejects with the label error', async () => {
        const compiler = TestBed.inject(CompilerService);
        const fn = compiler.compileAsync('Q1:1 + 1');
        expect(fn).toBeDefined();
        await expect(compiler.simpleCallAsync(fn, { 'Q1:1': 2 })).rejects.toThrow(LABEL_ERROR);
      });

      it('DiscoveryService.extract walks the label\'s body and finds x alone', () => {
        const discovery = TestBed.inject(DiscoveryService);
        const names = discovery.extract('Q1:1 + x', 'Identifier')
          ?.map((node) => (node as Identifier).name);
        expect(names).toEqual(['x']);
      });
    });
  });

  // A root injector per configuration. A flag the provider set for the module
  // would outlive the first.
  it('criterion 4: one TestBed configuration with the provider, then one without', () => {
    withProvider();
    expect(TestBed.inject(ParserService).parse('Q1:1'))
      .toMatchObject({ type: 'Identifier', name: 'Q1:1' });

    TestBed.resetTestingModule();
    withoutProvider();
    expect(TestBed.inject(ParserService).parse('Q1:1', { extractExpressions: false }))
      .toMatchObject(label);
  });

  describe('criterion 5: misplacement is loud', () => {
    beforeEach(withoutProvider);

    it('throws creating a child environment injector that holds the provider', () => {
      const root = TestBed.inject(EnvironmentInjector);
      let error: unknown;
      try {
        createEnvironmentInjector([provideColonIdentifiers()], root);
      } catch (thrown) {
        error = thrown;
      }
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('provideColonIdentifiers()');
      expect((error as Error).message).toContain('root');
      // And nothing was turned on in passing.
      expect(TestBed.inject(ParserService).parse('Q1:1', { extractExpressions: false }))
        .toMatchObject(label);
    });
  });

  // § 3.7 and finding 8: a colon name is one path segment, in the read events
  // and the tracker alike.
  describe('criterion 6: hooks and dependencies', () => {
    beforeEach(withProvider);

    interface Read { kind: string; key: unknown; path: unknown; scoped: boolean | undefined }

    const observe = (expression: string, context: Context, options?: EvalOptions) => {
      const service = TestBed.inject(EvalService);
      const state = service.createState(context, options);
      const tracker = createDependencyTracker();
      tracker.install(state.hooks);
      const reads: Read[] = [];
      state.hooks.onRead((event) => {
        reads.push({ kind: event.kind, key: event.key, path: event.path, scoped: event.scoped });
      });
      const value = service.eval(expression, state);
      return { value, reads, dependencies: [...tracker.dependencies].sort() };
    };

    const context = { 'Q1:1': 3, Q1: 100, obj: { 'Q2:3': 5 }, 'sheet:A1': { value: 6 } };

    it('reads Q1:1 as one identifier', () => {
      const { value, reads, dependencies } = observe('Q1:1', context);
      expect(value).toBe(3);
      expect(reads).toEqual([
        { kind: 'identifier', key: 'Q1:1', path: 'Q1:1', scoped: undefined },
      ]);
      expect(dependencies).toEqual(['Q1:1']);

      expect(observe('Q1:1', { Q1: 100 }).value).toBeUndefined();
    });

    it('reads obj.Q2:3 as a member named Q2:3', () => {
      const { value, reads, dependencies } = observe('obj.Q2:3', context);
      expect(value).toBe(5);
      expect(reads).toEqual([
        { kind: 'identifier', key: 'obj', path: 'obj', scoped: undefined },
        { kind: 'member', key: 'Q2:3', path: 'obj.Q2:3', scoped: undefined },
      ]);
      expect(dependencies).toEqual(['obj', 'obj.Q2:3']);

      expect(observe('obj.Q2:3', { obj: { Q2: 100 } }).value).toBeUndefined();
    });

    it('reads sheet:A1.value as the identifier sheet:A1, then its member', () => {
      const { value, reads, dependencies } = observe('sheet:A1.value', context);
      expect(value).toBe(6);
      expect(reads).toEqual([
        { kind: 'identifier', key: 'sheet:A1', path: 'sheet:A1', scoped: undefined },
        { kind: 'member', key: 'value', path: 'sheet:A1.value', scoped: undefined },
      ]);
      expect(dependencies).toEqual(['sheet:A1', 'sheet:A1.value']);

      expect(observe('sheet:A1.value', { sheet: { A1: { value: 100 } } }).value)
        .toBeUndefined();
    });

    it('reads an arrow parameter named Q9:9 as scoped, and drops it from the dependencies', () => {
      const { value, reads, dependencies } = observe('(Q9:9 => Q9:9 + 1)(2)', context);
      expect(value).toBe(3);
      expect(reads).toEqual([
        { kind: 'identifier', key: 'Q9:9', path: 'Q9:9', scoped: true },
      ]);
      expect(dependencies).toEqual([]);
    });

    it('records finding 8\'s dependencies for the rows together', () => {
      const { value, dependencies } =
        observe('Q1:1 + obj.Q2:3 + sheet:A1.value + (Q9:9 => Q9:9)(1)', context);
      expect(value).toBe(15);
      expect(dependencies).toEqual(['Q1:1', 'obj', 'obj.Q2:3', 'sheet:A1', 'sheet:A1.value']);

      expect(observe('Q1:1 + obj.Q2:3 + sheet:A1.value + (Q9:9 => Q9:9)(1)',
        { Q1: 100, obj: { Q2: 100 }, sheet: { A1: { value: 100 } } }).value).toBeNaN();
    });

    it('under caseInsensitive, reports the matched key and the source spelling', () => {
      const { value, reads } =
        observe('q1:1 + OBJ.q2:3', { 'Q1:1': 3, obj: { 'Q2:3': 5 } }, { caseInsensitive: true });
      expect(value).toBe(8);
      expect(reads).toEqual([
        { kind: 'identifier', key: 'Q1:1', path: 'q1:1', scoped: undefined },
        { kind: 'identifier', key: 'obj', path: 'OBJ', scoped: undefined },
        { kind: 'member', key: 'Q2:3', path: 'OBJ.q2:3', scoped: undefined },
      ]);

      expect(observe('q1:1 + OBJ.q2:3', { Q1: 100, obj: { Q2: 100 } },
        { caseInsensitive: true }).value).toBeNaN();
    });
  });

  // § 3.6 and finding 9: every refusal fires with the option on, beside a colon
  // name; a colon name reaches no inherited member.
  describe('criterion 7: refusals', () => {
    beforeEach(withProvider);

    const evaluate = (expression: string, context: Context, options?: EvalOptions) =>
      TestBed.inject(EvalService).simpleEval(expression, context, options);
    const caseInsensitive: EvalOptions = { caseInsensitive: true };

    it.each([
      ['constructor', { 'Q1:1': 1 }, undefined],
      ['CONSTRUCTOR', { 'Q1:1': 1, constructor: 1 }, caseInsensitive],
      ['Q1:1 && constructor', { 'Q1:1': 1 }, undefined],
    ])('refuses the identifier %s', (expression, context, options) => {
      expect(() => evaluate(expression, context, options)).toThrow(DANGEROUS);
    });

    it.each([
      ['obj.constructor', { 'Q1:1': 1, obj: {} }, undefined],
      ['obj.CONSTRUCTOR', { 'Q1:1': 1, obj: {} }, caseInsensitive],
    ])('refuses the member %s', (expression, context, options) => {
      expect(() => evaluate(expression, context, options)).toThrow(DANGEROUS);
    });

    // The rows above hold no colon name, and are refused alike with the option
    // off. These reach the matched-key check and the member guard through a
    // colon-name expression; with the option off each is a label instead, and
    // throws the label error.
    it.each([
      ['Q1:1 && CONSTRUCTOR', { 'Q1:1': 1, constructor: 1 }, caseInsensitive],
      ['Q1:1 && obj.constructor', { 'Q1:1': 1, obj: {} }, undefined],
      ['Q1:1 && obj.CONSTRUCTOR', { 'Q1:1': 1, obj: {} }, caseInsensitive],
    ])('refuses %s, past a colon name', (expression, context, options) => {
      expect(() => evaluate(expression, context, options)).toThrow(DANGEROUS);
    });

    it.each([
      ['toString:1', undefined],
      ['constructor:1', undefined],
      ['__proto__:1', undefined],
      ['valueOf:0', caseInsensitive],
    ])('reads %s from the context\'s own key, and nothing inherited', (expression, options) => {
      expect(evaluate(expression, { obj: {} }, options)).toBeUndefined();
      expect(evaluate(expression, { [expression]: 7 }, options)).toBe(7);
    });

    it('reads obj.toString:1 from obj\'s own key, and nothing inherited', () => {
      expect(evaluate('obj.toString:1', { obj: {} })).toBeUndefined();
      expect(evaluate('obj.toString:1', { obj: { 'toString:1': 7 } })).toBe(7);
    });
  });
});
