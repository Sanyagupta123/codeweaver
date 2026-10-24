export const TokenType = {
  LET: 'let',
  PRINT: 'print',
  IF: 'if',
  ELSE: 'else',
  WHILE: 'while',
  TRUE: 'true',
  FALSE: 'false',
  NULL: 'null',

  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',

  PLUS: '+',
  MINUS: '-',
  STAR: '*',
  SLASH: '/',
  ASSIGN: '=',
  EQUAL: '==',
  NOT_EQUAL: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>=',
  NOT: '!',

  LPAREN: '(',
  RPAREN: ')',
  LBRACE: '{',
  RBRACE: '}',
  SEMICOLON: ';',
  COMMA: ',',

  EOF: 'EOF',
} as const

export type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType]

export interface Token {
  type: TokenTypeValue
  lexeme: string
  literal: string | number | boolean | null
  line: number
  column: number
}

export const KEYWORDS: Record<string, TokenTypeValue> = {
  let: TokenType.LET,
  print: TokenType.PRINT,
  if: TokenType.IF,
  else: TokenType.ELSE,
  while: TokenType.WHILE,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  null: TokenType.NULL,
}
