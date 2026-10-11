import { Options, Parser, TokenType, tokTypes as tt } from 'acorn';

/**
 * @description
 * The colon-joined name grammar of `docs/colon-identifiers/phase-9-plan.md`
 * § 3.4, as an acorn plugin (§ 3.5). `parse` uses the parser built here when
 * `colonIdentifiers` is set, and acorn's own `parse` otherwise. No source text
 * is rewritten, so every position acorn reports is a position in what the
 * author wrote. Not re-exported from any barrel.
 *
 * Of acorn's documented API this module uses `Parser.extend`, `tokTypes` and
 * the `input` member. Everything else it touches is an acorn internal,
 * undeclared in acorn's `.d.ts`, and this is the complete list — what § 8 q3
 * checks at the `acorn` peer floor:
 *
 * - members read: `pos`, `start`, `type`, `value`, `keywords`;
 * - members written: `pos`, `containsEsc`;
 * - methods overridden, each calling acorn's own through `super`: `readWord`,
 *   `finishToken`, `parsePropertyName`, `parseStatement`, `unexpected`;
 * - methods called: `finishToken`, `raise`;
 * - what the overrides assume of acorn's tokenizer: `readToken` is the only
 *   caller of `readWord`, with `pos` at the token's first character; every
 *   token is finished through `finishToken`, in source order, before the next
 *   is read — except that a `/` read as `slash` is finished again as
 *   `regexp`, and neither type is counted here; `?.`, `??` and `??=` are never
 *   `question` tokens; the `}` that closes a `${` is finished as `braceR`; the
 *   constructor reads no token;
 * - what they assume of acorn's parser: every key of an object literal, an
 *   object pattern or a class body is read through `parsePropertyName`, with
 *   the key as the current token; every statement through `parseStatement`,
 *   with its first token as the current token; a colon the grammar cannot
 *   place reaches `unexpected`, from `expect` or `semicolon`, with `type` and
 *   `start` still at that colon.
 *
 * The token types it compares by identity, from `tokTypes`: `name`, `colon`,
 * `question`, `comma`, `semi`, `parenL`, `parenR`, `bracketL`, `bracketR`,
 * `braceL`, `braceR`, `dollarBraceL`.
 */

const COLON = 58;

