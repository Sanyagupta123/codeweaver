import type { Expression, Statement, Value } from './ast'
import { WeaveError } from './errors'
import { Environment } from './environment'

export interface TraceEvent {
  step: number
  eventType: string
  description: string
  location: { line: number; column: number }
  variables: Record<string, Value>
  output: string[]
}
export interface ExecutionResult {
  success: boolean; output: string[]; trace: TraceEvent[]; variables: Record<string, Value>
  error?: WeaveError; currentStatement?: Statement | null; currentLine?: number
}
export interface InterpreterOptions { maxSteps?: number; debugMode?: boolean }

export class Interpreter {
  globalEnv = new Environment()
  readonly maxSteps: number
  readonly debugMode: boolean
  private traceEvents: TraceEvent[] = []
  private outputBuffer: string[] = []
  private budget = 0
  private currentStatement: Statement | null = null
  private activeEnv = this.globalEnv
  constructor(options: InterpreterOptions = {}) { this.maxSteps = options.maxSteps ?? 10000; this.debugMode = options.debugMode ?? false }
  get output(): string[] { return [...this.outputBuffer] }
  get trace(): TraceEvent[] { return [...this.traceEvents] }
  reset(): void { this.globalEnv = new Environment(); this.traceEvents = []; this.outputBuffer = []; this.budget = 0; this.currentStatement = null }
  run(program: Statement[]): ExecutionResult {
    this.reset()
    try {
      for (const statement of program) this.executeStatement(statement)
      return this.result(true)
    } catch (error) { return this.result(false, this.asError(error)) }
  }
  *executeIncrementally(program: Statement[]): Generator<TraceEvent, void, void> {
    this.reset()
    for (const statement of program) yield* this.executeStepped(statement, this.globalEnv)
  }
  private *executeStepped(statement: Statement, env: Environment): Generator<TraceEvent, void, void> {
    this.currentStatement = statement
    this.activeEnv = env
    this.tick(statement)
    switch (statement.kind) {
      case 'LetStatement': env.define(statement.name, this.evaluateExpression(statement.initializer, env), statement.position); break
      case 'ExpressionStatement': this.evaluateExpression(statement.expression, env); break
      case 'PrintStatement': this.outputBuffer.push(this.stringify(this.evaluateExpression(statement.expression, env))); break
      case 'BlockStatement': { const nested = new Environment(env); for (const child of statement.statements) yield* this.executeStepped(child, nested); break }
      case 'IfStatement': { const branch = this.isTruthy(this.evaluateExpression(statement.condition, env)) ? statement.thenBranch : statement.elseBranch; if (branch) yield* this.executeStepped(branch, env); break }
      case 'WhileStatement': while (this.isTruthy(this.evaluateExpression(statement.condition, env))) yield* this.executeStepped(statement.body, env); break
    }
    yield this.record(statement)
  }
  executeStatement(statement: Statement, env: Environment = this.globalEnv): Value | null {
    this.currentStatement = statement; this.activeEnv = env; this.tick(statement)
    switch (statement.kind) {
      case 'LetStatement': env.define(statement.name, this.evaluateExpression(statement.initializer, env), statement.position); break
      case 'ExpressionStatement': this.evaluateExpression(statement.expression, env); break
      case 'PrintStatement': this.outputBuffer.push(this.stringify(this.evaluateExpression(statement.expression, env))); break
      case 'BlockStatement': { const nested = new Environment(env); for (const child of statement.statements) this.executeStatement(child, nested); break }
      case 'IfStatement': { const branch = this.isTruthy(this.evaluateExpression(statement.condition, env)) ? statement.thenBranch : statement.elseBranch; if (branch) this.executeStatement(branch, env); break }
      case 'WhileStatement': while (this.isTruthy(this.evaluateExpression(statement.condition, env))) this.executeStatement(statement.body, env); break
    }
    if (this.debugMode) this.traceEvents.push(this.record(statement))
    return null
  }
  evaluateExpression(expression: Expression, env: Environment = this.globalEnv): Value {
    this.consumeBudget(expression.position)
    switch (expression.kind) {
      case 'Literal': return expression.value
      case 'Variable': return env.get(expression.name, expression.position)
      case 'Unary': { const right = this.evaluateExpression(expression.right, env); if (expression.operator === '-') return -this.number(right, expression.position, 'Unary minus requires a number.'); if (expression.operator === '!') return !this.isTruthy(right); throw new WeaveError('runtime', `Unsupported unary operator '${expression.operator}'.`, expression.position.line, expression.position.column) }
      case 'Binary': {
        const left = this.evaluateExpression(expression.left, env), right = this.evaluateExpression(expression.right, env), pos = expression.position
        switch (expression.operator) {
          case '+': if (typeof left === 'string' && typeof right === 'string') return left + right; return this.number(left,pos,'Addition requires two numbers or two strings.') + this.number(right,pos,'Addition requires two numbers or two strings.')
          case '-': return this.number(left,pos,'Subtraction requires numbers.') - this.number(right,pos,'Subtraction requires numbers.')
          case '*': return this.number(left,pos,'Multiplication requires numbers.') * this.number(right,pos,'Multiplication requires numbers.')
          case '/': { const denominator=this.number(right,pos,'Division requires numbers.'); if (!denominator) throw new WeaveError('runtime','Division by zero.',pos.line,pos.column); return this.number(left,pos,'Division requires numbers.') / denominator }
          case '<': return this.number(left,pos,'Comparison requires numbers.') < this.number(right,pos,'Comparison requires numbers.')
          case '<=': return this.number(left,pos,'Comparison requires numbers.') <= this.number(right,pos,'Comparison requires numbers.')
          case '>': return this.number(left,pos,'Comparison requires numbers.') > this.number(right,pos,'Comparison requires numbers.')
          case '>=': return this.number(left,pos,'Comparison requires numbers.') >= this.number(right,pos,'Comparison requires numbers.')
          case '==': return typeof left === typeof right && left === right
          case '!=': return !(typeof left === typeof right && left === right)
          default: throw new WeaveError('runtime', `Unsupported binary operator '${expression.operator}'.`,pos.line,pos.column)
        }
      }
      case 'Assignment': return env.assign(expression.name, this.evaluateExpression(expression.value, env), expression.position)
    }
  }
  snapshot(env: Environment = this.globalEnv): Record<string, Value> { return env.snapshot() }
  private tick(statement: Statement): void { this.consumeBudget(statement.position); this.currentStatement = statement }
  private consumeBudget(position: {line:number;column:number}): void { if (++this.budget > this.maxSteps) throw new WeaveError('runtime','Execution budget exceeded.',position.line,position.column) }
  private record(statement: Statement): TraceEvent {
    const event: TraceEvent = { step: this.traceEvents.length + 1, eventType: statement.kind, description: statement.kind.replace('Statement',''), location: {...statement.position}, variables: this.activeEnv.snapshot(), output: [...this.outputBuffer] }
    this.traceEvents.push(event); return event
  }
  private result(success: boolean, error?: WeaveError): ExecutionResult { return { success, output: this.output, trace: this.trace, variables: this.globalEnv.snapshot(), error, currentStatement: this.currentStatement, currentLine: this.currentStatement?.position.line } }
  private asError(error: unknown): WeaveError { return error instanceof WeaveError ? error : new WeaveError('runtime', error instanceof Error ? error.message : String(error), this.currentStatement?.position.line ?? 1, this.currentStatement?.position.column ?? 1) }
  private number(value: Value, p: {line:number;column:number}, message: string): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw new WeaveError('runtime',message,p.line,p.column); return value }
  private stringify(value: Value): string { return value === null ? 'null' : String(value) }
  private isTruthy(value: Value): boolean { return value !== false && value !== null }
}




