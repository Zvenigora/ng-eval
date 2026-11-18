import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { Footer } from './footer';
import { SOURCE_FETCH, SourceResponse } from './source-view';

const ROOT = join(__dirname, '..', '..', '..', '..');
const GLOBALS = globalThis as Record<string, unknown>;

/** What the build copied: `packages/<folder>/package.json` is `modules/<folder>/package.json`. */
function fromDisk(url: string): Promise<SourceResponse> {
  const text = readFileSync(join(ROOT, url.replace(/^packages\//, 'modules/')), 'utf8');
  return Promise.resolve({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(text) });
}

function manifest(folder: string): { name: string; version: string } {
  return JSON.parse(readFileSync(join(ROOT, 'modules', folder, 'package.json'), 'utf8'));
}

async function render(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(Footer);
  await fixture.whenStable();
  return fixture.nativeElement;
}

const text = (node: Element | null): string => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the footer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: SOURCE_FETCH, useValue: fromDisk }] });
  });

  afterEach(() => {
    delete GLOBALS['NG_EVAL_COMMIT'];
  });

  it('shows each manifest\'s name and version, and the commit the workflow defines, or that none is recorded', async () => {
    let element = await render();
    expect(Array.from(element.querySelectorAll('.packages span'), text)).toEqual(
      ['eval-core', 'eval-signals', 'eval-forms'].map(manifest).map((m) => `${m.name} ${m.version}`)
    );
    expect(text(element.querySelector('.commit'))).toBe('A local build: no commit recorded.');

    GLOBALS['NG_EVAL_COMMIT'] = '84cd932595be29fdc3ae9975f3005a7802f010e8';
    element = await render();
    expect(text(element.querySelector('.commit'))).toBe('Built from commit 84cd932.');
    expect(element.querySelector('.commit a')?.getAttribute('href')).toBe(
      'https://github.com/Zvenigora/ng-eval/commit/84cd932595be29fdc3ae9975f3005a7802f010e8'
    );
  });
});
