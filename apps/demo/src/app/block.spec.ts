import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Block } from './block';
import { REGISTRY, RegistryEntry } from './registry';
import { CoreEvalExample } from './try/core-eval.example';

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

function example(fixture: ComponentFixture<Block>): CoreEvalExample | undefined {
  return fixture.debugElement.query(By.directive(CoreEvalExample))?.componentInstance;
}

async function createBlock(): Promise<ComponentFixture<Block>> {
  const fixture = TestBed.createComponent(Block);
  fixture.componentRef.setInput('entry', entryAt('try'));
  await fixture.whenStable();
  return fixture;
}

describe('the block, zoneless', () => {
  it('creates the example again on an edit: a new instance, and the first one unchanged', async () => {
    const fixture = await createBlock();
    const first = example(fixture);
    expect(first?.result).toBe(32);

    typeInto(fixture, 0, 'a * a');
    await fixture.whenStable();
    const second = example(fixture);
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    expect(second?.result).toBe(100);
    expect(first?.result).toBe(32);
    expect(fixture.nativeElement.querySelectorAll('demo-core-eval').length).toBe(1);
    expect(fixture.nativeElement.querySelector('demo-core-eval output').textContent).toBe('100');
  });

  it('shows a parse error\'s message in place of the example, and the example after the next valid edit', async () => {
    const fixture = await createBlock();

    typeInto(fixture, 0, '2 +');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('demo-core-eval')).toBeNull();
    expect(fixture.nativeElement.querySelector('.error').textContent).toBe('Unexpected token (1:3)');

    typeInto(fixture, 0, '2 + 3');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
    expect(fixture.nativeElement.querySelector('demo-core-eval output').textContent).toBe('5');
  });
});
