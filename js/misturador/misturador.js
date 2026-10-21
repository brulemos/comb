/** Pacote JavaScript consolidado; as seções ORIGINAL preservam a origem do código.
 * Gerado a partir da versão-base auditada. Sem bibliotecas externas adicionais.
 */
const __modules={
  "misturador.js": (__load,__exports) => {
// ===== ORIGINAL: misturador.js =====

/** Inicializador do misturador (módulos ES nativos, sem etapa de compilação). */
const { iniciarMisturador: iniciarMisturador } = __load("js/misturador/interface.js");
iniciarMisturador();

},
  "js/misturador/interface.js": (__load,__exports) => {
// ===== ORIGINAL: js/misturador/interface.js =====
Object.defineProperty(__exports, "iniciarMisturador", {enumerable:true,get:()=>iniciarMisturador});
/** Misturador simplificado: seleção de fontes, proporções e aplicação da composição. */
const { $: $, $$: $$, escapeHTML: escapeHTML, fmt: fmt, now: now, basisName: basisName } = __load("js/misturador/comum.js");
const { availableOptions: availableOptions, resolveSource: resolveSource, calculateSource: calculateSource } = __load("js/misturador/receitas.js");

function iniciarMisturador() {
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
        return {
            versao: 2, data: now(), baseProporcao, fontes, componentes, N, M, origin,
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
          <h2 id="mixTitle">Misturador de combustíveis</h2>
          <button type="button" id="mixClose" class="btn secondary">Fechar ×</button>
        </header>
        <label class="mix-field" for="mixBasis">Base da proporção entre misturas
          <select id="mixBasis"><option value="molar">% molar</option><option value="massica">% mássica</option></select>
        </label>
        <div id="mixSources"></div>
        <div class="mix-actions">
          <button type="button" class="btn secondary" id="mixAdd">+ Adicionar mistura</button>
          <button type="button" class="btn secondary" id="mixNormalize">Normalizar proporções</button>
        </div>
        <div id="mixStatus" role="status" aria-live="polite"></div>
        <section class="mix-preview" aria-label="Resultado da mistura">
          <h3>Composição resultante</h3>
          <div id="mixPreview" aria-live="polite">Selecione as fontes e ajuste as proporções.</div>
        </section>
        <div class="mix-actions mix-final-actions">
          <button type="button" class="btn primary" id="mixApply">Aplicar à composição</button>
        </div>
      </div>`;
    document.body.append(dialog);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "btn secondary";
    openButton.id = "btnMixCombustiveis";
    openButton.textContent = "Misturar combustíveis";
    $('#btnNormalizarFracoes').insertAdjacentElement("afterend", openButton);

    const sources = $('#mixSources');
    const status = $('#mixStatus');
    const result = $('#mixPreview');
    const showStatus = (message, error = false) => {
        status.textContent = message;
        status.className = error ? "mix-error" : "mix-ok";
    };
    function render(t) {
        result.innerHTML = `<p><strong>Base:</strong> ${basisName(t.baseProporcao)} · <strong>Massa molar:</strong> ${fmt(t.M, 4)} kg/kmol</p>
          <div class="mix-table-wrap"><table>
            <thead><tr><th>Componente</th><th>Fórmula</th><th>% molar</th><th>% mássica</th></tr></thead>
            <tbody>${t.componentes.map(c => `<tr><td>${escapeHTML(c.nome)}</td><td>${escapeHTML(c.formula)}</td><td>${fmt(c.y * 100, 4)}</td><td>${fmt(c.w * 100, 4)}</td></tr>`).join("")}
              <tr class="mix-total-row"><td colspan="2">Total</td><td>${fmt(t.somaMolar * 100, 4)}</td><td>${fmt(t.somaMassica * 100, 4)}</td></tr>
            </tbody>
          </table></div>`;
    }
    // A composição resultante é atualizada sem precisar de um botão de pré-visualização.
    function updatePreview() {
        try {
            const resultData = calculateTrace();
            render(resultData);
            showStatus("");
            return resultData;
        } catch (error) {
            result.textContent = "Preencha as fontes e as proporções para visualizar o resultado.";
            showStatus(error.message || String(error), true);
            return null;
        }
    }
    function handle(action) {
        try { action(); }
        catch (error) { showStatus(error.message || String(error), true); }
    }
    function addSource(key = "current", percent = 0) {
        const row = document.createElement("div");
        row.className = "mix-source";
        const opts = availableOptions();
        row.innerHTML = `<label>Composição
          <select class="mix-choice">${opts.map(o => `<option value="${escapeHTML(o.key)}">${escapeHTML(o.nome)}</option>`).join("")}</select></label>
          <label>Proporção (%)<input class="mix-percent" type="number" min="0" max="100" step="any" value="${percent}"></label>
          <button type="button" class="btn secondary mix-remove" aria-label="Remover composição">×</button>`;
        sources.append(row);
        $('.mix-choice', row).value = opts.some(o => o.key === key) ? key : (opts[0]?.key || "");
        $('.mix-remove', row).onclick = () => { row.remove(); updatePreview(); };
        $$('input,select', row).forEach(el => {
            el.addEventListener("input", updatePreview);
            el.addEventListener("change", updatePreview);
        });
    }
    function refreshOptions() {
        const opts = availableOptions();
        $$('.mix-choice', sources).forEach(select => {
            const selected = select.value;
            select.innerHTML = opts.map(o => `<option value="${escapeHTML(o.key)}">${escapeHTML(o.nome)}</option>`).join("");
            select.value = opts.some(o => o.key === selected) ? selected : "current";
        });
    }
    function initializeSources() {
        if (sources.children.length) return;
        addSource("current", 50);
        const opts = availableOptions();
        addSource(opts.some(o => o.key === "builtin:ar_seco") ? "builtin:ar_seco" : "current", 50);
    }
    openButton.onclick = () => {
        initializeSources();
        refreshOptions();
        updatePreview();
        dialog.showModal();
    };
    $('#mixClose').onclick = () => dialog.close();
    $('#mixAdd').onclick = () => { addSource("current", 0); updatePreview(); };
    $('#mixBasis').addEventListener("change", updatePreview);
    $('#mixNormalize').onclick = () => handle(() => {
        const inputs = $$('.mix-percent', sources);
        const values = inputs.map(i => i.value.trim() === "" ? NaN : Number(i.value));
        if (values.some(x => !Number.isFinite(x) || x < 0))
            throw Error("Informe proporções não negativas.");
        const sum = values.reduce((a, b) => a + b, 0);
        if (!(sum > 0)) throw Error("A soma deve ser positiva.");
        inputs.forEach((input, idx) => { input.value = String(100 * values[idx] / sum); });
        updatePreview();
        showStatus("Proporções normalizadas para 100%.");
    });
    $('#mixApply').onclick = () => handle(() => {
        // Recalcula no momento da aplicação, evitando qualquer resultado desatualizado.
        const t = calculateTrace();
        // Aplicação direta solicitada: a validação da composição já foi feita por calculateTrace().
        const target = $('#corpoMistura');
        const base = $('input[name="baseComposicao"][value="molar"]');
        base.checked = true;
        base.dispatchEvent(new Event("change", { bubbles: true }));
        target.innerHTML = "";
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
        dialog.close();
    });
    // Limpar caso também reinicia o preparo anterior do misturador.
    document.addEventListener("combustion:reset", () => {
        sources.replaceChildren();
        $('#mixBasis').value = "molar";
        result.textContent = "Selecione as fontes e ajuste as proporções.";
        showStatus("");
        if (dialog.open) dialog.close();
    });
}

},
  "js/misturador/comum.js": (__load,__exports) => {
// ===== ORIGINAL: js/misturador/comum.js =====
Object.defineProperty(__exports, "C", {enumerable:true,get:()=>C});
Object.defineProperty(__exports, "STORAGE", {enumerable:true,get:()=>STORAGE});
Object.defineProperty(__exports, "$", {enumerable:true,get:()=>$});
Object.defineProperty(__exports, "$$", {enumerable:true,get:()=>$$});
Object.defineProperty(__exports, "escapeHTML", {enumerable:true,get:()=>escapeHTML});
Object.defineProperty(__exports, "fmt", {enumerable:true,get:()=>fmt});
Object.defineProperty(__exports, "now", {enumerable:true,get:()=>now});
Object.defineProperty(__exports, "basisName", {enumerable:true,get:()=>basisName});
Object.defineProperty(__exports, "gas", {enumerable:true,get:()=>gas});
/**
 * Utilitários do misturador
 * Formatação, consulta ao cadastro de gases e seletores DOM.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
const C = window.Combustion;
const STORAGE = "lbe_misturador_receitas_v1";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
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

},
  "js/misturador/receitas.js": (__load,__exports) => {
// ===== ORIGINAL: js/misturador/receitas.js =====
Object.defineProperty(__exports, "readSaved", {enumerable:true,get:()=>readSaved});
Object.defineProperty(__exports, "originalComposition", {enumerable:true,get:()=>originalComposition});
Object.defineProperty(__exports, "currentComposition", {enumerable:true,get:()=>currentComposition});
Object.defineProperty(__exports, "availableOptions", {enumerable:true,get:()=>availableOptions});
Object.defineProperty(__exports, "resolveSource", {enumerable:true,get:()=>resolveSource});
Object.defineProperty(__exports, "calculateSource", {enumerable:true,get:()=>calculateSource});
/**
 * Receitas e composição de fontes do misturador
 * Normalização e conversão entre frações mássicas e molares.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
const { STORAGE: STORAGE, $: $, $$: $$, gas: gas } = __load("js/misturador/comum.js");
function readSaved() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE) || "[]");
        return Array.isArray(data) ? data.filter(v => v && typeof v.id === "string" &&
            typeof v.nome === "string" && Array.isArray(v.componentes)) : [];
    }
    catch {
        return [];
    }
}
function originalComposition(data) {
    if (!data || !Array.isArray(data.componentes))
        throw Error("Composição sem componentes.");
    const rows = data.componentes.map(row => ({
        id: String(row.id || ""), percentual: Number(row.percentual)
    }));
    if (rows.some(row => !row.id || !Number.isFinite(row.percentual) || row.percentual < 0)) {
        throw Error("A composição contém um componente não identificado ou percentual inválido.");
    }
    const total = rows.reduce((sum, row) => sum + row.percentual, 0);
    if (!Number.isFinite(total) || total <= 0)
        throw Error("Composição com soma nula ou inválida.");
    const byId = new Map();
    rows.forEach(({ id, percentual }) => {
        if (!percentual)
            return;
        gas(id);
        byId.set(id, (byId.get(id) || 0) + percentual);
    });
    return { totalOriginal: total, rows: [...byId].map(([id, pct]) => ({
            id, original: pct, normalizado: pct / total * 100
        })) };
}
function currentComposition() {
    const base = $('input[name="baseComposicao"]:checked')?.value || "molar";
    const rows = $$('#corpoMistura tr').map(tr => ({
        id: $('.component-select', tr)?.value || "",
        percentual: Number($('.component-percent', tr)?.value)
    })).filter(row => row.id || row.percentual !== 0);
    if (rows.some(row => !row.id))
        throw Error("A composição atual contém uma linha sem componente.");
    return { nome: "Composição atual", base, componentes: rows };
}
function availableOptions() {
    return [{ key: "current", nome: "Composição atual" },
        ...Object.entries(window.COMBUSTION_PRESETS || {}).map(([key, preset]) => ({
            key: "builtin:" + key, nome: preset.nome || key
        })),
        ...readSaved().map(recipe => ({ key: "saved:" + recipe.id, nome: "Minha receita: " + recipe.nome }))];
}
function resolveSource(key) {
    if (key === "current")
        return { key, ...currentComposition() };
    if (key.startsWith("builtin:")) {
        const preset = (window.COMBUSTION_PRESETS || {})[key.slice(8)];
        if (!preset)
            throw Error("Preset inexistente: " + key);
        return { key, ...preset, base: "molar" };
    }
    if (key.startsWith("saved:")) {
        const recipe = readSaved().find(p => p.id === key.slice(6));
        if (!recipe)
            throw Error("A receita selecionada não existe mais: " + key);
        return { key, ...recipe };
    }
    throw Error("Mistura não encontrada: " + key);
}
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
    const molar = amounts.map(row => ({ ...row, y: row.amount / totalAmounts }));
    const M = molar.reduce((sum, row) => sum + row.y * row.M, 0);
    return {
        index, key: source.key, nome: source.nome || source.key, baseOriginal,
        alpha, totalOriginal: original.totalOriginal, M,
        observacao: source.observacao || "",
        origemAnterior: source.origem || "",
        criadaEm: source.criadaEm || null,
        /* Salvas como fotografia da composição, sem links mutáveis aos presets antigos. */
        historicoReceita: source.proveniencia ? {
            data: source.proveniencia.data || null,
            base: source.proveniencia.baseProporcao || null,
            fontes: (source.proveniencia.fontes || []).map(f => ({
                nome: f.nome, percentual: f.alpha * 100, baseOriginal: f.baseOriginal,
                componentes: Array.isArray(f.componentes) ? f.componentes.map(c => ({ id: c.id, percentual: c.percentual })) : []
            }))
        } : null,
        componentes: molar.map(row => ({
            id: row.id, nome: row.nome, formula: row.formula, M: row.M,
            original: row.original, normalizado: row.normalizado,
            y: row.y, w: row.y * row.M / M
        }))
    };
}

},
};
const __cache=new Map();
function __load(id){
 if(__cache.has(id))return __cache.get(id);
 const load=__modules[id];
 if(!load)throw new Error('Módulo ausente: '+id);
 const exports=Object.create(null);__cache.set(id,exports);
 try{load(__load,exports);}catch(error){__cache.delete(id);throw error;}
 return exports;
}
__load("misturador.js");

