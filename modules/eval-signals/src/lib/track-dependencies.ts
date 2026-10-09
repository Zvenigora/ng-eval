import { EvalHooks, EvalOptions } from '@zvenigora/ng-eval-core';
import type { EvalReadEvent } from '@zvenigora/ng-eval-core';

/**
 * What `trackDependencies` needs on both primitives, kept in one place so
 * that the option means the same thing on `createEvalSignal` and
 * `createEvalSignalAsync`. Not re-exported by the package barrel.
 */

/**
 * Rewrites each path's first segment to the key its identifier read resolved
 * to, so that under `caseInsensitive` `COUNT + 1` over `{ count }` reports
 * `count`. The tracker records `path`, which is the expression's spelling;
 * the resolved spelling is on the identifier read's `key`, which the signal
 * context answers with the source's own spelling.
 *
 * **First segments only.** They are keys of the context; later segments are
 * property names inside a value, and their resolved key is on a member read
 * that has no path of its own when the member is computed. Respelling them
 * would also take the rewrite from a lookup by root to a walk of each chain.
 *
 * A name read through more than one spelling maps them all to the one key,
 * and the set collapses them. Run only under `caseInsensitive`, the only mode
 * in which a resolved key can differ from the name as written.
 */
export const respellRoots = (
  paths: ReadonlySet<string>,
  reads: readonly EvalReadEvent[]
): ReadonlySet<string> => {

  // Scoped reads need no filter here: the tracker has already dropped every
  // path rooted at a name an arrow parameter bound.
  const resolved = new Map<string, string>();
  for (const read of reads) {
    if (read.kind === 'identifier' && read.path !== undefined && typeof read.key === 'string') {
      resolved.set(read.path, read.key);
    }
  }

  const respelled = new Set<string>();
  for (const path of paths) {
    const dot = path.indexOf('.');
    const root = dot < 0 ? path : path.slice(0, dot);
    const key = resolved.get(root);
    respelled.add(key === undefined ? path : key + path.slice(root.length));
  }
  return respelled;
};

/**
 * Throws when `trackDependencies` is set together with an `EvalHooks`
 * registry in `eval.hooks`.
 *
 * Checked against `EvalState`'s own rule rather than against presence: it
 * adopts `hooks` only when the value is an `EvalHooks`, so anything else
 * leaves the state building a registry of its own and there is no conflict
 * to report. The caller raises it at construction, the call the consumer
 * wrote, because at the first recompute it would surface on whatever line
 * happens to read the signal.
 */
export const assertTrackingCompatible = (
  trackDependencies: boolean,
  evalOptions: EvalOptions | undefined
): void => {

  // Cast for the read, as `EvalState.adoptHooks` does and for its reason:
  // `EvalOptions` is a union, and `hooks` exists on neither arm by name - the
  // `caseInsensitive` arm has no index signature to reach it through. The
  // `instanceof` immediately after is what narrows the `unknown` back.
  const adoptedHooks = (evalOptions as Record<string, unknown> | undefined)?.['hooks'];

  if (trackDependencies && adoptedHooks instanceof EvalHooks) {
    throw new Error(
      `Cannot combine 'trackDependencies' with 'eval.hooks': an EvalState `
      + `dispatches through the registry it adopted, so tracking would have to `
      + `install a read hook on a registry this library does not own - one that `
      + `would keep firing on every later evaluation you run through it. `
      + `Install createDependencyTracker() on your own registry and read it `
      + `from there instead; it is the same tracker this option would have used.`
    );
  }
};
