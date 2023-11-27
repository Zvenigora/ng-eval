import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';

@Injectable({
  providedIn: 'root'
})
export class EvalService extends BaseEval {

  constructor(
    public parserService: ParserService
  ) {
    super();
  }
}
