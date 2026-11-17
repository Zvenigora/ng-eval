import { Component, inject } from '@angular/core';
import { EvalContext, EvalScope, EvalScopeOptions, EvalService } from '@zvenigora/ng-eval-core';
import { DATA, EXPRESSION } from '../../example-tokens';

const cat = {
  name: 'Miss Kitty',
  num: 3,
  action: function (args: string[], n: number, t: string) {
    return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;
  },
};

@Component({
  selector: 'demo-scopes',
  template: `<output>{{ result }}</output>`,
})
export class ScopesExample {
  private readonly service = inject(EvalService);

  private readonly expression = inject(EXPRESSION);
  private readonly context = inject(DATA) as Record<string, unknown>;

  readonly result: unknown;

  constructor() {
    const options = { caseInsensitive: true };
    const evalContext = EvalContext.fromContext(this.context, options);

    const catOptions: EvalScopeOptions = {
      global: false,
      caseInsensitive: true,
      namespace: 'cat',
      thisArg: { name: 'Mister Whiskers' },
    };
    evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

    this.result = this.service.simpleEval(this.expression, evalContext, options);
  }
}
