import { WeaveError } from './errors'
import type { AssignmentExpression, BinaryExpression, BlockStatement, Expression, IfStatement, LetStatement, LiteralExpression, PrintStatement, Statement, UnaryExpression, VariableExpression, WhileStatement } from './ast'
import { tokenize } from './lexer'
import { TokenType, type Token, type TokenTypeValue } from './token'
export class Parser {
  private current = 0
  private tokens: Token[]
  constructor(tokens: Token[]) { this.tokens = tokens }
  parseProgram(): Statement[] { const out: Statement[]=[]; while (!this.isAtEnd()) out.push(this.parseStatement()); return out }
  private parseStatement(): Statement {
    if (this.match(TokenType.LET)) return this.parseLetStatement()
    if (this.match(TokenType.PRINT)) return this.parsePrintStatement(this.previous())
    if (this.match(TokenType.IF)) return this.parseIfStatement(this.previous())
    if (this.match(TokenType.WHILE)) return this.parseWhileStatement(this.previous())
    if (this.check(TokenType.LBRACE)) return this.parseBlockStatement()
    return this.parseExpressionStatement()
  }
  private parseLetStatement(): LetStatement { const name=this.consume(TokenType.IDENTIFIER,"Expected variable name after 'let'."); this.consume(TokenType.ASSIGN,"Expected '=' in variable declaration."); const initializer=this.parseAssignment(); this.consume(TokenType.SEMICOLON,"Expected ';' after variable declaration."); return {kind:'LetStatement',position:this.pos(name),name:name.lexeme,initializer} }
  private parsePrintStatement(start: Token): PrintStatement { this.consume(TokenType.LPAREN,"Expected '(' after 'print'."); const expression=this.parseAssignment(); this.consume(TokenType.RPAREN,"Expected ')' after print argument."); this.consume(TokenType.SEMICOLON,"Expected ';' after print statement."); return {kind:'PrintStatement',position:this.pos(start),expression} }
  private parseIfStatement(start: Token): IfStatement { this.consume(TokenType.LPAREN,"Expected '(' after 'if'."); const condition=this.parseAssignment(); this.consume(TokenType.RPAREN,"Expected ')' after condition."); const thenBranch=this.parseStatement(); let elseBranch:Statement|undefined; if(this.match(TokenType.ELSE)) elseBranch=this.parseStatement(); return {kind:'IfStatement',position:this.pos(start),condition,thenBranch,elseBranch} }
  private parseWhileStatement(start: Token): WhileStatement { this.consume(TokenType.LPAREN,"Expected '(' after 'while'."); const condition=this.parseAssignment(); this.consume(TokenType.RPAREN,"Expected ')' after condition."); const body=this.parseStatement(); return {kind:'WhileStatement',position:this.pos(start),condition,body} }
  private parseExpressionStatement(): Statement { const expression=this.parseAssignment(); this.consume(TokenType.SEMICOLON,"Expected ';' after expression."); return {kind:'ExpressionStatement',position:expression.position,expression} }
  private parseBlockStatement(): BlockStatement { const start=this.consume(TokenType.LBRACE,"Expected '{'."); const statements:Statement[]=[]; while(!this.check(TokenType.RBRACE)&&!this.isAtEnd()) statements.push(this.parseStatement()); this.consume(TokenType.RBRACE,"Expected '}' after block."); return {kind:'BlockStatement',position:this.pos(start),statements} }
  private parseAssignment(): Expression { const expr=this.parseEquality(); if(this.match(TokenType.ASSIGN)){const value=this.parseAssignment(); if(expr.kind!=='Variable') throw this.error(this.previous(),'Invalid assignment target.'); const assignment:AssignmentExpression={kind:'Assignment',position:expr.position,name:expr.name,value}; return assignment} return expr }
  private parseEquality():Expression { let expr=this.parseComparison(); while(this.match(TokenType.EQUAL,TokenType.NOT_EQUAL)){const operator=this.previous().lexeme,right=this.parseComparison(); expr={kind:'Binary',position:expr.position,left:expr,operator,right} satisfies BinaryExpression} return expr }
  private parseComparison():Expression { let expr=this.parseTerm(); while(this.match(TokenType.LT,TokenType.LTE,TokenType.GT,TokenType.GTE)){const operator=this.previous().lexeme,right=this.parseTerm(); expr={kind:'Binary',position:expr.position,left:expr,operator,right} satisfies BinaryExpression} return expr }
  private parseTerm():Expression { let expr=this.parseFactor(); while(this.match(TokenType.PLUS,TokenType.MINUS)){const operator=this.previous().lexeme,right=this.parseFactor(); expr={kind:'Binary',position:expr.position,left:expr,operator,right} satisfies BinaryExpression} return expr }
  private parseFactor():Expression { let expr=this.parseUnary(); while(this.match(TokenType.STAR,TokenType.SLASH)){const operator=this.previous().lexeme,right=this.parseUnary(); expr={kind:'Binary',position:expr.position,left:expr,operator,right} satisfies BinaryExpression} return expr }
  private parseUnary():Expression { if(this.match(TokenType.NOT,TokenType.MINUS)){const op=this.previous(),right=this.parseUnary(),unary:UnaryExpression={kind:'Unary',position:this.pos(op),operator:op.lexeme,right}; return unary} return this.parsePrimary() }
  private parsePrimary():Expression {
    if(this.match(TokenType.NUMBER,TokenType.STRING)){const t=this.previous(),literal:LiteralExpression={kind:'Literal',position:this.pos(t),value:t.literal as number|string}; return literal}
    if(this.match(TokenType.TRUE,TokenType.FALSE,TokenType.NULL)){const t=this.previous(),value=t.type===TokenType.TRUE?true:t.type===TokenType.FALSE?false:null; return {kind:'Literal',position:this.pos(t),value}}
    if(this.match(TokenType.IDENTIFIER)){const t=this.previous(),variable:VariableExpression={kind:'Variable',position:this.pos(t),name:t.lexeme}; return variable}
    if(this.match(TokenType.LPAREN)){const expr=this.parseAssignment(); this.consume(TokenType.RPAREN,"Expected ')' after expression."); return expr}
    throw this.error(this.peek(),'Expected expression.')
  }
  private consume(type:TokenTypeValue,message:string):Token { if(this.check(type)) return this.advance(); throw this.error(this.peek(),message) }
  private match(...types:TokenTypeValue[]):boolean { for(const type of types) if(this.check(type)){this.advance();return true} return false }
  private check(type:TokenTypeValue):boolean { return this.peek().type===type }
  private advance():Token { if(!this.isAtEnd()) this.current++; return this.previous() }
  private isAtEnd():boolean { return this.peek().type===TokenType.EOF }
  private peek():Token { return this.tokens[this.current]??this.tokens[this.tokens.length-1] }
  private previous():Token { return this.tokens[Math.max(0,this.current-1)] }
  private pos(t:Token){return {line:t.line,column:t.column}}
  private error(token:Token,message:string){return new WeaveError('parse',message,token.line,token.column)}
}
export function parseSource(source:string):Statement[]{return new Parser(tokenize(source)).parseProgram()}


