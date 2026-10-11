import * as acorn from 'acorn';

export type ParserOptions = Partial<acorn.Options> & {
  extractExpressions?: boolean,
  cacheSize?: number,
  ecmaVersion?: acorn.ecmaVersion,
  /**
   * Parses a colon-joined name such as `Q1:1:3` as one `Identifier` whose
   * `name` is the whole text, by the grammar of
   * `docs/colon-identifiers/phase-9-plan.md` § 3.4: an ASCII first segment
   * that is not a keyword, then one or more `:segment` that may start with a
   * digit, with no whitespace or comment inside. In a conditional's
   * consequent such a name needs parentheses, `c ? (Q1:1) : 0`, and as an
   * object key it is refused: quote it, `{'Q1:1': v}`. Off when absent, and
   * an unset or `false` value parses with acorn's own parser.
   */
  colonIdentifiers?: boolean,
};

export type AnyNodeTypes = acorn.AnyNode['type'];
