import {
  EnvironmentInjector,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { FieldProperties, bindFieldProperties } from '../public-api';

/**
 * The two release paths a binding has, asked of the collector: `destroy()`,
 * and the `DestroyRef` net that calls it when the caller's injector dies.
 * The specs that bind and never call `destroy()` rely on the second, and
 * until this file nothing observed either as retention - the teardown cases
 * in `field-schema.spec.ts` count subscriptions and `destroy` calls, which a
 * registration left on the caller's injector does not change.
 *
 * `/signals` has no counterpart: `createExpressionRules` registers with no
 * `DestroyRef` and has no `destroy()` (`rules.ts`).
 */
describe('bindFieldProperties - release paths (docs/backlog.md D12)', () => {

  // `eval-signals`' memory spec's instrument, unchanged. Jest has no
  // `global.gc`: the flag exposes `gc` to contexts created after it is set,
  // and is cleared again at once so that the contexts Jest builds for later
  // suites do not get one.
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc') as () => void;
  setFlagsFromString('--no-expose-gc');

  // Whether each target is still alive. A `WeakRef` keeps its target alive
  // until the job that created or read it ends, so the collection has to
  // happen in a later one.
  const collect = async (refs: WeakRef<object>[]): Promise<boolean[]> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    gc();
    return refs.map((ref) => ref.deref() !== undefined);
  };

  let root: EnvironmentInjector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    root = TestBed.inject(EnvironmentInjector);
  });

  /**
   * Binds one field over a fresh group and reads both of its signals, so the
   * walks, the mirror's per-key subscriptions and the field's context all
   * exist before anything is released.
   *
   * Errors are caught here and handed back as a message, not thrown and not
   * asserted with `expect`: either would carry an object graph out of this
   * frame, and whatever that graph reaches is not collectable while the test
   * body holds it.
   */
  const bindOver = (
    injector: EnvironmentInjector,
    destroy: boolean
  ): { group?: FormGroup; properties?: FieldProperties; error?: string } => {
    try {
      const group = new FormGroup({
        country: new FormControl('US'),
        city: new FormControl('Austin'),
      });

      const binding = bindFieldProperties(
        [{ name: 'city', visible: "country === 'US'", text: 'city' }],
        group,
        { injector }
      );

      const properties = binding.fields['city'];
      const visible = properties.visible?.();
      const text = properties.text?.();

      if (visible !== true || text !== 'Austin') {
        return { error: `the binding did not evaluate: ${visible}, ${text}` };
      }

      if (destroy) {
        binding.destroy();
      }

      return { group, properties };

    } catch (error) {
      return { error: String(error) };
    }
  };

  /**
   * The injector-alive half. What holds the binding here is the registration
   * `bindFieldProperties` makes on the caller's `DestroyRef`
   * (`field-schema.ts`, the `unregister` assignment): its callback closes
   * over `destroy`, and `destroy` over `created` - every bound signal.
   *
   * **Three targets, because the registration retains two different things
   * depending on whether `destroy()` ran.** Before it, a signal reaches its
   * context, the context the mirror, and the mirror the `FormGroup`. After
   * it, the signals have let go of their contexts and the scope of its
   * subscriptions, so a registration left behind holds only the destroyed
   * signals themselves - the group is collected with or without the
   * unregister. Measured: with `destroy()`'s `release?.()` removed, a
   * group-only case stays green. The signals are what that leak keeps.
   *
   * The injector is held by the test body and never destroyed before the
   * assertion - it stands for the root injector, the case in which that
   * registration would otherwise live as long as the application.
   */
  const bindingUnder = (
    injector: EnvironmentInjector,
    destroy: boolean
  ): { refs?: WeakRef<object>[]; error?: string } => {
    const { group, properties, error } = bindOver(injector, destroy);

    if (!group || !properties?.visible || !properties.text) {
      return { error: error ?? 'the binding returned no signals' };
    }

    return {
      refs: [
        new WeakRef(group),
        new WeakRef(properties.visible),
        new WeakRef(properties.text),
      ],
    };
  };

  /**
   * The injector-dies half. **The target is the caller's injector, and the
   * test holds the group** - the case the `DestroyRef` net exists for: a form
   * that outlives the component or route injector its binding was wired to.
   *
   * A `FormGroup` target cannot observe this path. `R3Injector.destroy()`
   * replaces its hook list with an empty one before running the old one, so a
   * destroyed injector releases the registration whether or not the callback
   * released anything, and a group nothing else holds is collected either
   * way. Measured: a group-target case stayed green with the registration
   * removed, and again with its callback made a no-op.
   *
   * What the callback does release runs the other way, from the group:
   * `group.events` holds the mirror's `sync` subscriber, `sync` shares
   * `createControlSource`'s closure with `open`, which reads
   * `options.injector` - the binding's child scope - and the scope's `parent`
   * is this injector. The callback destroys the scope, the scope's
   * `takeUntilDestroyed` drops the subscriber, and the chain is cut.
   */
  const injectorUnder = (
    destroyInjector: boolean
  ): { group?: FormGroup; ref?: WeakRef<EnvironmentInjector>; error?: string } => {
    try {
      const injector = createEnvironmentInjector([], root);
      const { group, error } = bindOver(injector, false);

      if (!group) {
        return { error };
      }

      if (destroyInjector) {
        injector.destroy();
      }

      return { group, ref: new WeakRef(injector) };

    } catch (error) {
      return { error: String(error) };
    }
  };

  it('should release the group and the signals on destroy() while the caller\'s injector lives', async () => {
    const injector = createEnvironmentInjector([], root);

    const { refs, error } = bindingUnder(injector, true);

    expect(error).toBeUndefined();

    // [group, visible, text]
    const live = await collect(refs ?? []);

    expect(live).toEqual([false, false, false]);

    injector.destroy();
  });

  it('should release the caller\'s injector from the group when that injector is destroyed', async () => {
    const { group, ref, error } = injectorUnder(true);

    expect(error).toBeUndefined();

    const live = await collect(ref ? [ref] : []);

    expect(live).toEqual([false]);

    // Read after the collection, so the group is held across it - the form
    // that outlives the injector.
    expect(group).toBeDefined();
  });

  describe('calibration: with neither release, each target is retained', () => {

    it('should keep the group and the signals while the caller\'s injector lives and destroy() is not called', async () => {
      const injector = createEnvironmentInjector([], root);

      const { refs, error } = bindingUnder(injector, false);

      expect(error).toBeUndefined();

      // [group, visible, text]
      const live = await collect(refs ?? []);

      expect(live).toEqual([true, true, true]);

      injector.destroy();
    });

    it('should keep the caller\'s injector while the group lives and neither is destroyed', async () => {
      const { group, ref, error } = injectorUnder(false);

      expect(error).toBeUndefined();

      const live = await collect(ref ? [ref] : []);

      expect(live).toEqual([true]);
      expect(group).toBeDefined();
    });

  });

});
