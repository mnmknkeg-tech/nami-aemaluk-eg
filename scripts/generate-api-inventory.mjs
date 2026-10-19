#!/usr/bin/env node
/**
 * Repository API inventory: every Fiber route the Go backend registers, plus the
 * repository consumers of each route (web apps, cashier desktop, scripts, E2E,
 * tests) and the credential the route requires.
 *
 * Rules that must not be relaxed:
 *  - Only production registrations are inventoried; *_test.go files are excluded
 *    from the route table (they are still scanned as callers).
 *  - A route with no discovered caller is UNKNOWN — never UNUSED — and is never
 *    approved for deletion here. Production telemetry decides that.
 *  - Prefixes are resolved by following `Router.Group()` chains and the
 *    `RegisterRoutes(router)` call graph instead of guessing from file names.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const backendDir = join(root, 'gobackend', 'internal');
const outputPath = join(root, 'docs', 'API_INVENTORY.md');

const PRUNE = new Set([
  '.git',
  'node_modules',
  '.next',
  '.vercel',
  'dist',
  'build',
  'vendor',
  'bin',
  'obj',
  'coverage',
  'out',
  '.turbo',
  '_archive',
  'tmp',
  '.idea',
  '.vscode',
]);

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (PRUNE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const rel = (p) => relative(root, p).split('\\').join('/');

// ─── Go source scanning ─────────────────────────────────────────────────────

/**
 * Blanks out comments while preserving offsets and line numbers, so every
 * recorded index still maps onto the original source.
 */
function stripComments(src) {
  let out = '';
  let state = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') {
        state = 'line';
        out += '  ';
        i++;
        continue;
      }
      if (c === '/' && d === '*') {
        state = 'block';
        out += '  ';
        i++;
        continue;
      }
      if (c === '"') state = 'str';
      else if (c === "'") state = 'rune';
      else if (c === '`') state = 'raw';
      out += c;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      } else out += ' ';
      continue;
    }
    if (state === 'block') {
      if (c === '*' && d === '/') {
        state = 'code';
        out += '  ';
        i++;
      } else out += c === '\n' ? '\n' : ' ';
      continue;
    }
    if (state === 'str' || state === 'rune') {
      if (c === '\\') {
        out += c + (d ?? '');
        i++;
        continue;
      }
      if (c === '\n') state = 'code';
      else if ((state === 'str' && c === '"') || (state === 'rune' && c === "'")) state = 'code';
      out += c;
      continue;
    }
    // raw string
    if (c === '`') state = 'code';
    out += c;
  }
  return out;
}

/** Index of the matching close character, skipping string literals. */
function matchAt(src, openIndex, open = '(', close = ')') {
  let depth = 0;
  for (let i = openIndex; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function skipString(src, i) {
  const quote = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') {
      j++;
      continue;
    }
    if (src[j] === quote) return j;
    if (quote !== '`' && src[j] === '\n') return j;
  }
  return src.length;
}

/** Splits a Go argument list on top-level commas. */
function splitTopLevel(text, sep = ',') {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      cur += text.slice(i, end + 1);
      i = end;
      continue;
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    if (c === sep && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim() !== '') parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Discovers Go functions/methods with their body range. */
function findFunctions(src) {
  const funcs = [];
  const re = /(^|\n)[ \t]*func[ \t]+/g;
  let match;
  while ((match = re.exec(src))) {
    let i = match.index + match[0].length;
    let receiver = '';
    if (src[i] === '(') {
      const end = matchAt(src, i);
      if (end < 0) continue;
      receiver = src.slice(i + 1, end);
      i = end + 1;
    }
    while (i < src.length && /\s/.test(src[i])) i++;
    const nameMatch = /^[A-Za-z_]\w*/.exec(src.slice(i));
    if (!nameMatch) continue;
    const name = nameMatch[0];
    i += name.length;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== '(') continue;
    const paramsEnd = matchAt(src, i);
    if (paramsEnd < 0) continue;
    const paramsRaw = src.slice(i + 1, paramsEnd);
    let bodyStart = -1;
    for (let j = paramsEnd + 1; j < src.length; j++) {
      if (src[j] === '{') {
        bodyStart = j;
        break;
      }
      if (src[j] === '\n') break; // multi-line return types are not used here
    }
    if (bodyStart < 0) continue;
    const bodyEnd = matchAt(src, bodyStart, '{', '}');
    if (bodyEnd < 0) continue;
    funcs.push({ name, receiver, paramsRaw, bodyStart, bodyEnd });
    re.lastIndex = bodyEnd;
  }
  return funcs;
}

/** Parameter names whose type is a Fiber router (or the app itself). */
function routerParamNames(paramsRaw) {
  const names = [];
  for (const part of splitTopLevel(paramsRaw)) {
    if (!/fiber\.(Router|App)\b/.test(part)) continue;
    const ids = (part.match(/[A-Za-z_]\w*/g) || []).filter(
      (t) => !['fiber', 'Router', 'App'].includes(t)
    );
    if (ids.length) names.push(ids[0]);
  }
  return names;
}

