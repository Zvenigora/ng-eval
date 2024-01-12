import { AnyNode } from 'acorn';
import { extract } from './extract';

const testNode: AnyNode = {
  "type": "Program",
  "start": 0,
  "end": 5,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 5,
      "expression": {
        "type": "BinaryExpression",
        "start": 0,
        "end": 5,
        "left": {
          "type": "Identifier",
          "start": 0,
          "end": 1,
          "name": "a"
        },
        "operator": "+",
        "right": {
          "type": "BinaryExpression",
          "start": 2,
          "end": 5,
          "left": {
            "type": "Identifier",
            "start": 2,
            "end": 3,
            "name": "b"
          },
          "operator": "*",
          "right": {
            "type": "Identifier",
            "start": 4,
            "end": 5,
            "name": "x"
          }
        }
      }
    }
  ],
  "sourceType": "module"
};

describe('extract', () => {
  it('should return an array of nodes when a matching node is found', () => {
    // Arrange
    const node: AnyNode = {
      type: 'Program',
      body: [

        { type: 'ExpressionStatement', expression: { type: 'Literal', value: 1, start: 0, end: 1 }, start: 0, end: 1 },
        { type: 'ExpressionStatement', expression: { type: 'Literal', value: 2, start: 0, end: 1 }, start: 0, end: 1 },
        { type: 'ExpressionStatement', expression: { type: 'Literal', value: 3, start: 0, end: 1 }, start: 0, end: 1 },
      ],
      start: 0, end: 1, sourceType: 'module'
    };
    const searchType = 'ExpressionStatement';

    // Act
    const result = extract(node, searchType);

    // Assert
    expect(result).toEqual([
      { type: 'ExpressionStatement', expression: { type: 'Literal', value: 1, start: 0, end: 1 }, start: 0, end: 1 },
      { type: 'ExpressionStatement', expression: { type: 'Literal', value: 2, start: 0, end: 1 }, start: 0, end: 1 },
      { type: 'ExpressionStatement', expression: { type: 'Literal', value: 3, start: 0, end: 1 }, start: 0, end: 1 },
    ]);
  });

  it('should return an array of nodes when a matching node is found', () => {
    const searchType = 'Identifier';
    const result = extract(testNode, searchType);
    expect(result).toEqual([
      {type: 'Identifier', start: 0, end: 1, name: 'a'},
      {type: 'Identifier', start: 2, end: 3, name: 'b'},
      {type: 'Identifier', start: 4, end: 5, name: 'x'}
    ]);
  });

  it('should return undefined when the input node is undefined', () => {
    // Arrange
    const node = undefined;
    const searchType = 'ExpressionStatement';

    // Act
    const result = extract(node, searchType);

    // Assert
    expect(result).toBeUndefined();
  });
});
