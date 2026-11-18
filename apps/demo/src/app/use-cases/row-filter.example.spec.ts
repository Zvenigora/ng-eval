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

describe('the row-filter page, zoneless', () => {
  it('row-filter: shows the matching rows, and the new rows after the expression changes', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('use-cases/row-filter'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const titles = () => Array.from(
      element.querySelectorAll('demo-row-filter tbody tr'),
      (row) => row.querySelector('td')?.textContent
    );
    expect(element.querySelector('demo-row-filter output')?.textContent).toBe('2 of 5 rows');
    expect(titles()).toEqual(['Dune', 'Encyclopedia']);

    typeInto(fixture, 0, 'price > 100');
    await fixture.whenStable();
    expect(element.querySelector('demo-row-filter output')?.textContent).toBe('3 of 5 rows');
    expect(titles()).toEqual(['Dune', 'Desk lamp', 'Encyclopedia']);
  });
});
