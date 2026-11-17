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

describe('the reactive rule-fails page, zoneless', () => {
  it('rule-fails: shows each policy\'s line, and the value three times once the customer has a name', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/forms-reactive/rule-fails'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-rule-fails dd.default')?.textContent).toBe('""');
    expect(element.querySelector('demo-rule-fails dd.function')?.textContent).toBe('"—"');
    expect(element.querySelector('demo-rule-fails dd.throw')?.textContent)
      .toBe('Cannot call undefined or null function');

    typeInto(fixture, 1, '{ "customer": { "name": "Ada" } }');
    await fixture.whenStable();
    expect(element.querySelector('demo-rule-fails dd.default')?.textContent).toBe('"ADA"');
    expect(element.querySelector('demo-rule-fails dd.function')?.textContent).toBe('"ADA"');
    expect(element.querySelector('demo-rule-fails dd.throw')?.textContent).toBe('"ADA"');
  });
});
