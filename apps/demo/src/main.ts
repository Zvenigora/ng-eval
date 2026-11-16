import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { App } from './app/app';
import { Home } from './app/home';

bootstrapApplication(App, {
  providers: [provideRouter([{ path: '', component: Home }], withHashLocation())],
}).catch((error) => console.error(error));
