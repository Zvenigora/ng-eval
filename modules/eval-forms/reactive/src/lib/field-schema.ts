import {
  DestroyRef,
  EnvironmentInjector,
  Injector,
  computed,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import {
  ExpressionErrorPolicy,
  createFieldContext,
  toText,
  toVisible,
} from '@zvenigora/ng-eval-forms';
import { EvalSignal, createEvalSignal } from '@zvenigora/ng-eval-signals';
import { createControlSource } from './control-source';

/**
 * One field's rules, as strings resolved at runtime.
 *
 * This is the whole descriptor. It is deliberately not a schema *language*:
 * `visible` and `text` are the two properties this phase ships (plan S 3.6),
 * `disabled` is deferred with three reasons rather than a shrug, and
 * `required` is deferred with the validators.
 */
export interface FieldSchema {

  /**
   * The field's name, and the key its control is mirrored under.
   *
   * It does not have to name a control: a rule naming a field the group has
   * no control for resolves `undefined`, which is S 3.4.3's ordinary case
   * rather than an error. It may not be a member of `Object.prototype` -
   * see {@link bindFieldProperties}.
   */
  readonly name: string;

  /** An expression whose value is coerced by truthiness (`toVisible`). */
  readonly visible?: string;

  /** An expression whose value is coerced to a string (`toText`). */
  readonly text?: string;
}

/**
 * The signals bound for one field - one per rule the schema supplied.
 *
 * Typed as `EvalSignal`, not `Signal`, and both extra members are load-bearing
 * on this path (plan S 5): `invalidate()` is trap 3's hatch for a
 * `{ emitEvent: false }` write and S 3.4.2's hatch for a key-set change, and
 * `destroy()` is what step 5's teardown counts. Typing these as `Signal` would
 * put both out of reach through the published surface.
 *
 * The type arguments are `boolean` and `string` rather than S 5's original
 * `unknown`, **because the coercion of S 3.6 happens here**. That section was
 * written before the coercion's placement was settled and `coercion.ts` states
 * the settlement - "both adapters call this" - so `unknown` would now describe
 * the value the property is built *from* rather than the one it answers with.
 */
export interface FieldProperties {
  readonly visible?: EvalSignal<boolean>;
  readonly text?: EvalSignal<string>;
}

/**
 * What {@link bindFieldProperties} returns: the bound fields, and the one call
 * that ends them.
 *
 * **Nested rather than a `destroy` written onto the record** (plan S 5's step-5
 * amendment). The record is keyed by *field name*, `destroy` is a legal field
 * name, and S 0's premise is that those names arrive from a server rather than
 * from the consumer - so a flat shape would put a silent collision between the
 * consumer's data and this library's API in precisely the case where the
 * consumer controls the names least.
 */
export interface FormBinding {

  /** The bound properties, keyed by field name. */
  readonly fields: Record<string, FieldProperties>;

  /**
   * Destroys every `EvalSignal` this binding created and releases the mirror.
   *
   * **Call it.** Every signal here is built with an explicit injector, and
   * that means no `DestroyRef` registration of its own (`eval-signal.ts`) - so
   * nothing auto-destroys and all N x M are the caller's (plan S 3.7).
   *
   * There is one net under that, and it is a net rather than a substitute: the
   * binding registers this on the `DestroyRef` of the injector it was given,
   * so a binding wired to a component or route injector is released when that
   * injector dies even if nobody called it. It is not a licence to skip the
   * call - a binding built on the root injector is released at the end of the
   * application and no sooner.
   *
   * Idempotent, and that is load-bearing rather than polite: the scope is an
   * `EnvironmentInjector`, and `R3Injector.destroy()` throws NG0205 when it
   * has already run.
   */
  destroy(): void;
}

/**
 * Puts a coercion in front of an `EvalSignal` without losing the two members
 * that make it one.
 *
 * A second `computed` rather than a coercion inside the walk: the expression
 * is the consumer's and its *value* is what the error policy and the
 * dependency tracking are defined over, so the coercion belongs strictly
 * downstream of both. It is also what keeps a destroyed signal - which reads
 * `undefined` - answering `false` / `''` rather than leaking `undefined` into
 * a template.
 *
 * `Object.assign` then `defineProperty`, mirroring `createEvalSignal`'s own
 * construction: `assign` copies a getter's *current value*, which would freeze
 * `dependencies` at the empty set it holds before the first recompute.
 */
const coerce = <T>(
  inner: EvalSignal<unknown>,
  map: (value: unknown) => T
): EvalSignal<T> => {

  const outer = Object.assign(computed(() => map(inner())), {
    invalidate: () => inner.invalidate(),
    destroy: () => inner.destroy(),
  }) as EvalSignal<T>;

  Object.defineProperty(outer, 'dependencies', {
    get: () => inner.dependencies,
    enumerable: true,
    configurable: true,
  });

  return outer;
};

/**
 * The three checks of open question 8.3, plus 8.5's half.
 *
 * Three checks, and the count is the boundary rather than a starting point.
 * Each catches something that is otherwise either silent or reported far from
 * its cause, and none of them is a rule about what an *expression* may say -
 * that is `eval-core`'s and is already answered.
 */
const validate = (schema: readonly FieldSchema[], group: FormGroup): void => {

  const seen = new Set<string>();

  for (const field of schema) {

    if (seen.has(field.name)) {
      throw new Error(
        `Duplicate field name '${field.name}' in the schema: ` +
        `each field is bound once, so the second would silently replace the first.`
      );
    }
    seen.add(field.name);

    // The check no other layer can make (S 3.4.3's third precedence layer).
    // A server-supplied field named `constructor`, `toString`, `valueOf` or
    // `__proto__` is legal to `FormGroup`, which rejects only keys containing
    // a dot - and when no control backs it, `EvalContext.get` consults
    // `original` first and `getContextValue` reads a plain object as a bare
    // property access, so the name resolves off `Object.prototype`. Every rule
    // reading it then gets a *function*, which is truthy: `visible` renders
    // precisely the field that has no data, with no error anywhere.
    //
    // It is not containable downstream - the resolution happens above this
    // library, in `createSignalContext`'s `original`, and S 2 forbids the
    // upstream fix - and this is the only layer that can name the offending
    // field in the message.
    if (Object.prototype.hasOwnProperty.call(Object.prototype, field.name)) {
      throw new Error(
        `Field name '${field.name}' is a member of Object.prototype and cannot be ` +
        `resolved reliably: an expression naming it reads the prototype's value ` +
        `whenever no control backs it. Rename the field.`
      );
    }

    for (const property of ['visible', 'text'] as const) {
      const rule = field[property];

      if (rule !== undefined && typeof rule !== 'string') {
        throw new Error(
          `Field '${field.name}': ${property} must be a string expression, ` +
          `not ${typeof rule}.`
        );
      }
    }
  }

  // Checked over the *group*, not over the schema's names, because the mirror
  // covers every control (S 3.5) - so a control nobody named still reaches
  // every field's context, where an expression finds it.
  //
  // Construction-time only, and that is a limitation rather than a guarantee:
  // `addControl` afterwards reaches `sync` -> `open` with no check, and
  // throwing from there is not available - a throw inside the `group.events`
  // subscriber unsubscribes it and silently ends all diffing for the life of
  // the form (S 3.5.5). The README says so.
  for (const [name, control] of Object.entries(
    group.controls as Record<string, AbstractControl>
  )) {
    // The same check as above, over the other source of names rather than a
    // fourth one - and the mirror does **not** rescue this case, which is
    // easy to believe and wrong. The mirror does define an own accessor for
    // `constructor` on its record, but the record is reached through
    // `lookups`, step 4 of `EvalContext.get`, while `original` - the empty
    // field source - is read at step 2 with a bare property access. Measured:
    // the accessor is present and the expression still reads
    // `function Object() { [native code] }`. So a control named off
    // `Object.prototype` is unreadable through every expression, silently and
    // truthily, and worse than the schema case because the value exists.
    if (Object.prototype.hasOwnProperty.call(Object.prototype, name)) {
      throw new Error(
        `Control '${name}' is a member of Object.prototype and cannot be read by any ` +
        `expression: the name resolves to the prototype's value before the form is ` +
        `ever consulted. Rename the control.`
      );
    }

    // Flat forms only (S 2, open question 8.5): a thrown error rather than a
    // documented limitation, because the alternative surfaces as a confusing
    // evaluation result far from its cause - a nested group's *aggregate
    // object* arriving where a value was expected.
    if (!(control instanceof FormControl)) {
      throw new Error(
        `Control '${name}' is not a FormControl. Nested groups and FormArrays are ` +
        `out of scope for this phase.`
      );
    }
  }
};

/**
 * Binds a schema to a `FormGroup`, producing one `EvalSignal` per rule.
 *
 * ```ts
 * const binding = bindFieldProperties(
 *   [{ name: 'state', visible: "country === 'US'" }],
 *   form,
 *   { injector }
 * );
 *
 * binding.fields['state'].visible();   // recomputes when `country` changes
 *
 * binding.destroy();                   // yours to call - nothing here
 *                                      // auto-destroys (S 3.7)
 * ```
 *
 * **One `EvalContext` per field, never one shared** (plan S 3.4.1). `get`
 * resolves `scopes` and `original` *before* `lookups`, and
 * `arrow-function-expression.ts` pushes its scope with no `try`/`finally` - so
 * one field's arrow function that throws leaves a scope on the context for the
 * life of the form, and under a shared context it would shadow every other
 * field's key of the same name. The count is N contexts for N fields, and not
 * N x M: the properties of one field resolve against the same names.
 *
 * **The field half of each context is empty in this phase.**
 * `createFieldContext` takes two sources and the second is `{}` here. What a
 * field-local key set should *contain* is specified nowhere - S 3.4.3's
 * "a field named `value`, `name` or `index`" illustrates collision semantics
 * rather than naming keys - and inventing three keys to fill a parameter is
 * how a public surface acquires members nobody chose. The consequence, stated
 * rather than left to be found: S 3.4.3's precedence rule is asserted at the
 * core in `field-context.spec.ts` and ships **untested end to end**, because
 * no `/reactive` path produces a field-local key. It gets settled by whichever
 * phase first has a consumer for one.
 *
 * **`createControlSource` is called once, for the whole form.** Per field
 * would build N mirrors over one group: N x the live `toSignal` subscriptions
 * step 5 counts, and trap 5's O(N) diff running N times per `group.events`
 * emission, on a signal that already fires several times per interaction.
 *
 * **Constructed, not computed.** `toSignal` opens with
 * `assertNotInReactiveContext`, so calling this from inside an `effect()` or a
 * `computed()` throws out of the mirror with an error naming `toSignal` and
 * nothing naming this library. A form binding belongs in a service or a
 * factory, which is the same premise `injector` being required rests on.
 *
 * **Teardown runs off a child injector, and there is only one of them**
 * (S 3.7, amended in step 5). The binding opens an `EnvironmentInjector` under
 * the caller's and scopes *both* the mirror and every `createEvalSignal` to it,
 * so `destroy()` releases the whole mirror - every per-key `toSignal`
 * subscription and the `group.events` one - in a single call, and a bind that
 * throws part-way through releases exactly the same thing however far it got.
 * The plan's earlier premise, that releasing the mirror needed a handle
 * `createControlSource` does not return, was wrong: step 3 had already measured
 * that destroying the injector drops every control's observer count to 0 and
 * ends the diffing.
 *
 * The `EvalSignal`s are **not** covered by that, and that is the point of the
 * count: built with an explicit injector, they take no `DestroyRef`
 * registration, so `destroy()` walks them itself and N x M of them is what a
 * spec asserts rather than "the form's destroy ran".
 *
 * @param schema - The fields to bind. Validated at construction: a duplicate
 *                 name, a non-string rule, a name that resolves off
 *                 `Object.prototype`, and a control that is not a
 *                 `FormControl` all throw here rather than surfacing later as
 *                 an evaluation result nobody can trace.
 * @param group - A flat `FormGroup` of `FormControl`s.
 * @param options - `injector` is **required**, not optional: S 3.7's argument
 *                  is that every `EvalSignal` here has no auto-teardown, and
 *                  an optional injector would silently vary that for a call
 *                  that happened to sit in an injection context. `onError`
 *                  defaults to `'undefined'` - the opposite of
 *                  `eval-signals`' default, and resolved *here* rather than
 *                  forwarded absent, since `createEvalSignal` would otherwise
 *                  supply `'throw'` (S 3.4.4).
 * @returns The bound properties keyed by field name, and the `destroy()` that
 *          ends them.
 */
export const bindFieldProperties = (
  schema: readonly FieldSchema[],
  group: FormGroup,
  options: { injector: Injector; onError?: ExpressionErrorPolicy }
): FormBinding => {

  // Before the mirror, deliberately. A schema rejection then opens no
  // subscription at all, which is a stronger statement than "the catch below
  // releases it" and is asserted separately.
  validate(schema, group);

  // `?.` and the `inject` fallback are not defensive dressing: the type makes
  // `injector` required, but a JavaScript caller can omit it, and reading
  // `.get` off `undefined` is a `TypeError` naming nothing. `toSignal` solves
  // the same problem the same way (`rxjs-interop.mjs:106`), and it is what
  // keeps the error a caller sees NG0203 - naming the injection context -
  // rather than a property read on `undefined`. `control-source.ts` orders
  // its own statements for that error; this preserves it one layer up.
  const parent =
    options?.injector?.get(EnvironmentInjector) ?? inject(EnvironmentInjector);

  // The other arm of the same problem, and the fallback above is what opens
  // it: *inside* an injection context that fallback succeeds, so a caller who
  // omitted the required `injector` would get a working binding parented at
  // the ambient environment injector - with no auto-teardown and no
  // diagnostic. That is the exact silent variation S 3.7 makes `injector`
  // required to prevent, so it is rejected here by name rather than left to
  // surface as a leak. Outside a context the line above has already thrown
  // NG0203 and this is unreachable.
  if (!options?.injector) {
    throw new Error(
      `bindFieldProperties requires an 'injector': every signal it creates is built ` +
      `with one and therefore takes no DestroyRef registration, so an ambient ` +
      `injection context would silently vary when teardown runs.`
    );
  }

  const scope = createEnvironmentInjector([], parent);

  const onError = options.onError ?? 'undefined';

  const fields: Record<string, FieldProperties> = {};

  // The signals, in creation order, so the `catch` below releases exactly what
  // exists rather than walking `fields` - which holds nothing for the field
  // that threw and nothing at all for a throw in `createControlSource`.
  const created: EvalSignal<unknown>[] = [];

  let destroyed = false;

  // The registration on the *caller's* injector, held so `destroy()` can drop
  // it. See below for why it exists at all.
  let unregister: (() => void) | undefined;

  const destroy = (): void => {

    if (destroyed) {
      return;
    }

    destroyed = true;

    // Cleared before it is called, so a teardown driven *by* the caller's
    // injector does not turn around and mutate the hook list that injector is
    // iterating - `eval-signal.ts:408-414`'s pattern and its reason.
    const release = unregister;
    unregister = undefined;
    release?.();

    try {
      // Called through the property rather than a captured reference: it is
      // the object the caller holds, and `coerce`'s `destroy` delegates to the
      // inner signal, so this is the one call that reaches both.
      for (const signal of created) {
        signal.destroy();
      }
    } finally {
      // In a `finally` because `destroyed` is already set: a signal whose
      // `destroy` throws - a consumer calling this from inside a `computed()`
      // reaches NG0600 - would otherwise leave the scope alive with the retry
      // guarded into a no-op, and every mirror subscription live with no way
      // back.
      //
      // Last, and idempotence is why the guard above exists at all:
      // `R3Injector.destroy()` opens with `assertNotDestroyed` and throws
      // NG0205 on a second call.
      scope.destroy();
    }
  };

  // **The scope is detached, not merely shorter-lived.**
  // `createEnvironmentInjector` does not register the child with its parent's
  // destroy hooks, so without this the mirror would outlive the injector the
  // caller scoped it to - and step 4, which passed that injector to
  // `createControlSource` directly, released everything when it died. A
  // consumer who wires a binding to a component or route injector and forgets
  // `destroy()` would otherwise retain N subscriptions, the mirror, the N
  // contexts and the form itself for the life of the root injector, silently.
  // `destroy()` stays the documented call; this is the net under it.
  unregister = options.injector.get(DestroyRef).onDestroy(() => {
    unregister = undefined;
    destroy();
  });

  try {

    // Scoped to the child, not to the caller's injector: it is what makes the
    // mirror's two subscriptions releasable at all without a handle.
    const formSource = createControlSource(group, { injector: scope });

    for (const field of schema) {

      const context = createFieldContext(formSource, {});
      const properties: { visible?: EvalSignal<boolean>; text?: EvalSignal<string> } = {};

      // `options.injector`, **not** the scope, and the distinction is not
      // cosmetic: `createEvalSignal` uses the injector it is given only to
      // resolve `CompilerService` (`eval-signal.ts:215-216`) - it registers no
      // teardown against it - and the scope's parent is
      // `caller.get(EnvironmentInjector)`, which for a node injector is an
      // *ancestor*. Passing the scope would therefore skip providers the
      // caller declared, silently, and diverge from step 4 for no gain. The
      // scope exists for the one thing that does need a releasable lifetime,
      // which is the mirror.
      if (field.visible !== undefined) {
        properties.visible = coerce(
          createEvalSignal(field.visible, context, {
            injector: options.injector,
            onError,
          }),
          toVisible
        );
        created.push(properties.visible);
      }

      if (field.text !== undefined) {
        properties.text = coerce(
          createEvalSignal(field.text, context, {
            injector: options.injector,
            onError,
          }),
          toText
        );
        created.push(properties.text);
      }

      fields[field.name] = properties;
    }

  } catch (error) {
    // A *parse* error is the reachable case (S 3.4.4's amendment):
    // `createEvalSignal` compiles eagerly, so `visible: 'country ==='` throws
    // from inside this loop with the mirror already open - and the caller
    // holds no handle to any of it, because the binding never returned.
    destroy();
    throw error;
  }

  return { fields, destroy };
};
