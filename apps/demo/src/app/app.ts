import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { REGISTRY, RegistryEntry } from './registry';

/** The features' group titles, by the folder of their paths: one group per library. */
const FEATURE_GROUPS: Readonly<Record<string, string>> = {
  'features/core': 'core',
  'features/signals': 'signals',
  'features/forms-reactive': 'forms, /reactive',
  'features/forms-signals': 'forms, /signals',
};

interface NavGroup {
  readonly title: string;
  readonly entries: readonly RegistryEntry[];
}

function folderOf(entry: RegistryEntry): string {
  return entry.path.slice(0, Math.max(entry.path.lastIndexOf('/'), 0));
}

/** The entries under `features/`, grouped by folder, in registry order. */
function featureGroups(): NavGroup[] {
  const groups = new Map<string, RegistryEntry[]>();
  for (const entry of REGISTRY.filter((e) => e.path.startsWith('features/'))) {
    const title = FEATURE_GROUPS[folderOf(entry)] ?? folderOf(entry);
    groups.set(title, [...(groups.get(title) ?? []), entry]);
  }
  return Array.from(groups, ([title, entries]) => ({ title, entries }));
}

@Component({
  selector: 'demo-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav>
      @for (entry of top; track entry.path) {
        <a [routerLink]="'/' + entry.path">{{ entry.title }}</a>
      }
      <h2>Features</h2>
      @for (group of features; track group.title) {
        <h3>{{ group.title }}</h3>
        @for (entry of group.entries; track entry.path) {
          <a [routerLink]="'/' + entry.path">{{ entry.title }}</a>
        }
      }
      <h2>Use cases</h2>
      @for (entry of useCases; track entry.path) {
        <a [routerLink]="'/' + entry.path">{{ entry.title }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class App {
  /** The entries outside any folder: the free-form page. */
  readonly top = REGISTRY.filter((entry) => folderOf(entry) === '');
  readonly features = featureGroups();
  readonly useCases = REGISTRY.filter((entry) => entry.path.startsWith('use-cases/'));
}
