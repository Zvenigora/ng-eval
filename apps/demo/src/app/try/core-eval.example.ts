import { Component, inject } from '@angular/core';
import { EvalService } from '@zvenigora/ng-eval-core';
import { DATA, EXPRESSION } from '../example-tokens';

@Component({
  selector: 'demo-core-eval',
  template: `
    <dl>
      <dt>simpleEval</dt>
      <dd><output>{{ result }}</output></dd>
    </dl>
  `,
})
export class CoreEvalExample {
  private readonly service = inject(EvalService);

  private readonly expression = inject(EXPRESSION);
  private readonly context = inject(DATA) as Record<string, unknown>;

  readonly result = this.service.simpleEval(this.expression, this.context);
}
