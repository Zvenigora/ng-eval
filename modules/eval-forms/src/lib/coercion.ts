/**
 * Coerces an expression's result to the boolean a `visible` rule needs.
 *
 * **JavaScript truthiness, and nothing cleverer** (plan S 3.6). A rule author
 * writing `visible: "country === 'US'"` gets a boolean already; the coercion
 * exists for the ones who write `visible: "country"`.
 *
 * `undefined` is therefore the load-bearing input rather than an edge case.
 * An *empty* field and a *missing* field are indistinguishable here - S 3.4.3:
 * a field key bound to `undefined` is treated as absent, and an empty
 * `FormControl` is the common case - so both arrive as `undefined`, and both
 * mean "not visible".
 *
 * The string `'false'` is **visible**, because it is a non-empty string. That
 * is truthiness rather than parsing, and it is the answer a form-builder UI
 * storing every value as a string will hit. Documented in the README rather
 * than special-cased: a coercion that parsed `'false'` would then owe an
 * answer for `'no'`, `'0'` and `'off'`, none of which JavaScript has one for.
 *
 * Both adapters call this, which is why it is in the core: `/reactive` and
 * `/signals` differ in how they schedule the recompute and not in what the
 * result means (S 3.4.5).
 *
 * @param value - Whatever the expression evaluated to.
 * @returns `true` when the value is truthy.
 */
export const toVisible = (value: unknown): boolean => !!value;

/**
 * Coerces an expression's result to the string a `text` rule needs.
 *
 * `String(value)`, with `null` and `undefined` mapping to `''` (plan S 3.6).
 * Those two are the carve-out and the only one: rendering the literal text
 * `undefined` into a label is the failure this rule exists to prevent, and it
 * is what a bare `String(value)` would do for the most ordinary input a form
 * has - the empty control of S 3.4.3.
 *
 * Every *other* falsy value stringifies normally: `0` is `'0'` and `false` is
 * `'false'`. Mapping all falsy values to `''` would be the obvious way to
 * write this rule wrongly, and it would blank a field whose value is
 * legitimately zero.
 *
 * @param value - Whatever the expression evaluated to.
 * @returns The value as a string, or `''` when it is `null` or `undefined`.
 */
export const toText = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);
