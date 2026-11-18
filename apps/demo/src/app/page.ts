import { Component, inject } from '@angular/core';
import { Block } from './block';
import { ENTRY, readmeUrl } from './registry';
import { SourceView } from './source-view';

/** The summary's text, split at its backticks: the odd parts are code. */
function summaryParts(summary: string): string[] {
  return summary.split('`');
}

/**
 * An example's page: its title, what it does, the README section it links, the block and the
 * source view.
 */
@Component({
  selector: 'demo-page',
  imports: [Block, SourceView],
  template: `
    <h1>{{ entry.title }}</h1>
    <p class="summary">
      @for (part of summary; track $index) {
        @if ($odd) {
          <code>{{ part }}</code>
        } @else {
          {{ part }}
        }
      }
    </p>
    <p><a [href]="readme">{{ entry.readme.file }}</a></p>
    <demo-block [entry]="entry" />
    <demo-source-view [file]="entry.file" />
  `,
})
export class Page {
  readonly entry = inject(ENTRY);
  readonly readme = readmeUrl(this.entry);
  readonly summary = summaryParts(this.entry.summary);
}
