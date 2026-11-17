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

// Real timers: the async signal holds a `PendingTasks` task while a run is pending, so
// `whenStable` waits for `loadUser`'s 10 ms.
describe('the async page, zoneless', () => {
  it('async: shows the status and the user, and the new user after `id` changes in the data box', async () => {
    const fixture = TestBed.createComponent(Block);
    fixture.componentRef.setInput('entry', entryAt('features/signals/async'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('demo-async output.status')?.textContent).toBe('resolved');
    expect(element.querySelector('demo-async output.name')?.textContent).toBe('Ada');

    typeInto(fixture, 1, '{ "id": 2 }');
    await fixture.whenStable();
    expect(element.querySelector('demo-async output.status')?.textContent).toBe('resolved');
    expect(element.querySelector('demo-async output.name')?.textContent).toBe('Grace');
  });
});
