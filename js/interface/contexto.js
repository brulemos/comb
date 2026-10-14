/**
 * CONTEXTO DA INTERFACE
 * Referências aos elementos HTML e estado de execução compartilhado.
 * NENHUMA fórmula físico-química deve ser implementada aqui.
 */

export const C = window.Combustion;

export const E = window.EmissionEstimator;

export const BUILTIN = window.COMBUSTION_PRESETS || {};

export const VERSION = "0.7.1";

export const $ = s => document.querySelector(s);

export const $$ = s => [
        ...document.querySelectorAll(s)
    ];

export const DISPLAY_MAX_DECIMALS = 4;

export const fmt = (n, d = 2) => {
        const requestedDigits = Number(d);
        const digits = Number.isFinite(requestedDigits)
            ?
                Math.min(DISPLAY_MAX_DECIMALS, Math.max(0, Math.trunc(requestedDigits)))
            :
                2;
        return Number.isFinite(n)
            ?
                n.toLocaleString("pt-BR", {
                    minimumFractionDigits: digits,
                    maximumFractionDigits: digits
                })
            :
                "—";
    };

export const num = s => Number($(s)?.value);

export const esc = v => String(v ?? "")
        .replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[ch]);

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
  // Resultados do módulo de emissões estimadas, separados do cálculo ideal.
  estimativaEmissoes: null,
  // Inibe reações intermediárias enquanto um caso é carregado/resetado.
  carregando: false,
  temporizadorRedimensionamento: null,
  temporizadorCondicoesChamine: null
};
