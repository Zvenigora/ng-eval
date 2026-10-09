import type { SignalContextSource } from './signal-context';

/**
 * Which source key a name resolves to, kept in one place so that the signal
 * context's resolver and `createEvalSignalAsync`'s `abortSignalKey` check
 * match a key by one rule. Not re-exported by the package barrel.
 */

/**
 * Matches a key against the source, preferring an exact match, and returns
 * the source's own key - or undefined when the source holds none.
 *
 * Under `caseInsensitive` a key that does not match exactly falls back to the
 * first source key that differs only in case, in insertion order. An exact
 * match always wins, so enabling the option never changes how an
 * exactly-spelled key resolves.
 */
export const match = (
  source: SignalContextSource,
  key: unknown,
  caseInsensitive: boolean
): string | undefined => {

  if (Object.prototype.hasOwnProperty.call(source, key as PropertyKey)) {
    return key as string;
  }

  if (!caseInsensitive || typeof key !== 'string') {
    return undefined;
  }

  const lowered = key.toLowerCase();
  return Object.keys(source).find((candidate) => candidate.toLowerCase() === lowered);
};
