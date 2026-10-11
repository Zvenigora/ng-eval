import { sha256 } from 'js-sha256';
import { ParserOptions } from '../../internal/interfaces';

/**
 * The options a cached AST cannot honour: acorn calls each callback as it
 * parses, and appends to a caller's `program` node. A parse carrying any of
 * them with a value acorn acts on bypasses the cache, reading and writing
 * (`docs/colon-identifiers/phase-9-plan.md` § 3.2). The test is on the value,
 * never the key: `defaultParserOptions`, which every service passes, carries
 * all five as `null`.
 */
const UNCACHEABLE_OPTIONS = [
  'onToken', 'onComment', 'onInsertedSemicolon', 'onTrailingComma', 'program'
] as const;

/**
 * Left out of the fingerprint: the five above, and `cacheSize`, which sizes
 * the cache and changes no parse.
 */
const UNKEYED_OPTIONS: ReadonlySet<string> =
  new Set<string>([...UNCACHEABLE_OPTIONS, 'cacheSize']);

/** Stands for a call that passes no options object of its own. */
const NO_CALL_OPTIONS: ParserOptions = Object.freeze({});

/**
 * A `ParserService`'s remembered fingerprint digests, by the identity of the
 * service's options, then the call's. Weak at both levels, so it keeps
 * neither object alive. Each service holds its own.
 */
export type ParseFingerprintMemo =
  WeakMap<ParserOptions, WeakMap<ParserOptions, string | null>>;

/**
 * Builds the fingerprint of a parse with the given options — the service's and
 * the call's, merged as `ParserService.parse` merges them — or `null` when the
 * parse must bypass the cache.
 *
 * Every other option is in it under its own name, so an option this file does
 * not list keys the cache with no change here. Sorted `[key, value]` pairs as
 * JSON: canonical, so equal options give one fingerprint whatever their key
 * order or identity. A key whose value is `undefined` is written `[key]`
 * rather than dropped, since acorn reads it differently from a missing key:
 * `checkPrivateFields` defaults to `true`. A value JSON cannot hold, a cycle
 * or a `BigInt`, gives no fingerprint, so that parse bypasses the cache rather
 * than throw where it used to succeed.
 */
export const buildParseFingerprint = (options: ParserOptions): string | null => {
  for (const key of UNCACHEABLE_OPTIONS) {
    if (options[key]) {
      return null;
    }
  }
  const values = options as Readonly<Record<string, unknown>>;
  const pairs = Object.keys(values)
    .filter(key => !UNKEYED_OPTIONS.has(key))
    .sort()
    .map(key => values[key] === undefined ? [key] : [key, values[key]]);
  try {
    return JSON.stringify(pairs);
  } catch {
    return null;
  }
};

/**
 * Returns the cache namespace for a parse with the service's options and the
 * call's — the sha256 of their fingerprint, in hex — or `null` when the parse
 * must bypass the cache. Built once per pair of objects and remembered by
 * identity in the service's `memo`, so `EvalService`, which passes the same
 * `defaultParserOptions` on every call, pays two lookups per parse rather than
 * a serialization and a digest. The digest keeps `getHashKey`'s input short:
 * it joins the namespace and the text with `:`, and 64 hex characters, none a
 * colon, cannot make two (options, text) pairs one key when the text holds
 * colons.
 *
 * Remembered by identity, it does not see an object changed in place: the
 * object the `parserOptions` getter returns, an options object a caller passes
 * again after writing into it, or the exported `defaultParserOptions`. A change
 * through the `parserOptions` setter installs a new object, and is seen
 * (`docs/backlog.md` A34).
 */
export const parseFingerprint = (memo: ParseFingerprintMemo,
                                 serviceOptions: ParserOptions,
                                 callOptions?: ParserOptions): string | null => {
  let byCall = memo.get(serviceOptions);
  if (!byCall) {
    byCall = new WeakMap<ParserOptions, string | null>();
    memo.set(serviceOptions, byCall);
  }
  // A JavaScript caller can pass something other than an object, such as the
  // `false` of `condition && options`. It cannot be a `WeakMap` key, and acorn
  // reads none of its options from it, so it is fingerprinted as none.
  const call = typeof callOptions === 'object' && callOptions !== null
    ? callOptions : undefined;
  const callKey = call ?? NO_CALL_OPTIONS;
  let digest = byCall.get(callKey);
  if (digest === undefined) {
    const fingerprint = buildParseFingerprint({ ...serviceOptions, ...call });
    digest = fingerprint === null ? null : sha256(fingerprint);
    byCall.set(callKey, digest);
  }
  return digest;
};
