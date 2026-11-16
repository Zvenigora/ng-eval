import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'demo-root',
  imports: [RouterOutlet, RouterLink],
  template: `<a routerLink="/">home</a> <router-outlet />`,
})
export class App {}
