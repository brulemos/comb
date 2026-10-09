/* Misturador de combustíveis — v2.0 (rastreabilidade e documentação de ensaios)
   Módulo independente. As fórmulas de combustão existentes não são modificadas.
   Unidades: frações adimensionais; massa molar informada pelo database.js (kg/kmol).
*/
"use strict";
(() => {
  const C = window.Combustion;
  const STORAGE = "lbe_misturador_receitas_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char =>
    ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[char]);
  const fmt = (v, digits = 6) => Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: digits, maximumFractionDigits: digits
  });
  const now = () => new Date().toISOString();
  const basisName = value => value === "massica" ? "mássica" : "molar";
  const gas = id => {
    const component = C.getGas(id);
    if (!component || !Number.isFinite(component.massaMolar) || component.massaMolar <= 0) {
      throw Error("Componente inválido ou sem massa molar no banco: " + id);
    }
    return component;
  };

  function readSaved() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      return Array.isArray(data) ? data.filter(v => v && typeof v.id === "string" &&
        typeof v.nome === "string" && Array.isArray(v.componentes)) : [];
    } catch { return []; }
  }
  function writeSaved(value) { localStorage.setItem(STORAGE, JSON.stringify(value)); }
  function originalComposition(data) {
    if (!data || !Array.isArray(data.componentes)) throw Error("Composição sem componentes.");
    const rows = data.componentes.map(row => ({
      id: String(row.id || ""), percentual: Number(row.percentual)
    }));
    if (rows.some(row => !row.id || !Number.isFinite(row.percentual) || row.percentual < 0)) {
      throw Error("A composição contém um componente não identificado ou percentual inválido.");
    }
    const total = rows.reduce((sum, row) => sum + row.percentual, 0);
    if (!Number.isFinite(total) || total <= 0) throw Error("Composição com soma nula ou inválida.");
    const byId = new Map();
    rows.forEach(({id, percentual}) => {
      if (!percentual) return;
      gas(id);
      byId.set(id, (byId.get(id) || 0) + percentual);
    });
    return {totalOriginal: total, rows: [...byId].map(([id, pct]) => ({
      id, original: pct, normalizado: pct / total * 100
    }))};
  }
  function currentComposition() {
    const base = $('input[name="baseComposicao"]:checked')?.value || "molar";
    const rows = $$('#corpoMistura tr').map(tr => ({
      id: $('.component-select', tr)?.value || "",
      percentual: Number($('.component-percent', tr)?.value)
    })).filter(row => row.id || row.percentual !== 0);
    if (rows.some(row => !row.id)) throw Error("A composição atual contém uma linha sem componente.");
    return {nome: "Composição atual", base, componentes: rows};
  }
  function availableOptions() {
    return [{key:"current", nome:"Composição atual"},
      ...Object.entries(window.COMBUSTION_PRESETS || {}).map(([key, preset]) => ({
        key: "builtin:" + key, nome: preset.nome || key
      })),
      ...readSaved().map(recipe => ({key:"saved:" + recipe.id, nome:"Minha receita: " + recipe.nome}))];
  }
  function resolveSource(key) {
    if (key === "current") return {key, ...currentComposition()};
    if (key.startsWith("builtin:")) {
      const preset = (window.COMBUSTION_PRESETS || {})[key.slice(8)];
      if (!preset) throw Error("Preset inexistente: " + key);
      return {key, ...preset, base: "molar"};
    }
    if (key.startsWith("saved:")) {
      const recipe = readSaved().find(p => p.id === key.slice(6));
      if (!recipe) throw Error("A receita selecionada não existe mais: " + key);
      return {key, ...recipe};
    }
    throw Error("Mistura não encontrada: " + key);
  }

  /* Cada fonte é convertida para as duas bases independentemente de sua base de cadastro.
     y_i = (w_i / M_i) / Σ(w_k / M_k)
     w_i = y_i M_i / Σ(y_k M_k)                               */
  function calculateSource(source, alpha, index) {
    const baseOriginal = source.base === "massica" ? "massica" : "molar";
    const original = originalComposition(source);
    const amounts = original.rows.map(row => ({
      ...row, nome: gas(row.id).nome || row.id,
      formula: gas(row.id).formula || row.id,
      M: gas(row.id).massaMolar,
      amount: baseOriginal === "massica" ? (row.normalizado / 100) / gas(row.id).massaMolar : row.normalizado / 100
    }));
    const totalAmounts = amounts.reduce((sum, row) => sum + row.amount, 0);
    const molar = amounts.map(row => ({...row, y: row.amount / totalAmounts}));
    const M = molar.reduce((sum, row) => sum + row.y * row.M, 0);
    return {
      index, key:source.key, nome:source.nome || source.key, baseOriginal,
      alpha, totalOriginal:original.totalOriginal, M,
      observacao:source.observacao || "",
      origemAnterior:source.origem || "",
      criadaEm:source.criadaEm || null,
      /* Salvas como fotografia da composição, sem links mutáveis aos presets antigos. */
      historicoReceita: source.proveniencia ? {
        data:source.proveniencia.data || null,
        base:source.proveniencia.baseProporcao || null,
        fontes:(source.proveniencia.fontes || []).map(f => ({
          nome:f.nome, percentual:f.alpha * 100, baseOriginal:f.baseOriginal,
          componentes: Array.isArray(f.componentes) ? f.componentes.map(c => ({id:c.id, percentual:c.percentual})) : []
        }))
      } : null,
      componentes:molar.map(row => ({
        id:row.id, nome:row.nome, formula:row.formula, M:row.M,
        original:row.original, normalizado:row.normalizado,
        y:row.y, w:row.y * row.M / M
      }))
    };
  }

  /* Base molar: q_ij = α_j y_ij e N = Σq_ij = 1.
     Base mássica: q_ij = α_j w_ij/M_i e N = Σq_ij.
     Em ambas: y_i,final = Σ_j q_ij / N e w_i,final = y_i,final M_i / M_final.
     O cálculo usa precisão plena; apenas a exibição é arredondada. */
  function calculateTrace() {
    const rows = $$('.mix-source', $('#mixSources'));
    if (!rows.length) throw Error("Adicione pelo menos uma mistura.");
    const baseProporcao = $('#mixBasis').value;
    const chosen = rows.map(row => ({
      key: $('.mix-choice', row).value,
      percentual: $('.mix-percent', row).value.trim() === "" ? NaN : Number($('.mix-percent', row).value)
    }));
    if (chosen.some(row => !Number.isFinite(row.percentual) || row.percentual < 0 || row.percentual > 100)) {
      throw Error("As proporções devem ser números entre 0 e 100%.");
    }
    const sum = chosen.reduce((total, row) => total + row.percentual, 0);
    if (Math.abs(sum - 100) > 0.000001) {
      throw Error(`A soma é ${fmt(sum, 6)}%. Ajuste para 100% ou clique em Normalizar.`);
    }
    const fontes = chosen.filter(row => row.percentual > 0).map((row, index) =>
      calculateSource(resolveSource(row.key), row.percentual / 100, index));
    if (!fontes.length) throw Error("As proporções não contêm valores positivos.");
    const byId = new Map();
    let N = 0;
    fontes.forEach((source, j) => source.componentes.forEach(part => {
      const q = baseProporcao === "molar" ? source.alpha * part.y : source.alpha * part.w / part.M;
      N += q;
      if (!byId.has(part.id)) byId.set(part.id, {
        id:part.id, nome:part.nome, formula:part.formula, M:part.M,
        parcelasQ: Array(fontes.length).fill(0), parcelasW: Array(fontes.length).fill(0)
      });
      const target = byId.get(part.id);
      target.parcelasQ[j] += q;
      target.parcelasW[j] += source.alpha * part.w;
    }));
    if (!(N > 0) || !Number.isFinite(N)) throw Error("Não foi possível calcular a composição.");
    const componentes = [...byId.values()].map(row => {
      const q = row.parcelasQ.reduce((a, b) => a + b, 0);
      return {...row, q, y:q / N, parcelasY:row.parcelasQ.map(v => v / N)};
    });
    const M = componentes.reduce((sum, row) => sum + row.y * row.M, 0);
    componentes.forEach(row => row.w = row.y * row.M / M);
    componentes.sort((a, b) => b.y - a.y || a.id.localeCompare(b.id));
    const origin = fontes.map(source => `${fmt(source.alpha * 100, 2)}% ${source.nome}`).join(" + ");
    const ensaio = $('#mixTestId').value.trim();
    const observacoes = $('#mixNotes').value.trim();
    return {
      versao:2, data:now(), baseProporcao, fontes, componentes, N, M, origin, ensaio, observacoes,
      somaMolar:componentes.reduce((sum, row) => sum + row.y, 0),
      somaMassica:componentes.reduce((sum, row) => sum + row.w, 0)
    };
  }

  const dialog = document.createElement("dialog");
  dialog.id = "mixDialog";
  dialog.className = "mix-dialog";
  dialog.setAttribute("aria-labelledby", "mixTitle");
  dialog.innerHTML = `
    <div class="mix-shell">
      <header class="mix-header">
        <div><h2 id="mixTitle">Misturador de combustíveis</h2><small>Composição calculada com rastreabilidade das fontes</small></div>
        <button type="button" id="mixClose" class="btn secondary">Fechar ×</button>
      </header>
      <label class="mix-field">Base da proporção entre misturas
        <select id="mixBasis"><option value="molar">% molar</option><option value="massica">% mássica</option></select>
      </label>
      <details class="mix-test-meta"><summary>Identificação do ensaio (opcional)</summary>
        <label class="mix-field">Código ou nome do ensaio<input id="mixTestId" type="text" maxlength="120" placeholder="Ex.: LBE-2026-001"></label>
        <label class="mix-field">Observações<textarea id="mixNotes" rows="2" maxlength="1000" placeholder="Condições, lote, origem das análises..."></textarea></label>
      </details>
      <div id="mixSources"></div>
      <div class="mix-actions">
        <button type="button" class="btn secondary" id="mixAdd">+ Adicionar mistura</button>
        <button type="button" class="btn secondary" id="mixNormalize">Normalizar proporções</button>
      </div>
      <div id="mixStatus" role="status" aria-live="polite"></div>
      <section class="mix-preview">
        <h3>Composição resultante</h3><div id="mixPreview">Informe as proporções e clique em Pré-visualizar.</div>
      </section>
      <details id="mixTraceDetails" class="mix-trace-details">
        <summary><strong>Rastreabilidade e memória de cálculo</strong><span>Entradas · contribuições · fórmulas</span></summary>
        <div id="mixTraceBody"><p>Pré-visualize para gerar a memória de cálculo.</p></div>
      </details>
      <div class="mix-actions mix-export-actions">
        <button type="button" class="btn secondary" id="mixExportHTML" disabled>Exportar relatório HTML / PDF</button>
        <button type="button" class="btn secondary" id="mixExportCSV" disabled>Exportar tabelas CSV</button>
      </div>
      <div class="mix-actions">
        <button type="button" class="btn secondary" id="mixCalc">Pré-visualizar</button>
        <button type="button" class="btn secondary" id="mixSave">Salvar como receita</button>
        <button type="button" class="btn secondary" id="mixDelete">Excluir receita salva</button>
        <button type="button" class="btn" id="mixApply">Aplicar à composição</button>
      </div>
      <small>Receitas salvas localmente preservam a composição e os metadados das fontes na data do cálculo. Relatórios HTML podem ser impressos ou salvos em PDF pelo navegador.</small>
    </div>`;
  document.body.append(dialog);
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "btn secondary";
  openButton.id = "btnMixCombustiveis";
  openButton.textContent = "⊞ Misturar combustíveis";
  $('#btnNormalizarFracoes').insertAdjacentElement("afterend", openButton);
  const originArea = document.createElement("div");
  originArea.id = "mixOriginArea";
  originArea.className = "mix-origin-area";
  originArea.hidden = true;
  originArea.innerHTML = `<div id="mixOrigin"></div><button type="button" class="btn secondary" id="mixShowLastTrace">Ver memória de cálculo</button>`;
  $('.composition-box').insertAdjacentElement("afterend", originArea);

  const sources = $('#mixSources');
  let latest = null;
  let lastApplied = null;
  let modifiedAfterApply = false;
  const showStatus = (message, error = false) => {
    const element = $('#mixStatus');
    element.textContent = message;
    element.className = error ? "mix-error" : "mix-ok";
  };
  function setButtons(enabled) {
    $('#mixExportHTML').disabled = !enabled;
    $('#mixExportCSV').disabled = !enabled;
  }
  function invalidate() {
    latest = null;
    $('#mixPreview').textContent = "Clique em Pré-visualizar para atualizar os resultados.";
    $('#mixTraceBody').textContent = "Pré-visualize para atualizar a memória de cálculo.";
    setButtons(false);
    showStatus("");
  }
  function addSource(key = "current", percent = 0) {
    const row = document.createElement("div");
    row.className = "mix-source";
    const opts = availableOptions();
    row.innerHTML = `<label>Mistura
      <select class="mix-choice">${opts.map(o => `<option value="${escapeHTML(o.key)}">${escapeHTML(o.nome)}</option>`).join("")}</select></label>
      <label>Proporção (%)<input class="mix-percent" type="number" min="0" max="100" step="any" value="${percent}"></label>
      <button class="btn secondary mix-remove" type="button" aria-label="Remover mistura">×</button>`;
    sources.append(row);
    $('.mix-choice', row).value = opts.some(o => o.key === key) ? key : (opts[0]?.key || "");
    $('.mix-remove', row).onclick = () => {row.remove();invalidate();};
    $$('input,select', row).forEach(el => el.addEventListener("input", invalidate));
  }
  function refreshOptions() {
    const opts = availableOptions();
    $$('.mix-choice', sources).forEach(select => {
      const selected = select.value;
      select.innerHTML = opts.map(o => `<option value="${escapeHTML(o.key)}">${escapeHTML(o.nome)}</option>`).join("");
      select.value = opts.some(o => o.key === selected) ? selected : "current";
    });
  }
  function formulaDescription() {
    return `<div class="mix-method">
      <h4>Metodologia e equações</h4>
      <p>α<sub>j</sub> = proporção da mistura de entrada j (fração da unidade); M<sub>i</sub> = massa molar da espécie i (kg/kmol); M<sub>j</sub> = Σ(y<sub>ij</sub> · M<sub>i</sub>).</p>
      <p><strong>Conversão da origem:</strong> y<sub>ij</sub> = (w<sub>ij</sub>/M<sub>i</sub>) / Σ<sub>k</sub>(w<sub>kj</sub>/M<sub>k</sub>); w<sub>ij</sub> = y<sub>ij</sub> M<sub>i</sub> / M<sub>j</sub>.</p>
      <p><strong>Misturas na base molar:</strong> q<sub>ij</sub> = α<sub>j</sub> · y<sub>ij</sub>.</p>
      <p><strong>Misturas na base mássica:</strong> q<sub>ij</sub> = α<sub>j</sub> · w<sub>ij</sub> / M<sub>i</sub>.</p>
      <p><strong>Resultado:</strong> N = Σ<sub>i,j</sub> q<sub>ij</sub>; y<sub>i,final</sub> = Σ<sub>j</sub> q<sub>ij</sub> / N; M<sub>final</sub> = Σ<sub>i</sub> y<sub>i,final</sub> M<sub>i</sub>; w<sub>i,final</sub> = y<sub>i,final</sub> M<sub>i</sub> / M<sub>final</sub>.</p>
      <p>As parcelas da tabela estão normalizadas para % molar da mistura final. Em base mássica, o cálculo utiliza os quocientes massa/massa molar <em>antes</em> da normalização N. Todas as contas usam a precisão numérica do JavaScript; arredondamento apenas para exibição.</p>
    </div>`;
  }
  function sourceHTML(f, mixtureBasis) {
    const normalized = Math.abs(f.totalOriginal - 100) > 1e-7;
    const trs = f.componentes.map(x => `<tr><td>${escapeHTML(x.nome)}</td><td>${escapeHTML(x.formula)}</td>
      <td>${fmt(x.original, 6)}</td><td>${fmt(x.normalizado, 6)}</td>
      <td>${fmt(x.y * 100, 6)}</td><td>${fmt(x.w * 100, 6)}</td></tr>`).join("");
    return `<section class="mix-source-trace"><h4>Fonte ${f.index + 1} — ${escapeHTML(f.nome)}</h4>
      <p><strong>Proporção aplicada:</strong> ${fmt(f.alpha * 100, 6)}% (${basisName(mixtureBasis)}) ·
      <strong>Base cadastrada:</strong> ${basisName(f.baseOriginal)} · <strong>Massa molar:</strong> ${fmt(f.M, 6)} kg/kmol</p>
      <p><strong>Soma da entrada:</strong> ${fmt(f.totalOriginal, 6)}%. ${normalized ? "A origem foi normalizada para 100% no cálculo." : "A composição original já totalizava 100%."}</p>
      ${f.origemAnterior ? `<p><strong>Origem salva:</strong> ${escapeHTML(f.origemAnterior)}</p>` : ""}
      ${f.historicoReceita ? `<details class="mix-nested-history"><summary>Ver composição original das fontes desta receita salva</summary>
        ${f.historicoReceita.fontes.map((previous, idx) => `<div><p><strong>Fonte histórica ${idx + 1}: ${escapeHTML(previous.nome)}</strong> — ${fmt(previous.percentual, 4)}% (${basisName(f.historicoReceita.base)}) · composição original em base ${basisName(previous.baseOriginal)}</p>
        <p>${previous.componentes.map(c => `${escapeHTML(gas(c.id).formula || c.id)}: ${fmt(c.percentual, 6)}%`).join(" · ")}</p></div>`).join("")}
        <small>Fotografia armazenada quando a receita foi salva. Misturas históricas foram convertidas para uma composição equivalente, sem vínculos mutáveis com os presets.</small>
      </details>` : ""}
      ${f.observacao ? `<p><em>${escapeHTML(f.observacao)}</em></p>` : ""}
      <div class="mix-table-wrap"><table><thead><tr><th>Componente</th><th>Fórmula</th><th>Entrada (%)</th><th>Normalizado (%)</th><th>y molar (%)</th><th>w mássica (%)</th></tr></thead><tbody>${trs}</tbody></table></div></section>`;
  }
  function numericDerivation(t) {
    const lines = t.componentes.map(component => {
      const terms = t.fontes.map(source => {
        const part = source.componentes.find(x => x.id === component.id);
        if (!part) return null;
        return t.baseProporcao === "molar" ?
          `(${fmt(source.alpha, 8)} × ${fmt(part.y, 8)})` :
          `(${fmt(source.alpha, 8)} × ${fmt(part.w, 8)} / ${fmt(component.M, 8)})`;
      }).filter(Boolean);
      return `<tr><td>${escapeHTML(component.formula)}</td><td>${terms.join(" + ")} = ${fmt(component.q, 10)}</td>
        <td>${fmt(component.q, 10)} / ${fmt(t.N, 10)} × 100 = <strong>${fmt(component.y*100, 6)}%</strong></td></tr>`;
    }).join("");
    return `<details class="mix-derivation"><summary>Ver substituição numérica para cada componente</summary>
      <div class="mix-table-wrap"><table><thead><tr><th>Espécie</th><th>Cálculo de q<sub>i</sub> = Σq<sub>ij</sub></th><th>Fração molar final</th></tr></thead>
      <tbody>${lines}</tbody></table></div>
      <p>Os valores intermediários são apresentados com arredondamento visual; o cálculo utiliza a precisão integral.</p></details>`;
  }

  function contributionHTML(trace) {
    const headings = trace.fontes.map((f, j) => `<th>Fonte ${j + 1}<small>${escapeHTML(f.nome)}</small></th>`).join("");
    const rows = trace.componentes.map(row => `<tr><td>${escapeHTML(row.nome)} (${escapeHTML(row.formula)})</td>
      ${row.parcelasY.map(y => `<td>${fmt(y * 100, 6)}</td>`).join("")}
      <td><strong>${fmt(row.y * 100, 6)}</strong></td><td>${fmt(row.w * 100, 6)}</td></tr>`).join("");
    const totals = trace.fontes.map((f, j) => `<td>${fmt(trace.componentes.reduce((a,x)=>a+x.parcelasY[j],0)*100,6)}</td>`).join("");

    return `<section class="mix-source-trace"><h4>Contribuição de cada fonte para cada componente</h4>
      <p>Valores nas colunas Fonte 1, 2, … em pontos percentuais <strong>molares</strong> da mistura final; o somatório horizontal reproduz y final.</p>
      <div class="mix-table-wrap"><table><thead><tr><th>Componente</th>${headings}<th>y final (%)</th><th>w final (%)</th></tr></thead>
      <tbody>${rows}<tr class="mix-total-row"><td>Total</td>${totals}<td>${fmt(trace.somaMolar*100,6)}</td><td>${fmt(trace.somaMassica*100,6)}</td></tr></tbody></table></div>
      <p><strong>Normalizador N:</strong> ${fmt(trace.N, 12)} · <strong>Massa molar final:</strong> ${fmt(trace.M, 8)} kg/kmol.</p>
    </section>${numericDerivation(trace)}`;
  }
  function traceHTML(t) {
    return `<p class="mix-trace-meta"><strong>Data do cálculo:</strong> ${escapeHTML(new Date(t.data).toLocaleString("pt-BR"))} · <strong>Base das proporções:</strong> ${basisName(t.baseProporcao)}</p>
      ${t.ensaio ? `<p><strong>Ensaio:</strong> ${escapeHTML(t.ensaio)}</p>` : ""}
      ${t.observacoes ? `<p><strong>Observações:</strong> ${escapeHTML(t.observacoes)}</p>` : ""}
      ${t.fontes.map(f => sourceHTML(f, t.baseProporcao)).join("")}${contributionHTML(t)}${formulaDescription()}`;
  }
  function render(t) {
    $('#mixPreview').innerHTML = `<div class="mix-origin-line">${escapeHTML(t.origin)}</div>
      <p><strong>Base das proporções:</strong> ${basisName(t.baseProporcao)} · <strong>Massa molar final:</strong> ${fmt(t.M, 6)} kg/kmol</p>
      <div class="mix-table-wrap"><table><thead><tr><th>Componente</th><th>Fórmula</th><th>% molar</th><th>% mássica</th></tr></thead>
      <tbody>${t.componentes.map(row => `<tr><td>${escapeHTML(row.nome)}</td><td>${escapeHTML(row.formula)}</td><td>${fmt(row.y*100,6)}</td><td>${fmt(row.w*100,6)}</td></tr>`).join("")}
      <tr class="mix-total-row"><td colspan="2">Total</td><td>${fmt(t.somaMolar*100,6)}</td><td>${fmt(t.somaMassica*100,6)}</td></tr></tbody></table></div>`;
    $('#mixTraceBody').innerHTML = traceHTML(t);
    setButtons(true);
    showStatus("Composição e memória de cálculo atualizadas.");
  }
  function preview() {
    const trace = calculateTrace();
    latest = trace;
    render(trace);
    return trace;
  }
  function handle(fn) {
    try { fn(); }
    catch (err) { showStatus(err.message || String(err), true); }
  }

  function saveFile(content, mime, filename) {
    const url = URL.createObjectURL(new Blob([content], {type:mime}));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function csvCell(value) {return '"' + String(value ?? "").replace(/"/g, '""') + '"';}
  function exportCSV(t) {
    const lines = [];
    const add = (...cells) => lines.push(cells.map(csvCell).join(";"));
    add("RELATÓRIO DE RASTREABILIDADE — MISTURA DE COMBUSTÍVEIS");
    add("Data", new Date(t.data).toLocaleString("pt-BR"));
    add("Mistura", t.origin);
    add("Base das proporções", basisName(t.baseProporcao));
    if (t.ensaio) add("Identificação do ensaio", t.ensaio);
    if (t.observacoes) add("Observações", t.observacoes);
    add("Massa molar final (kg/kmol)", t.M.toPrecision(16).replace(".", ","));
    add("Normalizador N", t.N.toPrecision(16).replace(".", ","));
    t.fontes.forEach(f => {
      add();add("FONTE", f.index + 1, f.nome);
      add("Proporção (%)", (f.alpha*100).toPrecision(16).replace(".", ","));
      add("Base cadastrada",basisName(f.baseOriginal));
      add("Soma original (%)",f.totalOriginal.toPrecision(16).replace(".", ","));
      add("Massa molar (kg/kmol)",f.M.toPrecision(16).replace(".", ","));
      if (f.origemAnterior) add("Origem salva",f.origemAnterior);
      add("ID", "Componente", "Fórmula", "Entrada (%)", "Normalizado (%)", "y (%)", "w (%)", "M (kg/kmol)");
      f.componentes.forEach(c => add(c.id,c.nome,c.formula,c.original.toPrecision(16).replace(".", ","),c.normalizado.toPrecision(16).replace(".", ","),
        (c.y*100).toPrecision(16).replace(".", ","),(c.w*100).toPrecision(16).replace(".", ","),c.M.toPrecision(16).replace(".", ",")));
    });
    add();add("CONTRIBUIÇÕES MOLARES PARA A MISTURA FINAL — PONTOS PERCENTUAIS");
    add("ID", "Componente", "Fórmula", ...t.fontes.map((f,i) => `Fonte ${i+1}: ${f.nome}`), "y final (%)", "w final (%)", "M (kg/kmol)");
    t.componentes.forEach(c => add(c.id,c.nome,c.formula,...c.parcelasY.map(v => (v*100).toPrecision(16).replace(".", ",")),
      (c.y*100).toPrecision(16).replace(".", ","),(c.w*100).toPrecision(16).replace(".", ","),c.M.toPrecision(16).replace(".", ",")));
    add("TOTAL", "", "", ...t.fontes.map((f,j) => (t.componentes.reduce((a,c)=>a+c.parcelasY[j],0)*100).toPrecision(16).replace(".", ",")),
      (t.somaMolar*100).toPrecision(16).replace(".", ","),(t.somaMassica*100).toPrecision(16).replace(".", ","));
    add();add("MÉTODO", "y_i = Σ_j q_ij / N; N = Σ_i,j q_ij");
    add("Base molar", "q_ij = alfa_j * y_ij");
    add("Base mássica", "q_ij = alfa_j * w_ij / M_i");
    add("Conversão massa → mol", "y_i = (w_i/M_i) / Σ_k(w_k/M_k)");
    add("Conversão mol → massa", "w_i = y_i*M_i / Σ_k(y_k*M_k)");
    saveFile("\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8", "rastreabilidade_mistura_" + t.data.slice(0,10) + ".csv");
  }
  function exportHTML(t) {
    const css = `body{font:13px/1.5 Arial,sans-serif;color:#172433;margin:36px auto;max-width:1100px;padding:0 24px}h1{font-size:22px}h2{font-size:17px;padding-top:12px;border-top:2px solid #17365c}h4{font-size:15px;margin:16px 0 6px}p{margin:6px 0 10px}.mix-source-trace{break-inside:avoid-page;margin:18px 0}.mix-table-wrap{overflow:visible}table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:11px}th,td{padding:6px;border:1px solid #c8d3df;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#eaf0f6}th small{display:block;font-weight:normal}td{overflow-wrap:anywhere}.mix-total-row{font-weight:bold;background:#f3f6fa}.mix-method{border-top:1px solid #ccd6e2;margin-top:24px}.mix-method p{break-inside:avoid}.mix-origin-line{font-weight:bold}.meta{background:#f2f5f9;padding:12px;border-radius:8px}.hint{font-size:11px;color:#555}.toolbar{margin-bottom:18px}.toolbar button{padding:10px 16px;cursor:pointer}@media print{.toolbar{display:none}body{margin:0;padding:0;max-width:none}thead{display:table-header-group}tr{break-inside:avoid}}`;
    const printableTrace = traceHTML(t).replace(/<details class=/g, "<details open class=");
    const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Rastreabilidade de mistura — ${escapeHTML(t.data.slice(0,10))}</title><style>${css}</style></head><body>
      <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
      <h1>Memória de cálculo — mistura de combustíveis</h1>
      <div class="meta"><p><strong>Gerado em:</strong> ${escapeHTML(new Date(t.data).toLocaleString("pt-BR"))}</p>
      <p><strong>Origem:</strong> ${escapeHTML(t.origin)}</p><p><strong>Base das proporções:</strong> ${basisName(t.baseProporcao)}</p>
      ${t.ensaio ? `<p><strong>Ensaio:</strong> ${escapeHTML(t.ensaio)}</p>` : ""}
      ${t.observacoes ? `<p><strong>Observações:</strong> ${escapeHTML(t.observacoes)}</p>` : ""}
      <p><strong>Massa molar final:</strong> ${fmt(t.M, 8)} kg/kmol</p></div>
      <h2>Composição resultante</h2>
      <table><thead><tr><th>Componente</th><th>Fórmula</th><th>y molar (%)</th><th>w mássica (%)</th><th>M (kg/kmol)</th></tr></thead><tbody>
      ${t.componentes.map(c => `<tr><td>${escapeHTML(c.nome)}</td><td>${escapeHTML(c.formula)}</td><td>${fmt(c.y*100,8)}</td><td>${fmt(c.w*100,8)}</td><td>${fmt(c.M,8)}</td></tr>`).join("")}
      <tr class="mix-total-row"><td>Total</td><td></td><td>${fmt(t.somaMolar*100,8)}</td><td>${fmt(t.somaMassica*100,8)}</td><td></td></tr></tbody></table>
      <h2>Rastreabilidade das entradas e parcelas de contribuição</h2>${printableTrace}
      <p class="hint">Valores de composição arredondados apenas na exibição. Presets são composições de referência e precisam ser confrontados com análises reais quando usados em ensaios.</p>
      </body></html>`;
    saveFile(doc, "text/html;charset=utf-8", "rastreabilidade_mistura_" + t.data.slice(0,10) + ".html");
  }

  openButton.onclick = () => {
    refreshOptions();
    if (!sources.children.length) {
      const presets = availableOptions();
      addSource(presets.some(p => p.key === "builtin:glp") ? "builtin:glp" : "current", 30);
      addSource(presets.some(p => p.key === "builtin:cog") ? "builtin:cog" : "current", 70);
    }
    invalidate();
    dialog.showModal();
  };
  $('#mixClose').onclick = () => dialog.close();
  $('#mixAdd').onclick = () => {addSource("current",0);invalidate();};
  $('#mixBasis').onchange = invalidate;
  $('#mixTestId').addEventListener("input", invalidate);
  $('#mixNotes').addEventListener("input", invalidate);
  $('#mixNormalize').onclick = () => handle(() => {
    const inputs = $$('.mix-percent', sources);
    const values = inputs.map(i => i.value.trim() === "" ? NaN : Number(i.value));
    if (values.some(x => !Number.isFinite(x) || x < 0)) throw Error("Informe proporções não negativas.");
    const sum = values.reduce((a,b) => a+b,0);
    if (!(sum>0)) throw Error("A soma deve ser positiva.");
    inputs.forEach((input,idx) => {input.value = String(100*values[idx]/sum);});
    invalidate();showStatus("Proporções normalizadas para 100%.");
  });
  $('#mixCalc').onclick = () => handle(preview);
  $('#mixExportHTML').onclick = () => handle(() => exportHTML(latest || preview()));
  $('#mixExportCSV').onclick = () => handle(() => exportCSV(latest || preview()));
  $('#mixSave').onclick = () => handle(() => {
    const t = latest || preview();
    const input = prompt("Nome da nova receita:");
    if (input === null) return;
    const nome = input.trim();
    if (!nome || nome.length > 100) throw Error("Informe um nome com até 100 caracteres.");
    const saved = readSaved();
    if (saved.some(s => s.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) {
      throw Error("Já existe uma receita com esse nome.");
    }
    const id = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    saved.push({id,nome,base:"molar",componentes:t.componentes.map(c => ({id:c.id,percentual:c.y*100})),
      origem:t.origin,criadaEm:t.data,
      proveniencia:{ensaio:t.ensaio,observacoes:t.observacoes,versao:2,data:t.data,baseProporcao:t.baseProporcao,normalizador:t.N,massaMolar:t.M,
        fontes:t.fontes.map(f => ({nome:f.nome,alpha:f.alpha,baseOriginal:f.baseOriginal,totalOriginal:f.totalOriginal,
          componentes:f.componentes.map(c => ({id:c.id,percentual:c.original}))}))}});
    writeSaved(saved);refreshOptions();
    showStatus(`Receita "${nome}" salva com origem e composições das fontes.`);
  });
  $('#mixDelete').onclick = () => handle(() => {
    const saved = readSaved();
    if (!saved.length) throw Error("Não existem receitas salvas.");
    const name = prompt("Digite o nome exato da receita que deseja excluir:\n" + saved.map(s => s.nome).join("\n"));
    if (name === null) return;
    const found = saved.find(s => s.nome === name.trim());
    if (!found) throw Error("Receita não encontrada.");
    if (!confirm(`Excluir a receita "${found.nome}"?`)) return;
    writeSaved(saved.filter(x => x.id !== found.id));refreshOptions();invalidate();
    showStatus("Receita excluída da lista local.");
  });
  $('#mixApply').onclick = () => handle(() => {
    const t = latest || preview();
    if (!confirm("Substituir a composição atual pela mistura calculada?")) return;
    const target = $('#corpoMistura');
    const base = $('input[name="baseComposicao"][value="molar"]');
    base.checked = true;
    base.dispatchEvent(new Event("change", {bubbles:true}));
    target.innerHTML = "";
    /* Mantém o mecanismo original para criar e atualizar as linhas da composição. */
    t.componentes.forEach(c => {
      $('#btnAdicionar').click();
      const row = target.lastElementChild;
      const select = $('.component-select',row);
      select.value = c.id;
      select.dispatchEvent(new Event("change",{bubbles:true}));
      const field = $('.component-percent',row);
      field.value = String(c.y*100);
      field.dispatchEvent(new Event("input",{bubbles:true}));
    });
    $('#presetCombustivel').value = "manual";
    lastApplied = structuredClone(t);
    modifiedAfterApply = false;
    refreshOrigin();
    dialog.close();
  });
  // O botão "Limpar" da calculadora também reinicia o estado temporário
  // do misturador. Receitas salvas em localStorage permanecem intactas.
  function clearMixerSession() {
    lastApplied = null;
    modifiedAfterApply = false;
    originArea.hidden = true;
    $('#mixOrigin').textContent = "";

    // Descarte das fontes/proporções do caso anterior. O usuário começa
    // um novo preparo com duas linhas vazias, sem mistura pré-calculada.
    sources.replaceChildren();
    addSource("current", 0);
    addSource("current", 0);
    $('#mixBasis').value = "molar";
    $('#mixTestId').value = "";
    $('#mixNotes').value = "";
    $('.mix-test-meta').open = false;
    $('#mixTraceDetails').open = false;
    invalidate();
    $('#mixPreview').textContent = "Nenhuma mistura calculada. Selecione as fontes e informe as proporções.";

    if (dialog.open) dialog.close();
  }
  document.addEventListener("combustion:reset", clearMixerSession);

  function refreshOrigin() {
    if (!lastApplied) {originArea.hidden=true;return;}
    originArea.hidden=false;
    $('#mixOrigin').textContent = modifiedAfterApply ?
      "Composição editada após a aplicação. Memória disponível apenas como registro original: " + lastApplied.origin :
      "Origem da mistura aplicada: " + lastApplied.origin;
  }
  $('#mixShowLastTrace').onclick = () => {
    if (!lastApplied) return;
    refreshOptions();
    const t = structuredClone(lastApplied);
    latest=t;
    render(t);
    $('#mixTraceDetails').open = true;
    showStatus(modifiedAfterApply ? "Registro histórico: a composição principal foi alterada após esta aplicação." :
      "Memória de cálculo da última mistura aplicada.");
    dialog.showModal();
  };
  /* Não atribuir automaticamente ao resultado uma origem antiga após mudanças manuais. */
  const markEdited = event => {
    if (event.isTrusted && lastApplied && !dialog.open) {
      modifiedAfterApply = true;refreshOrigin();
    }
  };
  $('#corpoMistura').addEventListener("input",markEdited);
  $('#corpoMistura').addEventListener("change",markEdited);
  $('#corpoMistura').addEventListener("click",event => {
    if (event.isTrusted && event.target.closest(".remove-row")) markEdited(event);
  });
  $('#presetCombustivel').addEventListener("change",markEdited);
  $('#btnNormalizarFracoes').addEventListener("click",markEdited);
  $('#btnAdicionar').addEventListener("click",markEdited);
  $$('input[name="baseComposicao"]').forEach(el => el.addEventListener("change",markEdited));
})();
