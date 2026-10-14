/**
 * CÁLCULOS / PROPRIEDADES
 * Cp(T), densidade ideal, densidade normal e índices de Wobbe.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { CONFIG } from './01-utilidades.js';



/* =========================================================
   CP SHOMATE
========================================================= */
/** Seleciona a faixa cadastrada de coeficientes de Cp ou sinaliza extrapolação. */
export function selectCpRange(gas, T) {
    const ranges = gas?.cpShomate?.faixas
        ||
            [];
    if (!ranges.length) {
        return {
            range: null,
            extrapolated: true
        };
    }
    const inside = ranges.find(r => T >= r.Tmin
        &&
            T <= r.Tmax);
    if (inside) {
        return {
            range: inside,
            extrapolated: false
        };
    }
    return {
        range: T < ranges[0].Tmin
            ?
                ranges[0]
            :
                ranges[ranges.length - 1],
        extrapolated: true
    };
}

/** Cp molar via Shomate: A + Bt + Ct² + Dt³ + E/t², com t=T/1000; J/(mol·K). */
export function cpMolar(gas, T) {
    const { range, extrapolated } = selectCpRange(gas, T);
    if (!range) {
        return {
            value: NaN,
            extrapolated: true
        };
    }
    const t = T / 1000;
    return {
        value: range.A
            +
                range.B
                    *
                        t
            +
                range.C
                    *
                        t ** 2
            +
                range.D
                    *
                        t ** 3
            +
                range.E
                    /
                        t ** 2,
        extrapolated
    };
}

/** Converte Cp molar para Cp mássico em kJ/(kg·K), usando massa molar. */
export function cpMass(gas, T) {
    const r = cpMolar(gas, T);
    return {
        value: r.value
            /
                gas.massaMolar,
        extrapolated: r.extrapolated
    };
}

/** Cp mássico da mistura: Σ(wᵢ·Cpᵢ(T)), em kJ/(kg·K). */
export function mixtureCp(comp, T) {
    let value = 0;
    const warnings = [];
    for (const item of comp) {
        const cp = cpMass(item.gas, T);
        if (!Number.isFinite(cp.value)) {
            throw new Error(`Não há correlação de Cp para ${item.gas.nome}.`);
        }
        value +=
            item.w
                *
                    cp.value;
        if (item.gas.cpShomate?.estimado) {
            warnings.push(`${item.gas.nome}: Cp estimado por ${item.gas.cpShomate.metodo}.`);
        }
        if (cp.extrapolated) {
            warnings.push(`${item.gas.nome}: Cp extrapolado fora da faixa cadastrada em ${T.toFixed(2)} K.`);
        }
    }
    return {
        value,
        warnings: [
            ...new Set(warnings)
        ]
    };
}

/* =========================================================
   DENSIDADE / WOBBE
========================================================= */
/** Densidade ideal ρ=P·M/(R·T); P em kPa, M em kg/kmol, T em K, ρ em kg/m³. */
export const idealDensity = (M, T, PkPa) => PkPa
    *
        M
    /
        (CONFIG.R
            *
                T);

/** Densidade ideal em condição normal cadastrada no CONFIG, em kg/Nm³. */
export const normalDensity = M => idealDensity(M, CONFIG.Tn, CONFIG.Pn);

/** Calcula densidade relativa e índices de Wobbe para uma base de PCS. */
export function wobbe(pcsMass, rhoN, M) {
    const d = M
        /
            CONFIG.Mair;
    return {
        relativeDensity: d,
        volumetricMJNm3: pcsMass
            *
                rhoN
            /
                Math.sqrt(d),
        massEquivalentMJkg: pcsMass
            /
                Math.sqrt(d)
    };
}

/** Converte o índice de Wobbe para outras unidades volumétricas ou mássicas. */
export function convertWobbe(w, unit) {
    const base = unit.includes("kg")
        ?
            w.massEquivalentMJkg
        :
            w.volumetricMJNm3;
    if (unit.startsWith("kWh")) {
        return base / 3.6;
    }
    if (unit.startsWith("kcal")) {
        return base * 238.8458966;
    }
    return base;
}