/** Ordered parameter names, used to bind closure arguments. */
function paramNames(paramsRaw) {
  const skip = new Set(['string', 'bool', 'int', 'any', 'interface', 'kindSpec']);
  return splitTopLevel(paramsRaw)
    .map((part) => (part.match(/[A-Za-z_]\w*/g) || []).filter((t) => !skip.has(t))[0] ?? '')
    .filter(Boolean);
}

const ROUTE_METHODS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options', 'All']);

/** Reads the string literal at index, or null. */
function readStringLiteral(src, i) {
  const quote = src[i];
  if (quote !== '"' && quote !== '`') return null;
  const end = skipString(src, i);
  return src.slice(i + 1, end);
}

/**
 * Collects `var NAME = map[string]T{...}` keys, `var NAME = []T{{F: "v"}}` field
 * values and `var NAME = []string{...}` values. Used to expand route groups that
 * are built from a map or slice (`app.Group("/" + route)`).
 */
function collectStringLists(src) {
  const lists = new Map();
  const re = /(^|\n)var[ \t]+([A-Za-z_]\w*)[ \t]*=[ \t]*(map\[[^\]]*\][^{;\n]*|\[\][^{;\n]*)\{/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[2];
    const openBrace = m.index + m[0].length - 1;
    const closeBrace = matchAt(src, openBrace, '{', '}');
    if (closeBrace < 0) continue;
    const inner = src.slice(openBrace + 1, closeBrace);
    lists.set(
      name,
      m[3].startsWith('map[') ? { values: mapKeys(inner), fields: new Map() } : sliceValues(inner)
    );
    re.lastIndex = closeBrace;
  }
  return lists;
}

/** Top-level `"key":` literals of a map literal body. */
function mapKeys(inner) {
  const keys = [];
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '"' || c === '`') {
      const value = readStringLiteral(inner, i);
      const end = skipString(inner, i);
      let j = end + 1;
      while (j < inner.length && /\s/.test(inner[j])) j++;
      if (depth === 0 && inner[j] === ':' && !keys.includes(value)) keys.push(value);
      i = end;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  return keys;
}

/** Values and struct-field values of a slice literal body. */
function sliceValues(inner) {
  const values = new Set();
  const fields = new Map();
  for (const element of splitTopLevel(inner)) {
    const body = element.startsWith('{') ? element.slice(1, -1) : element;
    for (const field of splitTopLevel(body)) {
      const fm = /^(?:([A-Za-z_]\w*)[ \t]*:)?[ \t]*(?:"([^"]*)"|`([^`]*)`)$/.exec(field.trim());
      if (!fm) continue;
      const value = fm[2] ?? fm[3] ?? '';
      values.add(value);
      if (fm[1]) {
        if (!fields.has(fm[1])) fields.set(fm[1], []);
        if (!fields.get(fm[1]).includes(value)) fields.get(fm[1]).push(value);
      }
    }
  }
  return { values: [...values], fields };
}

/** Closure declarations in the file, so `register(route, spec)` calls resolve. */
function collectClosures(src) {
  const closures = [];
  const re = /(^|[^\w.])([A-Za-z_]\w*)[ \t]*:?=[ \t]*func[ \t]*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[2];
    const openParen = m.index + m[0].length - 1;
    const closeParen = matchAt(src, openParen);
    if (closeParen < 0) continue;
    let bodyStart = -1;
    for (let j = closeParen + 1; j < src.length; j++) {
      if (src[j] === '{') {
        bodyStart = j;
        break;
      }
      if (src[j] === '\n') break;
    }
    if (bodyStart < 0) continue;
    const bodyEnd = matchAt(src, bodyStart, '{', '}');
    if (bodyEnd < 0) continue;
    closures.push({
      type: 'closure',
      index: m.index,
      name,
      paramsRaw: src.slice(openParen + 1, closeParen),
      params: paramNames(src.slice(openParen + 1, closeParen)),
      bodyStart,
      bodyEnd,
    });
    re.lastIndex = bodyEnd;
  }
  return closures;
}

