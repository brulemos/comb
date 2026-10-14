/**
 * Receitas e composição de fontes do misturador
 * Normalização e conversão entre frações mássicas e molares.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
import { STORAGE, $, $$, gas } from './comum.js';
export function readSaved() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE) || "[]");
        return Array.isArray(data) ? data.filter(v => v && typeof v.id === "string" &&
            typeof v.nome === "string" && Array.isArray(v.componentes)) : [];
    }
    catch {
        return [];
    }
}
export function writeSaved(value) { localStorage.setItem(STORAGE, JSON.stringify(value)); }
export function originalComposition(data) {
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
export function currentComposition() {
    const base = $('input[name="baseComposicao"]:checked')?.value || "molar";
    const rows = $$('#corpoMistura tr').map(tr => ({
        id: $('.component-select', tr)?.value || "",
        percentual: Number($('.component-percent', tr)?.value)
    })).filter(row => row.id || row.percentual !== 0);
    if (rows.some(row => !row.id))
        throw Error("A composição atual contém uma linha sem componente.");
    return { nome: "Composição atual", base, componentes: rows };
}
export function availableOptions() {
    return [{ key: "current", nome: "Composição atual" },
        ...Object.entries(window.COMBUSTION_PRESETS || {}).map(([key, preset]) => ({
            key: "builtin:" + key, nome: preset.nome || key
        })),
        ...readSaved().map(recipe => ({ key: "saved:" + recipe.id, nome: "Minha receita: " + recipe.nome }))];
}
export function resolveSource(key) {
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
export function calculateSource(source, alpha, index) {
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
