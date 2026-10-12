import * as fs from 'fs';
import * as path from 'path';
import { TestBed } from '@angular/core/testing';
import { getLineInfo } from 'acorn';
import {
  Context,
  EvalService,
  createDependencyTracker,
  provideColonIdentifiers,
} from '../public-api';

/**
 * The colon-joined names corpus, `docs/colon-identifiers/phase-9-plan.md`
 * step 4: the cases are data, in `colon-identifiers.corpus.json`, read with
 * `fs` as `readme-examples.spec.ts` reads the README, so adding an expression
 * changes no code. Every case runs through `EvalService` under
 * `provideColonIdentifiers()`, each in a root injector of its own.
 *
 * A case is `{ id, origin, expression, context?, expect }`. `origin` is
 * `"synthetic"`, or where a real expression came from; real ones arrive
 * already rewritten to JavaScript, colon-joined names the only legacy
 * construct left in them (§ 8 q6). `expect` holds exactly one of:
 *
 * - `{ value }` — what `simpleEval` returns, compared with `toEqual`;
 * - `{ syntaxError, pos }` — a `SyntaxError` whose message contains the
 *   fragment, at exactly that `pos`. The fragment ends with the ` (line:col)`
 *   acorn gives that `pos`, so that a hint wedged between `Unexpected token`
 *   and the suffix fails it;
 * - `{ error }` — a throw at evaluation: an error whose message contains the
 *   fragment, and not acorn's parse error;
 * - `{ reads }` — the `dependencies` `createDependencyTracker` records, sorted
 *   and compared exactly, for a real expression whose value is unknown.
 *
 * JSON holds no function, `undefined` or `NaN`: a case that needs a function
 * declares it in the expression (`let f = v => v; f(Q1:1)`), and one that
 * reads `undefined` compares with `=== undefined`.
 */

const CORPUS = path.join(__dirname, 'colon-identifiers.corpus.json');

type Expectation =
  | { value: unknown }
  | { syntaxError: string; pos: number }
  | { error: string }
  | { reads: string[] };

interface Case {
  id: string;
  origin: string;
  expression: string;
  context?: Context;
  expect: Expectation;
}

const KINDS = ['value', 'syntaxError', 'error', 'reads'] as const;
type Kind = (typeof KINDS)[number];

