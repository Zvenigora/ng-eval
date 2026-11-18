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
// changes the value by the example's own drop-down, not by a box.

describe('the configured-form page, zoneless', () => {
  it('configured-form: shows the labels of the visible fields, and the changed set after choosing US in the country drop-down', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('use-cases/configured-form'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('textarea').length).toBe(1);

    const labels = () => Array.from(
      element.querySelectorAll('demo-configured-form label'),
      (label) => `${label.className}: ${label.querySelector('span')?.textContent?.trim()}`
    );
    expect(labels()).toEqual(['country: Country', 'zip: Postal code']);

    const country = element.querySelector('demo-configured-form label.country select') as HTMLSelectElement;
    expect(Array.from(country.options, (option) => option.value)).toEqual(['', 'US', 'CA', 'GB']);
    country.value = 'US';
    country.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(labels()).toEqual(['country: Country', 'state: State', 'zip: ZIP code']);
  });
});
