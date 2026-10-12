import { EnvironmentProviders, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService, EvalContext, provideColonIdentifiers } from '@zvenigora/ng-eval-core';
import { EvalSignal, EvalSignalOptions, createEvalSignal } from './eval-signal';
import { EvalSignalAsync, EvalSignalAsyncOptions, createEvalSignalAsync } from './eval-signal-async';
import { SignalContextSource, SignalContextWriteError } from './signal-context';

/**
 * `docs/colon-identifiers/phase-9-plan.md` step 5: colon-joined names through
 * both factories under `eval-core`'s `provideColonIdentifiers()`, with no
 * source change here for the feature - the factories compile through
 * `CompilerService`, and so through the root `ParserService` the provider
 * configures (plan S 3.8). And `abortSignalKey`, which stays a plain
 * identifier whatever the application sets.
 *
 * Every source that holds `Q1:1` also holds `Q1`, the name split at its
 * colon, as a signal the expression must not read: a name split there would
 * read it, and it is the unread signal criterion 1's recompute row changes.
 */

const SIGNAL_SUM = 'Q1:1 + Q2:3 + obj.R:7';

const NOT_PLAIN = 'the key must be a plain identifier (a colon-joined name is not one, even under colonIdentifiers).';

/**
 * Microtasks and one macrotask, as `eval-signal-async.spec.ts` flushes:
 * `evaluateAsync` resolves through several `await` hops.
 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const configure = (providers: EnvironmentProviders[]) => () =>
  TestBed.configureTestingModule({ providers });

const create = (
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalOptions
): EvalSignal<unknown> =>
  TestBed.runInInjectionContext(() => createEvalSignal(expression, source, options));

const createAsync = (
  expression: string,
  source: SignalContextSource | EvalContext,
  options?: EvalSignalAsyncOptions
): EvalSignalAsync<unknown> =>
  TestBed.runInInjectionContext(() => createEvalSignalAsync(expression, source, options));

const caught = (read: () => unknown): unknown => {
  try {
    read();
  } catch (error) {
    return error;
  }
  throw new Error('expected the read to throw');
};

/** Criterion 1's source: two colon-keyed signals, a colon-keyed member, and `Q1`. */
const sumSource = () => {
  const q11 = signal(1);
  const q1 = signal(100);
  return { q11, q1, source: { 'Q1:1': q11, 'Q2:3': signal(2), obj: { 'R:7': 4 }, Q1: q1 } };
};

