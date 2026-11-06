/* Organizador de Estudos — Engenharia de Computação Unicamp (AA)
 * App 100% local: dados ficam no localStorage do navegador.
 * Use "Backup" para exportar/importar um arquivo JSON.
 */
(function () {
  "use strict";

  const KEY = "organizador-estudos-v1";
  const CUR = window.CURRICULO;
  const CONT = window.CONTEUDO;

  // ---------------- utilidades ----------------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (s) => { if (s === "" || s === null || s === undefined) return null; const v = parseFloat(String(s).replace(",", ".")); return isNaN(v) ? null : v; };
  const fmt = (v, d = 2) => (v === null || v === undefined || isNaN(v) ? "—" : Number(v).toFixed(d).replace(".", ","));
  const fmtUp = (v) => fmt(Math.ceil(v * 100 - 1e-9) / 100); // arredonda pra cima: nota necessária
  const hoje = () => isoDate(new Date());
  function isoDate(d) { const z = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
  const fmtData = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return d + "/" + m + "/" + y; };
  const diasAte = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(hoje() + "T00:00:00")) / 86400000);
  // Ex.: "F 128" -> f_.html#disc-f_128 ; "MC102" -> mc.html#disc-mc102
  const ementaURL = (cod) => {
    const c = cod.trim().replace(/\s+/, "_").toLowerCase();
    return `https://www.dac.unicamp.br/sistemas/catalogos/grad/catalogo${CUR.catalogo}/disciplinas/${c.slice(0, 2)}.html#disc-${c}`;
  };
  const CAT = window.CATALOGO_DISC || {};
  // horas de extensão de uma disciplina: catálogo; EX/MX sem dado = créditos × 15
  const extPadrao = (codigo, creditos) => {
    const c = (codigo || "").toUpperCase();
    if (CAT[c]) return CAT[c].ext;
    if (/^(EX|MX)/.test(c)) return Number(creditos || 0) * CUR.horasPorCredito;
    return 0;
  };
  function semanaISO(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dia = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dia);
    const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + "-S" + String(Math.ceil(((t - ini) / 86400000 + 1) / 7)).padStart(2, "0");
  }

  // ---------------- estado ----------------
  function estadoInicial() {
    return {
      versao: 1,
      grade: { status: {}, eletivas: [] }, // status[codigo] = pendente | cursando | aprovado
      semestres: [],
      materias: {},
      objetivos: { habitos: [], metas: [] },
      prefs: { tema: "auto" },
    };
  }
  let S;
  function carregar() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || estadoInicial(); } catch { S = estadoInicial(); }
    const base = estadoInicial();
    for (const k in base) if (!(k in S)) S[k] = base[k];
    // migração catálogo 2026 -> 2024 (EM424 virou EM423)
    if (S.grade.status.EM424 && !S.grade.status.EM423) S.grade.status.EM423 = S.grade.status.EM424;
    delete S.grade.status.EM424;
    for (const e of S.grade.eletivas) if (e.ext === undefined) e.ext = extPadrao(e.codigo, e.creditos);
  }
  let salvarTimer;
  function salvar() {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); flash("Salvo"); }
      catch (e) { alert("Não consegui salvar no navegador: " + e.message + "\nFaça um backup em Configurações."); }
    }, 150);
  }
  function flash(msg) {
    const el = $("#flash"); el.textContent = msg; el.classList.add("on");
    clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove("on"), 900);
  }

  // ---------------- criação de matéria ----------------
  function novaMateria(codigo, semestreId, extra = {}) {
    const info = CUR.disciplinas[codigo];
    const c = CONT[codigo] || {};
    const cat = CAT[codigo];
    const id = uid();
    S.materias[id] = {
      id, codigo: codigo || "", semestreId,
      nome: extra.nome || (info ? info[0] : "Nova matéria"),
      creditos: extra.creditos ?? (info ? info[1] : 4),
      professor: "", horario: "", sala: "",
      topicos: (c.topicos || []).slice(),
      pdd: { link: "", texto: "" },
      cronograma: [],
      livros: (c.livros || []).map((l) => ({ id: uid(), ...l, status: "quero" })),
      notas: {
        formula: "(P1 + P2) / 2",
        mediaMin: 5, notaMax: 10, freqMin: cat ? cat.freq : 75, freq: "",
        valores: {},
        exame: { ativo: cat ? cat.exame : true, minParaExame: 2.5, formulaFinal: "(M + E) / 2" },
      },
      motivacao: {
        porque: c.porque || "", melhor: c.melhor || "", onde: c.onde || "",
        quem: c.quem || "", dinheiro: c.dinheiro || "",
        refs: (c.refs || []).map((r) => ({ ...r })),
      },
      anotacoes: "",
    };
    return S.materias[id];
  }

  // ---------------- roteador ----------------
  const rotas = {
    painel: viewPainel, grade: viewGrade, semestres: viewSemestres,
    materia: viewMateria, objetivos: viewObjetivos, config: viewConfig,
  };
  function render() {
    const [rota, ...args] = (location.hash.replace(/^#\/?/, "") || "painel").split("/");
    const fn = rotas[rota] || viewPainel;
    $$(".nav a").forEach((a) => a.classList.toggle("ativo", a.dataset.r === (rota === "materia" ? "semestres" : rota)));
    const main = $("#main");
    main.innerHTML = fn(...args.map(decodeURIComponent));
    main.dataset.view = rota;
    bind(main, rota, args);
    window.scrollTo(0, 0);
    if (rota === "grade" && args[0]) document.getElementById(args[0])?.scrollIntoView();
  }
  // re-render preservando scroll
  function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }
  window.addEventListener("hashchange", render);

  // ---------------- PAINEL ----------------
  function creditosResumo() {
    let obrig = 0, obrigFeito = 0, cursando = 0;
    for (const s of CUR.semestres) for (const c of s.codigos) {
      const cr = CUR.disciplinas[c][1]; obrig += cr;
      const st = S.grade.status[c];
      if (st === "aprovado") obrigFeito += cr; else if (st === "cursando") cursando += cr;
    }
    const totalElet = CUR.gruposEletivos.reduce((s, g) => s + g.creditos, 0);
    const eletFeito = Math.min(totalElet, S.grade.eletivas.filter((e) => e.status === "aprovado").reduce((s, e) => s + Number(e.creditos || 0), 0));
    return { obrig, obrigFeito, cursando, totalElet, eletFeito, total: obrig + totalElet, feito: obrigFeito + eletFeito };
  }
  // horas de extensão: obrigatórias (catálogo) + eletivas cadastradas
  function extensaoResumo() {
    let feito = 0, cursando = 0;
    const itens = [];
    for (const s of CUR.semestres) for (const c of s.codigos) {
      const h = CAT[c] ? CAT[c].ext : 0; if (!h) continue;
      const st = S.grade.status[c] || "pendente";
      itens.push({ codigo: c, nome: CUR.disciplinas[c][0], h, st });
      if (st === "aprovado") feito += h; else if (st === "cursando") cursando += h;
    }
    for (const e of S.grade.eletivas) {
      const h = Number(e.ext || 0); if (!h) continue;
      itens.push({ codigo: e.codigo, nome: e.nome, h, st: e.status });
      if (e.status === "aprovado") feito += h; else if (e.status === "cursando") cursando += h;
    }
    const meta = CUR.extensao.horas;
    return { feito, cursando, meta, falta: Math.max(0, meta - feito), pct: Math.min(100, Math.round((100 * feito) / meta)), itens };
  }
  function semestreAtual() { return S.semestres.find((s) => s.atual) || S.semestres[S.semestres.length - 1]; }

  function viewPainel() {
    const cr = creditosResumo();
    const pct = Math.round((100 * cr.feito) / cr.total);
    const sem = semestreAtual();
    const mats = sem ? Object.values(S.materias).filter((m) => m.semestreId === sem.id) : [];
    const proximos = [];
    for (const m of Object.values(S.materias)) for (const ev of m.cronograma)
      if (!ev.feito && ev.data && diasAte(ev.data) >= 0 && diasAte(ev.data) <= 21) proximos.push({ ...ev, m });
    proximos.sort((a, b) => a.data.localeCompare(b.data));
    const habs = S.objetivos.habitos;
    const metasAbertas = S.objetivos.metas.filter((g) => !g.feito && ["semanal", "mensal"].includes(g.tipo));

    return `
    <header class="topo"><h1>Painel</h1><p class="sub">${esc(CUR.curso)} · ${esc(CUR.modalidade)}</p></header>
    <section class="cards">
      <div class="card stat">
        <div class="lbl">Progresso no curso</div>
        <div class="big">${pct}%</div>
        <div class="barra"><span style="width:${pct}%"></span></div>
        <div class="mini">${cr.feito} de ${cr.total} créditos · ${cr.cursando} cursando</div>
      </div>
      ${(() => { const x = extensaoResumo(); return `<div class="card stat">
        <div class="lbl">Horas de extensão</div>
        <div class="big">${x.feito}/${x.meta} h</div>
        <div class="barra ext"><span style="width:${x.pct}%"></span></div>
        <div class="mini">${x.falta ? "faltam " + x.falta + " h" : "requisito cumprido ✓"}${x.cursando ? " · " + x.cursando + " h cursando" : ""}</div>
        <a class="link" href="#/grade/extensao">Ver extensão →</a>
      </div>`; })()}
      <div class="card stat">
        <div class="lbl">Hoje (${fmtData(hoje())})</div>
        <div class="big">${habs.filter((h) => h.hist[hoje()]).length}/${habs.length}</div>
        <div class="mini">hábitos diários feitos</div>
        <a class="link" href="#/objetivos">Ver objetivos →</a>
      </div>
      <div class="card stat">
        <div class="lbl">Semestre atual</div>
        <div class="big">${sem ? esc(sem.nome) : "—"}</div>
        <div class="mini">${mats.length} matérias · ${mats.reduce((s, m) => s + Number(m.creditos || 0), 0)} créditos</div>
        <a class="link" href="#/semestres">${sem ? "Abrir semestres →" : "Criar semestre →"}</a>
      </div>
    </section>

    <section class="duas">
      <div class="card">
        <h2>Hábitos de hoje</h2>
        ${habs.length ? `<ul class="check">${habs.map((h) => `
          <li><label><input type="checkbox" data-hab="${h.id}" ${h.hist[hoje()] ? "checked" : ""}> ${esc(h.titulo)}</label>
          <span class="tag">🔥 ${streak(h)}</span></li>`).join("")}</ul>`
        : `<p class="vazio">Nenhum hábito ainda. <a href="#/objetivos">Criar →</a></p>`}
        ${metasAbertas.length ? `<h3>Metas da semana/mês</h3><ul class="lista">${metasAbertas.slice(0, 6).map((g) => `<li>${esc(g.titulo)} <span class="tag">${g.tipo}</span> <span class="mini">${progressoMeta(g)}%</span></li>`).join("")}</ul>` : ""}
      </div>
      <div class="card">
        <h2>Próximos 21 dias</h2>
        ${proximos.length ? `<ul class="lista">${proximos.map((p) => `
          <li><span class="tag t-${p.tipo}">${esc(p.tipo)}</span> <b>${fmtData(p.data)}</b> (${diasAte(p.data) === 0 ? "hoje" : "em " + diasAte(p.data) + "d"}) —
          <a href="#/materia/${p.m.id}/cronograma">${esc(p.m.codigo || p.m.nome)}</a>: ${esc(p.titulo)}</li>`).join("")}</ul>`
        : `<p class="vazio">Nada no cronograma das matérias para as próximas 3 semanas.</p>`}
      </div>
    </section>

    ${mats.length ? `<section class="card">
      <h2>Situação das matérias — ${esc(sem.nome)}</h2>
      <table class="tab"><thead><tr><th>Matéria</th><th>Média parcial</th><th>Situação</th></tr></thead><tbody>
      ${mats.map((m) => { const r = calcNotas(m); return `<tr><td><a href="#/materia/${m.id}">${esc(m.codigo)} ${esc(m.nome)}</a></td><td>${r.media !== null ? fmt(r.media) : "—"}</td><td>${r.resumoHTML}</td></tr>`; }).join("")}
      </tbody></table></section>` : ""}`;
  }

  // ---------------- GRADE ----------------
  function viewGrade() {
    const cr = creditosResumo();
    const st = (c) => S.grade.status[c] || "pendente";
    const ord = { pendente: "cursando", cursando: "aprovado", aprovado: "pendente" };
    return `
    <header class="topo"><h1>Grade curricular</h1>
      <p class="sub">${esc(CUR.curso)} · ${esc(CUR.modalidade)} · Catálogo ${CUR.catalogo}.
      Clique numa disciplina para mudar o status (pendente → cursando → aprovada).</p></header>
    <section class="cards">
      <div class="card stat"><div class="lbl">Obrigatórias</div><div class="big">${cr.obrigFeito}/${cr.obrig}</div><div class="barra"><span style="width:${(100 * cr.obrigFeito) / cr.obrig}%"></span></div></div>
      <div class="card stat"><div class="lbl">Eletivas</div><div class="big">${cr.eletFeito}/${cr.totalElet}</div><div class="barra"><span style="width:${(100 * cr.eletFeito) / cr.totalElet}%"></span></div></div>
      <div class="card stat"><div class="lbl">Total</div><div class="big">${cr.feito}/${cr.total}</div><div class="mini">créditos</div></div>
      ${(() => { const x = extensaoResumo(); return `<div class="card stat"><div class="lbl">Extensão</div><div class="big">${x.feito}/${x.meta} h</div><div class="barra ext"><span style="width:${x.pct}%"></span></div></div>`; })()}
    </section>
    <div class="legenda"><span class="st pendente">pendente</span><span class="st cursando">cursando</span><span class="st aprovado">aprovada</span></div>
    <section class="grade">
      ${CUR.semestres.map((s) => `
      <div class="sem">
        <h3>${s.n}º semestre <span class="mini">${s.creditos} cr</span></h3>
        ${s.codigos.map((c) => { const [nome, crd] = CUR.disciplinas[c]; return `
          <button class="disc st ${st(c)}" data-st="${esc(c)}" data-next="${ord[st(c)]}" title="${esc(nome)}">
            <b>${esc(c)}</b><span>${esc(nome)}</span><small>${crd} cr</small>
          </button>`; }).join("")}
        ${s.eletivos ? `<div class="disc eletivo"><b>Eletivas</b><span>${s.eletivos} créditos</span></div>` : ""}
      </div>`).join("")}
    </section>

    <section class="card">
      <h2>Eletivas (${cr.eletFeito}/${cr.totalElet} créditos)</h2>
      <div class="grupos">${CUR.gruposEletivos.map((g) => {
        const feito = S.grade.eletivas.filter((e) => e.grupo === g.id && e.status === "aprovado").reduce((s, e) => s + Number(e.creditos || 0), 0);
        return `<div class="grupo"><b>${esc(g.titulo)}</b><div class="mini">${esc(g.descricao)}</div>
          <div class="barra"><span style="width:${Math.min(100, (100 * feito) / g.creditos)}%"></span></div><div class="mini">${feito}/${g.creditos} créditos</div></div>`;
      }).join("")}</div>
      <form class="linha" id="fElet">
        <select name="grupo">${CUR.gruposEletivos.map((g) => `<option value="${g.id}">Grupo ${g.id}</option>`).join("")}</select>
        <input name="busca" list="dlElet" placeholder="Código ou nome (ex.: MC886)" required>
        <datalist id="dlElet">${CUR.gruposEletivos.flatMap((g) => g.lista.map((d) => `<option value="${d[0]} – ${esc(d[1])}">`)).join("")}</datalist>
        <input name="creditos" type="number" min="1" max="24" placeholder="cr" style="width:5em" title="Créditos">
        <input name="ext" type="number" min="0" step="15" placeholder="h ext." style="width:6em" title="Horas de extensão (deixe vazio para usar o catálogo; EX/MX = créditos × 15)">
        <button class="btn">Adicionar eletiva</button>
      </form>
      ${S.grade.eletivas.length ? `<table class="tab"><thead><tr><th>Grupo</th><th>Disciplina</th><th>Créd.</th><th>Extensão (h)</th><th>Status</th><th></th></tr></thead><tbody>
        ${S.grade.eletivas.map((e) => `<tr><td>${e.grupo}</td><td>${esc(e.codigo)} ${esc(e.nome)}</td><td>${e.creditos}</td>
          <td><input type="number" min="0" step="15" data-elext="${e.id}" value="${Number(e.ext || 0)}" style="width:6em"></td>
          <td><select data-elst="${e.id}">${["pendente", "cursando", "aprovado"].map((x) => `<option ${e.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></td>
          <td><button class="x" data-eldel="${e.id}" title="Remover">✕</button></td></tr>`).join("")}</tbody></table>` : ""}
    </section>

    ${(() => { const x = extensaoResumo(); return `<section class="card" id="extensao">
      <h2>🤝 Horas de extensão — ${x.feito} de ${x.meta} h</h2>
      <div class="barra ext grande"><span style="width:${x.pct}%"></span></div>
      <p class="mini">${x.falta ? `Faltam <b>${x.falta} h</b>` : "<b>Requisito cumprido ✓</b>"}${x.cursando ? ` · ${x.cursando} h em disciplinas que você está cursando` : ""}.
      Regra do catálogo: ${esc(CUR.extensao.regra)}</p>
      <div class="grupos">
        ${CUR.extensao.caminhos.map((c) => `<div class="grupo"><b>${esc(c.titulo)}</b><div class="mini">${esc(c.texto)}</div></div>`).join("")}
      </div>
      ${x.itens.length ? `<table class="tab"><thead><tr><th>Disciplina</th><th>Horas de extensão</th><th>Status</th></tr></thead><tbody>
        ${x.itens.map((i) => `<tr><td>${esc(i.codigo)} ${esc(i.nome)}</td><td>${i.h} h</td><td><span class="tag ${i.st === "aprovado" ? "bem" : i.st === "cursando" ? "meio" : ""}">${i.st}</span></td></tr>`).join("")}
      </tbody></table>` : `<p class="vazio">Nenhuma disciplina com extensão cadastrada ainda. Adicione eletivas dos grupos I (EX/MX) e III (MC854 ou MX853) acima.</p>`}
      <p class="mini">As horas vêm do catálogo (Atividades Orientadas + Práticas de Extensão). Confirme sempre no histórico/integralização da DAC.</p>
    </section>`; })()}

    <section class="card">
      <h2>Observações do catálogo</h2>
      <ul class="lista">${CUR.observacoes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      <p class="mini">Certificados de estudos do IC: ${CUR.certificados.map(esc).join(" · ")}</p>
      <p class="mini">Fontes: ${CUR.fontes.map((f) => `<a href="${f}" target="_blank" rel="noopener">${f}</a>`).join("<br>")}</p>
    </section>`;
  }

  // ---------------- SEMESTRES ----------------
  function viewSemestres() {
    const naoAdicionadas = (semId) => {
      const ja = new Set(Object.values(S.materias).filter((m) => m.semestreId === semId).map((m) => m.codigo));
      return Object.keys(CUR.disciplinas).filter((c) => !ja.has(c));
    };
    const sugestao = (semN) => CUR.semestres.find((s) => s.n === semN);
    return `
    <header class="topo"><h1>Semestres e matérias</h1>
      <p class="sub">Crie um semestre (ex.: 2026/1) e adicione as matérias. Cada matéria tem PDD, cronograma, bibliografia, notas, prompts e motivação.</p></header>
    <form class="card linha" id="fSem">
      <input name="nome" placeholder="Nome do semestre (ex.: 2026/1)" required>
      <select name="sug"><option value="">Começar vazio</option>${CUR.semestres.map((s) => `<option value="${s.n}">Preencher com o ${s.n}º semestre da proposta</option>`).join("")}</select>
      <button class="btn">Criar semestre</button>
    </form>
    ${S.semestres.length === 0 ? `<p class="vazio">Nenhum semestre ainda.</p>` : ""}
    ${S.semestres.slice().reverse().map((s) => {
      const mats = Object.values(S.materias).filter((m) => m.semestreId === s.id);
      return `<section class="card">
        <div class="cab">
          <h2>${esc(s.nome)} ${s.atual ? `<span class="tag">atual</span>` : ""}</h2>
          <div class="acoes">
            ${s.atual ? "" : `<button class="btn sec" data-atual="${s.id}">Marcar como atual</button>`}
            <button class="btn sec" data-semdel="${s.id}">Excluir</button>
          </div>
        </div>
        <div class="mats">${mats.map((m) => { const r = calcNotas(m); return `
          <a class="mat" href="#/materia/${m.id}">
            <b>${esc(m.codigo)}</b> <span>${esc(m.nome)}</span>
            <small>${m.creditos} cr · ${r.media !== null ? "média " + fmt(r.media) : "média —"}</small>
            <div class="st-mini">${r.resumoHTML}</div>
          </a>`; }).join("") || `<p class="vazio">Sem matérias.</p>`}</div>
        <form class="linha" data-addmat="${s.id}">
          <select name="cod"><option value="">— matéria da grade —</option>
            ${naoAdicionadas(s.id).sort().map((c) => `<option value="${esc(c)}">${esc(c)} – ${esc(CUR.disciplinas[c][0])}</option>`).join("")}
          </select>
          <span class="mini">ou</span>
          <input name="nome" placeholder="Outra (eletiva, nome livre)">
          <input name="cod2" placeholder="Código" style="width:7em">
          <button class="btn">Adicionar</button>
        </form>
      </section>`;
    }).join("")}`;
  }

  // ---------------- MATÉRIA ----------------
  const ABAS = [
    ["visao", "Por que estudo isso?"], ["notas", "Notas e média"], ["cronograma", "Cronograma"],
    ["pdd", "PDD"], ["bibliografia", "Bibliografia"], ["prompts", "Prompts de IA"], ["anotacoes", "Anotações"],
  ];
  function viewMateria(id, aba = "visao") {
    const m = S.materias[id];
    if (!m) return `<p class="vazio">Matéria não encontrada. <a href="#/semestres">Voltar</a></p>`;
    const sem = S.semestres.find((s) => s.id === m.semestreId);
    const conteudo = { visao: abaVisao, notas: abaNotas, cronograma: abaCronograma, pdd: abaPDD, bibliografia: abaBiblio, prompts: abaPrompts, anotacoes: abaAnotacoes }[aba] || abaVisao;
    return `
    <header class="topo">
      <a class="voltar" href="#/semestres">← ${esc(sem ? sem.nome : "Semestres")}</a>
      <h1><input class="titulo" data-m="nome" value="${esc(m.nome)}"></h1>
      <div class="meta">
        <label>Código <input data-m="codigo" value="${esc(m.codigo)}" style="width:6em"></label>
        <label>Créditos <input data-m="creditos" type="number" value="${esc(m.creditos)}" style="width:4em"></label>
        <label>Professor(a) <input data-m="professor" value="${esc(m.professor)}"></label>
        <label>Horário/sala <input data-m="horario" value="${esc(m.horario)}"></label>
        ${m.codigo && /^[A-Z]{1,2}\s?\d{3}$/.test(m.codigo) ? `<a class="link" target="_blank" rel="noopener" href="${ementaURL(m.codigo)}">Ementa oficial (DAC) ↗</a>` : ""}
      </div>
    </header>
    <nav class="abas">${ABAS.map(([k, t]) => `<a href="#/materia/${m.id}/${k}" class="${k === aba ? "ativo" : ""}">${t}</a>`).join("")}</nav>
    <section class="aba" data-mid="${m.id}" data-aba="${aba}">${conteudo(m)}</section>
    <p class="rodape-mat"><button class="btn sec" data-matdel="${m.id}">Excluir matéria</button></p>`;
  }

  function abaVisao(m) {
    const mo = m.motivacao;
    const campo = (k, titulo, icone, dica) => `
      <div class="card motiv">
        <h3>${icone} ${titulo}</h3>
        <textarea data-mot="${k}" rows="3" placeholder="${esc(dica)}">${esc(mo[k])}</textarea>
      </div>`;
    return `
    <div class="motivs">
      ${campo("porque", "Por que estudo isso?", "🎯", "O que essa matéria resolve?")}
      ${campo("melhor", "Por que seria uma pessoa melhor aprendendo isso?", "🌱", "Que habilidade de pensamento ela treina?")}
      ${campo("onde", "Onde aplico isso?", "🛠️", "Aplicações reais, projetos, empregos...")}
      ${campo("quem", "Quem criou isso e por quê?", "📜", "História: quem, quando, qual problema queria resolver")}
      ${campo("dinheiro", "Vou ganhar mais dinheiro se aprender bem isso?", "💰", "Evidências de mercado")}
    </div>
    <div class="card">
      <h3>📚 Referências que justificam</h3>
      <ul class="refs">${mo.refs.map((r, i) => `<li>${r.u ? `<a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.t)}</a>` : esc(r.t)} <button class="x" data-refdel="${i}">✕</button></li>`).join("") || `<li class="vazio">Nenhuma referência.</li>`}</ul>
      <form class="linha" id="fRef"><input name="t" placeholder="Título / citação" required><input name="u" placeholder="Link (opcional)"><button class="btn">Adicionar</button></form>
      <details class="mini"><summary>Referências gerais (aprendizagem e retorno de habilidades)</summary>
        <ul class="refs">${window.REFS_GERAIS.map((r) => `<li><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.t)}</a></li>`).join("")}</ul>
      </details>
      <p class="mini">Os textos são um ponto de partida — edite com suas próprias razões. Salários variam por país/época: os dados do BLS são dos EUA e servem como indicador de demanda relativa entre profissões.</p>
    </div>`;
  }

  // ---- notas ----
  function calcNotas(m) {
    const n = m.notas;
    const out = { media: null, parcial: null, vars: [], erro: null, resumoHTML: "<span class='mini'>—</span>", detalhes: "" };
    let ast;
    try { ast = Expr.parse(n.formula); } catch (e) { out.erro = e.message; return out; }
    const vars = [...Expr.variables(ast)];
    out.vars = vars;
    const env = {}; const desconhecidas = [];
    for (const v of vars) { const x = num(n.valores[v]); if (x === null) desconhecidas.push(v); else env[v] = x; }
    const alvo = Number(n.mediaMin), max = Number(n.notaMax) || 10;
    const freq = num(n.freq);
    const freqOk = freq === null || freq >= Number(n.freqMin);
    const freqAviso = freq !== null && !freqOk ? `<div class="alerta">⚠️ Frequência ${fmt(freq, 0)}% abaixo do mínimo (${n.freqMin}%) — reprovação por falta.</div>` : "";

    try {
      if (desconhecidas.length === 0) {
        out.media = Expr.evaluate(ast, env);
        if (!freqOk) { out.resumoHTML = `<span class="tag mal">reprovado por falta</span>`; }
        else if (out.media >= alvo) { out.resumoHTML = `<span class="tag bem">aprovado</span>`; }
        else if (n.exame.ativo && out.media >= Number(n.exame.minParaExame)) {
          const ex = exameNecessario(m, out.media);
          out.resumoHTML = `<span class="tag meio">exame: precisa ${ex.status === "ok" ? "≥ " + fmtUp(ex.x) : ex.status === "ja" ? "0" : "— impossível"}</span>`;
        } else out.resumoHTML = `<span class="tag mal">abaixo da média</span>`;
        out.detalhes = `<div class="res big">Média: <b>${fmt(out.media)}</b></div>${freqAviso}`;
        if (out.media < alvo && n.exame.ativo && out.media >= Number(n.exame.minParaExame)) {
          const ex = exameNecessario(m, out.media);
          out.detalhes += `<div class="res">Exame: ${ex.status === "ok" ? `você precisa de <b>${fmtUp(ex.x)}</b> no exame (fórmula final: ${esc(n.exame.formulaFinal)})` : ex.status === "impossivel" ? "nem com nota máxima no exame você alcança a média." : "já passa."}</div>`;
        }
        return out;
      }
      // parcial: o que já tem, assumindo 0 nas que faltam
      const env0 = { ...env }; desconhecidas.forEach((u) => (env0[u] = 0));
      out.parcial = Expr.evaluate(ast, env0);
      const r = Expr.minNeeded(ast, env, desconhecidas, alvo, 0, max);
      const quem = desconhecidas.join(", ");
      if (r.status === "ja") {
        out.resumoHTML = `<span class="tag bem">já garantiu</span>`;
        out.detalhes = `<div class="res big">Você já garantiu média ≥ ${fmt(alvo, 1)} 🎉</div>`;
      } else if (r.status === "ok") {
        out.resumoHTML = `<span class="tag meio">precisa ${fmtUp(r.x)} em ${esc(quem)}</span>`;
        out.detalhes = `<div class="res big">Para média ${fmt(alvo, 1)}, você precisa tirar <b>${fmtUp(r.x)}</b> em ${desconhecidas.length > 1 ? "cada uma de" : ""} <b>${esc(quem)}</b>.</div>
`;
        if (desconhecidas.length > 1) out.detalhes += cenariosHTML(ast, env, desconhecidas, alvo, max);
      } else {
        out.resumoHTML = n.exame.ativo ? `<span class="tag mal">só com exame</span>` : `<span class="tag mal">média inalcançável</span>`;
        out.detalhes = `<div class="res big">Mesmo com ${fmt(max, 1)} em ${esc(quem)}, a média máxima seria <b>${fmt(r.max)}</b>.</div>`;
        if (n.exame.ativo) out.detalhes += `<div class="res">Ainda dá para ir ao exame se a média ficar ≥ ${fmt(n.exame.minParaExame, 1)}.</div>`;
      }
      out.detalhes += freqAviso;
    } catch (e) { out.erro = e.message; }
    return out;
  }
  function exameNecessario(m, media) {
    try {
      const ast = Expr.parse(m.notas.exame.formulaFinal);
      const vs = [...Expr.variables(ast)];
      const unk = vs.filter((v) => v !== "M");
      return Expr.minNeeded(ast, { M: media }, unk, Number(m.notas.mediaMin), 0, Number(m.notas.notaMax) || 10);
    } catch { return { status: "erro" }; }
  }
  // tabela: se a 1ª incógnita for x, quanto precisa nas outras
  function cenariosHTML(ast, env, unk, alvo, max) {
    const [a, ...resto] = unk;
    const linhas = [];
    for (let x = 0; x <= max; x += max / 10) {
      const e = { ...env, [a]: x };
      const r = Expr.minNeeded(ast, e, resto, alvo, 0, max);
      linhas.push(`<tr><td>${fmt(x, 1)}</td><td>${r.status === "ok" ? fmtUp(r.x) : r.status === "ja" ? "0 (já passa)" : "impossível"}</td></tr>`);
    }
    return `<details class="cen"><summary>Cenários: se eu tirar X em ${esc(a)}, quanto preciso em ${esc(resto.join(", "))}?</summary>
      <table class="tab"><thead><tr><th>${esc(a)}</th><th>${esc(resto.join(", "))} (cada)</th></tr></thead><tbody>${linhas.join("")}</tbody></table></details>`;
  }
  function abaNotas(m) {
    const n = m.notas;
    const r = calcNotas(m);
    return `
    <div class="duas">
      <div class="card">
        <h3>Fórmula da média (copie do PDD)</h3>
        <input class="mono" id="formula" value="${esc(n.formula)}" spellcheck="false">
        <p class="mini">Use nomes como <code>P1</code>, <code>P2</code>, <code>L</code>, <code>T1</code>. Operadores: <code>+ - * / ^ ( )</code>.
        Funções: <code>min</code>, <code>max</code>, <code>media</code>, <code>soma</code>, <code>sqrt</code>, <code>arred</code> e
        <code>se(condição, a, b)</code>. Ex.: <code>se(min(P1,P2) >= 3, 0.35*P1 + 0.35*P2 + 0.3*L, min(P1,P2))</code></p>
        <div id="formErro" class="alerta" ${r.erro ? "" : "hidden"}>${esc(r.erro || "")}</div>
        <div class="grade-cfg">
          <label>Média para passar <input type="number" step="0.1" id="mediaMin" value="${esc(n.mediaMin)}"></label>
          <label>Nota máxima <input type="number" step="0.1" id="notaMax" value="${esc(n.notaMax)}"></label>
          <label>Frequência mínima (%) <input type="number" id="freqMin" value="${esc(n.freqMin)}"></label>
          <label>Minha frequência (%) <input type="number" id="freq" value="${esc(n.freq)}" placeholder="opcional"></label>
        </div>
        <details ${n.exame.ativo ? "open" : ""}><summary>Exame</summary>
          <label class="chk"><input type="checkbox" id="exAtivo" ${n.exame.ativo ? "checked" : ""}> Disciplina tem exame</label>
          <label>Média mínima para fazer exame <input type="number" step="0.1" id="exMin" value="${esc(n.exame.minParaExame)}"></label>
          <label>Fórmula da nota final (M = média, E = exame) <input class="mono" id="exForm" value="${esc(n.exame.formulaFinal)}"></label>
        </details>
        <p class="mini">As regras exatas (pesos, exame, condições) estão no PDD de cada disciplina — confira lá.</p>
      </div>
      <div class="card">
        <h3>Minhas notas</h3>
        <div id="varsBox" class="vars">${varsHTML(m, r.vars)}</div>
        <p class="mini">Deixe em branco o que ainda não saiu: o app calcula quanto você precisa.</p>
        <div id="resBox" class="resbox">${r.erro ? "" : r.detalhes}</div>
      </div>
    </div>`;
  }
  const varsHTML = (m, vars) => vars.map((v) => `<label>${esc(v)} <input type="text" inputmode="decimal" data-var="${esc(v)}" value="${esc(m.notas.valores[v] ?? "")}" placeholder="?"></label>`).join("") || "<span class='mini'>Escreva a fórmula ao lado.</span>";

  // ---- cronograma ----
  function abaCronograma(m) {
    const evs = m.cronograma.slice().sort((a, b) => (a.data || "9").localeCompare(b.data || "9"));
    const feitos = evs.filter((e) => e.feito).length;
    return `
    <div class="card">
      <div class="cab"><h3>Cronograma (${feitos}/${evs.length} concluídos)</h3>
        <button class="btn sec" id="gerarSemanas">Gerar semanas…</button></div>
      <form class="linha" id="fEv">
        <input type="date" name="data">
        <select name="tipo"><option>aula</option><option>prova</option><option>lista</option><option>entrega</option><option>estudo</option><option>outro</option></select>
        <input name="titulo" placeholder="Assunto / atividade (ex.: P1 – limites e derivadas)" required style="flex:1">
        <button class="btn">Adicionar</button>
      </form>
      <table class="tab crono"><thead><tr><th></th><th>Data</th><th>Tipo</th><th>Atividade</th><th></th></tr></thead><tbody>
        ${evs.map((e) => `<tr class="${e.feito ? "feito" : ""} ${e.data && diasAte(e.data) < 0 && !e.feito ? "atrasado" : ""}">
          <td><input type="checkbox" data-evok="${e.id}" ${e.feito ? "checked" : ""}></td>
          <td><input type="date" data-evdata="${e.id}" value="${esc(e.data)}"></td>
          <td><span class="tag t-${esc(e.tipo)}">${esc(e.tipo)}</span></td>
          <td><input data-evtit="${e.id}" value="${esc(e.titulo)}"></td>
          <td><button class="x" data-evdel="${e.id}">✕</button></td></tr>`).join("") || `<tr><td colspan="5" class="vazio">Nada ainda. Copie o cronograma do PDD ou gere as semanas automaticamente.</td></tr>`}
      </tbody></table>
    </div>`;
  }

  // ---- PDD ----
  function abaPDD(m) {
    const cat = CAT[(m.codigo || "").toUpperCase()];
    return `
    ${cat ? `<div class="card">
      <h3>Dados do catálogo ${CUR.catalogo}</h3>
      <div class="catinfo">
        <div><span class="mini">Pré-requisitos</span><b>${esc(cat.pre && !/^Não há/.test(cat.pre) ? cat.pre : "nenhum")}</b></div>
        <div><span class="mini">Exame final</span><b>${cat.exame ? "sim" : "não"}</b></div>
        <div><span class="mini">Frequência mínima</span><b>${cat.freq}%</b></div>
        <div><span class="mini">Horas de extensão</span><b>${cat.ext} h</b></div>
      </div>
      <p><span class="mini">Ementa</span><br>${esc(cat.ementa)}</p>
      <p class="mini">Pré-requisitos AAxxx são exigências de créditos/integralização definidas pela DAC.
        <a href="${ementaURL(m.codigo)}" target="_blank" rel="noopener">Ver no catálogo ↗</a></p>
    </div>` : ""}
    <div class="card">
      <h3>Plano de Desenvolvimento da Disciplina (PDD)</h3>
      <label>Link do PDD (Moodle/Google Classroom/site do professor)
        <input data-pdd="link" value="${esc(m.pdd.link)}" placeholder="https://..."></label>
      ${m.pdd.link ? `<p><a class="link" href="${esc(m.pdd.link)}" target="_blank" rel="noopener">Abrir PDD ↗</a></p>` : ""}
      <label>Conteúdo do PDD (cole aqui: ementa, critérios de avaliação, datas, bibliografia oficial)
        <textarea data-pdd="texto" rows="18" placeholder="Cole o texto do PDD aqui...">${esc(m.pdd.texto)}</textarea></label>
      <p class="mini">Dica: depois de colar, copie a fórmula de média para a aba <a href="#/materia/${m.id}/notas">Notas</a> e as datas para o <a href="#/materia/${m.id}/cronograma">Cronograma</a>.</p>
      <h3>Tópicos da disciplina</h3>
      <p class="mini">Usados para gerar os prompts. Um por linha.</p>
      <textarea id="topicos" rows="6">${esc(m.topicos.join("\n"))}</textarea>
    </div>`;
  }

  // ---- bibliografia ----
  function abaBiblio(m) {
    const st = { quero: "quero ler", lendo: "lendo", feito: "concluído" };
    return `
    <div class="card">
      <h3>Bibliografia com exercícios resolvidos</h3>
      <p class="mini">Prioridade: livros com MUITOS exercícios resolvidos (ex.: Coleção Schaum), para treinar sem depender de IA. Adicione também a bibliografia oficial do PDD.</p>
      <ul class="livros">${m.livros.map((l) => `<li>
        <div><b>${esc(l.t)}</b> — ${esc(l.a)}<div class="mini">${linkify(l.n)}</div></div>
        <select data-livst="${l.id}">${Object.entries(st).map(([k, v]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>
        <button class="x" data-livdel="${l.id}">✕</button></li>`).join("") || `<li class="vazio">Sem livros.</li>`}</ul>
      <form class="linha" id="fLivro">
        <input name="t" placeholder="Título" required><input name="a" placeholder="Autor"><input name="n" placeholder="Observação / link" style="flex:1">
        <button class="btn">Adicionar</button>
      </form>
      <p class="mini">Bibliotecas: o SBU Unicamp dá acesso a muitos e-books (Minha Biblioteca, Pearson) — busque o título em <a href="https://www.sbu.unicamp.br" target="_blank" rel="noopener">sbu.unicamp.br</a>.</p>
    </div>`;
  }
  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  // ---- prompts ----
  const PROMPTS = [
    {
      id: "resolver", titulo: "Resolver exercício (direto, contextualizado e procedural)", precisa: ["exercicio"],
      txt: `Você é um professor de {materia} de um curso de Engenharia de Computação (Unicamp). Resolva o exercício abaixo de forma DIRETA, CONTEXTUALIZADA e PROCEDURAL.

Regras obrigatórias:
1. Antes de qualquer conta, explique em 2–4 frases, em linguagem natural, o que o problema pede e qual é a ideia central do raciocínio.
2. Liste os dados, as incógnitas e as hipóteses/simplificações.
3. Resolva em passos numerados. Em CADA passo: primeiro uma frase dizendo POR QUE esse passo é feito; só depois a conta.
4. Não use fórmula pronta sem justificar. Se uma fórmula for realmente necessária, diga em uma linha de onde ela vem (intuição ou dedução rápida). Prefira deduzir a partir de princípios.
5. Não pule passos algébricos relevantes. Sem enrolação.
6. No final: (a) resposta destacada; (b) verificação (unidades, ordem de grandeza, caso limite ou substituição); (c) o "método" em uma linha para eu reutilizar em exercícios parecidos.

Exercício:
{exercicio}`,
    },
    {
      id: "dica", titulo: "Só uma dica (sem spoiler)", precisa: ["exercicio"],
      txt: `Estou estudando {materia} e travei no exercício abaixo. NÃO resolva. Me dê apenas a menor dica possível que me faça avançar um passo (uma pergunta orientadora ou o princípio que devo usar). Se eu pedir "mais", dê a próxima dica, sempre a menor possível.

Exercício:
{exercicio}`,
    },
    {
      id: "corrigir", titulo: "Corrigir a minha resolução", precisa: ["exercicio", "tentativa"],
      txt: `Sou estudante de {materia}. Abaixo estão o exercício e a MINHA resolução. Atue como um corretor exigente:
1. Diga se a resposta final está certa.
2. Aponte o PRIMEIRO passo em que o raciocínio (não só a conta) falha, e explique por quê em linguagem natural.
3. Dê uma dica para eu corrigir sozinho. Não reescreva a solução inteira, a menos que eu peça.
4. Comente se há um caminho mais simples/elegante.

Exercício:
{exercicio}

Minha resolução:
{tentativa}`,
    },
    {
      id: "conceito", titulo: "Entender um conceito do zero (sem decoreba)", precisa: ["topico"],
      txt: `Quero entender "{topico}" em {materia}, com foco em raciocínio, sem decoreba de fórmulas.
Estruture assim:
1. Qual problema real motivou esse conceito? (contexto histórico em 2 frases)
2. A intuição, em linguagem simples, com uma analogia concreta.
3. Um exemplo numérico pequeno, resolvido passo a passo (texto explicando antes de cada conta).
4. A formalização: deduza as fórmulas a partir da intuição, em vez de apresentá-las prontas.
5. Erros e confusões mais comuns de estudantes.
6. Onde isso aparece em Engenharia de Computação.
7. Termine com 3 perguntas para eu testar meu entendimento — NÃO dê as respostas ainda.`,
    },
    {
      id: "lista", titulo: "Gerar lista de treino com gabarito comentado", precisa: ["topico"],
      txt: `Crie 6 exercícios de "{topico}" ({materia}), em dificuldade crescente, no estilo de provas de universidade (Unicamp): 2 fáceis, 2 médios, 2 difíceis. Pelo menos 2 devem ser aplicados a um contexto de computação/engenharia.
Coloque TODAS as soluções no final, separadas por uma linha "===== GABARITO =====". Cada solução deve ser procedural: uma frase explicando o raciocínio antes de cada conta, sem fórmulas prontas sem justificativa, e com verificação no final.`,
    },
    {
      id: "feynman", titulo: "Técnica Feynman (eu explico, a IA avalia)", precisa: ["topico", "tentativa"],
      txt: `Vou explicar "{topico}" ({materia}) com minhas próprias palavras, como se ensinasse a um colega. Avalie como um professor exigente:
- O que está correto?
- Quais lacunas, imprecisões ou erros conceituais existem?
- Qual pergunta um professor faria para revelar se eu realmente entendi?
Não reescreva tudo; aponte o que preciso estudar.

Minha explicação:
{tentativa}`,
    },
    {
      id: "revisao", titulo: "Plano de revisão para prova", precisa: ["dias"],
      txt: `Tenho prova de {materia} em {dias} dias. Os tópicos são:
{topicos}

Monte um plano diário de estudo usando prática de recuperação (fazer exercícios e se testar, em vez de reler) e repetição espaçada. Para cada dia: tópicos, tipo de exercício, quantidade aproximada e um mini-teste de 3 perguntas. Reserve o último dia para uma simulação de prova cronometrada. Indique em qual capítulo de livros como {livros} encontro exercícios resolvidos para cada tópico.`,
    },
  ];
  function abaPrompts(m) {
    return `
    <div class="card">
      <h3>Prompts prontos para IA</h3>
      <p class="mini">Primeiro tente pelos livros. Se travar, use estes prompts: eles forçam uma resolução direta, contextualizada (texto antes da conta), procedural e sem decoreba.</p>
      <div class="pform">
        <label>Modelo <select id="pTipo">${PROMPTS.map((p) => `<option value="${p.id}">${esc(p.titulo)}</option>`).join("")}</select></label>
        <label data-campo="topico">Tópico <input id="pTopico" list="dlTop" placeholder="Escolha ou digite">
          <datalist id="dlTop">${m.topicos.map((t) => `<option value="${esc(t)}">`).join("")}</datalist></label>
        <label data-campo="dias">Dias até a prova <input id="pDias" type="number" value="7" min="1"></label>
        <label data-campo="exercicio">Enunciado do exercício <textarea id="pEx" rows="4" placeholder="Cole o enunciado aqui (ou descreva a imagem)"></textarea></label>
        <label data-campo="tentativa">Minha resolução / explicação <textarea id="pTent" rows="4"></textarea></label>
      </div>
      <div class="cab"><h3>Prompt gerado</h3><button class="btn" id="pCopiar">Copiar</button></div>
      <pre id="pOut" class="prompt"></pre>
    </div>`;
  }
  function gerarPrompt(m) {
    const p = PROMPTS.find((x) => x.id === $("#pTipo").value);
    $$("[data-campo]").forEach((el) => (el.hidden = !p.precisa.includes(el.dataset.campo)));
    const nomeMat = (m.codigo ? m.codigo + " – " : "") + m.nome;
    const txt = p.txt
      .replaceAll("{materia}", nomeMat)
      .replaceAll("{topico}", $("#pTopico").value || "[TÓPICO]")
      .replaceAll("{exercicio}", $("#pEx").value || "[COLE O ENUNCIADO AQUI]")
      .replaceAll("{tentativa}", $("#pTent").value || "[ESCREVA SUA RESOLUÇÃO/EXPLICAÇÃO AQUI]")
      .replaceAll("{dias}", $("#pDias").value || "7")
      .replaceAll("{topicos}", m.topicos.map((t) => "- " + t).join("\n") || "- [liste os tópicos]")
      .replaceAll("{livros}", m.livros.slice(0, 3).map((l) => l.t).join("; ") || "os da bibliografia");
    $("#pOut").textContent = txt;
  }

  function abaAnotacoes(m) {
    return `<div class="card"><h3>Anotações livres</h3>
      <textarea id="anot" rows="22" placeholder="Resumos, dúvidas para levar ao atendimento, erros que cometi nas listas...">${esc(m.anotacoes)}</textarea></div>`;
  }

  // ---------------- OBJETIVOS ----------------
  const TIPOS = [
    ["semanal", "Semanais", () => "Semana " + semanaISO()],
    ["mensal", "Mensais", () => new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })],
    ["anual", "Anuais", () => String(new Date().getFullYear())],
    ["profissional", "Profissionais", () => "carreira"],
    ["vida", "Na vida", () => "propósito"],
  ];
  function streak(h) {
    let n = 0; const d = new Date();
    if (!h.hist[isoDate(d)]) d.setDate(d.getDate() - 1); // ainda dá tempo hoje
    while (h.hist[isoDate(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function progressoMeta(g) {
    if (g.feito) return 100;
    if (g.passos.length) return Math.round((100 * g.passos.filter((p) => p.feito).length) / g.passos.length);
    return Number(g.progresso || 0);
  }
  function viewObjetivos() {
    const ultimos = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return isoDate(d); });
    const sigla = (iso) => ["D", "S", "T", "Q", "Q", "S", "S"][new Date(iso + "T00:00:00").getDay()];
    return `
    <header class="topo"><h1>Objetivos</h1><p class="sub">Diários (hábitos), semanais, mensais, anuais, profissionais e de vida.</p></header>
    <section class="card">
      <h2>☀️ Diários — hábitos</h2>
      <table class="tab habitos"><thead><tr><th>Hábito</th>${ultimos.map((d) => `<th class="${d === hoje() ? "hj" : ""}">${sigla(d)}<br><small>${d.slice(8)}</small></th>`).join("")}<th>Sequência</th><th></th></tr></thead><tbody>
      ${S.objetivos.habitos.map((h) => `<tr><td><input data-habtit="${h.id}" value="${esc(h.titulo)}"></td>
        ${ultimos.map((d) => `<td class="${d === hoje() ? "hj" : ""}"><input type="checkbox" data-hab="${h.id}" data-dia="${d}" ${h.hist[d] ? "checked" : ""}></td>`).join("")}
        <td>🔥 ${streak(h)}</td><td><button class="x" data-habdel="${h.id}">✕</button></td></tr>`).join("") || `<tr><td colspan="10" class="vazio">Ex.: "2h de estudo focado", "1 lista de exercícios", "Revisar o dia (10 min)", "Dormir antes de 23h".</td></tr>`}
      </tbody></table>
      <form class="linha" id="fHab"><input name="titulo" placeholder="Novo hábito diário" required style="flex:1"><button class="btn">Adicionar</button></form>
    </section>
    ${TIPOS.map(([tipo, titulo, periodo]) => {
      const metas = S.objetivos.metas.filter((g) => g.tipo === tipo);
      const abertas = metas.filter((g) => !g.feito), feitas = metas.filter((g) => g.feito);
      return `<section class="card">
        <div class="cab"><h2>${{ semanal: "📅", mensal: "🗓️", anual: "📈", profissional: "💼", vida: "🧭" }[tipo]} ${titulo}</h2><span class="mini">${esc(periodo())}</span></div>
        <div class="metas">${abertas.map(metaHTML).join("") || `<p class="vazio">Nenhuma meta aberta.</p>`}</div>
        <form class="linha" data-addmeta="${tipo}">
          <input name="titulo" placeholder="Nova meta (${titulo.toLowerCase()})" required style="flex:1">
          <input name="prazo" type="date" title="Prazo (opcional)">
          <button class="btn">Adicionar</button>
        </form>
        ${feitas.length ? `<details><summary>Concluídas (${feitas.length})</summary>${feitas.map(metaHTML).join("")}</details>` : ""}
      </section>`;
    }).join("")}`;
  }
  function metaHTML(g) {
    const p = progressoMeta(g);
    return `<div class="meta-item ${g.feito ? "feito" : ""}">
      <div class="cab">
        <label class="chk"><input type="checkbox" data-metaok="${g.id}" ${g.feito ? "checked" : ""}> <input class="sem-borda" data-metatit="${g.id}" value="${esc(g.titulo)}"></label>
        <div class="acoes">${g.prazo ? `<span class="tag ${diasAte(g.prazo) < 0 && !g.feito ? "mal" : ""}">até ${fmtData(g.prazo)}</span>` : ""}<button class="x" data-metadel="${g.id}">✕</button></div>
      </div>
      <div class="barra"><span style="width:${p}%"></span></div>
      <div class="mini">${p}% ${g.passos.length ? "" : `· <input type="range" min="0" max="100" step="5" value="${Number(g.progresso || 0)}" data-metaprog="${g.id}">`}</div>
      <textarea class="sem-borda mini" data-metadesc="${g.id}" rows="1" placeholder="Por que essa meta importa? Como vou medir?">${esc(g.desc || "")}</textarea>
      <ul class="passos">${g.passos.map((s) => `<li><label><input type="checkbox" data-passo="${g.id}:${s.id}" ${s.feito ? "checked" : ""}> ${esc(s.t)}</label> <button class="x" data-passodel="${g.id}:${s.id}">✕</button></li>`).join("")}</ul>
      <form class="linha mini" data-addpasso="${g.id}"><input name="t" placeholder="+ passo" required><button class="btn sec">+</button></form>
    </div>`;
  }

  // ---------------- CONFIG ----------------
  function viewConfig() {
    const tam = new Blob([JSON.stringify(S)]).size;
    return `
    <header class="topo"><h1>Configurações e backup</h1></header>
    <section class="card">
      <h2>Backup</h2>
      <p>Seus dados ficam salvos <b>apenas neste navegador</b> (${(tam / 1024).toFixed(1)} KB). Exporte um backup regularmente — e para usar em outro computador, exporte aqui e importe lá.</p>
      <div class="linha"><button class="btn" id="exportar">Exportar backup (.json)</button>
      <label class="btn sec">Importar backup<input type="file" id="importar" accept=".json,application/json" hidden></label></div>
    </section>
    <section class="card">
      <h2>📱 Usar no celular (Android)</h2>
      ${matchMedia("(display-mode: standalone)").matches ? `<p>✅ Você está usando o app instalado.</p>` : `
      <p>Abra este endereço no Chrome do Android e toque em <b>⋮ → Instalar app</b> (ou "Adicionar à tela inicial"). Ele abre em tela cheia e funciona offline.</p>
      <button class="btn" id="instalar" ${instalarEvt ? "" : "hidden"}>Instalar agora</button>`}
      <p class="mini">Os dados do celular e do computador são separados. Para levar de um para o outro: <b>Exportar backup</b> num e <b>Importar backup</b> no outro.</p>
    </section>
    <section class="card">
      <h2>Aparência</h2>
      <label>Tema <select id="tema">${["auto", "claro", "escuro"].map((t) => `<option ${S.prefs.tema === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    </section>
    <section class="card">
      <h2>Zona de perigo</h2>
      <button class="btn perigo" id="resetar">Apagar todos os dados</button>
    </section>`;
  }
  function aplicarTema() { document.documentElement.dataset.theme = { claro: "light", escuro: "dark" }[S.prefs.tema] || ""; }

  // ---------------- eventos ----------------
  function bind(root, rota, args) {
    // checkboxes de hábito (painel e objetivos)
    $$("[data-hab]", root).forEach((el) => el.addEventListener("change", () => {
      const h = S.objetivos.habitos.find((x) => x.id === el.dataset.hab);
      const d = el.dataset.dia || hoje();
      if (el.checked) h.hist[d] = true; else delete h.hist[d];
      salvar(); rerender();
    }));

    if (rota === "grade") {
      $$("[data-st]", root).forEach((b) => b.addEventListener("click", () => {
        const c = b.dataset.st; const nx = b.dataset.next;
        if (nx === "pendente") delete S.grade.status[c]; else S.grade.status[c] = nx;
        salvar(); rerender();
      }));
      $("#fElet").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const txt = f.busca.value.trim(); const g = CUR.gruposEletivos.find((x) => x.id === f.grupo.value);
        const achado = CUR.gruposEletivos.flatMap((x) => x.lista).find((d) => txt.toUpperCase().startsWith(d[0]) || d[1].toLowerCase() === txt.toLowerCase());
        const [codigo, nome] = achado ? [achado[0], achado[1]] : (txt.match(/^([A-Z]{1,2}\s?\d{3})\s*[–-]?\s*(.*)$/i) || [null, "", txt]).slice(1);
        const cr = num(f.creditos.value) ?? (achado ? achado[2] : 4);
        const cod = (codigo || "").toUpperCase().trim();
        const ext = num(f.ext.value) ?? (g.id === "I" && !CAT[cod] ? cr * CUR.horasPorCredito : extPadrao(cod, cr));
        S.grade.eletivas.push({ id: uid(), grupo: g.id, codigo: cod, nome: nome || txt, creditos: cr, ext, status: "pendente" });
        salvar(); rerender();
      });
      $$("[data-elext]", root).forEach((el) => el.addEventListener("change", () => { S.grade.eletivas.find((e) => e.id === el.dataset.elext).ext = num(el.value) || 0; salvar(); rerender(); }));
      $$("[data-elst]", root).forEach((s) => s.addEventListener("change", () => { S.grade.eletivas.find((e) => e.id === s.dataset.elst).status = s.value; salvar(); rerender(); }));
      $$("[data-eldel]", root).forEach((b) => b.addEventListener("click", () => { S.grade.eletivas = S.grade.eletivas.filter((e) => e.id !== b.dataset.eldel); salvar(); rerender(); }));
    }

    if (rota === "semestres") {
      $("#fSem").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const sem = { id: uid(), nome: f.nome.value.trim(), atual: S.semestres.length === 0 };
        S.semestres.push(sem);
        if (f.sug.value) {
          for (const c of CUR.semestres.find((s) => s.n === Number(f.sug.value)).codigos) {
            novaMateria(c, sem.id);
            if (!S.grade.status[c]) S.grade.status[c] = "cursando";
          }
        }
        salvar(); rerender();
      });
      $$("[data-addmat]", root).forEach((f) => f.addEventListener("submit", (e) => {
        e.preventDefault();
        const semId = f.dataset.addmat;
        if (f.cod.value) { novaMateria(f.cod.value, semId); if (!S.grade.status[f.cod.value]) S.grade.status[f.cod.value] = "cursando"; }
        else if (f.nome.value.trim()) novaMateria(f.cod2.value.trim().toUpperCase(), semId, { nome: f.nome.value.trim() });
        else return;
        salvar(); rerender();
      }));
      $$("[data-atual]", root).forEach((b) => b.addEventListener("click", () => { S.semestres.forEach((s) => (s.atual = s.id === b.dataset.atual)); salvar(); rerender(); }));
      $$("[data-semdel]", root).forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.semdel; const s = S.semestres.find((x) => x.id === id);
        if (!confirm(`Excluir o semestre "${s.nome}" e todas as suas matérias (notas, cronograma, anotações)?`)) return;
        S.semestres = S.semestres.filter((x) => x.id !== id);
        for (const k in S.materias) if (S.materias[k].semestreId === id) delete S.materias[k];
        salvar(); rerender();
      }));
    }

    if (rota === "materia") bindMateria(root, S.materias[args[0]], args[1] || "visao");

    if (rota === "objetivos") {
      $("#fHab").addEventListener("submit", (e) => { e.preventDefault(); S.objetivos.habitos.push({ id: uid(), titulo: e.target.titulo.value.trim(), hist: {} }); salvar(); rerender(); });
      $$("[data-habtit]", root).forEach((el) => el.addEventListener("change", () => { S.objetivos.habitos.find((h) => h.id === el.dataset.habtit).titulo = el.value; salvar(); }));
      $$("[data-habdel]", root).forEach((b) => b.addEventListener("click", () => { if (!confirm("Remover hábito e seu histórico?")) return; S.objetivos.habitos = S.objetivos.habitos.filter((h) => h.id !== b.dataset.habdel); salvar(); rerender(); }));
      const meta = (id) => S.objetivos.metas.find((g) => g.id === id);
      $$("[data-addmeta]", root).forEach((f) => f.addEventListener("submit", (e) => {
        e.preventDefault();
        S.objetivos.metas.push({ id: uid(), tipo: f.dataset.addmeta, titulo: f.titulo.value.trim(), prazo: f.prazo.value, desc: "", progresso: 0, passos: [], feito: false, criada: hoje() });
        salvar(); rerender();
      }));
      $$("[data-metaok]", root).forEach((el) => el.addEventListener("change", () => { meta(el.dataset.metaok).feito = el.checked; salvar(); rerender(); }));
      $$("[data-metatit]", root).forEach((el) => el.addEventListener("change", () => { meta(el.dataset.metatit).titulo = el.value; salvar(); }));
      $$("[data-metadesc]", root).forEach((el) => {
        const ajusta = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; };
        ajusta(); el.addEventListener("input", ajusta);
        el.addEventListener("change", () => { meta(el.dataset.metadesc).desc = el.value; salvar(); });
      });
      $$("[data-metaprog]", root).forEach((el) => el.addEventListener("change", () => { meta(el.dataset.metaprog).progresso = Number(el.value); salvar(); rerender(); }));
      $$("[data-metadel]", root).forEach((b) => b.addEventListener("click", () => { if (!confirm("Remover esta meta?")) return; S.objetivos.metas = S.objetivos.metas.filter((g) => g.id !== b.dataset.metadel); salvar(); rerender(); }));
      $$("[data-addpasso]", root).forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); meta(f.dataset.addpasso).passos.push({ id: uid(), t: f.t.value.trim(), feito: false }); salvar(); rerender(); }));
      $$("[data-passo]", root).forEach((el) => el.addEventListener("change", () => { const [g, p] = el.dataset.passo.split(":"); meta(g).passos.find((s) => s.id === p).feito = el.checked; salvar(); rerender(); }));
      $$("[data-passodel]", root).forEach((b) => b.addEventListener("click", () => { const [g, p] = b.dataset.passodel.split(":"); meta(g).passos = meta(g).passos.filter((s) => s.id !== p); salvar(); rerender(); }));
    }

    if (rota === "config") {
      $("#exportar").addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
        a.download = `organizador-estudos-${hoje()}.json`; a.click(); URL.revokeObjectURL(a.href);
      });
      $("#importar").addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const dados = JSON.parse(await file.text());
          if (!dados || typeof dados !== "object" || !("materias" in dados)) throw new Error("arquivo não parece um backup deste app");
          if (!confirm("Substituir os dados atuais pelos do backup?")) return;
          S = dados; localStorage.setItem(KEY, JSON.stringify(S)); carregar(); aplicarTema(); flash("Backup importado"); rerender();
        } catch (err) { alert("Não foi possível importar: " + err.message); }
      });
      $("#tema").addEventListener("change", (e) => { S.prefs.tema = e.target.value; aplicarTema(); salvar(); });
      $("#instalar")?.addEventListener("click", async () => { if (!instalarEvt) return; instalarEvt.prompt(); await instalarEvt.userChoice; instalarEvt = null; rerender(); });
      $("#resetar").addEventListener("click", () => {
        if (!confirm("Isso apaga TODOS os dados deste app neste navegador. Exportou um backup?")) return;
        if (prompt('Digite APAGAR para confirmar') !== "APAGAR") return;
        S = estadoInicial(); localStorage.setItem(KEY, JSON.stringify(S)); rerender();
      });
    }
  }

  function bindMateria(root, m, aba) {
    if (!m) return;
    $$("[data-m]", root).forEach((el) => el.addEventListener("change", () => {
      const k = el.dataset.m; m[k] = k === "creditos" ? Number(el.value) : k === "codigo" ? el.value.toUpperCase() : el.value; salvar();
    }));
    const del = $("[data-matdel]", root);
    del.addEventListener("click", () => {
      if (!confirm(`Excluir a matéria "${m.nome}" com notas, cronograma e anotações?`)) return;
      delete S.materias[m.id]; salvar(); location.hash = "#/semestres";
    });

    if (aba === "visao") {
      $$("[data-mot]", root).forEach((el) => {
        const ajusta = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + 4 + "px"; };
        requestAnimationFrame(ajusta); el.addEventListener("input", ajusta);
        el.addEventListener("change", () => { m.motivacao[el.dataset.mot] = el.value; salvar(); });
      });
      $("#fRef").addEventListener("submit", (e) => { e.preventDefault(); m.motivacao.refs.push({ t: e.target.t.value.trim(), u: e.target.u.value.trim() }); salvar(); rerender(); });
      $$("[data-refdel]", root).forEach((b) => b.addEventListener("click", () => { m.motivacao.refs.splice(Number(b.dataset.refdel), 1); salvar(); rerender(); }));
    }

    if (aba === "notas") {
      const n = m.notas;
      const atualiza = (refazVars) => {
        const r = calcNotas(m);
        $("#formErro").hidden = !r.erro; $("#formErro").textContent = r.erro || "";
        if (refazVars && !r.erro) { $("#varsBox").innerHTML = varsHTML(m, r.vars); bindVars(); }
        $("#resBox").innerHTML = r.erro ? "" : r.detalhes;
        salvar();
      };
      const bindVars = () => $$("[data-var]", root).forEach((el) => el.addEventListener("input", () => {
        if (el.value.trim() === "") delete n.valores[el.dataset.var]; else n.valores[el.dataset.var] = el.value.trim();
        atualiza(false);
      }));
      bindVars();
      $("#formula").addEventListener("input", (e) => { n.formula = e.target.value; atualiza(true); });
      [["mediaMin", "mediaMin"], ["notaMax", "notaMax"], ["freqMin", "freqMin"], ["freq", "freq"]].forEach(([id, k]) =>
        $("#" + id).addEventListener("input", (e) => { n[k] = e.target.value; atualiza(false); }));
      $("#exAtivo").addEventListener("change", (e) => { n.exame.ativo = e.target.checked; atualiza(false); });
      $("#exMin").addEventListener("input", (e) => { n.exame.minParaExame = e.target.value; atualiza(false); });
      $("#exForm").addEventListener("input", (e) => { n.exame.formulaFinal = e.target.value; atualiza(false); });
    }

    if (aba === "cronograma") {
      const ev = (id) => m.cronograma.find((x) => x.id === id);
      $("#fEv").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        m.cronograma.push({ id: uid(), data: f.data.value, tipo: f.tipo.value, titulo: f.titulo.value.trim(), feito: false });
        salvar(); rerender();
      });
      $$("[data-evok]", root).forEach((el) => el.addEventListener("change", () => { ev(el.dataset.evok).feito = el.checked; salvar(); rerender(); }));
      $$("[data-evdata]", root).forEach((el) => el.addEventListener("change", () => { ev(el.dataset.evdata).data = el.value; salvar(); rerender(); }));
      $$("[data-evtit]", root).forEach((el) => el.addEventListener("change", () => { ev(el.dataset.evtit).titulo = el.value; salvar(); }));
      $$("[data-evdel]", root).forEach((b) => b.addEventListener("click", () => { m.cronograma = m.cronograma.filter((x) => x.id !== b.dataset.evdel); salvar(); rerender(); }));
      $("#gerarSemanas").addEventListener("click", () => {
        const ini = prompt("Data da primeira aula (AAAA-MM-DD):", hoje()); if (!ini || !/^\d{4}-\d{2}-\d{2}$/.test(ini)) return;
        const n = Number(prompt("Quantas semanas?", "15")); if (!n) return;
        const d = new Date(ini + "T00:00:00");
        for (let i = 0; i < n; i++) {
          m.cronograma.push({ id: uid(), data: isoDate(d), tipo: "aula", titulo: `Semana ${i + 1}: ${m.topicos[Math.floor((i * m.topicos.length) / n)] || "(assunto)"}`, feito: false });
          d.setDate(d.getDate() + 7);
        }
        salvar(); rerender();
      });
    }

    if (aba === "pdd") {
      $$("[data-pdd]", root).forEach((el) => el.addEventListener("change", () => { m.pdd[el.dataset.pdd] = el.value.trim(); salvar(); if (el.dataset.pdd === "link") rerender(); }));
      $("#topicos").addEventListener("change", (e) => { m.topicos = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); salvar(); });
    }

    if (aba === "bibliografia") {
      $("#fLivro").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; m.livros.push({ id: uid(), t: f.t.value.trim(), a: f.a.value.trim(), n: f.n.value.trim(), status: "quero" }); salvar(); rerender(); });
      $$("[data-livst]", root).forEach((s) => s.addEventListener("change", () => { m.livros.find((l) => l.id === s.dataset.livst).status = s.value; salvar(); }));
      $$("[data-livdel]", root).forEach((b) => b.addEventListener("click", () => { m.livros = m.livros.filter((l) => l.id !== b.dataset.livdel); salvar(); rerender(); }));
    }

    if (aba === "prompts") {
      ["#pTipo", "#pTopico", "#pDias", "#pEx", "#pTent"].forEach((s) => $(s).addEventListener("input", () => gerarPrompt(m)));
      gerarPrompt(m);
      $("#pCopiar").addEventListener("click", async () => {
        const t = $("#pOut").textContent;
        try { await navigator.clipboard.writeText(t); flash("Copiado!"); }
        catch { const r = document.createRange(); r.selectNodeContents($("#pOut")); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand("copy"); flash("Copiado!"); }
      });
    }

    if (aba === "anotacoes") $("#anot").addEventListener("input", (e) => { m.anotacoes = e.target.value; salvar(); });
  }

  // botão "Instalar app" (Chrome/Android)
  let instalarEvt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); instalarEvt = e; if ($("#main").dataset.view === "config") rerender(); });

  // ---------------- início ----------------
  carregar();
  aplicarTema();
  render();
})();
