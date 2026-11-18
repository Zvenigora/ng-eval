import { TestBed } from '@angular/core/testing';
import { Block } from '../block';
import { REGISTRY, RegistryEntry } from '../registry';

function entryAt(path: string): RegistryEntry {
  const entry = REGISTRY.find((e) => e.path === path);
  if (!entry) {
    throw new Error(`no registry entry at ${path}`);
  }
  return entry;
}

// `entryAt` is try/core-eval.example.spec.ts's; its `typeInto` is not copied, since this case
// changes the value by the example's own input, not by a box.

describe('the formula-fields page, zoneless', () => {
  it('formula-fields: shows the four formulas, and the new values after typing 2 in the quantity input', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('use-cases/formula-fields'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('textarea').length).toBe(1);

    const values = () => ['subtotal', 'discount', 'tax', 'total'].map(
      (name) => element.querySelector(`demo-formula-fields dd.${name}`)?.textContent
    );
    expect(values()).toEqual(['100.00', '10.00', '11.70', '101.70']);

    const quantity = element.querySelector('demo-formula-fields input.quantity') as HTMLInputElement;
    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(values()).toEqual(['50.00', '0.00', '6.50', '56.50']);
  });
});
