import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Block } from '../block';
import { REGISTRY, RegistryEntry } from '../registry';

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

describe('the free-form page, zoneless', () => {
  it('core-eval: shows the value, and the new value after `a` changes in the data box', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('try'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('demo-core-eval output').textContent).toBe('32');

    typeInto(fixture, 1, '{ "a": 20 }');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('demo-core-eval output').textContent).toBe('62');
  });
});
