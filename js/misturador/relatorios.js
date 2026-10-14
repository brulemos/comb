/**
 * Memória de cálculo e relatórios CSV/HTML
 * Apenas apresentação/exportação; não altera os resultados das misturas.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
import { escapeHTML, fmt, basisName, gas } from './comum.js';
export function formulaDescription() {
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
export function sourceHTML(f, mixtureBasis) {
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
export function numericDerivation(t) {
    const lines = t.componentes.map(component => {
        const terms = t.fontes.map(source => {
            const part = source.componentes.find(x => x.id === component.id);
            if (!part)
                return null;
            return t.baseProporcao === "molar" ?
                `(${fmt(source.alpha, 8)} × ${fmt(part.y, 8)})` :
                `(${fmt(source.alpha, 8)} × ${fmt(part.w, 8)} / ${fmt(component.M, 8)})`;
        }).filter(Boolean);
        return `<tr><td>${escapeHTML(component.formula)}</td><td>${terms.join(" + ")} = ${fmt(component.q, 10)}</td>
        <td>${fmt(component.q, 10)} / ${fmt(t.N, 10)} × 100 = <strong>${fmt(component.y * 100, 6)}%</strong></td></tr>`;
    }).join("");
    return `<details class="mix-derivation"><summary>Ver substituição numérica para cada componente</summary>
      <div class="mix-table-wrap"><table><thead><tr><th>Espécie</th><th>Cálculo de q<sub>i</sub> = Σq<sub>ij</sub></th><th>Fração molar final</th></tr></thead>
      <tbody>${lines}</tbody></table></div>
      <p>Os valores intermediários são apresentados com arredondamento visual; o cálculo utiliza a precisão integral.</p></details>`;
}
export function contributionHTML(trace) {
    const headings = trace.fontes.map((f, j) => `<th>Fonte ${j + 1}<small>${escapeHTML(f.nome)}</small></th>`).join("");
    const rows = trace.componentes.map(row => `<tr><td>${escapeHTML(row.nome)} (${escapeHTML(row.formula)})</td>
      ${row.parcelasY.map(y => `<td>${fmt(y * 100, 6)}</td>`).join("")}
      <td><strong>${fmt(row.y * 100, 6)}</strong></td><td>${fmt(row.w * 100, 6)}</td></tr>`).join("");
    const totals = trace.fontes.map((f, j) => `<td>${fmt(trace.componentes.reduce((a, x) => a + x.parcelasY[j], 0) * 100, 6)}</td>`).join("");
    return `<section class="mix-source-trace"><h4>Contribuição de cada fonte para cada componente</h4>
      <p>Valores nas colunas Fonte 1, 2, … em pontos percentuais <strong>molares</strong> da mistura final; o somatório horizontal reproduz y final.</p>
      <div class="mix-table-wrap"><table><thead><tr><th>Componente</th>${headings}<th>y final (%)</th><th>w final (%)</th></tr></thead>
      <tbody>${rows}<tr class="mix-total-row"><td>Total</td>${totals}<td>${fmt(trace.somaMolar * 100, 6)}</td><td>${fmt(trace.somaMassica * 100, 6)}</td></tr></tbody></table></div>
      <p><strong>Normalizador N:</strong> ${fmt(trace.N, 12)} · <strong>Massa molar final:</strong> ${fmt(trace.M, 8)} kg/kmol.</p>
    </section>${numericDerivation(trace)}`;
}
export function traceHTML(t) {
    return `<p class="mix-trace-meta"><strong>Data do cálculo:</strong> ${escapeHTML(new Date(t.data).toLocaleString("pt-BR"))} · <strong>Base das proporções:</strong> ${basisName(t.baseProporcao)}</p>
      ${t.ensaio ? `<p><strong>Ensaio:</strong> ${escapeHTML(t.ensaio)}</p>` : ""}
      ${t.observacoes ? `<p><strong>Observações:</strong> ${escapeHTML(t.observacoes)}</p>` : ""}
      ${t.fontes.map(f => sourceHTML(f, t.baseProporcao)).join("")}${contributionHTML(t)}${formulaDescription()}`;
}
export function saveFile(content, mime, filename) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function csvCell(value) { return '"' + String(value ?? "").replace(/"/g, '""') + '"'; }
export function exportCSV(t) {
    const lines = [];
    const add = (...cells) => lines.push(cells.map(csvCell).join(";"));
    add("RELATÓRIO DE RASTREABILIDADE — MISTURA DE COMBUSTÍVEIS");
    add("Data", new Date(t.data).toLocaleString("pt-BR"));
    add("Mistura", t.origin);
    add("Base das proporções", basisName(t.baseProporcao));
    if (t.ensaio)
        add("Identificação do ensaio", t.ensaio);
    if (t.observacoes)
        add("Observações", t.observacoes);
    add("Massa molar final (kg/kmol)", t.M.toPrecision(16).replace(".", ","));
    add("Normalizador N", t.N.toPrecision(16).replace(".", ","));
    t.fontes.forEach(f => {
        add();
        add("FONTE", f.index + 1, f.nome);
        add("Proporção (%)", (f.alpha * 100).toPrecision(16).replace(".", ","));
        add("Base cadastrada", basisName(f.baseOriginal));
        add("Soma original (%)", f.totalOriginal.toPrecision(16).replace(".", ","));
        add("Massa molar (kg/kmol)", f.M.toPrecision(16).replace(".", ","));
        if (f.origemAnterior)
            add("Origem salva", f.origemAnterior);
        add("ID", "Componente", "Fórmula", "Entrada (%)", "Normalizado (%)", "y (%)", "w (%)", "M (kg/kmol)");
        f.componentes.forEach(c => add(c.id, c.nome, c.formula, c.original.toPrecision(16).replace(".", ","), c.normalizado.toPrecision(16).replace(".", ","), (c.y * 100).toPrecision(16).replace(".", ","), (c.w * 100).toPrecision(16).replace(".", ","), c.M.toPrecision(16).replace(".", ",")));
    });
    add();
    add("CONTRIBUIÇÕES MOLARES PARA A MISTURA FINAL — PONTOS PERCENTUAIS");
    add("ID", "Componente", "Fórmula", ...t.fontes.map((f, i) => `Fonte ${i + 1}: ${f.nome}`), "y final (%)", "w final (%)", "M (kg/kmol)");
    t.componentes.forEach(c => add(c.id, c.nome, c.formula, ...c.parcelasY.map(v => (v * 100).toPrecision(16).replace(".", ",")), (c.y * 100).toPrecision(16).replace(".", ","), (c.w * 100).toPrecision(16).replace(".", ","), c.M.toPrecision(16).replace(".", ",")));
    add("TOTAL", "", "", ...t.fontes.map((f, j) => (t.componentes.reduce((a, c) => a + c.parcelasY[j], 0) * 100).toPrecision(16).replace(".", ",")), (t.somaMolar * 100).toPrecision(16).replace(".", ","), (t.somaMassica * 100).toPrecision(16).replace(".", ","));
    add();
    add("MÉTODO", "y_i = Σ_j q_ij / N; N = Σ_i,j q_ij");
    add("Base molar", "q_ij = alfa_j * y_ij");
    add("Base mássica", "q_ij = alfa_j * w_ij / M_i");
    add("Conversão massa → mol", "y_i = (w_i/M_i) / Σ_k(w_k/M_k)");
    add("Conversão mol → massa", "w_i = y_i*M_i / Σ_k(y_k*M_k)");
    saveFile("\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8", "rastreabilidade_mistura_" + t.data.slice(0, 10) + ".csv");
}
export function exportHTML(t) {
    const css = `body{font:13px/1.5 Arial,sans-serif;color:#172433;margin:36px auto;max-width:1100px;padding:0 24px}h1{font-size:22px}h2{font-size:17px;padding-top:12px;border-top:2px solid #17365c}h4{font-size:15px;margin:16px 0 6px}p{margin:6px 0 10px}.mix-source-trace{break-inside:avoid-page;margin:18px 0}.mix-table-wrap{overflow:visible}table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:11px}th,td{padding:6px;border:1px solid #c8d3df;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#eaf0f6}th small{display:block;font-weight:normal}td{overflow-wrap:anywhere}.mix-total-row{font-weight:bold;background:#f3f6fa}.mix-method{border-top:1px solid #ccd6e2;margin-top:24px}.mix-method p{break-inside:avoid}.mix-origin-line{font-weight:bold}.meta{background:#f2f5f9;padding:12px;border-radius:8px}.hint{font-size:11px;color:#555}.toolbar{margin-bottom:18px}.toolbar button{padding:10px 16px;cursor:pointer}@media print{.toolbar{display:none}body{margin:0;padding:0;max-width:none}thead{display:table-header-group}tr{break-inside:avoid}}`;
    const printableTrace = traceHTML(t).replace(/<details class=/g, "<details open class=");
    const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Rastreabilidade de mistura — ${escapeHTML(t.data.slice(0, 10))}</title><style>${css}</style></head><body>
      <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>
      <h1>Memória de cálculo — mistura de combustíveis</h1>
      <div class="meta"><p><strong>Gerado em:</strong> ${escapeHTML(new Date(t.data).toLocaleString("pt-BR"))}</p>
      <p><strong>Origem:</strong> ${escapeHTML(t.origin)}</p><p><strong>Base das proporções:</strong> ${basisName(t.baseProporcao)}</p>
      ${t.ensaio ? `<p><strong>Ensaio:</strong> ${escapeHTML(t.ensaio)}</p>` : ""}
      ${t.observacoes ? `<p><strong>Observações:</strong> ${escapeHTML(t.observacoes)}</p>` : ""}
      <p><strong>Massa molar final:</strong> ${fmt(t.M, 8)} kg/kmol</p></div>
      <h2>Composição resultante</h2>
      <table><thead><tr><th>Componente</th><th>Fórmula</th><th>y molar (%)</th><th>w mássica (%)</th><th>M (kg/kmol)</th></tr></thead><tbody>
      ${t.componentes.map(c => `<tr><td>${escapeHTML(c.nome)}</td><td>${escapeHTML(c.formula)}</td><td>${fmt(c.y * 100, 8)}</td><td>${fmt(c.w * 100, 8)}</td><td>${fmt(c.M, 8)}</td></tr>`).join("")}
      <tr class="mix-total-row"><td>Total</td><td></td><td>${fmt(t.somaMolar * 100, 8)}</td><td>${fmt(t.somaMassica * 100, 8)}</td><td></td></tr></tbody></table>
      <h2>Rastreabilidade das entradas e parcelas de contribuição</h2>${printableTrace}
      <p class="hint">Valores de composição arredondados apenas na exibição. Presets são composições de referência e precisam ser confrontados com análises reais quando usados em ensaios.</p>
      </body></html>`;
    saveFile(doc, "text/html;charset=utf-8", "rastreabilidade_mistura_" + t.data.slice(0, 10) + ".html");
}
