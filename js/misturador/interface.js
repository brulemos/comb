/**
 * Interface do misturador
 * Eventos, gerenciamento da sessão e interação com a calculadora.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
import { $, $$, escapeHTML, fmt, now, basisName } from './comum.js';
import { readSaved, writeSaved, availableOptions, resolveSource, calculateSource } from './receitas.js';
import { traceHTML, exportCSV, exportHTML } from './relatorios.js';
/** Inicializa o diálogo e registra eventos apenas quando a calculadora terminou de carregar. */
export function iniciarMisturador() {
    function calculateTrace() {
        const rows = $$('.mix-source', $('#mixSources'));
        if (!rows.length)
            throw Error("Adicione pelo menos uma mistura.");
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
        const fontes = chosen.filter(row => row.percentual > 0).map((row, index) => calculateSource(resolveSource(row.key), row.percentual / 100, index));
        if (!fontes.length)
            throw Error("As proporções não contêm valores positivos.");
        const byId = new Map();
        let N = 0;
        fontes.forEach((source, j) => source.componentes.forEach(part => {
            const q = baseProporcao === "molar" ? source.alpha * part.y : source.alpha * part.w / part.M;
            N += q;
            if (!byId.has(part.id))
                byId.set(part.id, {
                    id: part.id, nome: part.nome, formula: part.formula, M: part.M,
                    parcelasQ: Array(fontes.length).fill(0), parcelasW: Array(fontes.length).fill(0)
                });
            const target = byId.get(part.id);
            target.parcelasQ[j] += q;
            target.parcelasW[j] += source.alpha * part.w;
        }));
        if (!(N > 0) || !Number.isFinite(N))
            throw Error("Não foi possível calcular a composição.");
        const componentes = [...byId.values()].map(row => {
            const q = row.parcelasQ.reduce((a, b) => a + b, 0);
            return { ...row, q, y: q / N, parcelasY: row.parcelasQ.map(v => v / N) };
        });
        const M = componentes.reduce((sum, row) => sum + row.y * row.M, 0);
        componentes.forEach(row => row.w = row.y * row.M / M);
        componentes.sort((a, b) => b.y - a.y || a.id.localeCompare(b.id));
        const origin = fontes.map(source => `${fmt(source.alpha * 100, 2)}% ${source.nome}`).join(" + ");
        const ensaio = $('#mixTestId').value.trim();
        const observacoes = $('#mixNotes').value.trim();
        return {
            versao: 2, data: now(), baseProporcao, fontes, componentes, N, M, origin, ensaio, observacoes,
            somaMolar: componentes.reduce((sum, row) => sum + row.y, 0),
            somaMassica: componentes.reduce((sum, row) => sum + row.w, 0)
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
    openButton.textContent = "Misturar combustíveis";
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
        $('.mix-remove', row).onclick = () => { row.remove(); invalidate(); };
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
    function render(t) {
        $('#mixPreview').innerHTML = `<div class="mix-origin-line">${escapeHTML(t.origin)}</div>
      <p><strong>Base das proporções:</strong> ${basisName(t.baseProporcao)} · <strong>Massa molar final:</strong> ${fmt(t.M, 6)} kg/kmol</p>
      <div class="mix-table-wrap"><table><thead><tr><th>Componente</th><th>Fórmula</th><th>% molar</th><th>% mássica</th></tr></thead>
      <tbody>${t.componentes.map(row => `<tr><td>${escapeHTML(row.nome)}</td><td>${escapeHTML(row.formula)}</td><td>${fmt(row.y * 100, 6)}</td><td>${fmt(row.w * 100, 6)}</td></tr>`).join("")}
      <tr class="mix-total-row"><td colspan="2">Total</td><td>${fmt(t.somaMolar * 100, 6)}</td><td>${fmt(t.somaMassica * 100, 6)}</td></tr></tbody></table></div>`;
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
        try {
            fn();
        }
        catch (err) {
            showStatus(err.message || String(err), true);
        }
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
    $('#mixAdd').onclick = () => { addSource("current", 0); invalidate(); };
    $('#mixBasis').onchange = invalidate;
    $('#mixTestId').addEventListener("input", invalidate);
    $('#mixNotes').addEventListener("input", invalidate);
    $('#mixNormalize').onclick = () => handle(() => {
        const inputs = $$('.mix-percent', sources);
        const values = inputs.map(i => i.value.trim() === "" ? NaN : Number(i.value));
        if (values.some(x => !Number.isFinite(x) || x < 0))
            throw Error("Informe proporções não negativas.");
        const sum = values.reduce((a, b) => a + b, 0);
        if (!(sum > 0))
            throw Error("A soma deve ser positiva.");
        inputs.forEach((input, idx) => { input.value = String(100 * values[idx] / sum); });
        invalidate();
        showStatus("Proporções normalizadas para 100%.");
    });
    $('#mixCalc').onclick = () => handle(preview);
    $('#mixExportHTML').onclick = () => handle(() => exportHTML(latest || preview()));
    $('#mixExportCSV').onclick = () => handle(() => exportCSV(latest || preview()));
    $('#mixSave').onclick = () => handle(() => {
        const t = latest || preview();
        const input = prompt("Nome da nova receita:");
        if (input === null)
            return;
        const nome = input.trim();
        if (!nome || nome.length > 100)
            throw Error("Informe um nome com até 100 caracteres.");
        const saved = readSaved();
        if (saved.some(s => s.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) {
            throw Error("Já existe uma receita com esse nome.");
        }
        const id = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        saved.push({ id, nome, base: "molar", componentes: t.componentes.map(c => ({ id: c.id, percentual: c.y * 100 })),
            origem: t.origin, criadaEm: t.data,
            proveniencia: { ensaio: t.ensaio, observacoes: t.observacoes, versao: 2, data: t.data, baseProporcao: t.baseProporcao, normalizador: t.N, massaMolar: t.M,
                fontes: t.fontes.map(f => ({ nome: f.nome, alpha: f.alpha, baseOriginal: f.baseOriginal, totalOriginal: f.totalOriginal,
                    componentes: f.componentes.map(c => ({ id: c.id, percentual: c.original })) })) } });
        writeSaved(saved);
        refreshOptions();
        showStatus(`Receita "${nome}" salva com origem e composições das fontes.`);
    });
    $('#mixDelete').onclick = () => handle(() => {
        const saved = readSaved();
        if (!saved.length)
            throw Error("Não existem receitas salvas.");
        const name = prompt("Digite o nome exato da receita que deseja excluir:\n" + saved.map(s => s.nome).join("\n"));
        if (name === null)
            return;
        const found = saved.find(s => s.nome === name.trim());
        if (!found)
            throw Error("Receita não encontrada.");
        if (!confirm(`Excluir a receita "${found.nome}"?`))
            return;
        writeSaved(saved.filter(x => x.id !== found.id));
        refreshOptions();
        invalidate();
        showStatus("Receita excluída da lista local.");
    });
    $('#mixApply').onclick = () => handle(() => {
        const t = latest || preview();
        if (!confirm("Substituir a composição atual pela mistura calculada?"))
            return;
        const target = $('#corpoMistura');
        const base = $('input[name="baseComposicao"][value="molar"]');
        base.checked = true;
        base.dispatchEvent(new Event("change", { bubbles: true }));
        target.innerHTML = "";
        /* Mantém o mecanismo original para criar e atualizar as linhas da composição. */
        t.componentes.forEach(c => {
            $('#btnAdicionar').click();
            const row = target.lastElementChild;
            const select = $('.component-select', row);
            select.value = c.id;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            const field = $('.component-percent', row);
            field.value = String(c.y * 100);
            field.dispatchEvent(new Event("input", { bubbles: true }));
        });
        $('#presetCombustivel').value = "manual";
        lastApplied = structuredClone(t);
        modifiedAfterApply = false;
        refreshOrigin();
        dialog.close();
    });
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
        if (dialog.open)
            dialog.close();
    }
    document.addEventListener("combustion:reset", clearMixerSession);
    function refreshOrigin() {
        if (!lastApplied) {
            originArea.hidden = true;
            return;
        }
        originArea.hidden = false;
        $('#mixOrigin').textContent = modifiedAfterApply ?
            "Composição editada após a aplicação. Memória disponível apenas como registro original: " + lastApplied.origin :
            "Origem da mistura aplicada: " + lastApplied.origin;
    }
    $('#mixShowLastTrace').onclick = () => {
        if (!lastApplied)
            return;
        refreshOptions();
        const t = structuredClone(lastApplied);
        latest = t;
        render(t);
        $('#mixTraceDetails').open = true;
        showStatus(modifiedAfterApply ? "Registro histórico: a composição principal foi alterada após esta aplicação." :
            "Memória de cálculo da última mistura aplicada.");
        dialog.showModal();
    };
    const markEdited = event => {
        if (event.isTrusted && lastApplied && !dialog.open) {
            modifiedAfterApply = true;
            refreshOrigin();
        }
    };
    $('#corpoMistura').addEventListener("input", markEdited);
    $('#corpoMistura').addEventListener("change", markEdited);
    $('#corpoMistura').addEventListener("click", event => {
        if (event.isTrusted && event.target.closest(".remove-row"))
            markEdited(event);
    });
    $('#presetCombustivel').addEventListener("change", markEdited);
    $('#btnNormalizarFracoes').addEventListener("click", markEdited);
    $('#btnAdicionar').addEventListener("click", markEdited);
    $$('input[name="baseComposicao"]').forEach(el => el.addEventListener("change", markEdited));
}
