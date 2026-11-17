import { Component, inject } from '@angular/core';
import { Block } from './block';
import { ENTRY, readmeUrl } from './registry';
import { SourceView } from './source-view';

/**
 * An example's page: its title, what it does, the README section it links, the block and the
 * source view.
 */
@Component({
  selector: 'demo-page',
  imports: [Block, SourceView],
  template: `
    <h1>{{ entry.title }}</h1>
    <p>{{ entry.summary }}</p>
    <p><a [href]="readme">{{ entry.readme.file }}</a></p>
    <demo-block [entry]="entry" />
    <demo-source-view [file]="entry.file" />
  `,
})
export class Page {
  readonly entry = inject(ENTRY);
  readonly readme = readmeUrl(this.entry);
}
