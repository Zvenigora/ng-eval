import { Component, inject } from '@angular/core';
import { CompilerService } from '@zvenigora/ng-eval-core';
import { DATA, EXPRESSION } from '../example-tokens';

type Row = Record<string, unknown>;

@Component({
  selector: 'demo-row-filter',
  template: `
    <output>{{ matches.length }} of {{ rows.length }} rows</output>
    <table>
      <thead>
        <tr>
          @for (column of columns; track column) {
            <th>{{ column }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of matches; track $index) {
          <tr>
            @for (column of columns; track column) {
              <td>{{ row[column] }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class RowFilterExample {
  private readonly service = inject(CompilerService);

  private readonly expression = inject(EXPRESSION);
  readonly rows = inject(DATA) as Row[];

  readonly columns = Object.keys(this.rows[0] ?? {});

  /** Compiled once, then called once per row. */
  private readonly fn = this.service.compile(this.expression);
  readonly matches = this.rows.filter((row) => this.service.simpleCall(this.fn, row));
}
