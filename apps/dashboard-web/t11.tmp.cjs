const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('app/dashboard/(main)/pos/page.tsx', 'utf8');
const sf = ts.createSourceFile('p.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const start = src.indexOf('const obileCartOpen');
const end = src.indexOf('useState(false);', start) + 16;
// find deepest nodes covering [start, end)
const stack = [];
(function walk(node) {
  if (node.end <= start || node.pos >= end) return;
  stack.push(node);
  ts.forEachChild(node, walk);
})(sf);
for (const n of stack) {
  const sl = ts.getLineAndCharacterOfPosition(sf, Math.max(n.pos, 0)).line + 1;
  const el = ts.getLineAndCharacterOfPosition(sf, Math.min(n.end, src.length)).line + 1;
  console.log(
    `${'  '.repeat(stack.indexOf(n))}${ts.SyntaxKind[n.kind]} [L${sl}-L${el}] ${JSON.stringify(src.slice(Math.max(n.pos, 0), Math.min(n.end, src.length)).slice(0, 60))}`
  );
}
