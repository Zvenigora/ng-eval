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

describe('the schema-function page, zoneless', () => {
  it('schema-function: shows each form\'s `hidden`, and the new ones after the expression changes', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/forms-signals/schema-function'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-schema-function dd.a')?.textContent).toBe('false');
    expect(element.querySelector('demo-schema-function dd.b')?.textContent).toBe('true');

    typeInto(fixture, 0, "country === 'CA'");
    await fixture.whenStable();
    expect(element.querySelector('demo-schema-function dd.a')?.textContent).toBe('true');
    expect(element.querySelector('demo-schema-function dd.b')?.textContent).toBe('false');
  });
});
