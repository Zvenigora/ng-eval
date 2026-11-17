import { TestBed } from '@angular/core/testing';
import { Block } from '../../block';
import { REGISTRY, RegistryEntry } from '../../registry';

function entryAt(path: string): RegistryEntry {
  const entry = REGISTRY.find((e) => e.path === path);
  if (!entry) {
    throw new Error(`no registry entry at ${path}`);
  }
  return entry;
}

// `entryAt` is try/core-eval.example.spec.ts's; its `typeInto` is not copied, since this case
// changes the value by the example's own input, not by a box.

describe('the reactive quick-start page, zoneless', () => {
  it('quick-start: shows the value, and the new value and the state input after typing US in the country input', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/forms-reactive/quick-start'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-quick-start output')?.textContent).toBe('false');
    expect(element.querySelector('demo-quick-start input.state')).toBeNull();

    const country = element.querySelector('demo-quick-start input.country') as HTMLInputElement;
    country.value = 'US';
    country.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.querySelector('demo-quick-start output')?.textContent).toBe('true');
    expect(element.querySelector('demo-quick-start input.state')).not.toBeNull();
  });
});
