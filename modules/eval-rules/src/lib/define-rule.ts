import type { Rule } from './rule';

/**
 * Types a rule written in TypeScript, and returns it unchanged. JSON is the
 * canonical form (the design's Q4); this is the helper over it, so that an
 * editor checks a literal's fields as it is written: the parameter is `Rule`
 * itself, not a type parameter, since an object literal is checked for
 * excess fields only against a declared type. It checks nothing at run time:
 * `compileRule` does.
 *
 * @param rule the rule
 * @returns the same object
 */
export const defineRule = (rule: Rule): Rule => rule;
