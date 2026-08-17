import type { Injector } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import type { SignalContextSource } from '@zvenigora/ng-eval-signals';

/**
 * Builds the form-wide source of an expression context from a `FormGroup`.
 *
 * **This is a snapshot, not yet a mirror.** It reads `group.controls` once and
 * takes each control's current value. Step 3 makes it track, per *control* and
 * never per group (plan S 3.5.1), and adds the instance diffing of trap 5. The
 * signature is already the final one so that step does not rewrite the symbol
 * and leave a stale caller behind.
 *
 * **Whether the record then holds `Signal`s or live plain values is open**, and
 * S 3.4.2 gives step 2 the decision, because it is the same question as whether
 * the field context's form half unwraps. A record of `Signal`s read by a form
 * half that does not unwrap would compare a function to a string on every
 * recompute, silently and without a dependency. Do not settle it from here.
 *
 * `group.controls` and not `group.value`: the latter omits disabled controls,
 * which would silently drop a field from every expression on the form.
 *
 * @param group - A flat `FormGroup`. Nested groups and `FormArray` are out of
 *                scope for this phase.
 * @param options - `injector` scopes the signals step 3 creates to the form's
 *                  lifetime; it is required rather than optional because an
 *                  explicit injector means no `DestroyRef` auto-teardown, and
 *                  an optional one would silently vary that (plan S 3.7).
 */
export const createControlSource = (
  group: FormGroup,
  options: { injector: Injector }
): SignalContextSource => {

  // Deliberately unread until step 3 creates the signals it scopes. Not
  // renamed to `_options`: no `argsIgnorePattern` is configured in this
  // workspace, so that silences nothing, and it would put the throwaway name
  // in the emitted `.d.ts` of a signature this step ships final.
  void options;

  const source: SignalContextSource = {};

  for (const [name, control] of Object.entries(group.controls)) {
    source[name] = control.value;
  }

  return source;
};
