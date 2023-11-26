import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import * as acorn from "acorn";

export function ngEval(): string {
  console.log(acorn.parse("1 + 1", {ecmaVersion: 2020}));
  return 'eval';
}

@Component({
  selector: 'zvenigora-eval-core',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eval-core.component.html',
  styleUrl: './eval-core.component.scss',
})
export class EvalCoreComponent {

  constructor() {
    console.log(acorn.parse("1 + 1", {ecmaVersion: 2020}));
  }
}
