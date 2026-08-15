import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompilerService } from '@zvenigora/ng-eval-core';
import { EvalSignalService } from './eval-signal.service';

describe('EvalSignalService', () => {

  let service: EvalSignalService;
  let compiler: CompilerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalSignalService);
    compiler = TestBed.inject(CompilerService);
  });

  /**
   * Nothing here is wrapped in `runInInjectionContext`, unlike every case in
   * `eval-signal.spec.ts`. That is the point of this file: the service exists
   * so a consumer who holds it can call `create` from wherever they are - a
   * lifecycle hook, a subscription callback - and the free function's
   * `inject(CompilerService)` would throw `NG0203` in exactly those places.
   */
  it('should be injectable without any providers of its own', () => {
    expect(service).toBeInstanceOf(EvalSignalService);
    expect(TestBed.inject(EvalSignalService)).toBe(service);
  });

  it('should create a working signal from outside an injection context', () => {
    const c = signal(1);

    const value = service.create('c + 1', { c });

    expect(value()).toEqual(2);

    c.set(4);

    expect(value()).toEqual(5);
  });

  it('should forward its options to the factory', () => {
    const states = jest.spyOn(compiler, 'createState');

    const value = service.create('a.b + c', {
      a: signal({ b: 1 }),
      c: signal(2),
    }, { trackDependencies: true });

    expect(value()).toEqual(3);

    // Both halves of the option, so a `create` that dropped `options` on the
    // floor cannot pass: the tracker is installed on the state, and its
    // result reaches the consumer.
    expect(statesBuilt(states)[0].hasHooks).toBe(true);
    expect([...value.dependencies].sort()).toEqual(['a', 'a.b', 'c']);
  });

  it('should prefer a caller-supplied injector over its own', () => {
    // A delegating stand-in rather than a second real `CompilerService`: the
    // real one starts a cache-cleanup interval, and what is under test is
    // *which* injector the factory resolved through, not what it resolved.
    const delegate = {
      compile: jest.fn((expression: string) => compiler.compile(expression)),
      createState: jest.fn((context: unknown, options?: unknown) =>
        compiler.createState(context as never, options as never)),
    };
    const injector = Injector.create({
      providers: [{ provide: CompilerService, useValue: delegate }],
    });

    const value = service.create('c + 1', { c: signal(1) }, { injector });

    expect(value()).toEqual(2);
    expect(delegate.compile).toHaveBeenCalledTimes(1);
    expect(delegate.createState).toHaveBeenCalledTimes(1);
  });

  it('should surface the write policy the same way the free function does', () => {
    const value = service.create('count = 5', { count: signal(1) });

    // The service adds no error handling of its own; it is the factory's
    // behaviour reaching the DI-first caller unchanged.
    expect(() => value()).toThrow(/read-only/);
  });

  const statesBuilt = (spy: jest.SpyInstance) =>
    spy.mock.results.map((result) => result.value as { hasHooks: boolean });

});
