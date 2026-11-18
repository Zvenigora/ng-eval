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

describe('the hooks page, zoneless', () => {
  it('hooks: shows the value, the reads and the trace with each node\'s type, and the new value after `a` changes', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/core/hooks'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const texts = (selector: string): string[] =>
      Array.from(element.querySelectorAll(selector), (node) => node.textContent ?? '');
    expect(element.querySelector('demo-hooks output')?.textContent).toBe('32');
    expect(texts('demo-hooks ul.reads li')).toEqual(['a']);
    expect(texts('demo-hooks ul.trace li')).toHaveLength(7);
    expect(texts('demo-hooks ul.trace li')[6]).toBe('Program: 2 + 3 * a = 32');

    typeInto(fixture, 1, '{ "a": 20 }');
    await fixture.whenStable();
    expect(element.querySelector('demo-hooks output')?.textContent).toBe('62');
  });
});