/** All router-related events of a file, ordered by source position. */
function collectEvents(src) {
  const closures = collectClosures(src);
  const closureNames = new Set(closures.map((e) => e.name));
  const events = [...closures];
  let m;

  const groupRe =
    /(?:([A-Za-z_]\w*)[ \t]*:?=[ \t]*)?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)[ \t]*\.[ \t]*Group[ \t]*\(/g;
  while ((m = groupRe.exec(src))) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchAt(src, openIdx);
    if (close < 0) continue;
    const args = splitTopLevel(src.slice(openIdx + 1, close));
    events.push({
      type: 'group',
      index: m.index,
      varName: m[1] ?? null,
      parent: m[2],
      pathExpr: args[0] ?? '""',
      extraArgs: args.slice(1).join(','),
    });
    groupRe.lastIndex = close;
  }

  const routeRe =
    /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)[ \t]*\.[ \t]*(Get|Post|Put|Patch|Delete|Head|Options|All)[ \t]*\(/g;
  while ((m = routeRe.exec(src))) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchAt(src, openIdx);
    if (close < 0) continue;
    const args = splitTopLevel(src.slice(openIdx + 1, close));
    const middleware = args.slice(1).join(',');
    events.push({
      type: 'route',
      index: m.index,
      receiver: m[1],
      method: m[2].toUpperCase(),
      pathExpr: args[0] ?? '""',
      extraArgs: args.slice(1).join(','),
      deprecated: /Deprecated[ \t]*\(/.test(middleware),
    });
    routeRe.lastIndex = close;
  }

  const rangeRe =
    /(^|\n)[ \t]*for[ \t]+([^:=\n{]*?)[ \t]*(?::=|=)[ \t]*range[ \t]+([A-Za-z_][\w.]*)[ \t]*\{/g;
  while ((m = rangeRe.exec(src))) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchAt(src, openIdx, '{', '}');
    if (close < 0) continue;
    events.push({
      type: 'range',
      index: m.index,
      collection: m[3],
      loopVars: splitTopLevel(m[2]),
      bodyStart: openIdx,
      bodyEnd: close,
    });
  }

  const methodCallRe = /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)[ \t]*\.[ \t]*([A-Z]\w*)[ \t]*\(/g;
  while ((m = methodCallRe.exec(src))) {
    if (ROUTE_METHODS.has(m[2]) || m[2] === 'Group') continue;
    const openIdx = m.index + m[0].length - 1;
    const close = matchAt(src, openIdx);
    if (close < 0) continue;
    events.push({
      type: 'methodCall',
      index: m.index,
      receiver: m[1],
      callee: m[2],
      args: splitTopLevel(src.slice(openIdx + 1, close)),
    });
    methodCallRe.lastIndex = close;
  }

  const plainCallRe = /(^|[^\w.$])([A-Za-z_]\w*)[ \t]*\(/gm;
  while ((m = plainCallRe.exec(src))) {
    const name = m[2];
    if (!closureNames.has(name) && !/^Register/.test(name)) continue;
    const openIdx = m.index + m[0].length - 1;
    const close = matchAt(src, openIdx);
    if (close < 0) continue;
    events.push({
      type: 'plainCall',
      index: openIdx - name.length,
      callee: name,
      args: splitTopLevel(src.slice(openIdx + 1, close)),
    });
  }

  events.sort((a, b) => a.index - b.index);
  return { events, closureNames };
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
}

/** Joins two route fragments without duplicating or losing slashes. */
function joinRoute(base, suffix) {
  const a = String(base ?? '').replace(/\/+$/, '');
  const b = String(suffix ?? '').replace(/\/+$/, '');
  const joined = `${a}${b}`;
  if (joined === '') return '/';
  return joined.startsWith('/') ? joined : `/${joined}`;
}

/** Evaluates a Go path expression ("/a" + x) into every possible string value. */
function evalPathExpr(expr, values) {
  const parts = String(expr ?? '')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  let out = [''];
  for (const part of parts) {
    let chunk;
    if (/^"([^"]*)"$/.test(part)) chunk = [part.slice(1, -1)];
    else if (/^`([^`]*)`$/.test(part)) chunk = [part.slice(1, -1)];
    else if (values.has(part)) chunk = values.get(part);
    else return null;
    const next = [];
    for (const a of out) for (const b of chunk) next.push(a + b);
    out = next.length > 500 ? next.slice(0, 500) : next;
  }
  return out;
}

function resolveRouterExpr(expr, scope) {
  if (scope.routerVars.has(expr)) return scope.routerVars.get(expr);
  if (/\.Fiber$/.test(expr)) return [''];
  return null;
}

/** True when a router variable was derived from the Fiber app itself. */
function isFiberDerived(expr, scope) {
  return /\.Fiber$/.test(expr) || scope.fiberVars.has(expr);
}

/** Credential requirement expressed by a Go middleware expression. */
function authOf(text) {
  if (!text) return null;
  if (/RequireAuth[ \t]*\(/.test(text)) return 'required';
  if (/OptionalAuth[ \t]*\(/.test(text)) return 'optional';
  return null;
}

/**
 * Middleware variables of a file, e.g. `merchantAuth := []fiber.Handler{
 * middleware.RequireAuth(h.cfg), ... }` or `auth := middleware.RequireAuth(cfg)`.
 * Routes wired as `g.Get("/", append(merchantAuth, h.List)...)` are then known to
 * require authentication even though the route line itself does not say so.
 */
function collectMiddlewareVars(src) {
  const vars = new Map();
  const sliceRe = /([A-Za-z_]\w*)[ \t]*:?=[ \t]*\[\]fiber\.Handler\{([^}]*)\}/g;
  let m;
  while ((m = sliceRe.exec(src))) {
    const auth = authOf(m[2]);
    if (auth) vars.set(m[1], auth);
  }
  const singleRe =
    /([A-Za-z_]\w*)[ \t]*:?=[ \t]*middleware\.(RequireAuth|OptionalAuth)[A-Za-z]*\(/g;
  while ((m = singleRe.exec(src))) {
    vars.set(m[1], m[2] === 'RequireAuth' ? 'required' : 'optional');
  }
  return vars;
}

function referencedAuth(text, mwVars) {
  if (!text) return null;
  for (const id of text.match(/[A-Za-z_]\w*/g) || []) {
    if (mwVars.has(id)) return mwVars.get(id);
  }
  return null;
}

// ─── Resolving which package a `Register*Routes` call actually targets ─────

/** Import aliases of a file, mapped to their package path inside gobackend. */
function collectImports(src) {
  const dirs = new Map();
  const block = /import\s*\(([\s\S]*?)\n\)/.exec(src);
  if (!block) return dirs;
  for (const line of block[1].split('\n')) {
    const m = /^[ \t]*(?:([A-Za-z_]\w*|\.|_)[ \t]+)?"([^"]+)"/.exec(line);
    if (!m) continue;
    const alias = m[1] && m[1] !== '.' && m[1] !== '_' ? m[1] : m[2].split('/').pop();
    dirs.set(alias, normalizePkg(m[2]));
  }
  return dirs;
}

/**
 * `a.authHandler.RegisterRoutes(api)` must resolve to the auth package, not to
 * the 30 other `RegisterRoutes` methods. The receiver variable is mapped to the
 * package of its declared type: struct fields (`authHandler *auth.Handler`) and
 * constructor results (`h := health.NewHandler(...)`).
 */
function collectReceiverPkgs(src) {
  const pkgs = new Map();
  const fieldRe = /^[ \t]*([A-Za-z_]\w*)[ \t]+\*?([A-Za-z_]\w*)\.([A-Za-z_]\w*)/gm;
  let m;
  while ((m = fieldRe.exec(src))) {
    const alias = m[2];
    if (['string', 'int', 'bool', 'error', 'func', 'chan', 'any'].includes(alias)) continue;
    pkgs.set(m[1], alias);
  }
  const ctorRe = /([A-Za-z_]\w*)[ \t]*:?=[ \t]*([A-Za-z_]\w*)\.New[A-Za-z]*\(/g;
  while ((m = ctorRe.exec(src))) pkgs.set(m[1], m[2]);
  return pkgs;
}

function normalizePkg(path) {
  return String(path)
    .replace(/^.*?ray-eg\/gobackend\//, '')
    .replace(/^gobackend[\\/]/, '')
    .split('\\')
    .join('/');
}

function cartesian(lists, cap = 256) {
  let out = [[]];
  for (const list of lists) {
    const next = [];
    for (const combo of out) for (const value of list) next.push([...combo, value]);
    out = next.length > cap ? next.slice(0, cap) : next;
  }
  return out;
}

/**
 * Walks a function/closure body in source order, tracking which variables hold a
 * router and which hold expandable string values, then records the routes and the
 * `Register*Routes(router)` calls it found.
 */
function walkScope(fileCtx, scope, state) {
  const skip = [];
  for (const e of fileCtx.events) {
    if (e.index < scope.bodyStart || e.index > scope.bodyEnd) continue;
    if (skip.some(([a, b]) => e.index > a && e.index <= b)) continue;

    if (e.type === 'closure') {
      skip.push([e.bodyStart, e.bodyEnd]);
      scope.closures.set(e.name, {
        params: e.params,
        bodyStart: e.bodyStart,
        bodyEnd: e.bodyEnd,
        env: {
          routerVars: new Map(scope.routerVars),
          fiberVars: new Set(scope.fiberVars),
          groupAuth: new Map(scope.groupAuth),
        },
      });
      continue;
    }

    if (e.type === 'range') {
      skip.push([e.bodyStart, e.bodyEnd]);
      // The collection may be declared in a sibling file of the same package
      // (dashboard's `entityKinds` lives in types.go, its range in handler.go).
      const list =
        fileCtx.stringLists.get(e.collection) ?? fileCtx.globalStringLists.get(e.collection);
      const values = new Map(scope.values);
      if (list) {
        for (const name of e.loopVars) {
          if (!name || name === '_') continue;
          values.set(name, list.values);
          for (const [field, fieldValues] of list.fields)
            values.set(`${name}.${field}`, fieldValues);
        }
      }
      walkScope(
        fileCtx,
        {
          bodyStart: e.bodyStart,
          bodyEnd: e.bodyEnd,
          routerVars: new Map(scope.routerVars),
          fiberVars: new Set(scope.fiberVars),
          groupAuth: new Map(scope.groupAuth),
          recvName: scope.recvName,
          values,
          closures: scope.closures,
        },
        state
      );
      continue;
    }

    if (e.type === 'group') {
      if (!e.varName) continue;
      const parents = resolveRouterExpr(e.parent, scope);
      const suffix = evalPathExpr(e.pathExpr, scope.values);
      if (!parents || !suffix) {
        scope.routerVars.set(e.varName, null);
        continue;
      }
      const paths = new Set();
      for (const parent of parents) for (const part of suffix) paths.add(joinRoute(parent, part));
      scope.routerVars.set(e.varName, [...paths]);
      if (isFiberDerived(e.parent, scope)) scope.fiberVars.add(e.varName);
      // Fiber groups inherit their parent's middleware, so a sub-group of an
      // authenticated group is authenticated too.
      scope.groupAuth.set(
        e.varName,
        authOf(e.extraArgs) ||
          referencedAuth(e.extraArgs, fileCtx.mwVars) ||
          scope.groupAuth.get(e.parent) ||
          null
      );
      continue;
    }

    if (e.type === 'route') {
      // Only a receiver that is a known router (or the Fiber app itself) counts;
      // this is what keeps c.Get("User-Agent") out of the route table.
      const known = scope.routerVars.has(e.receiver) || /\.Fiber$/.test(e.receiver);
      if (!known) continue;
      state.routes.push({
        method: e.method,
        basePaths: resolveRouterExpr(e.receiver, scope),
        relPaths: evalPathExpr(e.pathExpr, scope.values),
        auth:
          authOf(e.extraArgs) ||
          referencedAuth(e.extraArgs, fileCtx.mwVars) ||
          scope.groupAuth.get(e.receiver) ||
          'public',
        deprecated: e.deprecated,
        rooted: isFiberDerived(e.receiver, scope),
        file: fileCtx.file,
        line: lineOf(fileCtx.src, e.index),
      });
      continue;
    }

    if (e.type === 'methodCall') {
      if (!/^Register/.test(e.callee) || !e.args.length) continue;
      const basePaths = resolveRouterExpr(e.args[0], scope);
      if (!basePaths) continue;
      // `RegisterBuilderRoutes(api, middleware.RequireAuth(cfg))` hands the
      // credential requirement to the callee as a parameter.
      const rest = e.args.slice(1).join(',');
      const forced = authOf(rest) || referencedAuth(rest, fileCtx.mwVars);
      if (forced) {
        const current = state.forcedAuth.get(e.callee);
        state.forcedAuth.set(e.callee, current && current !== forced ? 'required' : forced);
      }
      // Which package does this call target? `a.authHandler.…`, `h.…` (method
      // receiver of the enclosing function) or a package-scoped helper.
      const field = e.receiver.split('.').pop();
      let calleeDir = null;
      if (field && fileCtx.importDirs.has(fileCtx.receiverPkgs.get(field))) {
        calleeDir = fileCtx.importDirs.get(fileCtx.receiverPkgs.get(field));
      } else if (e.receiver === scope.recvName) {
        calleeDir = fileCtx.dir;
      }
      state.calls.push({
        callee: e.callee,
        calleeDir,
        basePaths,
        rooted: isFiberDerived(e.args[0], scope),
        file: fileCtx.file,
        line: lineOf(fileCtx.src, e.index),
      });
      continue;
    }

    if (e.type === 'plainCall') {
      const closure = scope.closures.get(e.callee);
      if (!closure) continue;
      const closureText = fileCtx.src.slice(closure.bodyStart, closure.bodyEnd);
      const argLists = e.args.map((arg, i) => {
        const evaluated = evalPathExpr(arg, scope.values);
        if (evaluated) return evaluated;
        // Only arguments the closure body concatenates into a path have to be
        // resolved; anything else may stay symbolic.
        const param = closure.params[i];
        const required = param && new RegExp(`\\+\\s*${param}\\b`).test(closureText);
        return required ? null : [arg];
      });
      if (argLists.some((list) => list === null)) {
        state.skipped.push(`${e.callee}(…) at ${fileCtx.file}:${lineOf(fileCtx.src, e.index)}`);
        continue;
      }
      for (const combo of cartesian(argLists)) {
        const values = new Map(scope.values);
        closure.params.forEach((param, i) => {
          if (combo[i] !== undefined) values.set(param, [combo[i]]);
        });
        walkScope(
          fileCtx,
          {
            bodyStart: closure.bodyStart,
            bodyEnd: closure.bodyEnd,
            routerVars: new Map(closure.env.routerVars),
            fiberVars: new Set(closure.env.fiberVars),
            groupAuth: new Map(closure.env.groupAuth),
            recvName: scope.recvName,
            values,
            closures: new Map(),
          },
          state
        );
      }
    }
  }
}

/** Inventories the route registrations of every production Go file. */
function analyzeFunctions() {
  const files = walk(backendDir).filter((p) => p.endsWith('.go') && !p.endsWith('_test.go'));
  const sources = new Map();
  const globalStringLists = new Map();
  for (const path of files) {
    const src = stripComments(readFileSync(path, 'utf8'));
    sources.set(path, src);
    for (const [name, list] of collectStringLists(src)) {
      if (!globalStringLists.has(name)) globalStringLists.set(name, list);
    }
  }

  const functions = [];
  for (const [path, src] of sources) {
    const { events } = collectEvents(src);
    const fileCtx = {
      file: rel(path),
      dir: normalizePkg(dirname(rel(path))),
      src,
      events,
      stringLists: collectStringLists(src),
      globalStringLists,
      mwVars: collectMiddlewareVars(src),
      importDirs: collectImports(src),
      receiverPkgs: collectReceiverPkgs(src),
    };
    for (const fn of findFunctions(src)) {
      const state = { routes: [], calls: [], forcedAuth: new Map(), skipped: [] };
      const routerVars = new Map();
      for (const name of routerParamNames(fn.paramsRaw)) routerVars.set(name, ['']);
      const recvName = (fn.receiver.match(/[A-Za-z_]\w*/) || [])[0] ?? null;
      walkScope(
        fileCtx,
        {
          bodyStart: fn.bodyStart,
          bodyEnd: fn.bodyEnd,
          routerVars,
          fiberVars: new Set(),
          groupAuth: new Map(),
          recvName,
          values: new Map(),
          closures: new Map(),
        },
        state
      );
      if (state.routes.length || state.calls.length) {
        functions.push({
          name: fn.name,
          file: fileCtx.file,
          dir: fileCtx.dir,
          routes: state.routes,
          calls: state.calls,
          forcedAuth: state.forcedAuth,
          skipped: state.skipped,
        });
      }
    }
  }
  return functions;
}

/** Callees of a `Register*Routes` call, restricted to the target package. */
function calleesFor(byName, call) {
  const all = byName.get(call.callee) ?? [];
  if (!call.calleeDir) return all;
  const scoped = all.filter((fn) => fn.dir === call.calleeDir);
  return scoped.length ? scoped : all;
}

/**
 * Resolves the prefix each `RegisterRoutes`-style function is mounted at by
 * propagating bases through the call graph until it reaches a fixed point.
 */
function resolveBases(functions) {
  const byName = new Map();
  for (const fn of functions) {
    if (!byName.has(fn.name)) byName.set(fn.name, []);
    byName.get(fn.name).push(fn);
  }

  const bases = new Map();
  const addBase = (fn, base) => {
    if (!bases.has(fn)) bases.set(fn, new Set());
    const set = bases.get(fn);
    const before = set.size;
    set.add(base);
    return set.size !== before;
  };

  // Roots: registrations wired straight onto the Fiber app (`a.Fiber`), not
  // merely onto a function's own router parameter.
  for (const fn of functions) {
    const rooted = [...fn.routes.filter((r) => r.rooted), ...fn.calls.filter((c) => c.rooted)];
    if (rooted.length) addBase(fn, '');
  }

  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const fn of functions) {
      const fnBases = bases.get(fn);
      if (!fnBases) continue;
      for (const call of fn.calls) {
        for (const callee of calleesFor(byName, call)) {
          for (const fnBase of fnBases) {
            for (const callBase of call.basePaths ?? []) {
              if (addBase(callee, joinRoute(fnBase, callBase))) changed = true;
            }
          }
        }
      }
    }
    if (!changed) break;
  }

  // A callee can also inherit the credential requirement passed as a parameter.
  for (const fn of functions) {
    for (const call of fn.calls) {
      const forced = fn.forcedAuth.get(call.callee);
      if (!forced) continue;
      for (const callee of calleesFor(byName, call)) {
        if (!callee.forcedAuth) callee.forcedAuth = new Map();
        callee.forcedAuth.set('__inherited__', forced);
      }
    }
  }

  return { byName, bases };
}

/** Builds one row per method+path, remembering where it was registered. */
function buildRows(functions, bases) {
  const rows = new Map();
  const unresolved = [];

  const addRow = (method, path, route, auth) => {
    const key = `${method} ${path}`;
    if (!rows.has(key)) {
      rows.set(key, {
        method,
        path,
        auth: new Set(),
        deprecated: false,
        sites: new Set(),
      });
    }
    const row = rows.get(key);
    row.auth.add(auth);
    row.deprecated = row.deprecated || route.deprecated;
    row.sites.add(`${route.file}:${route.line}`);
  };

  for (const fn of functions) {
    const prefixes = [...(bases.get(fn) ?? [])];
    const inherited = fn.forcedAuth?.get('__inherited__') ?? null;
    for (const route of fn.routes) {
      if (!route.relPaths || !route.basePaths) {
        unresolved.push(
          `${route.method} ${joinRoute(route.basePaths?.[0] ?? '', route.relPaths?.[0] ?? '')}` +
            ` (${route.file}:${route.line})`
        );
        continue;
      }
      if (!prefixes.length) {
        for (const inner of route.basePaths) {
          for (const p of route.relPaths) {
            unresolved.push(`${route.method} ${joinRoute(inner, p)} (${route.file}:${route.line})`);
          }
        }
        continue;
      }
      const auth = route.auth === 'public' && inherited ? inherited : route.auth;
      for (const prefix of prefixes) {
        for (const inner of route.basePaths) {
          for (const p of route.relPaths)
            addRow(route.method, joinRoute(joinRoute(prefix, inner), p), route, auth);
        }
      }
    }
  }

  return { rows, unresolved };
}

// ─── Repository consumers ───────────────────────────────────────────────────

const CALLER_ROOTS = [
  ['dashboard', 'apps/dashboard-web'],
  ['marketplace', 'apps/marketplace-next'],
  ['business', 'apps/business'],
  ['desktop', 'apps/cashier-desktop'],
  ['shared', 'packages'],
  ['script', 'scripts'],
  ['e2e', 'e2e'],
  ['test', 'test'],
];

const CALLER_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|go|sh|ps1|py|json|ya?ml|http)$/i;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Row matcher: `:param` matches an interpolation or a literal path segment. */
function matchersFor(path) {
  const cleaned = path.replace(/\/+$/, '') || '/';
  const candidates = new Set([cleaned]);
  if (cleaned.startsWith('/api/v1')) candidates.add(cleaned.slice('/api/v1'.length) || '/');
  const out = [];
  for (const candidate of candidates) {
    if (!candidate || candidate === '/') continue;
    const source = candidate
      .split('/')
      .map((seg) =>
        seg.startsWith(':') ? '(?:\\$\\{[^}]*\\}|[A-Za-z0-9._~%+-]+)' : escapeRegex(seg)
      )
      .join('/');
    out.push(new RegExp(`${source}(?![-A-Za-z0-9_/])`));
  }
  return out;
}

/** Static prefix of a route (segments before the first `:param`). */
function staticPrefix(path) {
  const out = [];
  for (const seg of path.split('/').filter(Boolean)) {
    if (seg.startsWith(':')) break;
    out.push(seg);
  }
  return `/${out.join('/')}`;
}

function routeLookupKeys(path) {
  const keys = new Set([staticPrefix(path)]);
  const stripped = staticPrefix(path).replace(/^\/api\/v1/, '') || '/';
  keys.add(stripped);
  return [...keys];
}

function lineLookup(text) {
  const newlines = [];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') newlines.push(i);
  return (index) => {
    let lo = 0;
    let hi = newlines.length - 1;
    let count = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (newlines[mid] < index) {
        count = mid + 1;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return count + 1;
  };
}

/** Path-like literals of a consumer file, exactly where they are written. */
function pathTokens(text, lineAt) {
  const tokens = [];
  const re = /\/[A-Za-z0-9_${}.\-]+(?:\/[A-Za-z0-9_${}.\-]+)*/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[0].length < 3) continue;
    tokens.push({ value: m[0], line: lineAt(m.index) });
  }
  return tokens;
}

function loadConsumerFiles() {
  const files = [];
  for (const [kind, dir] of CALLER_ROOTS) {
    for (const path of walk(join(root, dir))) {
      if (!CALLER_EXT.test(path)) continue;
      if (/package-lock\.json$/i.test(path)) continue;
      // The reporter itself is not a consumer of anything.
      if (/generate-api-inventory\.mjs$/i.test(path)) continue;
      const text = readFileSync(path, 'utf8');
      const lineAt = lineLookup(text);
      files.push({ kind, path: rel(path), tokens: pathTokens(text, lineAt) });
    }
  }
  return files;
}

function buildRowsIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    row.matchers = matchersFor(row.path);
    for (const key of routeLookupKeys(row.path)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(row);
    }
  }
  return index;
}

function tokenPrefixes(token) {
  const segs = token.split('/').filter(Boolean);
  const out = [];
  for (let i = segs.length; i >= 1; i--) out.push(`/${segs.slice(0, i).join('/')}`);
  return out;
}

/** Matches every consumer file against the routed rows, recording the first hit. */
function matchConsumers(rows, index, files) {
  for (const file of files) {
    for (const token of file.tokens) {
      const raw = token.value.split(/[?#]/)[0];
      // A literal ending in "/" is a path that gets concatenated later, so it is
      // also tested with a placeholder segment.
      const variants = [raw.replace(/\/+$/, ''), raw.endsWith('/') ? `${raw}x` : ''];
      const normalized = variants[0] || '/';
      for (const candidate of tokenPrefixes(normalized)) {
        for (const row of index.get(candidate) ?? []) {
          if (row.consumers.has(file.path)) continue;
          if (row.matchers.some((re) => variants.some((v) => v && re.test(v)))) {
            row.consumers.set(file.path, token.line);
          }
        }
      }
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────

const RETIREMENT_DEFAULT = 'Not approved for deletion';

function classify(row) {
  if (
    row.path === '/metrics' ||
    row.path.startsWith('/monitoring/') ||
    row.path === '/api/v1/status'
  ) {
    return 'OPERATIONAL';
  }
  if (row.consumers.size) return 'ACTIVE';
  const auth = [...row.auth];
  if (auth.length === 1 && auth[0] === 'public') return 'UNKNOWN (public)';
  return 'UNKNOWN';
}

function cellList(items, limit) {
  const shown = [...items].slice(0, limit);
  const rest = items.length - shown.length;
  const rendered = shown.map((item) => `\`${item}\``);
  if (rest > 0) rendered.push(`+${rest} more`);
  return rendered.join('<br>');
}

