import { Component, OnInit, PendingTasks, inject, signal } from '@angular/core';
import { SOURCE_FETCH } from './source-view';

/**
 * The commit the site is built from. The Pages workflow defines it, with `--define`, to its
 * `GITHUB_SHA`. No other build defines it, and there `typeof` reads it as undefined.
 */
declare const NG_EVAL_COMMIT: string | undefined;

const REPOSITORY = 'https://github.com/Zvenigora/ng-eval';

/** The libraries whose manifests the build copies to `packages/<folder>/package.json`. */
const FOLDERS = ['eval-core', 'eval-signals', 'eval-forms'];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The footer: the commit the site is built from, and each package's name and version, read from
 * its manifest, which the build copied. A relative import of a manifest is refused by the lint
 * boundary, and a path alias for it turns the libraries' export-list cases red.
 */
@Component({
  selector: 'demo-footer',
  template: `
    <footer>
      <p class="commit">
        @if (commit; as sha) {
          Built from commit <a [href]="repository + '/commit/' + sha">{{ sha.slice(0, 7) }}</a>.
        } @else {
          A local build: no commit recorded.
        }
      </p>
      @if (error(); as message) {
        <p class="error">{{ message }}</p>
      } @else {
        <p class="packages">
          @for (pkg of packages(); track pkg) {
            <span>{{ pkg }}</span>
          }
        </p>
      }
      <p>
        <a [href]="repository">Repository</a>
        <a [href]="repository + '/blob/master/SECURITY.md'">Security policy</a>
      </p>
    </footer>
  `,
})
export class Footer implements OnInit {
  readonly repository = REPOSITORY;
  readonly commit = typeof NG_EVAL_COMMIT === 'undefined' ? null : NG_EVAL_COMMIT;

  /** Each package as its manifest's name and version. */
  readonly packages = signal<readonly string[]>([]);
  readonly error = signal<string | null>(null);

  private readonly fetchFile = inject(SOURCE_FETCH);
  private readonly pendingTasks = inject(PendingTasks);

  ngOnInit(): void {
    const done = this.pendingTasks.add();
    Promise.all(FOLDERS.map((folder) => this.read(`packages/${folder}/package.json`)))
      .then(
        (packages) => this.packages.set(packages),
        (error: unknown) => this.error.set(messageOf(error))
      )
      .finally(done);
  }

  private async read(url: string): Promise<string> {
    const response = await this.fetchFile(url);
    if (!response.ok) {
      throw new Error(`${url}: ${response.status} ${response.statusText}`);
    }
    const manifest = JSON.parse(await response.text()) as { name: string; version: string };
    return `${manifest.name} ${manifest.version}`;
  }
}
