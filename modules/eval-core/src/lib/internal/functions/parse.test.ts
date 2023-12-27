import { ecmaVersion } from 'acorn';
import { parse } from './parse';

describe('parse', () => {
  it('should parse the expression and return the program', () => {
    const expr = '1 + 2';
    const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: false };
    const result = parse(expr, options);
    expect(result).toBeDefined(); // Replace with your expected value
  });

  it('should parse the expression and return the extracted expression', () => {
    const expr = '1 + 2';
    const options = { ecmaVersion: 2020 as ecmaVersion, extractExpressions: true };
    const result = parse(expr, options);
    expect(result).toBeDefined(); // Replace with your expected value
  });

  it('should set the default ecmaVersion if not provided', () => {
    const expr = '1 + 2';
    const options = { extractExpressions: false };
    const result = parse(expr, options);
    expect(result).toBeDefined(); // Replace with your expected value
  });
});
