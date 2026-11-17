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
// changes the values by the example's button, not by a box.

describe('the registrars page, zoneless', () => {
  it('registrars: shows what the field state reads back, and the new values after the button sets the model', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/forms-signals/registrars'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const text = (name: string) => element.querySelector(`demo-registrars dd.${name}`)?.textContent;
    expect(text('hidden')).toBe('true');
    expect(text('text')).toBe('Standard');
    expect(text('disabled')).toBe('true');
    expect(text('reasons')).toBe('ZIP is US-only');

    (element.querySelector('demo-registrars button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text('hidden')).toBe('false');
    expect(text('text')).toBe('Free shipping');
    expect(text('disabled')).toBe('false');
    expect(text('reasons')).toBe('');
  });
});
