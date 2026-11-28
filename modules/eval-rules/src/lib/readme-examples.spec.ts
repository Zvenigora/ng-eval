import * as fs from 'fs';
import * as path from 'path';
// Through `../public-api` rather than `@zvenigora/ng-eval-rules`: the published
// specifier is what the README prints, and from inside this project it is an
// `@nx/enforce-module-boundaries` error (substitution 1 below).
import { compileRule, evaluateRule } from '../public-api';

/** The ` ```ts ` fences in `modules/eval-rules/README.md`. */
const README_TS_BLOCKS = 2;

/** The ` ```sh ` fences in the same file. */
const README_SH_BLOCKS = 1;

/**
 * Executes the snippets in `modules/eval-rules/README.md`, after
 * `modules/eval-signals/src/lib/readme-examples.spec.ts`, which is the pattern.
 *
 * **What it is not.** It reads the markdown only to count its fenced blocks, in
 * the last cases below. Nothing keeps a case and the block it mirrors in step
 * but a human. `src/public-api.spec.ts` is the other half: it gates the names
 * the README imports, the peers `## Install` quotes and the codes
 * `## Problem codes` lists, and this file gates whether what the README prints
 * runs.
 *
 * ## Coverage
 *
 * The README has `README_TS_BLOCKS` `ts` blocks and `README_SH_BLOCKS` `sh`
 * block, and the counting cases read the file (`docs/backlog.md` F13), so
 * neither constant goes stale silently. Executed here:
 *
 * 1. `## Quick start`, its one block: one case.
 *
 * Not executed:
 *
 * - The import line under `## Compilation — compileRule`, which runs nothing:
 *   `src/public-api.spec.ts` resolves the names it imports.
 * - The `sh` block, `npm install`.
 *
 * `## The rule format` has no block. Its cases below witness two of its
 * sentences that no other row runs: a label is a finite number, and a
 * `match`'s scalar or object never matches an array.
 *
 * ## Substitutions, everything this file supplies that the README does not print
 *
 * 1. **The import specifier**, `../public-api` for the README's
 *    `@zvenigora/ng-eval-rules`.
 * 2. **The printed values.** The block's comments print `status`, `calc`,
 *    `labels`, `effects` and the second run's `status`; the case asserts each.
 *    `calc` and `labels` are frozen and have null prototypes, which the
 *    comments do not print; `toEqual` compares their keys and values.
 */
describe('documented examples', () => {
  describe('Quick start', () => {
    it('completes the open order with its calculations, label and effect, and skips the paid one', () => {
      const compiled = compileRule(
        {
          id: 'order-discount',
          filter: { match: { order: { status: 'open' } }, when: 'order.total > 0' },
          calculations: [
            { name: 'discount', value: 'order.total >= 100 ? 10 : 0' },
            { name: 'net', value: 'order.total - order.total * calc.discount / 100' },
          ],
          decisions: [
            { name: 'tier', cases: [{ if: 'calc.net >= 500', value: 'gold' }, { value: 'standard' }] },
          ],
          outputs: [{ on: { decision: 'tier', is: 'gold' }, items: ['notify("vip", order.id)'] }],
        },
        { effects: { notify: {} } },
      );
      if (!compiled.ok) {
        throw new Error(compiled.problems.map((problem) => problem.message).join('\n'));
      }

      const result = evaluateRule(compiled.rule, {
        facts: { order: { id: 7, status: 'open', total: 600 } },
      });
      expect(result.status).toBe('completed');
      expect(result.calc).toEqual({ discount: 10, net: 540 });
      expect(result.labels).toEqual({ tier: 'gold' });
      expect(result.effects).toEqual([{ name: 'notify', args: ['vip', 7] }]);

      expect(
        evaluateRule(compiled.rule, {
          facts: { order: { id: 8, status: 'paid', total: 600 } },
        }).status
      ).toBe('skipped');
    });
  });

  describe('The rule format', () => {
    it.each([Number.NaN, Infinity, -Infinity])('refuses %s as a label: a label is a finite number', (value) => {
      const compiled = compileRule({ id: 'r', decisions: [{ name: 'd', cases: [{ value }] }] });
      expect(compiled.problems.map((problem) => [problem.code, problem.path])).toEqual([
        ['invalid-field', 'decisions[0].cases[0].value'],
      ]);
    });

    it('matches an array target by an array, and never by a scalar or an object', () => {
      const status = (match: Record<string, unknown>): string => {
        const compiled = compileRule({ id: 'r', filter: { match } });
        if (!compiled.ok) {
          throw new Error(compiled.problems.map((problem) => problem.message).join('\n'));
        }
        return evaluateRule(compiled.rule, { facts: { tags: [1, 2] } }).status;
      };
      expect(status({ tags: [2, 3] })).toBe('completed');
      expect(status({ tags: 2 })).toBe('skipped');
      expect(status({ tags: { 0: 1 } })).toBe('skipped');
    });
  });
});

interface FencedBlock {
  readonly language: string;
  /** 1-based line of the opening fence. */
  readonly line: number;
  /** The headings the block sits under, indexed by level - 1. */
  readonly headings: readonly string[];
}

/**
 * Every fenced block in a markdown text.
 *
 * A fence opens on three or more backticks or tildes at **any** indentation,
 * so one inside a list item counts, and closes on the next bare run of the
 * same character at least as long. Lines inside a block are neither fences
 * nor headings. The same reader as `eval-signals`' `readme-examples.spec.ts`,
 * copied because no spec may import out of another project
 * (`export-list.spec.ts` records why).
 */
const fencedBlocks = (markdown: string): readonly FencedBlock[] => {
  const blocks: FencedBlock[] = [];
  const headings: string[] = [];
  let closing: RegExp | undefined;

  markdown.split(/\r?\n/).forEach((line, index) => {
    if (closing) {
      if (closing.test(line)) {
        closing = undefined;
      }
      return;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      headings.length = heading[1].length - 1;
      headings[heading[1].length - 1] = heading[2].trim();
      return;
    }
    const fence = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
    if (fence) {
      closing = new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`);
      blocks.push({ language: fence[2], line: index + 1, headings: [...headings] });
    }
  });

  return blocks;
};

describe('README block count (docs/backlog.md F13)', () => {
  // Lines, not bare numbers, so a failure names the blocks it counted.
  const linesIn = (language: string): string[] =>
    fencedBlocks(fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf8'))
      .filter((block) => block.language === language)
      .map((block) => `README.md:${block.line}`);

  it('should hold README_TS_BLOCKS ts blocks', () => {
    expect(linesIn('ts')).toHaveLength(README_TS_BLOCKS);
  });

  it('should hold README_SH_BLOCKS sh blocks', () => {
    expect(linesIn('sh')).toHaveLength(README_SH_BLOCKS);
  });
});
