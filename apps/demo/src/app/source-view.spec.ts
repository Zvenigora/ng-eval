import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCE_FETCH, SourceResponse, SourceView } from './source-view';

// The build copies `src/app/<file>` to `source/<file>`; here the file is read from disk, from
// this spec's location, `apps/demo/src/app`.
function fromDisk(url: string): Promise<SourceResponse> {
  const text = readFileSync(join(__dirname, url.replace(/^source\//, '')), 'utf8');
  return Promise.resolve({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(text) });
}

describe('the source view, zoneless', () => {
  let written: string | undefined;

  beforeEach(() => {
    written = undefined;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          written = text;
          return Promise.resolve();
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('copies the text the view shows', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: SOURCE_FETCH, useValue: fromDisk }] });
    const warn = jest.spyOn(console, 'warn');
    const fixture = TestBed.createComponent(SourceView);
    fixture.componentRef.setInput('file', 'try/core-eval.example.ts');
    await fixture.whenStable();

    const code = fixture.nativeElement.querySelector('code') as HTMLElement;
    expect(code.querySelector('span')).not.toBeNull();
    expect(code.textContent).toBe(
      readFileSync(join(__dirname, 'try/core-eval.example.ts'), 'utf8').replace(/\r\n?/g, '\n')
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(written).toBe(code.textContent);
  });
});
