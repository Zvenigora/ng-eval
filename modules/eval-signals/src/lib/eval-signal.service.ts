import { Injectable, Injector, inject } from '@angular/core';
import { EvalContext } from '@zvenigora/ng-eval-core';
import { EvalSignal, EvalSignalOptions, createEvalSignal } from './eval-signal';
import { SignalContextSource } from './signal-context';

/**
 * The DI-first entry point to {@link createEvalSignal}.
 *
 * `create` forwards its arguments unchanged, and every behaviour documented on
 * the factory holds here - with **one exception, and it is the reason to read
 * this paragraph**: a signal created through this service takes no
 * `DestroyRef` registration and must be destroyed by hand.
 *
 * ```ts
 * export class PriceComponent implements OnDestroy {
 *   private readonly signals = inject(EvalSignalService);
 *   readonly total = this.signals.create('price * quantity', {
 *     price: this.price,
 *     quantity: this.quantity,
 *   });
 *
 *   ngOnDestroy(): void {
 *     this.total.destroy();
 *   }
 * }
 * ```
 *
 * The `ngOnDestroy` above is not decoration. `create` always supplies an
 * `injector` - that is its whole job - and {@link EvalSignal.destroy} takes
 * its lifetime from the *ambient* injection context rather than from a
 * supplied injector, because the injector a service has to hand is a
 * long-lived one and a teardown callback registered there is retained for its
 * whole life, once per signal ever created. So the same expression written as
 * a free `createEvalSignal` in a field initializer tears itself down and this
 * one does not.
 *
 * **Why the service exists.** `createEvalSignal` calls `inject(CompilerService)`
 * unless handed an `injector`, so calling it outside an injection context -
 * from a lifecycle hook, a subscription callback, a plain method - throws
 * `NG0203`. Holding this service is the ordinary Angular answer: it captures an
 * `Injector` once at construction and supplies it on every `create`.
 *
 * It injects **nothing from `eval-core`**. The factory resolves
 * `CompilerService` off the injector it is given, so a second injection here
 * would be a field nothing reads; and `EvalService` is deliberately not
 * consumed anywhere in this library - the one thing it was wanted for,
 * `createState` with `ngOnDestroy` cleanup, tracks every state it builds in a
 * strong `Set` drained only on destroy, which is an asset for one long-lived
 * state and an accumulator for the one-per-recompute states this library
 * builds.
 */
@Injectable({
  providedIn: 'root'
})
export class EvalSignalService {

  private readonly injector = inject(Injector);

  /**
   * Creates a `Signal` that evaluates `expression` over `source`.
   *
   * See {@link createEvalSignal} for the full contract. This method adds the
   * injector - and because it always adds one, the signal it returns has **no
   * auto-teardown**: see {@link EvalSignal.destroy} and this class's own
   * example. That is the one place the DI-first style and the free function
   * differ in behaviour rather than in ergonomics.
   *
   * @param expression - A JavaScript expression.
   * @param source - A record whose values may be signals, or a pre-built
   *                 `EvalContext` the caller owns.
   * @param options - See `EvalSignalOptions`. A supplied `injector` wins over
   *                  this service's own: a caller who names one has a reason,
   *                  and the default exists to serve callers who have not.
   * @returns A `Signal` carrying the expression's value.
   */
  public create(
    expression: string,
    source: SignalContextSource | EvalContext,
    options?: EvalSignalOptions
  ): EvalSignal<unknown> {

    return createEvalSignal(expression, source, {
      ...options,
      injector: options?.injector ?? this.injector,
    });
  }

}
