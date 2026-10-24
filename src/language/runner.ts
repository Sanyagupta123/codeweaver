import { tokenize, Lexer } from './lexer'
import { Parser, parseSource } from './parser'
import { Interpreter, type ExecutionResult, type TraceEvent } from './interpreter'
import { WeaveError } from './errors'
import type { Statement, Value } from './ast'

export interface RunnerOptions { maxSteps?: number }
export class DebuggerSession {
  readonly source: string
  readonly program: Statement[]
  readonly trace: TraceEvent[] = []
  private interpreter: Interpreter
  private iterator: Generator<TraceEvent, void, void>
  private finished = false
  private runtimeError?: WeaveError
  constructor(source: string, options: RunnerOptions = {}) {
    this.source = source
    this.program = parseSource(source)
    this.interpreter = new Interpreter({ maxSteps: options.maxSteps ?? 10000, debugMode: true })
    this.iterator = this.interpreter.executeIncrementally(this.program)
  }
  get output(): string[] { return this.interpreter.output }
  get variables(): Record<string, Value> { return this.trace[this.trace.length - 1]?.variables ?? this.interpreter.globalEnv.snapshot() }
  get currentStatement(): Statement | null { return this.trace.length ? this.program.find(s => s.position.line === this.trace[this.trace.length - 1].location.line) ?? null : this.program[0] ?? null }
  get currentLine(): number | undefined { return this.finished ? undefined : this.trace[this.trace.length - 1]?.location.line ?? this.program[0]?.position.line }
  step(): ExecutionResult {
    if (this.runtimeError) return this.result(false, this.runtimeError)
    if (this.finished) return this.result(true)
    try {
      const next = this.iterator.next()
      if (next.done) this.finished = true
      else this.trace.push(next.value)
      return this.result(true)
    } catch (error) {
      this.runtimeError = error instanceof WeaveError ? error : new WeaveError('runtime', String(error))
      this.finished = true
      return this.result(false, this.runtimeError)
    }
  }
  continue(): ExecutionResult { let result = this.result(true); while (!this.finished && !this.runtimeError) { result = this.step(); if (!result.success) break } return result }
  reset(): void { this.trace.length = 0; this.finished = false; this.runtimeError = undefined; this.interpreter = new Interpreter({ maxSteps: 10000, debugMode: true }); this.iterator = this.interpreter.executeIncrementally(this.program) }
  private result(success: boolean, error?: WeaveError): ExecutionResult { return { success, output: this.output, trace: [...this.trace], variables: this.variables, error, currentStatement: this.currentStatement, currentLine: this.currentLine } }
}
export function tokenizeSource(source: string) { return tokenize(source) }
export function parseProgram(source: string): Statement[] { return parseSource(source) }
export function executeSource(source: string, options: RunnerOptions = {}): ExecutionResult {
  const program = new Parser(tokenize(source)).parseProgram()
  return new Interpreter({ maxSteps: options.maxSteps, debugMode: true }).run(program)
}
export { Lexer, Parser }



