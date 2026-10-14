/**
 * Correção convencional de concentrações para O₂ de referência (base seca).
 * Aplicável somente a comburente com composição equivalente ao ar atmosférico.
 * O modelo com oxigênio enriquecido exige metodologia própria de normalização.
 * 20,9%: constante convencional da equação de correção;
 * 20,95%: composição atmosférica nominal usada no formulário.
 */
export const O2_AR_REFERENCIA_PCT = 20.9;
export const O2_AR_ATMOSFERICO_PCT = 20.95;
const TOLERANCIA_O2_AR_PCT = 0.2; // tolera 20,9% ou 20,95%; não aceita enriquecimento

export function comburenteAtmosferico(o2ComburentePct = O2_AR_ATMOSFERICO_PCT) {
  return Number.isFinite(o2ComburentePct) &&
    Math.abs(o2ComburentePct - O2_AR_ATMOSFERICO_PCT) <= TOLERANCIA_O2_AR_PCT;
}

export function referenciaO2Valida(referenciaPct) {
  return Number.isFinite(referenciaPct) &&
    referenciaPct >= 0 && referenciaPct < O2_AR_REFERENCIA_PCT;
}

export function fatorCorrecaoO2(o2MedidoSecoPct, o2ReferenciaPct, o2ComburentePct = O2_AR_ATMOSFERICO_PCT) {
  if (!comburenteAtmosferico(o2ComburentePct) ||
      !referenciaO2Valida(o2ReferenciaPct) ||
      !Number.isFinite(o2MedidoSecoPct) ||
      o2MedidoSecoPct < 0 || o2MedidoSecoPct >= O2_AR_REFERENCIA_PCT) return NaN;
  return (O2_AR_REFERENCIA_PCT - o2ReferenciaPct) /
    (O2_AR_REFERENCIA_PCT - o2MedidoSecoPct);
}

export function concentracaoCorrigidaO2(valor, o2MedidoSecoPct, o2ReferenciaPct, o2ComburentePct = O2_AR_ATMOSFERICO_PCT) {
  const fator = fatorCorrecaoO2(o2MedidoSecoPct, o2ReferenciaPct, o2ComburentePct);
  return Number.isFinite(valor) && Number.isFinite(fator) ? valor * fator : NaN;
}
