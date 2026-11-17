import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/routes';

bootstrapApplication(App, {
  providers: [provideRouter(routes, withHashLocation())],
}).catch((error) => console.error(error));
