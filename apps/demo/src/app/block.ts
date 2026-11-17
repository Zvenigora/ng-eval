import {
  Component,
  Injector,
  OnInit,
  PendingTasks,
  Type,
  ViewContainerRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DATA, EXPRESSION } from './example-tokens';
import { RegistryEntry } from './registry';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The live-example block: the boxes, and the example created from what they hold. The example
 * reads the values by `inject()` when it is constructed, so an edit creates it again.
 *
 * It is created by `ViewContainerRef.createComponent`, from the boxes' `(input)` handler and once
 * after the example's chunk has loaded. Not by an `effect()`, which would track the signals the
 * example reads while it is constructed, and not by `NgComponentOutlet`, whose creation errors go
 * to the `ErrorHandler`, where the block cannot catch them.
 */
@Component({
  selector: 'demo-block',
  template: `
    <label>
      Expression
      <textarea #expressionBox [value]="expression()" (input)="setExpression(expressionBox.value)"></textarea>
    </label>
    <label>
      Data, as JSON
      <textarea #dataBox [value]="data()" (input)="setData(dataBox.value)"></textarea>
    </label>
    <div class="example">
      <ng-container #host />
      @if (error(); as message) {
        <p class="error">{{ message }}</p>
      }
    </div>
  `,
})
export class Block implements OnInit {
  readonly entry = input.required<RegistryEntry>();

  readonly expression = signal('');
  readonly data = signal('');
  readonly error = signal<string | null>(null);

  private readonly host = viewChild.required('host', { read: ViewContainerRef });
  private readonly injector = inject(Injector);
  private readonly pendingTasks = inject(PendingTasks);
  private type: Type<unknown> | undefined;

  ngOnInit(): void {
    const entry = this.entry();
    this.expression.set(entry.expression);
    this.data.set(entry.data);

    const done = this.pendingTasks.add();
    entry
      .load()
      .then(
        (type) => {
          this.type = type;
          this.create();
        },
        (error: unknown) => this.error.set(messageOf(error))
      )
      .finally(done);
  }

  setExpression(value: string): void {
    this.expression.set(value);
    this.create();
  }

  setData(value: string): void {
    this.data.set(value);
    this.create();
  }

  private create(): void {
    const type = this.type;
    if (!type) {
      return;
    }
    const host = this.host();
    host.clear();
    try {
      const injector = Injector.create({
        providers: [
          { provide: EXPRESSION, useValue: this.expression() },
          { provide: DATA, useValue: JSON.parse(this.data()) },
        ],
        parent: this.injector,
      });
      const ref = host.createComponent(type, { injector });
      ref.changeDetectorRef.detectChanges();
      this.error.set(null);
    } catch (error) {
      host.clear();
      this.error.set(messageOf(error));
    }
  }
}
