/**
 * CÁLCULOS / QUALIDADE
 * Alertas para propriedades, extrapolações e condições de cálculo.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { getGas } from './01-utilidades.js';

import { selectCpRange } from './03-propriedades.js';



/* =========================================================
   AVISOS
========================================================= */
/** Emite alertas sobre dados estimados e Cp fora das faixas cadastradas. */
export function qualityWarnings({ comp, fuelT, oxidizerT, stackT, presetName = null, humidityEnabled = false }) {
    const warnings = [];
    if (presetName) {
        warnings.push(`${presetName}: preset representativo e editável; não é composição normativa.`);
    }
    if (humidityEnabled) {
        warnings.push("Comburente úmido: O₂/N₂ informados são tratados em base seca e H₂O é acrescentado pela umidade relativa.");
    }
    const checks = [
        {
            label: "combustível",
            T: fuelT
        },
        {
            label: "gases de chaminé",
            T: stackT
        }
    ];
    for (const item of comp) {
        if (item.gas.cpShomate?.estimado) {
            warnings.push(`${item.gas.nome}: Cp estimado por ${item.gas.cpShomate.metodo}.`);
        }
        for (const c of checks) {
            if (selectCpRange(item.gas, c.T).extrapolated) {
                warnings.push(`${item.gas.nome}: Cp fora da faixa cadastrada na condição de ${c.label} (${c.T.toFixed(2)} K).`);
            }
        }
        const src = item.gas.fontePcsPci
            ||
                "";
        if (src
            .toLowerCase()
            .includes("estim")
            ||
                src.includes("Channiwala")) {
            warnings.push(`${item.gas.nome}: PCS/PCI contém estimativa/correlação.`);
        }
    }
    for (const id of [
        "O2",
        "N2",
        "H2O",
        "CO2",
        "SO2"
    ]) {
        const g = getGas(id);
        if (g
            &&
                selectCpRange(g, oxidizerT).extrapolated
            &&
                [
                    "O2",
                    "N2",
                    "H2O"
                ]
                    .includes(id)) {
            warnings.push(`${g.nome}: Cp do comburente extrapolado em ${oxidizerT.toFixed(2)} K.`);
        }
    }
    return [
        ...new Set(warnings)
    ];
}
