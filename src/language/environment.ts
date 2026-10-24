import type { Value } from './ast'
import { WeaveError } from './errors'

export class Environment {
  private values = new Map<string, Value>()
  readonly parent?: Environment
  constructor(parent?: Environment) { this.parent = parent }
  define(name: string, value: Value, position = { line: 1, column: 1 }): void {
    if (this.values.has(name)) throw new WeaveError('runtime', `Duplicate declaration for '${name}'.`, position.line, position.column)
    this.values.set(name, value)
  }
  assign(name: string, value: Value, position = { line: 1, column: 1 }): Value {
    if (this.values.has(name)) { this.values.set(name, value); return value }
    if (this.parent) return this.parent.assign(name, value, position)
    throw new WeaveError('runtime', `Undefined variable '${name}'.`, position.line, position.column)
  }
  get(name: string, position = { line: 1, column: 1 }): Value {
    if (this.values.has(name)) return this.values.get(name) as Value
    if (this.parent) return this.parent.get(name, position)
    throw new WeaveError('runtime', `Undefined variable '${name}'.`, position.line, position.column)
  }
  snapshot(): Record<string, Value> {
    const result: Record<string, Value> = {}
    if (this.parent) Object.assign(result, this.parent.snapshot())
    for (const [key, value] of this.values) result[key] = value
    return result
  }
}