function renderReport({ rows, unresolved, consumerCount, skipped }) {
  const counts = new Map();
  for (const row of rows) {
    const key = classify(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const deprecated = rows.filter((row) => row.deprecated);
  const sorted = [...rows].sort((a, b) =>
    a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)
  );

  const table = sorted.map((row) => {
    const consumers = [...row.consumers].map(([file, line]) => `${file}:${line}`);
    const auth = [...row.auth].sort().join(', ') || '-';
    return (
      `| \`${row.method} ${row.path}\` | ${auth} | ${classify(row)} | ` +
      `${cellList(row.sites, 4)} | ` +
      `${consumers.length ? cellList(consumers, 6) : 'No consumer found in the repository'} | ` +
      `${row.deprecated ? 'Sunset announced in code' : RETIREMENT_DEFAULT} |`
    );
  });

  const summary = [
    '| Classification | Routes |',
    '|---|---|',
    ...['ACTIVE', 'OPERATIONAL', 'UNKNOWN', 'UNKNOWN (public)']
      .filter((key) => counts.has(key))
      .map((key) => `| ${key} | ${counts.get(key)} |`),
    `| **Total** | **${rows.length}** |`,
  ].join('\n');

  return `# API Inventory

> Generated by \`node scripts/generate-api-inventory.mjs\` (\`npm run api:inventory\`). Do not hand-edit.
>
> Route prefixes are resolved by following the Fiber \`Router.Group()\` chains and the
> \`RegisterRoutes(router)\` call graph — not by guessing from file names. Consumers are
> matched against repository sources (web apps, cashier desktop, scripts, E2E, tests).
>
> A missing consumer is **not** proof that a route is dead. Nothing here approves a
> deletion: only production telemetry can do that.

## Summary

${summary}

- Routes marked \`Deprecation\` in code: **${deprecated.length}**
- Consumer files scanned: **${consumerCount}**
- Routes whose prefix could not be resolved statically: **${new Set(unresolved).size}** (listed at the end)
- Dynamic route helpers skipped (arguments not statically resolvable): **${new Set(skipped).size}** (listed at the end)

## Classification rules

- **ACTIVE** — a repository consumer was found for the route.
- **OPERATIONAL** — liveness/readiness/metrics/status surface used by infrastructure, not by product code.
- **UNKNOWN (public)** — no consumer found and the route needs no credential; it is part of the public contract.
- **UNKNOWN** — no consumer found in the repository. This is a *review queue*, not a deletion list.
- **LEGACY** — only an explicit compatibility decision; the word "legacy" in a file name is not evidence.
- **UNUSED** — approved only after production telemetry (\`http_requests_total\`, \`http_auth_source_total\`),
  the cashier Desktop app, E2E, scripts and webhooks show zero usage for a release period.
- **EXTERNAL** — public, provider callback, webhook or production client requiring confirmation outside this repository.

## Inventory

| Endpoint | Auth | Classification | Registered by | Repository consumers | Retirement |
|---|---|---|---|---|---|
${table.join('\n')}
${unresolved.length ? `## Unresolved prefixes\n\nThese registrations were found but their mount prefix could not be resolved statically; check them by hand before drawing conclusions.\n\n${[...new Set(unresolved)].map((item) => `- \`${item}\``).join('\n')}\n` : ''}${skipped.length ? `## Skipped dynamic helpers\n\nRoute helpers whose path argument could not be resolved to concrete values, so their routes are not in the table above. They are never treated as removed.\n\n${[...new Set(skipped)].map((item) => `- \`${item}\``).join('\n')}\n` : ''}## Compatibility policy

1. Keep the current \`/api/v1\` contract while clients migrate. No \`v2\` prefix without a breaking change.
2. Deprecate with \`middleware.Deprecated(...)\` only once an owner, a documentation URL and a sunset date exist; it emits
   \`Deprecation\`, \`Sunset\` and \`Link\` without changing the response contract.
3. Preserve Bearer authentication for Cashier Desktop.
4. Watch \`http_auth_source_total{source="session_cookie"}\` before stopping the \`ray_session\` refresh-token bridge.
5. Delete reviewed endpoints in a separate release, after the sunset period and telemetry confirmation.

## Known limitations

- Consumers are matched from path literals; a route built entirely from variables at runtime may show no consumer.
- A \`:param\` segment also matches a literal, so \`/shops/:shopId\` can be credited by a call to \`/shops/me\`. Verify before deleting.
- \`http_auth_source_total\` is the authority on real usage; this report is a map, not a verdict.
`;
}

function main() {
  const functions = analyzeFunctions();
  const { bases } = resolveBases(functions);
  const { rows, unresolved } = buildRows(functions, bases);
  const list = [...rows.values()];
  for (const row of list) if (!row.consumers) row.consumers = new Map();

  const index = buildRowsIndex(list);
  const files = loadConsumerFiles();
  matchConsumers(list, index, files);

  const skipped = functions.flatMap((fn) => fn.skipped ?? []);

  writeFileSync(
    outputPath,
    renderReport({
      rows: list,
      unresolved,
      skipped,
      consumerCount: files.length,
    }),
    'utf8'
  );

  const counts = new Map();
  for (const row of list) {
    const key = classify(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const summary = [...counts].map(([key, count]) => `${key}=${count}`).join(' ');
  console.log(`Wrote ${rel(outputPath)}: ${list.length} routes (${summary}).`);
  console.log(
    `Unresolved prefixes: ${new Set(unresolved).size}; skipped dynamic helpers: ${new Set(skipped).size}.`
  );
  console.log('No route is approved for deletion by this report.');
}

main();
