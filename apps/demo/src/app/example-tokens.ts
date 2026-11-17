import { InjectionToken } from '@angular/core';

/** The expression the visitor typed. The page recreates the example when it changes. */
export const EXPRESSION = new InjectionToken<string>('EXPRESSION');

/** The schema or data the visitor typed, parsed from JSON. */
export const DATA = new InjectionToken<unknown>('DATA');
