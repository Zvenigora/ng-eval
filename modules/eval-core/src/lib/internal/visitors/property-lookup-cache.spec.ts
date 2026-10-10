import { TestBed } from '@angular/core/testing';
import { EvalService } from '../../actual/services/eval.service';
import { clearPropertyLookupCache } from './property-lookup-cache';

/**
 * The case-insensitive property cache, through the member visitor that asks it
 * (`docs/backlog-retired.md` A31).
 *
 * Up to 0.11.0 an answer was cached under the object's own-key count and its
 * first five own names, in one cache for the whole process, so two objects
 * that shared those resolved each other's spelling. Every fixture below that
 * pairs two objects gives them the same count and the same first five names,
 * and spells the searched key differently in each, so a shared answer reads
 * as the other object's property - `undefined` here.
 */
describe('case-insensitive property cache', () => {
  let service: EvalService;

  const ci = { caseInsensitive: true };

  const one = () => ({ a: 1, b: 1, c: 1, d: 1, e: 1, Extra: 'one' });
  const two = () => ({ a: 1, b: 1, c: 1, d: 1, e: 1, EXTRA: 'two' });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
    clearPropertyLookupCache();
  });

  it.each([
    ['one, then two', [['one', one], ['two', two]]],
    ['two, then one', [['two', two], ['one', one]]],
  ] as const)('should resolve two objects sharing their first five keys independently: %s', (_order, reads) => {
    for (const [expected, build] of reads) {
      expect(service.simpleEval('o.extra', { o: build() }, ci)).toBe(expected);
    }
  });

  it('should leave no entry from an earlier service\'s objects for a fresh one', () => {
    expect(service.simpleEval('o.extra', { o: one() }, ci)).toBe('one');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(EvalService);

    expect(fresh.simpleEval('o.extra', { o: two() }, ci)).toBe('two');
  });

  it('should resolve objects whose key names join alike independently', () => {
    // `Z_x`, `y` and `Z`, `x_y`: the same count, and the same names once
    // joined with `_`, so a key built from all of them still collides.
    expect(service.simpleEval('o.z', { o: { Z_x: 1, y: 1 } }, ci)).toBeUndefined();
    expect(service.simpleEval('o.z', { o: { Z: 'two', x_y: 1 } }, ci)).toBe('two');
  });

  it('should resolve two objects holding the same names in different orders by their own order', () => {
    // Two keys match `name` in each, so the answer is whichever comes first.
    expect(service.simpleEval('o.name', { o: { Name: 'first', NAME: 'second' } }, ci)).toBe('first');
    expect(service.simpleEval('o.name', { o: { NAME: 'first', Name: 'second' } }, ci)).toBe('first');
  });

  it('should find a property added after a cached miss', () => {
    const o: Record<string, unknown> = { a: 1 };

    expect(service.simpleEval('o.name', { o }, ci)).toBeUndefined();
    o['NAME'] = 'late';
    expect(service.simpleEval('o.name', { o }, ci)).toBe('late');
  });

  it('should re-scan when a cached key is no longer the object\'s own', () => {
    const o: Record<string, unknown> = { Name: 'before' };

    expect(service.simpleEval('o.name', { o }, ci)).toBe('before');
    delete o['Name'];
    o['NAME'] = 'after';
    expect(service.simpleEval('o.name', { o }, ci)).toBe('after');
  });

  // The control: one object read twice resolves the same key both times.
  it('should resolve the same key for the same object read twice', () => {
    const o = { Name: 'x', other: 1 };
    const state = service.createState({ o }, ci);
    const keys: unknown[] = [];
    state.hooks.onRead((event) => {
      if (event.kind === 'member') {
        keys.push(event.key);
      }
    });

    expect(service.eval('o.name', state)).toBe('x');
    expect(service.eval('o.NAME', state)).toBe('x');
    expect(keys).toEqual(['Name', 'Name']);
  });
});
