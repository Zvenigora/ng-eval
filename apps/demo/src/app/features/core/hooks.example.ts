import { Component, inject } from '@angular/core';
import { EvalService } from '@zvenigora/ng-eval-core';
import { DATA, EXPRESSION } from '../../example-tokens';

@Component({
  selector: 'demo-hooks',
  template: `
    <dl>
      <dt>eval</dt>
      <dd><output>{{ result }}</output></dd>
      <dt>onRead</dt>
      <dd>
        <ul class="reads">
          @for (read of reads; track $index) {
            <li>{{ read }}</li>
          }
        </ul>
      </dd>
      <dt>state.result.trace</dt>
      <dd>
        <ul class="trace">
          @for (line of trace; track $index) {
            <li>{{ line }}</li>
          }
        </ul>
      </dd>
    </dl>
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
    this.trace = state.result.trace.map((item) => `${item.type}: ${item.expression} = ${item.value}`);
  }
}
