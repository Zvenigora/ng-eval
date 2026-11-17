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

describe('the evaluate page, zoneless', () => {
  it('evaluate: shows both values, and the new ones after `x` changes in the data box', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/core/evaluate'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-evaluate output.evaluated')?.textContent).toBe('3');
    expect(element.querySelector('demo-evaluate output.called')?.textContent).toBe('3');

    typeInto(fixture, 1, '{ "x": 10, "y": 2 }');
    await fixture.whenStable();
    expect(element.querySelector('demo-evaluate output.evaluated')?.textContent).toBe('12');
    expect(element.querySelector('demo-evaluate output.called')?.textContent).toBe('12');
  });
});
