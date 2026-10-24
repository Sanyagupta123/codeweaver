export type ErrorPhase = 'lex' | 'parse' | 'runtime'

export class WeaveError extends Error {
  readonly phase: ErrorPhase
  readonly line: number
  readonly column: number

  constructor(phase: ErrorPhase, message: string, line = 1, column = 1) {
    super(message)
    this.name = 'WeaveError'
    this.phase = phase
    this.line = line
    this.column = column
  }

  toString(): string {
    return `${this.phase.toUpperCase()} error at ${this.line}:${this.column}: ${this.message}`
  }
}

export function formatError(error: unknown): string {
  if (error instanceof WeaveError) {
    return error.toString()
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
