import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Block } from '../../block';
import { REGISTRY, RegistryEntry } from '../../registry';

function entryAt(path: string): RegistryEntry {
  const entry = REGISTRY.find((e) => e.path === path);
  if (!entry) {
    throw new Error(`no registry entry at ${path}`);
  }
  return entry;
}

function typeInto(fixture: ComponentFixture<Block>, index: number, value: string): void {
  const box = fixture.nativeElement.querySelectorAll('textarea')[index] as HTMLTextAreaElement;
  box.value = value;
  box.dispatchEvent(new Event('input'));
}

describe('the dependencies page, zoneless', () => {
  it('dependencies: shows the value and the keys read, and new ones after the expression changes', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/signals/dependencies'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-dependencies output.total')?.textContent).toBe('30');
    expect(element.querySelector('demo-dependencies output.dependencies')?.textContent)
      .toBe('price, quantity');

    typeInto(fixture, 0, 'price * quantity + shipping');
    await fixture.whenStable();
    expect(element.querySelector('demo-dependencies output.total')?.textContent).toBe('35');
    expect(element.querySelector('demo-dependencies output.dependencies')?.textContent)
      .toBe('price, quantity, shipping');
  });
});
