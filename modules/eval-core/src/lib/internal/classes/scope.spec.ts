import { Registry } from './registry';
import { Scope } from './scope';

describe('Scope', () => {
  it('should create an instance', () => {
    expect(new Scope()).toBeTruthy();
  });

  it('should add a registry to the scope', () => {
    const scope = new Scope<number, string>();
    const registry = { registry: new Registry<number, string>(), options: { global: true } };
    scope.add(registry);
    expect(scope.registries.length).toBe(1);
    expect(scope.registries[0]).toBe(registry);
  });

  it('should get the value associated with the specified key in the scope', () => {
    const scope = new Scope<number, string>();
    const registry1 = { registry: new Registry<number, string>(), options: { global: true } };
    const registry2 = { registry: new Registry<number, string>(), options: { global: false, namespace: 'ns1' } };
    const registry3 = { registry: new Registry<number, string>(), options: { global: false, namespace: 'ns2' } };
    registry1.registry.set(1, 'value1');
    registry2.registry.set(2, 'value2');
    registry3.registry.set(3, 'value3');
    scope.add(registry1);
    scope.add(registry2);
    scope.add(registry3);
    expect(scope.get(1)).toEqual([1, 'value1']);
    expect(scope.get(2, 'ns1')).toEqual([2, 'value2']);
    expect(scope.get(3, 'ns2')).toEqual([3, 'value3']);
    expect(scope.get(4)).toBeUndefined();
  });
});
