import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';

describe('EvalService - Binary Expression Edge Cases', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  describe('String concatenation edge cases', () => {
    it.each([
      ['5 + "3"', '53'],
      ['"5" + 3', '53'],
      ['true + "test"', 'truetest'],
      ['null + "null"', 'nullnull'],
      ['undefined + "undefined"', 'undefinedundefined'],
    ])('should handle %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression);
      expect(result).toBe(expected);
    });
  });

  describe('Numeric coercion edge cases', () => {
    it.each([
      ['"5" - 3', 2],
      ['"5" * 3', 15],
      ['"5" / 2', 2.5],
      ['true - false', 1],
      ['null + 5', 5],
    ])('should handle %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression);
      expect(result).toBe(expected);
    });

    it('should handle undefined + 5 => NaN', () => {
      const result = service.simpleEval('undefined + 5');
      expect(Number.isNaN(result)).toBe(true);
    });
  });

  describe('Comparison edge cases', () => {
    it.each([
      ['"5" == 5', true],
      ['"5" === 5', false],
      ['true == 1', true],
      ['true === 1', false],
      ['null == undefined', true],
      ['null === undefined', false],
      ['"10" > "9"', false], // String comparison
      ['10 > "9"', true], // Numeric comparison
    ])('should handle %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression);
      expect(result).toBe(expected);
    });
  });

  describe('Logical operators', () => {
    it.each([
      ['true && "test"', 'test'],
      ['false && "test"', false],
      ['true || "test"', true],
      ['false || "test"', 'test'],
      ['"" && "test"', ''],
      ['0 || "default"', 'default'],
    ])('should handle %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression);
      expect(result).toBe(expected);
    });
  });

  describe('Nullish coalescing', () => {
    it.each([
      ['null ?? "default"', 'default'],
      ['undefined ?? "default"', 'default'],
      ['0 ?? "default"', 0],
      ['"" ?? "default"', ''],
    ])('should handle %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression);
      expect(result).toBe(expected);
    });
  });

  describe('Bitwise operations with edge cases', () => {
    it.each([
      ['3.7 | 0', 3], // Should truncate
      ['-3.7 | 0', -3],
      ['true & 1', 1],
      ['false & 1', 0],
    ])('should handle %s => %p', (expression: string, expected: unknown) => {
      const result = service.simpleEval(expression);
      expect(result).toBe(expected);
    });
  });
});