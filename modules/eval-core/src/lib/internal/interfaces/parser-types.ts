import {
  Identifier,
  Literal,
  Program,
  Function,
  ExpressionStatement,
  BlockStatement,
  EmptyStatement,
  DebuggerStatement,
  WithStatement,
  ReturnStatement,
  LabeledStatement,
  BreakStatement,
  ContinueStatement,
  IfStatement,
  SwitchStatement,
  SwitchCase,
  ThrowStatement,
  TryStatement,
  CatchClause,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  ForInStatement,
  FunctionDeclaration,
  VariableDeclaration,
  VariableDeclarator,
  ThisExpression,
  ArrayExpression,
  ObjectExpression,
  Property,
  FunctionExpression,
  UnaryExpression,
  UpdateExpression,
  BinaryExpression,
  AssignmentExpression,
  LogicalExpression,
  MemberExpression,
  ConditionalExpression,
  CallExpression,
  NewExpression,
  SequenceExpression,
  ForOfStatement,
  SpreadElement,
  ArrowFunctionExpression,
  YieldExpression,
  TemplateLiteral,
  TaggedTemplateExpression,
  TemplateElement,
  AssignmentProperty,
  ObjectPattern,
  ArrayPattern,
  RestElement,
  AssignmentPattern,
  Class,
  ClassBody,
  MethodDefinition,
  ClassDeclaration,
  ClassExpression,
  MetaProperty,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ExportNamedDeclaration,
  ExportSpecifier,
  AnonymousFunctionDeclaration,
  AnonymousClassDeclaration,
  ExportDefaultDeclaration,
  ExportAllDeclaration,
  AwaitExpression,
  ChainExpression,
  ImportExpression,
  ParenthesizedExpression,
  PropertyDefinition,
  PrivateIdentifier,
  StaticBlock,
  Statement,
  Declaration,
  Expression,
  Pattern,
  ModuleDeclaration,
  AnyNode,
  Options,
  defaultOptions,
  version
} from 'acorn';


export {
  Identifier,
  Literal,
  Program,
  Function,
  ExpressionStatement,
  BlockStatement,
  EmptyStatement,
  DebuggerStatement,
  WithStatement,
  ReturnStatement,
  LabeledStatement,
  BreakStatement,
  ContinueStatement,
  IfStatement,
  SwitchStatement,
  SwitchCase,
  ThrowStatement,
  TryStatement,
  CatchClause,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  ForInStatement,
  FunctionDeclaration,
  VariableDeclaration,
  VariableDeclarator,
  ThisExpression,
  ArrayExpression,
  ObjectExpression,
  Property,
  FunctionExpression,
  UnaryExpression,
  UpdateExpression,
  BinaryExpression,
  AssignmentExpression,
  LogicalExpression,
  MemberExpression,
  ConditionalExpression,
  CallExpression,
  NewExpression,
  SequenceExpression,
  ForOfStatement,
  SpreadElement,
  ArrowFunctionExpression,
  YieldExpression,
  TemplateLiteral,
  TaggedTemplateExpression,
  TemplateElement,
  AssignmentProperty,
  ObjectPattern,
  ArrayPattern,
  RestElement,
  AssignmentPattern,
  Class,
  ClassBody,
  MethodDefinition,
  ClassDeclaration,
  ClassExpression,
  MetaProperty,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ExportNamedDeclaration,
  ExportSpecifier,
  AnonymousFunctionDeclaration,
  AnonymousClassDeclaration,
  ExportDefaultDeclaration,
  ExportAllDeclaration,
  AwaitExpression,
  ChainExpression,
  ImportExpression,
  ParenthesizedExpression,
  PropertyDefinition,
  PrivateIdentifier,
  StaticBlock,
  Statement,
  Declaration,
  Expression,
  Pattern,
  ModuleDeclaration,
  AnyNode,
  Options,
  defaultOptions,
  version
};


export type ParserOptions = Options & {
  extractExpressions?: boolean,
  cacheSize?: number,
};

export type ExpressionTypes = Expression['type'];

export const ExpressionTypes: ExpressionTypes[] = [
  'Identifier',
  'Literal',
  'ThisExpression',
  'ArrayExpression',
  'ObjectExpression',
  'FunctionExpression',
  'UnaryExpression',
  'UpdateExpression',
  'BinaryExpression',
  'AssignmentExpression',
  'LogicalExpression',
  'MemberExpression',
  'ConditionalExpression',
  'CallExpression',
  'NewExpression',
  'SequenceExpression',
  'ArrowFunctionExpression',
  'YieldExpression',
  'TemplateLiteral',
  'TaggedTemplateExpression',
  'ClassExpression',
  'MetaProperty',
  'AwaitExpression',
  'ChainExpression',
  'ImportExpression',
  'ParenthesizedExpression',
];
