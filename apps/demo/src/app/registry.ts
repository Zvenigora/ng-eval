import { InjectionToken, Type } from '@angular/core';

/** One example: its page, its file, the values its boxes start from, and its README section. */
export interface RegistryEntry {
  /** The route's path. */
  readonly path: string;
  /** The page's title, and its link in the navigation. */
  readonly title: string;
  /** The example's file, as a path under `src/app`; the build copies it to `source/`. */
  readonly file: string;
  /** The example's component, by a dynamic import, so that each example is its own chunk. */
  readonly load: () => Promise<Type<unknown>>;
  /** The expression box's first value. */
  readonly expression: string;
  /** The data box's first value, as JSON text. */
  readonly data: string;
  /** The README section the page links, as a path from the repository's root and a heading slug. */
  readonly readme: { readonly file: string; readonly anchor: string };
}

export const REGISTRY: readonly RegistryEntry[] = [
  {
    path: 'try',
    title: 'Try an expression',
    file: 'try/core-eval.example.ts',
    load: () => import('./try/core-eval.example').then((m) => m.CoreEvalExample),
    expression: '2 + 3 * a',
    data: '{ "a": 10 }',
    readme: { file: 'modules/eval-core/README.md', anchor: 'evaluation--evalservice' },
  },
];

/** The entry a page shows, provided by its route. */
export const ENTRY = new InjectionToken<RegistryEntry>('ENTRY');

/** The entry's README section on GitHub. */
export function readmeUrl(entry: RegistryEntry): string {
  return `https://github.com/Zvenigora/ng-eval/blob/master/${entry.readme.file}#${entry.readme.anchor}`;
}
