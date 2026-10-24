import { useMemo, useState } from 'react'
import './App.css'
import { DebuggerSession, executeSource, parseProgram, tokenizeSource } from './language/runner'
import { WeaveError } from './language/errors'
import type { ExecutionResult } from './language/interpreter'

const EXAMPLES = [
  { name:'Arithmetic & precedence', description:'Multiplication binds before addition.', code:'print(2 + 3 * 4);', expected:'14' },
  { name:'Variables & reassignment', description:'Declare a binding, then update its value.', code:'let x = 10;\nx = x + 5;\nprint(x);', expected:'15' },
  { name:'Summing with a loop', description:'Accumulate values from one through five.', code:'let count = 1;\nlet total = 0;\n\nwhile (count <= 5) {\n  total = total + count;\n  count = count + 1;\n}\n\nprint(total);', expected:'15' },
  { name:'Conditional pass/fail', description:'Choose a branch from a comparison.', code:'let score = 7;\nif (score >= 5) {\n  print("pass");\n} else {\n  print("fail");\n}', expected:'pass' },
  { name:'Nested scope', description:'A block can read outer bindings and declare local ones.', code:'let message = "outside";\n{\n  let local = "inside";\n  print(message);\n  print(local);\n}\nprint(message);', expected:'outside, inside, outside' },
  { name:'Strings & booleans', description:'Strings, booleans, null, equality, and negation.', code:'let ready = true;\nlet greeting = "hello";\nprint(ready == !false);\nprint(greeting + " weave");', expected:'true, hello weave' },
  { name:'Division by zero', description:'Runtime diagnostics include the source location.', code:'print(10 / 0);', expected:'Runtime error' },
  { name:'Undefined variable', description:'Reading an undeclared name is a runtime error.', code:'print(missing);', expected:'Runtime error' },
  { name:'Invalid syntax', description:'Parser diagnostics point to the missing delimiter.', code:'print(2 + 3;', expected:'Syntax error' },
  { name:'Infinite loop guard', description:'The execution budget stops loops that never finish.', code:'let n = 0;\nwhile (true) {\n  n = n + 1;\n}', expected:'Execution budget error' },
]
type Tab = 'tokens'|'ast'|'variables'|'trace'
function App() {
  const [source,setSource]=useState(EXAMPLES[2].code), [selected,setSelected]=useState(2)
  const [session,setSession]=useState<DebuggerSession|null>(null), [result,setResult]=useState<ExecutionResult|null>(null)
  const [activeTab,setActiveTab]=useState<Tab>('variables'), [status,setStatus]=useState('Ready')
  const [diagnostic,setDiagnostic]=useState<WeaveError|null>(null)
  const lineCount=Math.max(1,source.split('\n').length)
  const tokens=useMemo(()=>{try{return tokenizeSource(source)}catch{return []}},[source])
  const ast=useMemo(()=>{try{return parseProgram(source)}catch{return null}},[source])
  const output=result?.output??session?.output??[]
  const trace=result?.trace??session?.trace??[]
  const variables=result?.variables??session?.variables??{}
  const currentLine=result?.currentLine??session?.currentLine
  const reset=()=>{setSession(null);setResult(null);setDiagnostic(null);setStatus('Ready')}
  const run=()=>{try{const next=executeSource(source);setSession(null);setResult(next);setDiagnostic(next.error??null);setStatus(next.success?'Finished':`Runtime error · ${next.error?.line}:${next.error?.column}`)}catch(e){const err=e instanceof WeaveError?e:new WeaveError('runtime',String(e));setResult({success:false,output:[],trace:[],variables:{},error:err});setDiagnostic(err);setStatus(`${err.phase} error · ${err.line}:${err.column}`)}}
  const step=()=>{try{const active=session??new DebuggerSession(source);const next=active.step();setSession(active);setResult(next);setDiagnostic(next.error??null);setStatus(next.success?(next.currentLine?`Paused · line ${next.currentLine}`:'Finished'): `Runtime error · ${next.error?.line}:${next.error?.column}`)}catch(e){const err=e instanceof WeaveError?e:new WeaveError('parse',String(e));setDiagnostic(err);setStatus(`${err.phase} error · ${err.line}:${err.column}`)}}
  const cont=()=>{try{const active=session??new DebuggerSession(source);const next=active.continue();setSession(active);setResult(next);setDiagnostic(next.error??null);setStatus(next.success?'Finished':`Runtime error · ${next.error?.line}:${next.error?.column}`)}catch(e){const err=e instanceof WeaveError?e:new WeaveError('parse',String(e));setDiagnostic(err);setStatus(`${err.phase} error · ${err.line}:${err.column}`)}}
  const choose=(index:number)=>{setSelected(index);setSource(EXAMPLES[index].code);reset()}
  const started=!!session||!!result
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">W</div><div><div className="brand-name">CodeWeaver</div><div className="tagline">A tiny language. A real interpreter.</div></div></div><div className="top-actions"><span className={`status ${diagnostic?'has-error':''}`}><i/> {status}</span><button className="button quiet" onClick={reset}>↺ Reset</button><button className="button quiet" disabled={!!result?.currentStatement && !session} onClick={step}>▷ Step</button><button className="button quiet" disabled={!!result?.currentStatement && !session} onClick={cont}>▷▷ Continue</button><button className="button run" onClick={run}>▶ Run</button></div></header>
    <div className="subbar"><div className="crumb"><span>PLAYGROUND</span><b>/</b><span>WEAVE 0.1</span></div><label className="example-select"><span>Example</span><select value={selected} onChange={e=>choose(Number(e.target.value))}>{EXAMPLES.map((x,i)=><option value={i} key={x.name}>{x.name}</option>)}</select></label></div>
    <section className="main-grid"><article className="panel editor-panel"><div className="panel-head"><div><span className="dot purple"/> <b>main.weave</b><span className="muted"> · Weave</span></div><span className="muted">{tokens.length?tokens.length-1:0} tokens</span></div><div className="editor"><div className="gutter" aria-hidden="true">{Array.from({length:lineCount},(_,i)=><div className={currentLine===i+1?'active-line':''} key={i}>{i+1}</div>)}</div><textarea value={source} onChange={e=>{setSource(e.target.value);setSession(null);setResult(null);setDiagnostic(null);setStatus('Editing')}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}}} spellCheck={false} aria-label="Weave source editor" autoCapitalize="off" autoComplete="off" /></div><div className="editor-foot"><span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run</span><span>{source.split('\n').length} lines</span></div></article>
      <article className="panel console-panel"><div className="panel-head"><div><span className="dot green"/> <b>Console</b></div><button className="text-button" onClick={()=>{setResult(null);setDiagnostic(null)}}>Clear</button></div><div className="console-body">{output.length?output.map((line,i)=><div className="output-line" key={i}><span className="prompt">›</span>{line}</div>):!diagnostic&&<div className="empty"><span>⌁</span><p>Program output will appear here</p><small>Run your program to see what it does</small></div>}{diagnostic&&<div className="diagnostic"><div><b>{diagnostic.phase.toUpperCase()}</b><span>LINE {diagnostic.line} : COL {diagnostic.column}</span></div><p>{diagnostic.message}</p></div>}</div><div className="console-footer"><span>● {result?.success?'Execution complete':diagnostic?'Stopped with error':started?'Paused':'Awaiting execution'}</span><span>{trace.length} steps</span></div></article></section>
    <section className="lower-grid"><article className="panel example-card"><div className="section-label">CURRENT EXAMPLE</div><h2>{EXAMPLES[selected].name}</h2><p>{EXAMPLES[selected].description}</p><div className="expected"><span>EXPECTED</span><code>{EXAMPLES[selected].expected}</code></div><div className="example-chips">{EXAMPLES.map((ex,i)=><button key={ex.name} title={ex.name} aria-label={`Select ${ex.name}`} className={i===selected?'chip selected':'chip'} onClick={()=>choose(i)}>{String(i+1).padStart(2,'0')}</button>)}</div></article>
      <article className="panel inspector-panel"><div className="panel-head inspector-head"><div><span className="dot blue"/> <b>Inspector</b><span className="muted"> · {trace.length} events</span></div><div className="tabs">{(['variables','trace','tokens','ast'] as Tab[]).map(tab=><button className={activeTab===tab?'tab active':'tab'} onClick={()=>setActiveTab(tab)} key={tab}>{tab}</button>)}</div></div><div className="inspect-content">
        {activeTab==='variables'&&<div>{Object.entries(variables).length?<div className="variable-list">{Object.entries(variables).map(([k,v])=><div className="variable-row" key={k}><code>{k}</code><span className={`type-${typeof v}`}>{v===null?'null':typeof v}</span><b>{JSON.stringify(v)}</b></div>)}</div>:<div className="inspect-empty">Variables appear as the interpreter reaches declarations.</div>}</div>}
        {activeTab==='trace'&&(trace.length?<div className="trace-list">{trace.map(e=><div className="trace-row" key={e.step}><span>{String(e.step).padStart(2,'0')}</span><b>{e.eventType.replace('Statement','')}</b><code>line {e.location.line}:{e.location.column}</code><small>{e.description}</small></div>)}</div>:<div className="inspect-empty">Step or run the program to build an execution trace.</div>)}
        {activeTab==='tokens'&&(tokens.length?<div className="token-list">{tokens.map((t,i)=><div className="token-row" key={i}><b>{t.type}</b><code>{t.lexeme||'∅'}</code><span>{t.literal===null?'null':String(t.literal)}</span><small>{t.line}:{t.column}</small></div>)}</div>:<div className="inspect-empty">Tokens are shown when the source is valid.</div>)}
        {activeTab==='ast'&&(ast?<details className="ast-tree" open><summary>Program · {ast.length} statements</summary><pre>{JSON.stringify(ast,null,2)}</pre></details>:<div className="inspect-empty">Fix the syntax error to inspect the parsed AST.</div>)}
      </div></article></section>
    <footer className="footer"><span>CODEWEAVER <i>·</i> WEAVE INTERPRETER</span><span>Lexer <i>→</i> Parser <i>→</i> AST <i>→</i> Interpreter</span><span>Spec · docs/language-spec.md</span></footer>
  </main>
}
export default App



