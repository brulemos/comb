/**
 * Referências, constantes e fatores de conversão
 * Não alterar sem atualizar a rastreabilidade bibliográfica.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
export const LB_MMBTU_TO_KG_GJ = 0.45359237 / 1.05505585262;
export const NG_HHV_BTU_SCF = 1020;
export const MW = {
    CO: 28.0101,
    CO2: 44.0095,
    CH4: 16.04246,
    NO: 30.0061,
    NO2: 46.0055,
    O2: 31.9988,
    H2O: 18.01528
};
export const SOURCES = {
    ap42_14: {
        short: "US EPA AP-42, Seção 1.4 — Natural Gas Combustion",
        edition: "Fifth Edition; seção de 1998, correção editorial de abril/2026",
        url: "https://www.epa.gov/sites/default/files/2020-09/documents/1.4_natural_gas_combustion.pdf"
    },
    ap42_31: {
        short: "US EPA AP-42, Seção 3.1 — Stationary Gas Turbines",
        edition: "Fifth Edition, Supplement F, abril/2000",
        url: "https://www.epa.gov/sites/default/files/2020-10/documents/c03s01.pdf"
    },
    ap42_32: {
        short: "US EPA AP-42, Seção 3.2 — Natural Gas-fired Reciprocating Engines",
        edition: "Fifth Edition, atualização de outubro/2024",
        url: "https://www.epa.gov/system/files/documents/2024-10/c03s02_2024-update_0.pdf"
    }
};
export function lbMmbtuToKgGJ(value) {
    return Number(value) * LB_MMBTU_TO_KG_GJ;
}
export function lbMmscfToKgGJ(value) {
    return lbMmbtuToKgGJ(Number(value) / NG_HHV_BTU_SCF);
}
