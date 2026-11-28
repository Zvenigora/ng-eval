import {
  type CompileRuleOptions,
  type CompileRuleResult,
  type Settings,
  compileWithSettings,
  readOptions,
} from './compile-rule';
import { isPlainObject } from './pattern';
import { describeShape } from './rule-context';

/**
 * `RuleRegistry`: the Phase 12 plan's step 6, its shapes and 12.6c's
 * decisions, each of which a row of `rule-registry.spec.ts` holds.
 */

/**
 * What a `RuleRegistry` is constructed with. Any other own key throws, a symbol
 * or a non-enumerable one included, and an own field whose value is
 * `undefined` is absent.
 */
export interface RuleRegistryOptions {
  /**
   * The `CompileRuleOptions` every compile uses, checked as `compileRule`
   * checks them and copied when the registry is constructed, so a later change
   * to that object changes nothing.
   */
  readonly compile?: CompileRuleOptions;
  /** The most rules the registry holds, an integer from 1. Default 500. */
  readonly maxEntries?: number;
}

const CALLER = 'RuleRegistry';
const OPTION_KEYS: readonly string[] = ['compile', 'maxEntries'];
const DEFAULT_MAX_ENTRIES = 500;

/** A stored result: its `version`, or, stored without one, the text it was compiled from. */
interface Entry {
  readonly result: CompileRuleResult;
  readonly version?: string;
  readonly text?: string;
}

/** A field of the options, read once, as an own property; `undefined` is absent. */
const ownField = (value: object, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(value, key) ? (value as Record<string, unknown>)[key] : undefined;

/** The parsed rule's own `id`, when it is a non-null non-array object and that `id` is a string. */
const keyOf = (parsed: unknown): string | undefined => {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  const id = ownField(parsed, 'id');
  return typeof id === 'string' ? id : undefined;
};

/**
 * Caches compiled rules by `id`, under one set of compile options. A request
 * reuses the stored result, the same object, when the registry holds one for
 * the rule's `id` stored with the same `version`, or, without a `version`,
 * stored without one from the same text. A `version` is the caller's promise
 * that the text is the same: the text is not compared. A reuse makes the entry
 * the most recently used. Any other request compiles: a result with no
 * problems is stored, frozen, in place of the id's entry, and the least
 * recently used entry is evicted past `maxEntries`; a result with problems is
 * not stored, and removes the id's entry.
 */
export class RuleRegistry {
  readonly #settings: Settings;
  readonly #maxEntries: number;
  /** One map for both lookup and recency: the first key is the least recently used. */
  readonly #entries = new Map<string, Entry>();

  /**
   * @param options `compile`, the `CompileRuleOptions` every compile uses, and
   *   `maxEntries`, the most rules the registry holds, an integer from 1, 500
   *   by default
   * @throws TypeError for options that are not a plain object, that hold an
   *   own key other than `compile` and `maxEntries`, a symbol or a
   *   non-enumerable one included, or whose `maxEntries` is not an integer from
   *   1, an `undefined` field being absent; and what `compileRule` throws for
   *   the `compile` options, with `compileRule`'s message
   */
  constructor(options?: RuleRegistryOptions) {
    let compile: unknown;
    let maxEntries: unknown;
    if (options !== undefined) {
      if (!isPlainObject(options)) {
        throw new TypeError(
          `${CALLER} takes its options as a plain object, { compile?, maxEntries? }: this is ${describeShape(options)}.`
        );
      }
      for (const key of Reflect.ownKeys(options)) {
        if (typeof key !== 'string' || !OPTION_KEYS.includes(key)) {
          throw new TypeError(`${CALLER}'s options have no field ${String(key)}: they are compile and maxEntries.`);
        }
      }
      compile = ownField(options, 'compile');
      maxEntries = ownField(options, 'maxEntries');
    }
    if (maxEntries !== undefined && !(Number.isInteger(maxEntries) && (maxEntries as number) >= 1)) {
      const shown = typeof maxEntries === 'number' ? String(maxEntries) : describeShape(maxEntries);
      throw new TypeError(`${CALLER}'s option maxEntries is an integer from 1: this is ${shown}.`);
    }
    this.#maxEntries = (maxEntries as number | undefined) ?? DEFAULT_MAX_ENTRIES;
    this.#settings = readOptions(compile as CompileRuleOptions | undefined);
  }

  /**
   * Compiles a rule's JSON text, or returns the result stored for it.
   *
   * @param text the rule's JSON text
   * @param version the caller's promise that a text under this `version` is the same
   * @returns what `compileRule(JSON.parse(text), compile)` returns: the stored
   *   result, the same object, when the registry holds one for the rule's `id`
   *   stored with the same `version`, or, without a `version`, stored without
   *   one from the same text
   * @throws TypeError for a `text` that is not a string or a `version` that is
   *   given and is not one; and what `JSON.parse` throws passes through.
   *   Neither changes an entry.
   */
  compile(text: string, version?: string): CompileRuleResult {
    if (typeof text !== 'string') {
      throw new TypeError(`${CALLER}.compile takes a rule's JSON text as a string: this is ${describeShape(text)}.`);
    }
    if (version !== undefined && typeof version !== 'string') {
      throw new TypeError(`${CALLER}.compile takes a version as a string, or none: this is ${describeShape(version)}.`);
    }
    const parsed: unknown = JSON.parse(text);
    const key = keyOf(parsed);
    if (key === undefined) {
      // A rule with no string `id` has a problem, so nothing is stored or removed.
      return compileWithSettings(parsed, this.#settings);
    }
    const entry = this.#entries.get(key);
    if (
      entry !== undefined &&
      (version !== undefined ? entry.version === version : entry.version === undefined && entry.text === text)
    ) {
      this.#entries.delete(key);
      this.#entries.set(key, entry);
      return entry.result;
    }
    const result = compileWithSettings(parsed, this.#settings);
    if (!result.ok) {
      this.#entries.delete(key);
      return result;
    }
    Object.freeze(result.problems);
    Object.freeze(result);
    this.#entries.delete(key);
    this.#entries.set(key, version === undefined ? { result, text } : { result, version });
    for (const oldest of this.#entries.keys()) {
      if (this.#entries.size <= this.#maxEntries) {
        break;
      }
      this.#entries.delete(oldest);
    }
    return result;
  }

  /**
   * Removes the entry stored for a rule's `id`, if there is one.
   *
   * @param id the rule's `id`
   * @throws TypeError for an `id` that is not a string
   */
  invalidate(id: string): void {
    if (typeof id !== 'string') {
      throw new TypeError(`${CALLER}.invalidate takes a rule's id as a string: this is ${describeShape(id)}.`);
    }
    this.#entries.delete(id);
  }
}
