import { Component, inject } from '@angular/core';
import { EvalService } from '@zvenigora/ng-eval-core';
import { DATA, EXPRESSION } from '../../example-tokens';

@Component({
  selector: 'demo-hooks',
  template: `
    <output>{{ result }}</output>
    <ul class="reads">
      @for (read of reads; track $index) {
        <li>{{ read }}</li>
      }
    </ul>
    <ul class="trace">
      @for (line of trace; track $index) {
        <li>{{ line }}</li>
      }
    </ul>
  `,
})
export class HooksExample {
  private readonly service = inject(EvalService);

  private readonly expression = inject(EXPRESSION);
  private readonly context = inject(DATA) as Record<string, unknown>;

  readonly reads: string[] = [];
  readonly result: unknown;
  readonly trace: string[];

  constructor() {
    const state = this.service.createState(this.context);

    state.hooks.onRead((event) => {
      this.reads.push(event.path ?? String(event.key));
    });

    this.result = this.service.eval(this.expression, state);
    this.trace = state.result.trace.map((item) => `${item.expression} = ${item.value}`);
  }
}
