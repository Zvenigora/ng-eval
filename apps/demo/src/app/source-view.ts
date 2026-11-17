import { Component, InjectionToken, OnInit, PendingTasks, computed, inject, input, signal } from '@angular/core';
import { highlightTypeScript } from './highlight';

/** What the source view reads of a response. */
export type SourceResponse = Pick<Response, 'ok' | 'status' | 'statusText' | 'text'>;

/** How the source view fetches a file. The default is the browser's `fetch`; a spec provides its own. */
export const SOURCE_FETCH = new InjectionToken<(url: string) => Promise<SourceResponse>>('SOURCE_FETCH', {
  providedIn: 'root',
  factory: () => (url: string) => fetch(url),
});

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The example's file, fetched from `source/`, where the build copied it, with a copy button. */
@Component({
  selector: 'demo-source-view',
  template: `
    @if (error(); as message) {
      <p class="error">{{ message }}</p>
    } @else {
      <button type="button" (click)="copy()">Copy</button>
      @if (copied()) {
        <span>Copied</span>
      }
      <pre><code [innerHTML]="highlighted()"></code></pre>
    }
  `,
})
export class SourceView implements OnInit {
  readonly file = input.required<string>();

  readonly text = signal('');
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);
  readonly highlighted = computed(() => highlightTypeScript(this.text()));

  private readonly fetchSource = inject(SOURCE_FETCH);
  private readonly pendingTasks = inject(PendingTasks);

  ngOnInit(): void {
    const url = `source/${this.file()}`;
    const done = this.pendingTasks.add();
    this.fetchSource(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${url}: ${response.status} ${response.statusText}`);
        }
        // A Windows checkout serves the file with CRLF, which the HTML parser turns into LF in
        // the code element: keep LF, so that the text copied is the text shown.
        this.text.set((await response.text()).replace(/\r\n?/g, '\n'));
      })
      .catch((error: unknown) => this.error.set(messageOf(error)))
      .finally(done);
  }

  copy(): void {
    navigator.clipboard.writeText(this.text()).then(
      () => this.copied.set(true),
      (error: unknown) => this.error.set(messageOf(error))
    );
  }
}
