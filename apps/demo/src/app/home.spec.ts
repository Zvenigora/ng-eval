import { TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('the home page, zoneless', () => {
  it('signals: shows the value, and the new value after a click', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#signals output').textContent).toBe('30');

    fixture.nativeElement.querySelector('#signals button').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#signals output').textContent).toBe('40');
  });
});
