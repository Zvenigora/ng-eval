import { Component, inject } from '@angular/core';
import { CompilerService, EvalService } from '@zvenigora/ng-eval-core';
import { DATA, EXPRESSION } from '../../example-tokens';

@Component({
  selector: 'demo-evaluate',
  template: `
    <dl>
      <dt>simpleEval</dt>
      <dd><output class="evaluated">{{ evaluated }}</output></dd>
      <dt>compile, then simpleCall</dt>
      <dd><output class="called">{{ called }}</output></dd>
    </dl>
  `,
})
export class EvaluateExample {
  private readonly evalService = inject(EvalService);
  private readonly service = inject(CompilerService);

  private readonly expression = inject(EXPRESSION);
  private readonly context = inject(DATA) as Record<string, unknown>;

  readonly evaluated = this.evalService.simpleEval(this.expression, this.context);

  private readonly fn = this.service.compile(this.expression);
  private readonly options = { caseInsensitive: false };
  readonly called = this.service.simpleCall(this.fn, this.context, this.options);
}
