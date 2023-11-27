import { Injectable } from '@angular/core';
import { BaseEval } from './base-eval';
import { ParserService } from './parser.service';
import { EvalService } from './eval.service';

@Injectable({
  providedIn: 'root'
})
export class CompilerService extends BaseEval {

  constructor(
    public parserService: ParserService,
    public evalService: EvalService
  ) {
    super();
  }

}
