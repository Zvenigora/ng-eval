import { TestBed } from '@angular/core/testing';

import { BaseEvalService } from './base-eval.service';

describe('BaseEvalService', () => {
  let service: BaseEvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseEvalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
