import { WritableSignal, computed, signal } from '@angular/core';
import { EvalContext, EvalOptions, EvalState, call, compile, defaultParserOptions, parse } from '@zvenigora/ng-eval-core';
// `createSignalContext` and `SignalContextWriteError` are not on the
// adapter's import list (plan S 5), which governs **non-spec** files. They are
// load-bearing here rather than convenient: the first is the resolver
// `readProperty` re-implements and cannot otherwise be compared against, and
// the second is the class `createFieldContext` is chosen for.
import { SignalContextWriteError, createSignalContext } from '@zvenigora/ng-eval-signals';
import { evaluateRule } from './evaluate-rule';
import { createModelSource } from './model-source';

// The source adapter, asserted on the observables this step can actually
// reach (plan S 4, step 2). Every case here constructs
// `createModelSource(model, options).createRuleContext()` directly: there is
// no registrar yet, no `form()`, no field state and no `LogicFn`, so S 6.1's
// **third** harness is the only one available - a spec-local
// `computed(() => context.get(key))`, counted.
//
// The model is typed `Record<string, unknown>` rather than a closed interface
// throughout, because the case this section exists for is a key the model
// does **not** hold at construction (S 3.2.1, C2). A closed interface would
// make that fixture unwritable, which is precisely how the plan's earlier
// revisions ended up with a criterion no fixture could reach.
describe('createModelSource', () => {

  describe('createRuleContext', () => {

    it('should build a context carrying exactly three lookups', () => {
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const context = createModelSource(model).createRuleContext();

      // Two from `createFieldContext` - one per `createSignalContext`, and
      // both over an empty `{}` - plus ours. The count is the only observable
      // there is: `createSignalContext` closes over its source and the
      // returned `EvalContext` exposes no accessor for it, so "both sources
      // are empty" is not directly assertable and the pop below is what
      // stands in for it.
      expect(context.lookups.length).toBe(3);
    });

    it('should build a context that rejects a write', () => {
      // S 3.2.1's *stated* reason for going through `createFieldContext` is
      // not its sources - both are empty - but its **class**: it returns a
      // context whose `set` throws, and that is the error step 3's
      // `applyErrorPolicy` must re-throw rather than swallow under a default
      // of `'undefined'`. A hand-built `EvalContext` would silently accept an
      // assigning expression, and the lookup count above would not notice.
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const context = createModelSource(model).createRuleContext();

      expect(() => context.set('country')).toThrow(SignalContextWriteError);
    });

    it('should resolve every model key through the third lookup and nothing without it', () => {
      const model = signal<Record<string, unknown>>({ country: 'US', zip: '10001' });
      const context = createModelSource(model).createRuleContext();

      expect(context.get('country')).toBe('US');
      expect(context.get('zip')).toBe('10001');

      // Removing the third lookup is what proves the first two are empty: if
      // either carried the model, a key would still resolve here.
      context.lookups.pop();

      expect(context.get('country')).toBeUndefined();
      expect(context.get('zip')).toBeUndefined();
    });

    it('should mint a distinct context per call while sharing one memo', () => {
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const source = createModelSource(model);

      const first = source.createRuleContext();
      const second = source.createRuleContext();

      // S 3.6's count as two identity comparisons rather than as a sentence:
      // one `EvalContext` per rule per `form()`, one `computed` per key per
      // **factory**. Asserted on the source directly, which is the narrower
      // subject; `rules.invocation-count.spec.ts`' "one memo per factory and
      // one context per rule per form" observes **both** counts through the
      // registrars, across two `form()` calls on a two-rule schema.
      expect(first).not.toBe(second);
      expect(source.keySignal('country')).toBe(source.keySignal('country'));
    });
  });

  describe('resolution', () => {

    it('should resolve a key the model holds at construction', () => {
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const context = createModelSource(model).createRuleContext();

      expect(context.get('country')).toBe('US');
    });

    it('should resolve a key absent at construction once the model gains it', () => {
      // The fixture **omits** `country`. That is the whole point of the case
      // (S 3.2.1, C2): the read is what subscribes, and it happens even
      // though the key resolves `undefined`, because `EvalContext.get` treats
      // `undefined` as absent at every step. A record that simply lacked the
      // key would return `undefined` having read nothing, and would be frozen
      // for the life of the form.
      const model = signal<Record<string, unknown>>({ zip: '10001' });
      const context = createModelSource(model).createRuleContext();
      const derived = computed(() => context.get('country'));

      expect(derived()).toBeUndefined();

      model.set({ zip: '10001', country: 'US' });

      expect(derived()).toBe('US');
    });

    it('should resolve a case-variant key on the first read', () => {
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const context = createModelSource(model, { caseInsensitive: true }).createRuleContext();

      expect(context.get('Country')).toBe('US');
    });

    it('should still resolve a case-variant key after a write', () => {
      // Q4, and the case that separates the two candidate shapes. The first
      // read passes under a memo written back into the source record too -
      // it is the **second** that freezes there, because the memo entry is
      // spelled as the expression wrote it and becomes an exact match that
      // shadows the model's own key. Revision 3 was right about the case it
      // was defended on and wrong one read later, so a spec that reads once
      // is the setup failure rather than the assertion failure.
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const context = createModelSource(model, { caseInsensitive: true }).createRuleContext();
      const derived = computed(() => context.get('Country'));

      expect(derived()).toBe('US');

      model.set({ country: 'CA' });

      expect(derived()).toBe('CA');
    });

    it('should resolve a case-variant key bound to undefined once it gains a value', () => {
      // Q4 in its measured spelling: the key is present at construction and
      // holds `undefined`, so the first read resolves nothing and the second
      // must still find it.
      const model = signal<Record<string, unknown>>({ country: undefined });
      const context = createModelSource(model, { caseInsensitive: true }).createRuleContext();
      const derived = computed(() => context.get('Country'));

      expect(derived()).toBeUndefined();

      model.set({ country: 'US' });

      expect(derived()).toBe('US');
    });

    it('should resolve a case-variant key absent at construction once it arrives', () => {
      // Q4b - the late-key case and the case-variant case at once, which is
      // the pair neither candidate shape could satisfy before the resolution
      // moved inside the computed.
      const model = signal<Record<string, unknown>>({ zip: '10001' });
      const context = createModelSource(model, { caseInsensitive: true }).createRuleContext();
      const derived = computed(() => context.get('Country'));

      expect(derived()).toBeUndefined();

      model.set({ zip: '10001', country: 'US' });

      expect(derived()).toBe('US');
    });

    it('should prefer an exact match over a case variant', () => {
      // `readProperty` re-implements `eval-signals`' `resolve` rather than
      // borrowing it - `resolve` is module-private there and could not be
      // called (S 0.1, S 3.2.1). The two must agree, and this is the rule
      // that would drift first.
      const model = signal<Record<string, unknown>>({ Country: 'exact', country: 'variant' });
      const context = createModelSource(model, { caseInsensitive: true }).createRuleContext();

      expect(context.get('Country')).toBe('exact');
    });

    it('should not fall back to a case variant without the option', () => {
      const model = signal<Record<string, unknown>>({ country: 'US' });
      const context = createModelSource(model).createRuleContext();

      expect(context.get('Country')).toBeUndefined();
    });

    it.each([true, false])(
      'should agree with upstream resolve on the same keys, caseInsensitive=%s',
      (caseInsensitive) => {
        // The drift gate for S 0.1's borrow-or-say-what-differs rule.
        // `readProperty` is a re-implementation of `resolve`
        // (`signal-context.ts:127-144`) because `resolve` is module-private
        // there, so "the two must agree" is otherwise a sentence nothing
        // checks. The fixture carries the pair that separates the rules -
        // an exact match and a case variant of it - because an exact match
        // winning is the whole of what enabling the option must *not*
        // change.
        const values = { Country: 'exact', country: 'variant', zip: '10001' };
        const model = signal<Record<string, unknown>>({ ...values });
        const options = { caseInsensitive };

        const ours = createModelSource(model, options).createRuleContext();
        const upstream = createSignalContext({ ...values }, options);

        for (const key of ['Country', 'country', 'COUNTRY', 'zip', 'ZIP', 'absent']) {
          expect([key, ours.get(key)]).toEqual([key, upstream.get(key)]);
        }
      }
    );
  });

  describe('non-string keys', () => {

    // `docs/backlog.md` `BL-D6`. A computed member whose object is the context
    // is how an expression hands a lookup a key that is not a string: `this`
    // evaluates to the context itself, and `member-expression.ts` passes the
    // computed key through raw. The string-keyed drift gate above cannot reach it, so
    // these cases walk the expression through both adapters instead - ours
    // through `evaluateRule`, upstream through `eval-core` directly - and
    // compare. Each also names the value, so the two agreeing on a wrong
    // answer does not pass.
    const walk = (expression: string, context: EvalContext, options?: EvalOptions): unknown =>
      call(compile(parse(expression, defaultParserOptions)), EvalState.fromContext(context, options));

    const both = (expression: string, values: Record<string, unknown>, options?: EvalOptions) => {
      const model = signal<Record<string, unknown>>({ ...values });
      const ours = createModelSource(model, options).createRuleContext();
      const upstream = createSignalContext({ ...values }, options);

      return {
        ours: evaluateRule(compile(parse(expression, defaultParserOptions)), ours, options),
        upstream: walk(expression, upstream, options),
      };
    };

    it('should resolve a number key the model holds, as upstream does', () => {
      const { ours, upstream } = both('this[42]', { '42': 'forty-two' });

      expect(ours).toBe(upstream);
      expect(ours).toBe('forty-two');
    });

    it('should resolve a number key the model holds under caseInsensitive, as upstream does', () => {
      const { ours, upstream } = both('this[42]', { '42': 'forty-two' }, { caseInsensitive: true });

      expect(ours).toBe(upstream);
      expect(ours).toBe('forty-two');
    });

    it('should resolve an absent number key to undefined under caseInsensitive, as upstream does', () => {
      // The case-variant fallback lowercases the key. Upstream runs it for
      // strings only; a number reaching it would throw a `TypeError` out of
      // the walk rather than resolve.
      const { ours, upstream } = both('this[42]', { country: 'US' }, { caseInsensitive: true });

      expect(ours).toBe(upstream);
      expect(ours).toBeUndefined();
    });

    it('should share one memo entry between a number key and its string spelling', () => {
      // The memo is private, and the resolver returns a value, so the two
      // spellings agreeing on the value says nothing about how many entries
      // they made. What does observe it is the model read: each memo entry is
      // a `computed` that reads `model()` once when first evaluated. So the
      // model is counted through a `Proxy`, which forwards everything else to
      // the real signal.
      let reads = 0;
      const counted = <T>(model: WritableSignal<T>): WritableSignal<T> =>
        new Proxy(model, {
          apply: (target, thisArg, args) => {
            reads++;
            return Reflect.apply(target, thisArg, args);
          },
        });

      const values = { '42': 'forty-two', '43': 'forty-three' };
      const evaluate = (expression: string): unknown =>
        evaluateRule(
          compile(parse(expression, defaultParserOptions)),
          createModelSource(counted(signal<Record<string, unknown>>({ ...values }))).createRuleContext()
        );
      const upstream = (expression: string): unknown =>
        walk(expression, createSignalContext({ ...values }));

      // Each `evaluate` builds a fresh source, so each count is one
      // evaluation's entries and nothing else.
      const shared = '[this["42"], this[42]]';
      reads = 0;
      const result = evaluate(shared);

      expect(result).toEqual(upstream(shared));
      expect(result).toEqual(['forty-two', 'forty-two']);
      expect(reads).toBe(1);

      // The calibration arm: two distinct keys make two entries, so the
      // counter is shown able to read 2 in this fixture.
      reads = 0;

      expect(evaluate('[this["42"], this[43]]')).toEqual(['forty-two', 'forty-three']);
      expect(reads).toBe(2);
    });
  });

  describe('the memo', () => {

    it('should return one computed per key across two reads of a late key', () => {
      // The memo is mandatory rather than an optimisation: a resolver
      // building a fresh `computed` per read hands Angular a new dependency
      // every invocation, so the previous one is dropped and the tracking
      // churns - which makes the negative case below unstable rather than
      // wrong, the harder failure to read.
      //
      // The observable has to be the `computed` itself. The memo is private
      // and the resolver returns a **value**, so comparing two resolved
      // values passes with or without a memo. `keySignal` is on the
      // `ModelSource` for exactly this comparison.
      const model = signal<Record<string, unknown>>({ zip: '10001' });
      const source = createModelSource(model);

      const first = source.keySignal('country');
      const second = source.keySignal('country');

      expect(first).toBe(second);
    });

    it('should hold one computed per key, not one per factory', () => {
      const model = signal<Record<string, unknown>>({ country: 'US', zip: '10001' });
      const source = createModelSource(model);

      expect(source.keySignal('country')).not.toBe(source.keySignal('zip'));
    });
  });

  describe('per-key propagation', () => {

    it('should not re-derive for a key the expression does not name, and should for one it does', () => {
      // S 6.1's six-step sequence, run against the third harness: the
      // counted derivation is a spec-local `computed(() => context.get(key))`
      // and "read" is calling it. Every line is load-bearing - Angular's
      // graph is pull-based, so a spec that writes the model and compares
      // counts without reading compares 0 to 0 and passes against a source
      // that over-subscribes just as happily.
      const model = signal<Record<string, unknown>>({ country: 'US', zip: '10001' });
      const context = createModelSource(model).createRuleContext();

      let invocations = 0;
      const derived = computed(() => {
        invocations++;
        return context.get('country');
      });

      // 1. Read, forcing the first invocation.
      expect(derived()).toBe('US');

      // 2. Record it, and assert it moved at all. A recorded 0 means nothing
      //    has run and the rest of this case measures an absence it created.
      const afterFirstRead = invocations;
      expect(afterFirstRead).toBeGreaterThanOrEqual(1);

      // 3. Write a key the derivation does not name.
      model.set({ country: 'US', zip: '90210' });

      // 4. Read the same derivation again. Without this the count cannot
      //    move whether the source over-subscribes or not.
      expect(derived()).toBe('US');

      // 5. The count is the assertion; 1 and 4 are setup.
      expect(invocations).toBe(afterFirstRead);

      // 6. The calibration arm. Without it, a counter incremented at
      //    construction or wrapping the wrong closure satisfies step 2 and
      //    then reports "unchanged" for every negative case there is.
      model.set({ country: 'CA', zip: '90210' });

      expect(derived()).toBe('CA');
      expect(invocations).toBeGreaterThan(afterFirstRead);
    });

    it('should not re-derive for an unnamed key under caseInsensitive either', () => {
      // Q2b, and it is a separate case rather than a variant of the one above
      // because `caseInsensitive` is the path where `readProperty` scans
      // `Object.keys(model())` - which is the obvious objection to resolving
      // inside the computed, and the one the plan measured rather than
      // argued. Scanning the model costs work *inside* a memoised
      // derivation, not a dependency: the computed was already reading the
      // whole model object before the scan existed.
      const model = signal<Record<string, unknown>>({ country: 'US', zip: '10001' });
      const context = createModelSource(model, { caseInsensitive: true }).createRuleContext();

      let invocations = 0;
      const derived = computed(() => {
        invocations++;
        return context.get('Country');
      });

      expect(derived()).toBe('US');
      const afterFirstRead = invocations;
      expect(afterFirstRead).toBeGreaterThanOrEqual(1);

      model.set({ country: 'US', zip: '90210' });

      expect(derived()).toBe('US');
      expect(invocations).toBe(afterFirstRead);

      model.set({ country: 'CA', zip: '90210' });

      expect(derived()).toBe('CA');
      expect(invocations).toBeGreaterThan(afterFirstRead);
    });
  });
});
