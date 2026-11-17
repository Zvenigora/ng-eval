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
// changes the value by the example's button, not by a box.

describe('the signal page, zoneless', () => {
  it('signal: shows the value, and the new value after the button sets `quantity` higher', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/signals/signal'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-signal output')?.textContent).toBe('30');

    (element.querySelector('demo-signal button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('demo-signal output')?.textContent).toBe('40');
  });
});
