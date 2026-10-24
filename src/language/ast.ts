export type Value = number | string | boolean | null

export interface SourcePosition {
  line: number
  column: number
}

export type Expression =
  | LiteralExpression
  | VariableExpression
  | UnaryExpression
  | BinaryExpression
  | AssignmentExpression

export type Statement =
  | LetStatement
  | ExpressionStatement
  | PrintStatement
  | BlockStatement
  | IfStatement
  | WhileStatement

export interface BaseNode {
  kind: string
  position: SourcePosition
}

export interface LiteralExpression extends BaseNode {
  kind: 'Literal'
  value: Value
}

export interface VariableExpression extends BaseNode {
  kind: 'Variable'
  name: string
}

export interface UnaryExpression extends BaseNode {
  kind: 'Unary'
  operator: string
  right: Expression
}

export interface BinaryExpression extends BaseNode {
  kind: 'Binary'
  left: Expression
  operator: string
  right: Expression
}

export interface AssignmentExpression extends BaseNode {
  kind: 'Assignment'
  name: string
  value: Expression
}

export interface LetStatement extends BaseNode {
  kind: 'LetStatement'
  name: string
  initializer: Expression
}

export interface ExpressionStatement extends BaseNode {
  kind: 'ExpressionStatement'
  expression: Expression
}

export interface PrintStatement extends BaseNode {
  kind: 'PrintStatement'
  expression: Expression
}

export interface BlockStatement extends BaseNode {
  kind: 'BlockStatement'
  statements: Statement[]
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement'
  condition: Expression
  thenBranch: Statement
  elseBranch?: Statement
}

export interface WhileStatement extends BaseNode {
  kind: 'WhileStatement'
  condition: Expression
  body: Statement
}
