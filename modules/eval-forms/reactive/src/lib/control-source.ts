import { DestroyRef, Injector, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl, FormGroup } from '@angular/forms';
import type { SignalContextSource } from '@zvenigora/ng-eval-signals';
import { Subject, startWith, switchMap, takeUntil } from 'rxjs';

/**
 * One key's mirror: the control it currently points at, the channel that
 * re-points it, and the one that ends it.
 *
 * Both channels exist because `toSignal(obs, { injector })` takes its cleanup
 * from that injector's `DestroyRef` and hands back no per-subscription handle.
 * Releasing *one* control's subscription while the injector is still alive
 * therefore has to happen inside the stream, and the two cases need different
 * operators:
 *
 * - **replaced** - `instances` emits, `switchMap` drops the previous inner
 *   subscription and takes the new one. One release, one subscribe.
 * - **removed** - `released` emits and `takeUntil` unsubscribes the chain.
 *   Completing `instances` is *not* enough and the difference is not academic:
 *   `switchMap` completes only once its inner completes too, and
 *   `valueChanges` never does - so the dead control keeps its subscriber. This
 *   is measured, not reasoned; the removal spec fails against the version that
 *   only completed `instances`.
 */
interface ControlChannel {
  control: AbstractControl;
  instances: Subject<AbstractControl>;
  released: Subject<void>;
}

/**
 * Builds the form-wide source of an expression context from a `FormGroup`.
 *
 * One mirror **per control, never per group** (plan S 3.5.1). A disabled
 * control is excluded from its parent's aggregate value and there is no
 * `rawValueChanges` to go with `getRawValue()`, so a group-backed mirror would
 * lose a field the moment anything disabled it - and this library computes
 * disablement, so one field's rule would silently blank the value every *other*
 * field's rules resolve against. A control's own `valueChanges` keeps emitting
 * regardless of its enabled state.
 *
 * **The record holds live values behind accessors, not the mirrored signals**
 * (S 3.5.5). Each key is an enumerable accessor that reads its change-signal -
 * which is what a surrounding `computed()` records as a dependency, per key -
 * and then answers with the control's *current* value. Reading the control
 * rather than the signal is what makes `invalidate()` a working hatch for
 * trap 3: a `{ emitEvent: false }` write leaves the change-signal stale, and a
 * record that handed out that signal would have nothing to recover, however
 * often it was re-evaluated.
 *
 * **One entry per key, for the life of that key** (S 3.5.5). A replaced control
 * instance re-points its channel; it does not get a new accessor or a new
 * signal. Building fresh ones would leave every property that had already read
 * the key tracking the *dead* control's signal - frozen at its last value, for
 * the life of the binding, which is the failure trap 5 exists to prevent
 * reappearing one layer up.
 *
 * **The returned record must be passed by reference, never spread or cloned.**
 * `{ ...source }` flattens the accessors to the values they happened to hold,
 * so the copy records no dependency and every property over it freezes at its
 * first value with no error. The type - `Record<string, unknown>` - gives no
 * hint of this, and phase-3-plan S 9.2 describes composing sources by
 * spreading, which is why it is said here.
 *
 * **`invalidate()` covers a stale *value*, not a suppressed *control-set*
 * change.** Trap 3's hatch works because the accessor re-reads the control, so
 * re-running the walk recovers. `setControl` / `addControl` / `removeControl`
 * with `{ emitEvent: false }` suppress `group.events` instead, so `sync` never
 * runs and the channel still points at the dead instance - there is nothing
 * for a re-run to recover, in the same structural sense that rules out a
 * signal-valued record. Current behaviour, pinned here rather than fixed:
 * the observable is the only signal there is.
 *
 * @param group - A flat `FormGroup`. Nested groups and `FormArray` are out of
 *                scope for this phase.
 * @param options - `injector` scopes every subscription here to the form's
 *                  lifetime; it is required rather than optional because an
 *                  explicit injector means no `DestroyRef` auto-teardown, and
 *                  an optional one would silently vary that (plan S 3.7).
 */
