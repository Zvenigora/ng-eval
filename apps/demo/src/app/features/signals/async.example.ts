import { Component, computed, inject, signal } from '@angular/core';
import { createEvalSignalAsync } from '@zvenigora/ng-eval-signals';
import { DATA, EXPRESSION } from '../../example-tokens';

interface User {
  id: number;
  name: string;
}

const users: Record<number, User> = {
  1: { id: 1, name: 'Ada' },
  2: { id: 2, name: 'Grace' },
};

function loadUser(id: number): Promise<User | undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(users[id]), 10));
}

@Component({
  selector: 'demo-async',
  template: `
    <dl>
      <dt>user.status()</dt>
      <dd><output class="status">{{ user.status() }}</output></dd>
      <dt>user().name</dt>
      <dd><output class="name">{{ name() }}</output></dd>
    </dl>
  `,
})
export class AsyncExample {
  private readonly expression = inject(EXPRESSION);
  private readonly data = inject(DATA) as { id: number };

  readonly id = signal(this.data.id);
  readonly user = createEvalSignalAsync(this.expression, { id: this.id, loadUser });

  readonly name = computed(() => (this.user() as User | undefined)?.name);
}
