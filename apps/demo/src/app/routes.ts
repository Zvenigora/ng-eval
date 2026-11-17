import { Routes } from '@angular/router';
import { Page } from './page';
import { ENTRY, REGISTRY } from './registry';

/** One route per registry entry, each a page that the entry is provided to. */
export const routes: Routes = [
  ...REGISTRY.map((entry) => ({
    path: entry.path,
    title: entry.title,
    component: Page,
    providers: [{ provide: ENTRY, useValue: entry }],
  })),
  { path: '', pathMatch: 'full', redirectTo: 'try' },
  { path: '**', redirectTo: 'try' },
];
