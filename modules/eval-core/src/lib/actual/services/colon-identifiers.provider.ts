import { EnvironmentProviders, InjectionToken, inject,
  makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { ParserService } from './parser.service';

/**
 * Set by {@link provideColonIdentifiers}, and by nothing else. Exported from no
 * barrel: the provider is the only way to set it, and
 * `inject(ParserService).parserOptions` the published way to read the
 * effective value (`docs/colon-identifiers/phase-9-plan.md` § 3.3).
 */
export const COLON_IDENTIFIERS = new InjectionToken<boolean>('COLON_IDENTIFIERS');

/** Angular's code for `inject()` called outside an injection context, NG0203. */
const MISSING_INJECTION_CONTEXT = -203;

/**
 * Whether the injector constructing a `ParserService` holds
 * {@link provideColonIdentifiers}. `false` outside an injection context:
 * `new ParserService()` constructed a working service before the provider
 * existed, and still does, with the option off. Any other error from the read
 * is rethrown (plan § 3.1).
 */
export const injectColonIdentifiers = (): boolean => {
  try {
    return inject(COLON_IDENTIFIERS, { optional: true }) === true;
  } catch (error) {
    if ((error as { code?: unknown } | null | undefined)?.code === MISSING_INJECTION_CONTEXT) {
      return false;
    }
    throw error;
  }
};

/**
 * Turns `colonIdentifiers` on for every parse through `ParserService`, and so
 * through `EvalService`, `CompilerService` and `DiscoveryService`: a
 * colon-joined name such as `Q1:1:3` parses as one identifier and reads the
 * context key of that spelling. A per-call `colonIdentifiers` overrides it.
 *
 * Belongs in the application's root providers. `ParserService` is provided in
 * the root, so in a child environment injector - a lazy route's `providers` -
 * it would reach no parse; there it throws when that injector is created.
 *
 * @returns The providers, for the application's root providers.
 */
export function provideColonIdentifiers(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: COLON_IDENTIFIERS, useValue: true },
    provideEnvironmentInitializer(() => {
      if (inject(ParserService).parserOptions?.colonIdentifiers !== true) {
        throw new Error('provideColonIdentifiers() reaches no parse here: ' +
          'ParserService is provided in the root, and the root ParserService ' +
          'does not have colonIdentifiers on. Put provideColonIdentifiers() in ' +
          'the application\'s root providers, not a lazy route\'s or another ' +
          'child injector\'s.');
      }
    }),
  ]);
}
