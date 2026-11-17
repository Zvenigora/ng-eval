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

describe('the scopes page, zoneless', () => {
  it('scopes: shows the value, and the new value after the expression box changes', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/core/scopes'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-scopes output')?.textContent)
      .toBe('Mister Whiskers says meow 3 times');

    typeInto(fixture, 0, 'cat.NAME');
    await fixture.whenStable();
    expect(element.querySelector('demo-scopes output')?.textContent).toBe('Miss Kitty');
  });
});
