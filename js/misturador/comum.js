/**
 * Utilitários do misturador
 * Formatação, consulta ao cadastro de gases e seletores DOM.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
export const C = window.Combustion;
export const STORAGE = "lbe_misturador_receitas_v1";
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export const fmt = (v, digits = 6) => Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: digits, maximumFractionDigits: digits
});
export const now = () => new Date().toISOString();
export const basisName = value => value === "massica" ? "mássica" : "molar";
export const gas = id => {
    const component = C.getGas(id);
    if (!component || !Number.isFinite(component.massaMolar) || component.massaMolar <= 0) {
        throw Error("Componente inválido ou sem massa molar no banco: " + id);
    }
    return component;
};
