import { selecionar, selecionarTodos, escaparHTML } from "./dom.js";
/**
 * CONTEXTO DA INTERFACE
 * Referências aos elementos HTML e estado de execução compartilhado.
 * NENHUMA fórmula físico-química deve ser implementada aqui.
 */

export const C = window.Combustion;

export const BUILTIN = window.COMBUSTION_PRESETS || {};

export const $ = selecionar;

export const $$ = selecionarTodos;

export const DISPLAY_MAX_DECIMALS = 4;

export const fmt = (n, d = 2) => {
  const requestedDigits = Number(d);
  const digits = Number.isFinite(requestedDigits)
    ? Math.min(DISPLAY_MAX_DECIMALS, Math.max(0, Math.trunc(requestedDigits)))
    : 2;
  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      })
    : "—";
};

export const num = (s) => {
  const value = $(s)?.value;
  return value === undefined || value.trim() === "" ? NaN : Number(value);
};

export const esc = escaparHTML;

export const els = {
  body: $("#corpoMistura"),
  preset: $("#presetCombustivel"),
  search: $("#componentSearch"),
  total: $("#totalComposicao"),
  bar: $("#barraComposicao"),
  status: $("#statusComposicao"),
  error: $("#mensagemErro"),
  flowType: $("#tipoVazao"),
  flow: $("#vazaoEntrada"),
  flowLabel: $("#labelVazaoEntrada"),
  flowUnit: $("#unidadeVazao"),
  flowHelp: $("#ajudaVazao"),
  o2: $("#o2Comburente"),
  n2: $("#n2Comburente"),
  excess: $("#excessoAr"),
  measuredO2: $("#o2Medido"),
  lambdaPreview: $("#lambdaPreview"),
  warnings: $("#warningsList"),
  productBody: $("#corpoProdutos"),
  mixtureDetail: $("#mixtureDetailBody"),
  elementBody: $("#elementBalanceBody"),

  traceDialog: $("#componentTraceDialog"),
  traceBody: $("#componentTraceBody")
};

/** Um único estado compartilhado evita variáveis globais e imports mutáveis. */
export const estado = {
  // Resultado integral do último cálculo; nulo após Limpar.
  ultimoCaso: null,
  // Inibe reações intermediárias enquanto um caso é carregado/resetado.
  carregando: false,
  temporizadorRedimensionamento: null,
  temporizadorCondicoesChamine: null
};

/** Identifica resultados que não correspondem mais aos campos editados. */
export function setResultStatus(status) {
  const el = document.getElementById("resultStatus");
  if (!el) return;
  el.dataset.status = status;
  document.dispatchEvent(new CustomEvent("combustion:result-status", { detail: { status } }));
  el.classList.toggle("hidden", status !== "pendente");
  el.textContent =
    status === "pendente"
      ? "Entradas alteradas: os resultados exibidos são do cálculo anterior. Clique em Calcular combustão para atualizar antes de utilizar ou imprimir."
      : "";
}
