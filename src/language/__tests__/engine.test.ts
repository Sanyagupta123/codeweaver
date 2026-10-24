import { describe, expect, it } from 'vitest'
import { executeSource, parseProgram, tokenizeSource, DebuggerSession } from '../runner'
import { WeaveError } from '../errors'

describe('Weave lexer and parser', () => {
  it('preserves token locations and scans strings and operators', () => {
    const tokens = tokenizeSource('let x = 10;\nprint("ok");')
    expect(tokens[0]).toMatchObject({ type: 'let', line: 1, column: 1 })
    expect(tokens.find(t => t.type === 'STRING')).toMatchObject({ literal: 'ok', line: 2, column: 7 })
  })
  it('reports lexical and delimiter errors with locations', () => {
    expect(() => tokenizeSource('@')).toThrow(WeaveError)
    expect(() => tokenizeSource('print("oops);')).toThrow('Unterminated string')
    expect(() => parseProgram('print(2 + 3;')).toThrow("Expected ')' after print argument")
  })
  it('builds precedence and right-associative assignment AST', () => {
    const tree = parseProgram('let x = 1; let y = 2; x = y = 3; print(2 + 3 * 4);')
    expect(tree[2]).toMatchObject({ expression: { kind: 'Assignment', value: { kind: 'Assignment' } } })
    expect(tree[3]).toMatchObject({ expression: { kind: 'Binary', operator: '+', right: { kind: 'Binary', operator: '*' } } })
  })
})
describe('Weave interpreter', () => {
  it.each([
    ['print(2 + 3 * 4);', ['14']],
    ['let x = 10; x = x + 5; print(x);', ['15']],
    ['let x = 10; let y = 20; print(x + y * 2);', ['50']],
    ['let n = 1; let sum = 0; while (n <= 5) { sum = sum + n; n = n + 1; } print(sum);', ['15']],
    ['let x = 1; { let x = 2; print(x); } print(x);', ['2', '1']],
    ['if (true) { print("yes"); } else { print("no"); }', ['yes']],
    ['print(true == !false); print("a" + "b");', ['true', 'ab']],
  ])('executes %s', (source, output) => { expect(executeSource(source).output).toEqual(output) })
  it('reports type, duplicate, undefined and division errors and preserves partial output', () => {
    const partial = executeSource('print(1); print(10 / 0);')
    expect(partial.success).toBe(false); expect(partial.output).toEqual(['1']); expect(partial.error?.phase).toBe('runtime')
    expect(executeSource('let x = 1; let x = 2;').error?.message).toContain('Duplicate declaration')
    expect(executeSource('print(nope);').error?.message).toContain('Undefined variable')
    expect(executeSource('print("a" - 1);').error?.message).toContain('requires numbers')
  })
  it('enforces the execution budget inside loops', () => { expect(executeSource('while (true) { print(1); }', { maxSteps: 80 }).error?.message).toContain('Execution budget') })
})
describe('incremental debugger', () => {
  it('steps through loop statements, continues, snapshots state and resets', () => {
    const session = new DebuggerSession('let n = 1; while (n <= 2) { print(n); n = n + 1; }')
    const first = session.step(); expect(first.variables.n).toBe(1); expect(first.trace).toHaveLength(1)
    const next = session.step(); expect(next.trace).toHaveLength(2); expect(next.variables.n).toBe(1)
    const done = session.continue(); expect(done.output).toEqual(['1','2']); expect(done.variables.n).toBe(3); expect(done.trace.length).toBeGreaterThan(4)
    session.reset(); expect(session.output).toEqual([]); expect(session.variables).toEqual({})
  })
})
