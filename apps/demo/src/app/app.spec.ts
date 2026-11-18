import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { REGISTRY } from './registry';
import { routes } from './routes';

// No navigation here: a page's source view would call `fetch`. A link array, `['/', path]`,
// encodes the slashes inside `path`, so a nested page's link went to `/features%2Fcore%2Fhooks`,
// and the '**' route sent it to `try`.
describe('the navigation', () => {
  it('links each entry at "/" + its path, in registry order, under the two sections and the four library groups', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
      (a) => a.getAttribute('href')
    );
    expect(links).toEqual(REGISTRY.map((entry) => '/' + entry.path));

    const texts = (selector: string) => Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(selector),
      (heading) => heading.textContent
    );
    expect(texts('nav h2')).toEqual(['Features', 'Use cases']);
    expect(texts('nav h3')).toEqual(['core', 'signals', 'forms, /reactive', 'forms, /signals']);
  });
});
