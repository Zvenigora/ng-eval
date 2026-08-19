import { Injector, computed } from '@angular/core';
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
 * const fields = bindFieldProperties(
 *   [{ name: 'state', visible: "country === 'US'" }],
 *   form,
 *   { injector }
 * );
 *
 * fields['state'].visible();   // recomputes when `country` changes
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
 * Teardown is **not** here yet: every signal below is built with an explicit
 * injector, which resolves services and does not scope lifetime, so none of
 * them auto-destroys and all N x M are the caller's (S 3.7). Step 5 owns it.
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
 * @returns The bound properties, keyed by field name.
 */
export const bindFieldProperties = (
  schema: readonly FieldSchema[],
  group: FormGroup,
  options: { injector: Injector; onError?: ExpressionErrorPolicy }
): Record<string, FieldProperties> => {

  // Before the mirror, deliberately. Validation that ran after
  // `createControlSource` would leave its subscriptions alive behind the
  // throw, with nothing to release them: the binding has not returned, so the
  // caller holds no handle to destroy.
  validate(schema, group);

  const formSource = createControlSource(group, { injector: options.injector });
  const onError = options.onError ?? 'undefined';

  const bound: Record<string, FieldProperties> = {};

  for (const field of schema) {

    const context = createFieldContext(formSource, {});
    const properties: { visible?: EvalSignal<boolean>; text?: EvalSignal<string> } = {};

    if (field.visible !== undefined) {
      properties.visible = coerce(
        createEvalSignal(field.visible, context, {
          injector: options.injector,
          onError,
        }),
        toVisible
      );
    }

    if (field.text !== undefined) {
      properties.text = coerce(
        createEvalSignal(field.text, context, {
          injector: options.injector,
          onError,
        }),
        toText
      );
    }

    bound[field.name] = properties;
  }

  return bound;
};