describe('colon-joined names through the factories (Phase 9 step 5)', () => {

  describe('under provideColonIdentifiers()', () => {

    beforeEach(configure([provideColonIdentifiers()]));

    // Under `caseInsensitive` the expression spells the first key `q1:1`, so
    // its reported root is the source's spelling only if `respellRoots`
    // rewrote it. Without it `respellRoots` never runs, and `dependencies` is
    // `eval-core`'s tracker's as it recorded them.
    const sums: [string, boolean][] = [
      [SIGNAL_SUM, false],
      ['q1:1 + Q2:3 + obj.R:7', true],
    ];

    describe('criterion 1: createEvalSignal', () => {

      it.each(sums)('should read the sum of %p, caseInsensitive %p', (expression, caseInsensitive) => {
        const { source } = sumSource();
        const value = create(expression, source, { eval: { caseInsensitive } });

        expect(value()).toEqual(7);
      });

      it.each(sums)('should report each colon key as one path segment for %p, caseInsensitive %p',
        (expression, caseInsensitive) => {
          const { source } = sumSource();
          const value = create(expression, source, { trackDependencies: true, eval: { caseInsensitive } });

          expect(value()).toEqual(7);
          expect([...value.dependencies].sort()).toEqual(['Q1:1', 'Q2:3', 'obj', 'obj.R:7']);
        });

      it.each(sums)('should recompute for the Q1:1 signal and not for Q1, which it never read: %p, caseInsensitive %p',
        (expression, caseInsensitive) => {
          const { q11, q1, source } = sumSource();
          const states = jest.spyOn(TestBed.inject(CompilerService), 'createState');
          const value = create(expression, source, { eval: { caseInsensitive } });

          expect(value()).toEqual(7);
          expect(states).toHaveBeenCalledTimes(1);

          q1.set(200);

          expect(value()).toEqual(7);
          expect(states).toHaveBeenCalledTimes(1);

          // The positive half: without it the negative above passes against a
          // signal that never recomputes at all.
          q11.set(10);

          expect(value()).toEqual(16);
          expect(states).toHaveBeenCalledTimes(2);
        });

    });

    describe('criterion 2: a write to a colon key', () => {

      it('should throw SignalContextWriteError naming Q1:1, and leave the signal as it was', () => {
        const q11 = signal(1);
        const value = create('Q1:1 = 5', { 'Q1:1': q11, Q1: signal(100) });

        const error = caught(() => value());

        expect(error).toBeInstanceOf(SignalContextWriteError);
        expect((error as SignalContextWriteError).key).toEqual('Q1:1');
        expect((error as SignalContextWriteError).kind).toEqual('key');
        expect(q11()).toEqual(1);
      });

    });

    describe('criterion 3: createEvalSignalAsync', () => {

      const load = (id: number): Promise<number> => Promise.resolve(id * 10);

      it.each([
        ['load(Q1:1)', false],
        ['load(q1:1)', true],
      ])('should resolve %p and report Q1:1 in dependencies, caseInsensitive %p', async (expression, caseInsensitive) => {
        const value = createAsync(expression, { 'Q1:1': signal(2), Q1: signal(100), load }, {
          trackDependencies: true,
          eval: { caseInsensitive },
        });

        expect(value()).toBeUndefined();
        expect([...value.dependencies].sort()).toEqual(['Q1:1', 'load']);

        await flush();

        expect(value.status()).toEqual('resolved');
        expect(value()).toEqual(20);
      });

    });

  });

  // The control for the rows above: the same factory over the same source
  // with no provider. `Q1:1 + Q2:3 + obj.R:7` is the label `Q1` over a
  // statement that does not parse, so the compile at construction throws.
  describe('without the provider', () => {

    beforeEach(configure([]));

    it('should throw a SyntaxError at construction', () => {
      const { source } = sumSource();

      expect(caught(() => create(SIGNAL_SUM, source))).toBeInstanceOf(SyntaxError);
    });

  });

  /**
   * The key is parsed with `defaultParserOptions`, never through the
   * application's `ParserService`, so the refusal is the same with the
   * provider and without it (plan S 3.8). `run:abort` parses as a label and is
   * refused for its shape; `Q1:1:3` does not parse at all. One per refusal
   * site, as `eval-signal-async.spec.ts` has one per site for keys with no
   * colon.
   */
  describe.each([
    ['under provideColonIdentifiers()', [provideColonIdentifiers()]],
    ['without the provider', []],
  ] as [string, EnvironmentProviders[]][])('criterion 4: abortSignalKey, %s', (_, providers) => {

    beforeEach(configure(providers));

    it.each(['run:abort', 'Q1:1:3'])('should refuse %p at construction, saying it must be a plain identifier', (key) => {
      const error = caught(() => createAsync('1', {}, { abortSignalKey: key })) as Error;

      expect(error.message).toEqual(`Cannot bind the run's AbortSignal under 'abortSignalKey' "${key}": ${NOT_PLAIN}`);
    });

  });

  // The setup check for criterion 4's first half: in that configuration an
  // expression *can* name `run:abort`, so the refusal there is not the
  // parser's - it holds although the option is on.
  describe('the control for criterion 4', () => {

    beforeEach(configure([provideColonIdentifiers()]));

    it('should read run:abort in an expression under the provider', () => {
      expect(create('run:abort', { 'run:abort': signal(3), run: signal(100) })()).toEqual(3);
    });

  });

});