export const createControlSource = (
  group: FormGroup,
  options: { injector: Injector }
): SignalContextSource => {

  const source: SignalContextSource = {};
  const channels = new Map<string, ControlChannel>();

  // `FormGroup`'s default type argument is `any`, so its `controls` is too.
  // Narrowed once here rather than at four call sites.
  const controls = (): Record<string, AbstractControl> =>
    group.controls as Record<string, AbstractControl>;

  const open = (name: string, control: AbstractControl): void => {

    const channel: ControlChannel = {
      control,
      instances: new Subject<AbstractControl>(),
      released: new Subject<void>(),
    };

    // `startWith` twice, and both are load-bearing. The outer one subscribes
    // the control the key opened with. The inner one replays the *current*
    // instance's value on subscribe, so a replacement produces an emission
    // immediately instead of waiting for its first edit - without it a
    // property reading this key would sit on the dead control's value until
    // someone typed into the new one.
    //
    // The signal's own value is never read; it is a change ticker. It still
    // has to carry values, because `toSignal` dedupes with `Object.is` and a
    // stream emitting a constant would tick once and never again.
    const changed: Signal<unknown> = toSignal(
      channel.instances.pipe(
        startWith(control),
        switchMap((instance) =>
          instance.valueChanges.pipe(startWith(instance.value))
        ),
        takeUntil(channel.released)
      ),
      { injector: options.injector, requireSync: true }
    );

    Object.defineProperty(source, name, {
      get: () => {
        changed();
        return channel.control.value;
      },
      enumerable: true,
      configurable: true,
    });

    // Registered last, after everything that can throw. `toSignal` can
    // (NG0205 from a destroyed injector, NG0601 from a stream that does not
    // emit synchronously), and a channel registered before it would leave
    // `channels` holding a key `source` has no accessor for - which `sync`
    // then reads as "unchanged" forever, so the key is permanently
    // un-mirrored with no path back.
    channels.set(name, channel);
  };

  const close = (name: string, channel: ControlChannel): void => {
    channel.released.next();
    channel.released.complete();
    channel.instances.complete();
    channels.delete(name);
    delete source[name];
  };

  // Diffs the key -> instance map against the group's current controls
  // (S 3.5.5). Deleting the entry being visited is safe: `Map` iteration
  // tolerates it.
  const sync = (): void => {

    const live = controls();

    for (const [name, channel] of channels) {
      // Own-property, never a bare `live[name]` (plan S 3.4.2's rule, applied
      // on this side of the library too). `FormGroup` keeps the caller's
      // object literal and rejects only keys containing a dot, so a
      // server-supplied field named `constructor` or `toString` is legal -
      // and after its control is removed a bare read resolves the
      // *prototype's* value instead of `undefined`. This loop would then take
      // the "replaced" branch, push `Object` down the channel, and throw out
      // of the `group.events` subscriber - which unsubscribes it, silently
      // ending all diffing for the life of the form.
      const replacement: AbstractControl | undefined =
        Object.prototype.hasOwnProperty.call(live, name)
          ? live[name]
          : undefined;

      if (replacement === channel.control) {
        continue;
      }

      if (replacement === undefined) {
        close(name, channel);
        continue;
      }

      channel.control = replacement;
      channel.instances.next(replacement);
    }

    for (const [name, control] of Object.entries(live)) {
      if (!channels.has(name)) {
        open(name, control);
      }
    }
  };

  for (const [name, control] of Object.entries(controls())) {
    open(name, control);
  }

  // After the channels, deliberately: with the injector missing - which the
  // type forbids but a JavaScript caller can still do - `toSignal` above
  // throws NG0203 naming the injection context, where reading `DestroyRef` off
  // `undefined` first would throw a `TypeError` naming nothing.
  //
  // `group.events` and not `valueChanges`: `setControl` / `addControl` /
  // `removeControl` all reach `updateValueAndValidity`, so the control set
  // changing is observable here.
  //
  // It fires on ordinary interaction too, and on more than one event apiece -
  // value, status, pristine, touched and reset are all `ControlEvent`s - so
  // this runs several O(N) diffs per interaction rather than one. That is the
  // price of not handing the consumer a `rebind()` they will forget to call,
  // and there is no narrower signal available: Angular's collection-change
  // callback is private. Nothing per-node is touched, so eval-core's
  // performance gate is unaffected.
  group.events
    .pipe(takeUntilDestroyed(options.injector.get(DestroyRef)))
    .subscribe(() => sync());

  return source;
};
