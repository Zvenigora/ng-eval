import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { REGISTRY } from './registry';

@Component({
  selector: 'demo-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav>
      @for (entry of entries; track entry.path) {
        <a [routerLink]="['/', entry.path]">{{ entry.title }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class App {
  readonly entries = REGISTRY;
}
