# Weave language specification (MVP)

## Grammar

```ebnf
program      = { statement } ;
statement    = "let" IDENTIFIER "=" expression ";"
             | "print" "(" expression ")" ";"
             | expression ";"
             | "{" { statement } "}"
             | "if" "(" expression ")" statement [ "else" statement ]
             | "while" "(" expression ")" statement ;
expression   = assignment ;
assignment   = equality [ "=" assignment ] ;
equality     = comparison { ( "==" | "!=" ) comparison } ;
comparison   = term { ( "<" | "<=" | ">" | ">=" ) term } ;
term         = factor { ( "+" | "-" ) factor } ;
factor       = unary { ( "*" | "/" ) unary } ;
unary        = ( "!" | "-" ) unary | primary ;
primary      = NUMBER | STRING | "true" | "false" | "null" | IDENTIFIER
             | "(" expression ")" ;
```

Assignment is right-associative and its target must be an identifier. Binary levels group left-to-right, with multiplication/division above addition/subtraction, then comparisons and equality. Unary operators bind more tightly than binary operators.

## Values and operators

Values are finite JavaScript numbers, strings, booleans, and `null`. `+` adds two numbers or concatenates two strings. `-`, `*`, `/`, and ordered comparisons require numbers. `/` rejects zero denominators. Equality is strict by type and value (`1 != "1"`). `!` negates truthiness; unary `-` requires a number. Falsey values are `false`, `null`, numeric zero, and the empty string.

## Scope

Declarations belong to the current environment; duplicate names in that environment are errors. A nested block creates a child scope. Reads search outward. Assignment changes the nearest existing binding and errors when no binding exists. A block's local bindings are discarded when it exits.

## Errors and execution

Lexer, parser, and runtime failures use `WeaveError` with phase, message, one-based line, and column. Runtime evaluation is limited by a configurable operation budget, counting statement dispatch and expression evaluation. The debugger advances after each executed statement; branches and loop bodies are stepped into, and snapshots reflect the interpreter environment and output at that point.

Comments begin with `//` and continue to the end of the line. Strings use double quotes and support `\n`, `\t`, `\r`, `\"`, and `\\` escapes.
