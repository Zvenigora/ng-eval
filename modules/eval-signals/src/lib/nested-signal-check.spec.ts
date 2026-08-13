jest.mock('@angular/core', () => {
  const actual = jest.requireActual('@angular/core');
  return { ...actual, isDevMode: jest.fn(() => true) };
});

import { isDevMode, signal } from '@angular/core';
import { findNestedSignals, warnOnNestedSignals } from './nested-signal-check';

const isDevModeMock = isDevMode as unknown as jest.Mock;

describe('nested-signal-check', () => {

  let warn: jest.SpyInstance;

  beforeEach(() => {
    isDevModeMock.mockReturnValue(true);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  describe('findNestedSignals', () => {

    it('should report a signal nested one level inside a plain object', () => {
      const source = { user: { name: signal('a') } };
      expect(findNestedSignals(source)).toEqual(['user.name']);
    });

    it('should report every nested signal, not just the first', () => {
      const source = { user: { name: signal('a'), age: signal(30), city: 'Tokio' } };
      expect(findNestedSignals(source)).toEqual(['user.name', 'user.age']);
    });

    it('should stay silent for a signal wrapping an object', () => {
      const source = { user: signal({ name: 'a' }) };
      expect(findNestedSignals(source)).toEqual([]);
    });

    it('should stay silent for a signal at the top level', () => {
      const source = { count: signal(1) };
      expect(findNestedSignals(source)).toEqual([]);
    });

    it('should stay silent for a plain nested object', () => {
      const source = { user: { name: 'a' } };
      expect(findNestedSignals(source)).toEqual([]);
    });

    it('should not scan two levels down', () => {
      const source = { a: { b: { c: signal(1) } } };
      expect(findNestedSignals(source)).toEqual([]);
    });

    it('should not invoke a getter while scanning', () => {
      let reads = 0;
      const source = {};
      Object.defineProperty(source, 'lazy', {
        enumerable: true,
        get: () => { reads++; return { name: signal('a') }; },
      });

      expect(findNestedSignals(source)).toEqual([]);
      expect(reads).toBe(0);
    });

    it('should not scan into a class instance', () => {
      class Holder { name = signal('a'); }
      const source = { holder: new Holder() };
      expect(findNestedSignals(source)).toEqual([]);
    });

    it('should not scan into an array', () => {
      const source = { items: [signal(1)] };
      expect(findNestedSignals(source)).toEqual([]);
    });

  });

  describe('warnOnNestedSignals', () => {

    it('should warn once, naming the offending path', () => {
      warnOnNestedSignals({ user: { name: signal('a') } });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('user.name');
    });

    it('should stay silent for a signal wrapping an object', () => {
      warnOnNestedSignals({ user: signal({ name: 'a' }) });
      expect(warn).not.toHaveBeenCalled();
    });

    it('should stay silent for a signal at the top level', () => {
      warnOnNestedSignals({ count: signal(1) });
      expect(warn).not.toHaveBeenCalled();
    });

    it('should stay silent for a plain nested object', () => {
      warnOnNestedSignals({ user: { name: 'a' } });
      expect(warn).not.toHaveBeenCalled();
    });

    it('should stay silent when isDevMode is false', () => {
      isDevModeMock.mockReturnValue(false);

      warnOnNestedSignals({ user: { name: signal('a') } });

      expect(warn).not.toHaveBeenCalled();
    });

  });

});