const CASE_KEYS = ['id', 'origin', 'expression', 'context', 'expect'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** The known kinds an expectation holds; a well-formed one holds one. */
const kindsIn = (expectation: Record<string, unknown>): Kind[] =>
  KINDS.filter(kind => kind in expectation);

/**
 * What is wrong with one entry's shape; nothing when it is well-formed. An
 * unknown key is a problem too: a misspelt `context` would otherwise run the
 * case over no context at all.
 */
const problemsOf = (entry: unknown): string[] => {
  if (!isRecord(entry)) {
    return ['is not an object'];
  }
  const problems = Object.keys(entry).filter(key => !CASE_KEYS.includes(key))
    .map(key => `has an unknown key '${key}'`);
  if (!isText(entry['id'])) {
    problems.push('has no id');
  }
  if (!isText(entry['origin'])) {
    problems.push('has no origin');
  }
  if (!isText(entry['expression'])) {
    problems.push('has no expression');
  }
  if ('context' in entry && !isRecord(entry['context'])) {
    problems.push('has a context that is not an object');
  }
  const expectation = entry['expect'];
  if (!isRecord(expectation)) {
    return [...problems, 'has no expect object'];
  }
  const kinds = kindsIn(expectation);
  if (kinds.length !== 1) {
    return [...problems, `expects ${kinds.length} known kinds, not one`];
  }
  const allowed: string[] = kinds[0] === 'syntaxError' ? ['syntaxError', 'pos'] : [kinds[0]];
  problems.push(...Object.keys(expectation).filter(key => !allowed.includes(key))
    .map(key => `expects an unknown key '${key}'`));
  switch (kinds[0]) {
    case 'syntaxError': {
      const fragment = expectation['syntaxError'];
      const pos = expectation['pos'];
      if (!isText(fragment)) {
        problems.push('expects a syntaxError with no message fragment');
      }
      if (typeof pos !== 'number' || !Number.isInteger(pos) || pos < 0) {
        problems.push('expects a syntaxError with no pos');
      } else if (isText(fragment) && isText(entry['expression'])) {
        // acorn ends every message it raises with ` (line:col)`. A fragment
        // without it would pass a hint wedged in before it (W8).
        const { line, column } = getLineInfo(entry['expression'], pos);
        if (!fragment.endsWith(` (${line}:${column})`)) {
          problems.push(`expects a syntaxError fragment not ending in ' (${line}:${column})'`);
        }
      }
      break;
    }
    case 'error':
      if (!isText(expectation['error'])) {
        problems.push('expects an error with no message fragment');
      }
      break;
    case 'reads': {
      const reads = expectation['reads'];
      if (!Array.isArray(reads) || !reads.every(isText)) {
        problems.push('expects reads that are not a list of keys');
      }
      break;
    }
  }
  return problems;
};

const corpus: unknown = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
const entries: unknown[] = isRecord(corpus) && Array.isArray(corpus['cases']) ? corpus['cases'] : [];

/** The kind a well-formed expectation holds, and a throw for any other. */
const kindOf = (expectation: Expectation): Kind => {
  const kinds = isRecord(expectation) ? kindsIn(expectation) : [];
  if (kinds.length !== 1) {
    throw new Error(`An expect must hold exactly one of ${KINDS.join(', ')}`);
  }
  return kinds[0];
};

/** What `run` threw, or what it returned when it threw nothing. */
const thrownBy = (run: () => unknown): unknown => {
  try {
    return { returned: run() };
  } catch (thrown) {
    return thrown;
  }
};

/** acorn's parse error: a `SyntaxError` carrying the position it raised at. */
const isParseError = (thrown: unknown): boolean =>
  thrown instanceof SyntaxError && typeof (thrown as SyntaxError & { pos?: unknown }).pos === 'number';

describe('the colon-joined names corpus (Phase 9 step 4)', () => {

  it('is well-formed: one known expect each, a unique id and an origin', () => {
    expect(isRecord(corpus) && Array.isArray(corpus['cases'])).toBe(true);
    expect(entries.length).toBeGreaterThan(0);

    const problems = entries.flatMap((entry, i) => problemsOf(entry)
      .map(problem => `case ${i} (${isRecord(entry) ? String(entry['id']) : '?'}) ${problem}`));
    const ids = entries.map(entry => (isRecord(entry) ? entry['id'] : undefined));
    problems.push(...ids.filter((id, i) => ids.indexOf(id) !== i)
      .map(id => `id ${String(id)} is not unique`));
    expect(problems).toEqual([]);
  });

  describe('every case, through EvalService under provideColonIdentifiers()', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideColonIdentifiers()] }));

    it.each(entries as Case[])('$id: $expression', ({ expression, context, expect: expectation }) => {
      const service = TestBed.inject(EvalService);

      const kind = kindOf(expectation);
      switch (kind) {
        case 'value': {
          const { value } = expectation as { value: unknown };
          expect(service.simpleEval(expression, context)).toEqual(value);
          break;
        }
        case 'syntaxError': {
          const { syntaxError, pos } = expectation as { syntaxError: string; pos: number };
          const thrown = thrownBy(() => service.simpleEval(expression, context));
          expect(thrown).toBeInstanceOf(SyntaxError);
          expect((thrown as SyntaxError).message).toContain(syntaxError);
          expect((thrown as SyntaxError & { pos?: unknown }).pos).toBe(pos);
          break;
        }
        case 'error': {
          const { error } = expectation as { error: string };
          const thrown = thrownBy(() => service.simpleEval(expression, context));
          expect(thrown).toBeInstanceOf(Error);
          expect(isParseError(thrown)).toBe(false);
          expect((thrown as Error).message).toContain(error);
          break;
        }
        case 'reads': {
          const { reads } = expectation as { reads: string[] };
          const state = service.createState(context);
          const tracker = createDependencyTracker();
          tracker.install(state.hooks);
          service.eval(expression, state);
          expect([...tracker.dependencies].sort()).toEqual([...reads].sort());
          break;
        }
        default: {
          // A kind added to `KINDS` without an arm here would otherwise pass
          // every case of that kind with no assertion at all.
          const unhandled: never = kind;
          throw new Error(`No arm runs the kind ${String(unhandled)}`);
        }
      }
    });
  });
});
