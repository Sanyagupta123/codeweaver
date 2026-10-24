import { WeaveError } from './errors'
import { KEYWORDS, TokenType, type Token, type TokenTypeValue } from './token'

export class Lexer {
  private source: string
  private index = 0
  private line = 1
  private column = 1

  constructor(source: string) {
    this.source = source
  }

  scan(): Token[] {
    const tokens: Token[] = []

    while (!this.isAtEnd()) {
      const startLine = this.line
      const startColumn = this.column
      const ch = this.advance()

      if (/\s/.test(ch)) {
        continue
      }

      if (ch === '/' && this.peek() === '/') {
        this.advance()
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance()
        }
        continue
      }

      if (ch === '"') {
        tokens.push(this.readString(startLine, startColumn))
        continue
      }

      if (/\d/.test(ch)) {
        tokens.push(this.readNumber(ch, startLine, startColumn))
        continue
      }

      if (/[A-Za-z_]/.test(ch)) {
        tokens.push(this.readIdentifier(ch, startLine, startColumn))
        continue
      }

      const token = this.readOperatorOrPunctuation(ch, startLine, startColumn)
      tokens.push(token)
    }

    tokens.push({
      type: TokenType.EOF,
      lexeme: '',
      literal: null,
      line: this.line,
      column: this.column,
    })

    return tokens
  }

  private readString(startLine: number, startColumn: number): Token {
    let value = ''

    while (!this.isAtEnd()) {
      const ch = this.advance()
      if (ch === '"') {
        return {
          type: TokenType.STRING,
          lexeme: `"${value}"`,
          literal: value,
          line: startLine,
          column: startColumn,
        }
      }

      if (ch === '\\') {
        if (this.isAtEnd()) {
          throw new WeaveError('lex', 'Unterminated string literal.', startLine, startColumn)
        }

        const escaped = this.advance()
        switch (escaped) {
          case 'n':
            value += '\n'
            break
          case 't':
            value += '\t'
            break
          case 'r':
            value += '\r'
            break
          case '"':
            value += '"'
            break
          case '\\':
            value += '\\'
            break
          default:
            value += escaped
        }
        continue
      }

      if (ch === '\n') {
        throw new WeaveError('lex', 'Unterminated string literal.', startLine, startColumn)
      }

      value += ch
    }

    throw new WeaveError('lex', 'Unterminated string literal.', startLine, startColumn)
  }

  private readNumber(firstChar: string, startLine: number, startColumn: number): Token {
    let numberText = firstChar

    while (!this.isAtEnd() && /\d/.test(this.peek())) {
      numberText += this.advance()
    }

    if (!this.isAtEnd() && this.peek() === '.' && /\d/.test(this.peekNext())) {
      numberText += this.advance()
      while (!this.isAtEnd() && /\d/.test(this.peek())) {
        numberText += this.advance()
      }
    }

    const numericValue = Number(numberText)

    return {
      type: TokenType.NUMBER,
      lexeme: numberText,
      literal: numericValue,
      line: startLine,
      column: startColumn,
    }
  }

  private readIdentifier(firstChar: string, startLine: number, startColumn: number): Token {
    let identifier = firstChar

    while (!this.isAtEnd() && /[A-Za-z0-9_]/.test(this.peek())) {
      identifier += this.advance()
    }

    const keywordType = KEYWORDS[identifier]
    const type = keywordType ?? TokenType.IDENTIFIER

    return {
      type,
      lexeme: identifier,
      literal: identifier,
      line: startLine,
      column: startColumn,
    }
  }

  private readOperatorOrPunctuation(
    ch: string,
    startLine: number,
    startColumn: number,
  ): Token {
    const twoChar = ch + this.peek()

    switch (twoChar) {
      case '==':
        this.advance()
        return this.makeToken(TokenType.EQUAL, twoChar, startLine, startColumn)
      case '!=':
        this.advance()
        return this.makeToken(TokenType.NOT_EQUAL, twoChar, startLine, startColumn)
      case '<=':
        this.advance()
        return this.makeToken(TokenType.LTE, twoChar, startLine, startColumn)
      case '>=':
        this.advance()
        return this.makeToken(TokenType.GTE, twoChar, startLine, startColumn)
      default:
        break
    }

    switch (ch) {
      case '+':
        return this.makeToken(TokenType.PLUS, ch, startLine, startColumn)
      case '-':
        return this.makeToken(TokenType.MINUS, ch, startLine, startColumn)
      case '*':
        return this.makeToken(TokenType.STAR, ch, startLine, startColumn)
      case '/':
        return this.makeToken(TokenType.SLASH, ch, startLine, startColumn)
      case '=':
        return this.makeToken(TokenType.ASSIGN, ch, startLine, startColumn)
      case '!':
        return this.makeToken(TokenType.NOT, ch, startLine, startColumn)
      case '<':
        return this.makeToken(TokenType.LT, ch, startLine, startColumn)
      case '>':
        return this.makeToken(TokenType.GT, ch, startLine, startColumn)
      case '(':
        return this.makeToken(TokenType.LPAREN, ch, startLine, startColumn)
      case ')':
        return this.makeToken(TokenType.RPAREN, ch, startLine, startColumn)
      case '{':
        return this.makeToken(TokenType.LBRACE, ch, startLine, startColumn)
      case '}':
        return this.makeToken(TokenType.RBRACE, ch, startLine, startColumn)
      case ';':
        return this.makeToken(TokenType.SEMICOLON, ch, startLine, startColumn)
      case ',':
        return this.makeToken(TokenType.COMMA, ch, startLine, startColumn)
      default:
        throw new WeaveError('lex', `Unexpected character '${ch}'.`, startLine, startColumn)
    }
  }

  private makeToken(
    type: TokenTypeValue,
    lexeme: string,
    startLine: number,
    startColumn: number,
  ): Token {
    return {
      type,
      lexeme,
      literal: lexeme,
      line: startLine,
      column: startColumn,
    }
  }

  private advance(): string {
    const ch = this.source[this.index]
    this.index += 1
    if (ch === '\n') {
      this.line += 1
      this.column = 1
    } else {
      this.column += 1
    }
    return ch
  }

  private peek(): string {
    return this.source[this.index] ?? ''
  }

  private peekNext(): string {
    return this.source[this.index + 1] ?? ''
  }

  private isAtEnd(): boolean {
    return this.index >= this.source.length
  }
}

export function tokenize(source: string): Token[] {
  return new Lexer(source).scan()
}
