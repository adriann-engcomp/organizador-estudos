// Avaliador seguro de fórmulas (sem eval). Suporta:
//   números (ponto decimal), variáveis (P1, Lab, T_2...), + - * / ^, parênteses,
//   comparações (>= <= > < == !=), e funções:
//   min(..), max(..), media(..), soma(..), sqrt(x), abs(x), arred(x, casas),
//   se(condição, valor_se_verdadeiro, valor_se_falso)
// Exemplo: se(min(P1,P2) >= 3, 0.4*P1 + 0.4*P2 + 0.2*L, min(P1,P2))

(function () {
  const FUNCS = {
    min: (...a) => Math.min(...a),
    max: (...a) => Math.max(...a),
    media: (...a) => a.reduce((s, x) => s + x, 0) / a.length,
    avg: (...a) => a.reduce((s, x) => s + x, 0) / a.length,
    soma: (...a) => a.reduce((s, x) => s + x, 0),
    sqrt: (x) => Math.sqrt(x),
    abs: (x) => Math.abs(x),
    arred: (x, c = 0) => { const f = 10 ** c; return Math.round(x * f) / f; },
  };

  function tokenize(src) {
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
        const v = parseFloat(src.slice(i, j));
        if (isNaN(v)) throw new Error("Número inválido perto de '" + src.slice(i, j) + "'");
        toks.push({ t: "num", v }); i = j; continue;
      }
      if (/[A-Za-z_À-ú]/.test(c)) {
        let j = i; while (j < src.length && /[A-Za-z0-9_À-ú]/.test(src[j])) j++;
        toks.push({ t: "id", v: src.slice(i, j) }); i = j; continue;
      }
      const two = src.slice(i, i + 2);
      if ([">=", "<=", "==", "!="].includes(two)) { toks.push({ t: "op", v: two }); i += 2; continue; }
      if ("+-*/^(),<>".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
      if (c === ";") { toks.push({ t: "op", v: "," }); i++; continue; } // aceita ; como separador
      throw new Error("Caractere inesperado: '" + c + "'");
    }
    return toks;
  }

  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const eat = (v) => {
      const t = toks[p];
      if (!t || t.v !== v) throw new Error("Esperado '" + v + "'" + (t ? " mas encontrei '" + t.v + "'" : " no fim da fórmula"));
      p++; return t;
    };
    function comparison() {
      let l = additive();
      while (peek() && [">=", "<=", ">", "<", "==", "!="].includes(peek().v)) {
        const op = toks[p++].v; l = { k: "bin", op, l, r: additive() };
      }
      return l;
    }
    function additive() {
      let l = term();
      while (peek() && (peek().v === "+" || peek().v === "-")) { const op = toks[p++].v; l = { k: "bin", op, l, r: term() }; }
      return l;
    }
    function term() {
      let l = unary();
      while (peek() && (peek().v === "*" || peek().v === "/")) { const op = toks[p++].v; l = { k: "bin", op, l, r: unary() }; }
      return l;
    }
    function unary() {
      if (peek() && peek().v === "-") { p++; return { k: "neg", e: unary() }; }
      if (peek() && peek().v === "+") { p++; return unary(); }
      return power();
    }
    function power() {
      const b = primary();
      if (peek() && peek().v === "^") { p++; return { k: "bin", op: "^", l: b, r: unary() }; }
      return b;
    }
    function primary() {
      const t = toks[p];
      if (!t) throw new Error("Fórmula terminou inesperadamente");
      if (t.t === "num") { p++; return { k: "num", v: t.v }; }
      if (t.t === "id") {
        p++;
        if (peek() && peek().v === "(") {
          p++;
          const args = [];
          if (peek() && peek().v !== ")") {
            args.push(comparison());
            while (peek() && peek().v === ",") { p++; args.push(comparison()); }
          }
          eat(")");
          const name = t.v.toLowerCase();
          if (name !== "se" && !FUNCS[name]) throw new Error("Função desconhecida: " + t.v);
          return { k: "call", f: name, args };
        }
        return { k: "var", v: t.v };
      }
      if (t.v === "(") { p++; const e = comparison(); eat(")"); return e; }
      throw new Error("Símbolo inesperado: '" + t.v + "'");
    }
    const ast = comparison();
    if (p < toks.length) throw new Error("Sobrou algo na fórmula: '" + toks[p].v + "'");
    return ast;
  }

  function evaluate(ast, env) {
    switch (ast.k) {
      case "num": return ast.v;
      case "var": {
        if (!(ast.v in env) || env[ast.v] === null || env[ast.v] === undefined || isNaN(env[ast.v]))
          throw new Error("Sem valor para " + ast.v);
        return env[ast.v];
      }
      case "neg": return -evaluate(ast.e, env);
      case "bin": {
        const a = evaluate(ast.l, env), b = evaluate(ast.r, env);
        switch (ast.op) {
          case "+": return a + b; case "-": return a - b; case "*": return a * b;
          case "/": return a / b; case "^": return a ** b;
          case ">=": return a >= b ? 1 : 0; case "<=": return a <= b ? 1 : 0;
          case ">": return a > b ? 1 : 0; case "<": return a < b ? 1 : 0;
          case "==": return a === b ? 1 : 0; case "!=": return a !== b ? 1 : 0;
        }
      }
      // falls through
      case "call": {
        if (ast.f === "se") {
          if (ast.args.length !== 3) throw new Error("se(condição, a, b) precisa de 3 argumentos");
          return evaluate(ast.args[0], env) ? evaluate(ast.args[1], env) : evaluate(ast.args[2], env);
        }
        return FUNCS[ast.f](...ast.args.map((a) => evaluate(a, env)));
      }
    }
    throw new Error("Expressão inválida");
  }

  function variables(ast, out = new Set()) {
    if (!ast) return out;
    if (ast.k === "var") out.add(ast.v);
    if (ast.l) variables(ast.l, out);
    if (ast.r) variables(ast.r, out);
    if (ast.e) variables(ast.e, out);
    if (ast.args) ast.args.forEach((a) => variables(a, out));
    return out;
  }

  // Encontra o menor x em [lo, hi] (todas as incógnitas = x) tal que f(x) >= alvo.
  // Usa varredura + bissecção, então funciona mesmo com se()/min()/max().
  function minNeeded(ast, env, unknowns, alvo, lo = 0, hi = 10) {
    const f = (x) => { const e = { ...env }; unknowns.forEach((u) => (e[u] = x)); return evaluate(ast, e); };
    if (f(lo) >= alvo) return { x: lo, status: "ja" };
    if (f(hi) < alvo) return { x: null, status: "impossivel", max: f(hi) };
    const N = 200; let prev = lo;
    for (let i = 1; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N;
      if (f(x) >= alvo) {
        let a = prev, b = x;
        for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (f(m) >= alvo) b = m; else a = m; }
        return { x: b, status: "ok" };
      }
      prev = x;
    }
    return { x: null, status: "impossivel", max: f(hi) };
  }

  window.Expr = { parse, evaluate, variables, minNeeded };
})();
