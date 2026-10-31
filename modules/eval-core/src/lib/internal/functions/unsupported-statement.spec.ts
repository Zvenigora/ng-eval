import * as fs from 'fs';
import * as path from 'path';
import { TestBed } from '@angular/core/testing';
import { AnyNode } from 'acorn';
import { EvalService } from '../../actual/services';
import { defaultParserOptions } from '../classes/eval';
import { parse } from './parse';
import { findUnsupportedStatement } from './unsupported-statement';

/**
 * `findUnsupportedStatement`, the D13 export (`docs/a24/plan.md` § 3.3, step 5).
 *
 * **The parity table is the spec's reason to exist.** The export and the
 * evaluator read one table, `statement-support.ts`, and each row below runs its
 * source through `simpleEval` and through the export: evaluation throws iff the
 * export reports a statement, and with the message the export gives. A second
 * list in either place breaks the row for the type it disagrees on. Each row
 * also names what the export reports, so a type both sides admitted wrongly
 * would still go red.
 *
 * Sources parse at the services' options, `defaultParserOptions`: `ecmaVersion`
 * 2020, `sourceType` `script`, into a `Program`. `simpleEval` parses the same
 * way.
 */
describe('findUnsupportedStatement', () => {

  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  const ast = (source: string): AnyNode =>
    parse(source, defaultParserOptions) as AnyNode;

  /** The message `simpleEval` throws for a source, or `undefined` if it returns. */
  const thrownMessage = (source: string): string | undefined => {
    try {
      service.simpleEval(source);
      return undefined;
    } catch (error) {
      return (error as Error).message;
    }
  };

  describe('the parity table: one row per statement type at the services\' options', () => {

    // One row per member of acorn's `Statement` union other than
    // `VariableDeclaration`, which has three, one per kind. Acorn's `kind`
    // union also has `using` and `await using`; neither parses at `ecmaVersion`
    // 2020, so neither has a row.
    //
    // `return`, `break` and `continue` do not parse at a script's top level, so
    // their sources put them where they parse. `return` is in the block body
    // of an arrow the source calls, whose throw the call passes through
    // unchanged. `break` and `continue` are in a bounded `for`, the one loop
    // this library evaluates, so the throw is theirs and not the loop's.
    const rows: { type: string, source: string, refused: boolean }[] = [
      { type: 'ExpressionStatement', source: '1', refused: false },
      { type: 'BlockStatement', source: '{ 1 }', refused: false },
      { type: 'EmptyStatement', source: ';', refused: false },
      { type: 'DebuggerStatement', source: 'debugger', refused: true },
      { type: 'WithStatement', source: 'with ({}) {}', refused: true },
      { type: 'ReturnStatement', source: '(() => { return 1 })()', refused: true },
      { type: 'LabeledStatement', source: 'a: 1', refused: true },
      { type: 'BreakStatement', source: 'for (let i = 0; i < 1; i++) { break }', refused: true },
      { type: 'ContinueStatement', source: 'for (let i = 0; i < 1; i++) { continue }', refused: true },
      { type: 'IfStatement', source: 'if (true) 1', refused: false },
      { type: 'SwitchStatement', source: 'switch (1) {}', refused: true },
      { type: 'ThrowStatement', source: 'throw 1', refused: true },
      { type: 'TryStatement', source: 'try {} catch (e) {}', refused: true },
      { type: 'WhileStatement', source: 'while (false) {}', refused: true },
      { type: 'DoWhileStatement', source: 'do {} while (false)', refused: true },
      { type: 'ForStatement', source: 'for (let i = 0; i < 1; i++) {}', refused: false },
      { type: 'ForInStatement', source: 'for (const k in {}) {}', refused: true },
      { type: 'ForOfStatement', source: 'for (const v of []) {}', refused: true },
      { type: 'FunctionDeclaration', source: 'function f() {}', refused: true },
      { type: 'ClassDeclaration', source: 'class A {}', refused: true },
      { type: 'VariableDeclaration', source: 'var x = 1', refused: true },
      { type: 'VariableDeclaration', source: 'let x = 1', refused: false },
      { type: 'VariableDeclaration', source: 'const x = 1', refused: false },
    ];

    it.each(rows)('$type: $source', ({ type, source, refused }) => {
      const found = findUnsupportedStatement(ast(source));

      expect(found?.statement.type).toBe(refused ? type : undefined);
      expect(thrownMessage(source)).toBe(found?.message);
    });

    it('has a row, or a stated reason, for every statement type acorn declares', () => {
      const dts = fs.readFileSync(
        path.join(path.dirname(require.resolve('acorn/package.json')), 'dist', 'acorn.d.ts'), 'utf8');

      const members = (union: string): string[] => {
        const body = new RegExp(`export type ${union} =\\s*([^]*?)\\r?\\n\\s*\\r?\\n`).exec(dts);
        if (!body) {
          throw new Error(`no union ${union} in acorn.d.ts`);
        }
        return body[1].split('|').map((member) => member.trim()).filter((member) => member.length > 0);
      };

      const statements = members('Statement')
        .flatMap((member) => member === 'Declaration' ? members('Declaration') : [member]);

      // A `ModuleDeclaration` reaches the dispatcher only under a per-call
      // `sourceType: 'module'`, so none is produced at the services' options:
      // each source below is a `SyntaxError` there. The export reports them by
      // the same table, since none is in it.
      const notProduced: Record<string, string> = {
        ImportDeclaration: "import x from 'm'",
        ExportNamedDeclaration: 'export const a = 1',
        ExportDefaultDeclaration: 'export default 1',
        ExportAllDeclaration: "export * from 'm'",
      };

      expect(statements).toContain('WhileStatement');
      expect(statements).toContain('VariableDeclaration');
      const covered = new Set(rows.map((row) => row.type));
      expect(statements.filter((member) => !covered.has(member))).toEqual([]);
      expect([...covered].filter((type) => !statements.includes(type))).toEqual([]);

      expect(members('ModuleDeclaration').sort()).toEqual(Object.keys(notProduced).sort());
      for (const [type, source] of Object.entries(notProduced)) {
        expect(() => ast(source)).toThrow(SyntaxError);
        const found = findUnsupportedStatement(
          parse(source, { ...defaultParserOptions, sourceType: 'module' }) as AnyNode);
        expect(found?.statement.type).toBe(type);
        expect(found?.message).toBe(`Unsupported statement type: ${type}`);
      }
    });
  });

  describe('the tree', () => {

    it('reports a statement in an arrow function\'s body that is never called', () => {
      const source = 'let f = () => { while (true) {} }; 1';

      expect(service.simpleEval(source)).toBe(1);
      expect(findUnsupportedStatement(ast(source))).toEqual({
        statement: expect.objectContaining({ type: 'WhileStatement', start: 16 }),
        message: 'Unsupported statement type: WhileStatement',
      });
    });

    it('reports a statement in a branch that is not taken', () => {
      const source = 'if (false) { switch (1) {} } 2';

      expect(service.simpleEval(source)).toBe(2);
      expect(findUnsupportedStatement(ast(source))).toEqual({
        statement: expect.objectContaining({ type: 'SwitchStatement', start: 13 }),
        message: 'Unsupported statement type: SwitchStatement',
      });
    });

    it('reports the first refused statement in source order, not the first visited', () => {
      // Three refused statements. The walk visits the `throw` first, since it
      // is inside the `do`; the `debugger` is last in the source.
      const source = 'do { throw 1 } while (false); debugger';

      expect(thrownMessage(source)).toBe('Unsupported statement type: DoWhileStatement');
      expect(findUnsupportedStatement(ast(source))).toEqual({
        statement: expect.objectContaining({ type: 'DoWhileStatement', start: 0 }),
        message: 'Unsupported statement type: DoWhileStatement',
      });
    });

    it('reports undefined for a tree with no refused statement, or no tree', () => {
      const source = 'let x = 1; if (x) { x } else { [1].map(y => { const z = y; z }) }';

      expect(service.simpleEval(source)).toBe(1);
      expect(findUnsupportedStatement(ast(source))).toBeUndefined();
      expect(findUnsupportedStatement(undefined)).toBeUndefined();
    });
  });
});