/** `[A-Za-z_$]`: the first character of a name that may join. */
const isFirstChar = (code: number): boolean =>
  (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code === 36;

/** `[A-Za-z0-9_$]`: any later character, and a segment's first. */
const isSegmentChar = (code: number): boolean =>
  isFirstChar(code) || (code >= 48 && code <= 57);

/** Whether a `:segment` starts at `pos`: a colon with a segment character after it. */
const joinsAt = (input: string, pos: number): boolean =>
  input.charCodeAt(pos) === COLON && isSegmentChar(input.charCodeAt(pos + 1));

/** The acorn internals the overrides use: the list in the header. */
interface AcornInternals {
  input: string;
  pos: number;
  start: number;
  type: TokenType;
  value: unknown;
  keywords: RegExp;
  containsEsc: boolean;
  readWord(): void;
  finishToken(type: TokenType, value?: unknown): void;
  parsePropertyName(prop: unknown): unknown;
  parseStatement(...args: unknown[]): unknown;
  unexpected(pos?: number): never;
  raise(pos: number, message: string): never;
}

type AcornInternalsParser =
  new (options: Options, input: string, startPos?: number) => AcornInternals;

/** One nesting level: the top, or what a `(`, `[`, `{` or `${` opened. */
interface Level {
  /** The `?` tokens at this level still waiting for their `:`. */
  pending: number;
  /**
   * The last name this level did not join because a `?` was pending, kept
   * for the hint until the level's next `,`, `;` or statement.
   */
  suppressed?: string;
}

const colonIdentifiers = (Base: typeof Parser): typeof Parser => {
  class ColonParser extends (Base as unknown as AcornInternalsParser) {
    /** Never empty: the top level is never closed. */
    private readonly levels: Level[] = [{ pending: 0 }];

    /**
     * The level the current token was read at: for a `(`, `[`, `{` or `${`,
     * the one around the level it opened.
     */
    private tokenLevel: Level = this.levels[0];

    private get level(): Level {
      return this.levels[this.levels.length - 1];
    }

    /**
     * Reads a colon-joined name as one `name` token when one starts at `pos`
     * and no `?` at this level is waiting for its `:` (§ 3.4, 1). In every
     * other case acorn's own `readWord`, so a word that does not join is read
     * exactly as acorn reads it.
     */
    override readWord(): void {
      const end = this.colonNameEnd();
      if (end === undefined) {
        return super.readWord();
      }
      const name = this.input.slice(this.pos, end);
      if (this.level.pending > 0) {
        this.level.suppressed = name;
        return super.readWord();
      }
      this.pos = end;
      this.containsEsc = false;
      this.finishToken(tt.name, name);
    }

    /**
     * Where the colon name that starts at `pos` ends — its longest match — or
     * `undefined` when none does: the first segment is not ASCII, is a keyword
     * of the parse's `ecmaVersion`, or has no `:segment` directly after it.
     */
    private colonNameEnd(): number | undefined {
      const input = this.input;
      let end = this.pos;
      if (!isFirstChar(input.charCodeAt(end))) {
        return undefined;
      }
      do {
        end++;
      } while (isSegmentChar(input.charCodeAt(end)));
      if (!joinsAt(input, end) || this.keywords.test(input.slice(this.pos, end))) {
        return undefined;
      }
      do {
        end += 2;
        while (isSegmentChar(input.charCodeAt(end))) {
          end++;
        }
      } while (joinsAt(input, end));
      return end;
    }

    /**
     * Keeps the levels after acorn has finished the token, recording the one
     * the token was read at: `(`, `[`, `{` and `${` open a level and `)`, `]`
     * and `}` close it; a `?` is counted at its level and a `:` there
     * uncounts it. `?.` and `??` are other token types, and count for nothing.
     */
    override finishToken(type: TokenType, value?: unknown): void {
      super.finishToken(type, value);
      const level = this.level;
      this.tokenLevel = level;
      switch (type) {
        case tt.parenL:
        case tt.bracketL:
        case tt.braceL:
        case tt.dollarBraceL:
          this.levels.push({ pending: 0 });
          break;
        case tt.parenR:
        case tt.bracketR:
        case tt.braceR:
          if (this.levels.length > 1) {
            this.levels.pop();
          }
          break;
        case tt.question:
          level.pending++;
          break;
        case tt.colon:
          if (level.pending > 0) {
            level.pending--;
          }
          break;
        case tt.comma:
        case tt.semi:
          level.suppressed = undefined;
          break;
      }
    }

    /**
     * Refuses a colon name as an object key, in a literal or a pattern alike
     * (§ 3.4, 2): `{Q1:1}` is `{Q1: 1}` to JavaScript and a shorthand to the
     * grammar, and keeping either would answer some author wrongly. Only a
     * joined token is a `name` holding a colon.
     */
    override parsePropertyName(prop: unknown): unknown {
      const name = this.value;
      if (this.type === tt.name && typeof name === 'string' && name.includes(':')) {
        const first = name.slice(0, name.indexOf(':'));
        this.raise(this.start, `Colon-joined name '${name}' cannot be an object key: ` +
          `write '${first}: ...' with a space for a property, or quote the key`);
      }
      return super.parsePropertyName(prop);
    }

    /**
     * Forgets the name not joined at the level a statement starts at: the
     * statement boundary ended the conditional whose consequent lost it. A
     * semicolon acorn inserts at a line break is such a boundary, and no `;`
     * token marks it.
     */
    override parseStatement(...args: unknown[]): unknown {
      this.tokenLevel.suppressed = undefined;
      return super.parseStatement(...args);
    }

    /**
     * acorn's own error, with the hint of § 3.4, 1 when the unexpected token
     * is a `:` at a level that did not join a name since its last `,`, `;` or
     * statement start: the colon the name lost to the conditional. Any other
     * error is left as acorn words it.
     */
    override unexpected(pos?: number): never {
      const suppressed = this.tokenLevel.suppressed;
      if (suppressed !== undefined && this.type === tt.colon &&
          (pos === undefined || pos === this.start)) {
        return this.raise(this.start, 'Unexpected token: a colon-joined name in the ' +
          `consequent of a conditional needs parentheses: (${suppressed})`);
      }
      return super.unexpected(pos);
    }
  }
  return ColonParser as unknown as typeof Parser;
};

/**
 * acorn's `Parser` with the grammar, built once, at module load. `extend`
 * returns a subclass, so acorn's own `Parser`, which `acorn.parse` uses, is
 * left as it was.
 */
export const ColonIdentifiersParser: typeof Parser = Parser.extend(colonIdentifiers);
