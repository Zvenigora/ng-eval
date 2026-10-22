import { Registry } from '../public-api';
import { isCaseInsensitiveStore } from '../classes/common/context';

/**
 * The names `identifier.ts` resolves to a built-in value under
 * `caseInsensitive`, in any spelling, when the context holds none of them.
 * ESTree parses `undefined` as an `Identifier`, and under that option a case
 * variant of `null`, `true` or `false` is one too, so each reaches the
 * identifier visitor rather than the literal one.
 */
export const literals: Registry<string, unknown> = Registry.fromObject({
  'undefined': undefined,
  'null': null,
  'true': true,
  'false': false,
}, { caseInsensitive: true });

/**
 * Whether `name`, as written, is one the evaluator resolves to a built-in
 * value, for a write that would land in `store`: `undefined` in both modes,
 * and under `caseInsensitive` any spelling of a {@link literals} name.
 * Case-sensitively, `TRUE` and `NULL` are ordinary names, and `true`, `null`
 * and `false` never reach an identifier.
 *
 * **Any spelling of `undefined` also counts when the store compares keys
 * case-insensitively**, whatever the walk's mode. A case-insensitive context
 * walked with case-sensitive options is the split the README warns of, and
 * there `UNDEFINED = 1` lands in a store whose `get('undefined')` then finds
 * it, so the case-sensitive read of `undefined` would read the write. `TRUE`,
 * `NULL` and `FALSE` need no such clause: a case-sensitive walk never reads
 * them as literals. The length test keeps the lowering off every other write.
 *
 * `NaN` and `Infinity` are not among them: the evaluator resolves neither, so
 * on an empty context each reads `undefined` (`docs/backlog-retired.md` A46).
 */
export const isLiteralName = (name: string, caseInsensitive: boolean, store: unknown): boolean =>
  name === 'undefined'
  || (caseInsensitive
    ? literals.has(name)
    : name.length === 9 && name.toLowerCase() === 'undefined' && isCaseInsensitiveStore(store));
