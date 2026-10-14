/**
 * CÁLCULOS / COMPOSIÇÃO
 * Frações molares e mássicas, poderes caloríficos e balanço elementar.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { getGas } from './01-utilidades.js';



/* =========================================================
   COMPOSIÇÃO
========================================================= */
/** Transforma percentuais dos componentes em frações molares (y) e mássicas (w). */
export function compositionToYW(items, base) {
    const valid = items
        .filter(i => i.gas
        &&
            Number(i.percentual)
                >
                    0)
        .map(i => ({
        gas: i.gas,
        f: Number(i.percentual)
            /
                100
    }));
    if (!valid.length) {
        return [];
    }
    if (base === "molar") {
        const M = valid.reduce((s, i) => s
            +
                i.f
                    *
                        i.gas.massaMolar, 0);
        return valid.map(i => ({
            gas: i.gas,
            y: i.f,
            w: i.f
                *
                    i.gas.massaMolar
                /
                    M
        }));
    }
    const denom = valid.reduce((s, i) => s
        +
            i.f
                /
                    i.gas.massaMolar, 0);
    return valid.map(i => ({
        gas: i.gas,
        w: i.f,
        y: (i.f
            /
                i.gas.massaMolar)
            /
                denom
    }));
}

/** Agrupa componentes repetidos e normaliza suas frações molares; recalcula w. */
export function normalizeMolarComposition(entries) {
    const merged = new Map();
    for (const entry of entries) {
        if (!entry.gas
            ||
                !(entry.y > 0)) {
            continue;
        }
        merged.set(entry.gas.id, (merged.get(entry.gas.id)
            ||
                0)
            +
                entry.y);
    }
    const total = [
        ...merged.values()
    ]
        .reduce((a, b) => a + b, 0);
    if (!(total > 0)) {
        return [];
    }
    const mol = [
        ...merged.entries()
    ]
        .map(([id, y]) => ({
        gas: getGas(id),
        y: y / total
    }));
    const M = mol.reduce((s, i) => s
        +
            i.y
                *
                    i.gas.massaMolar, 0);
    return mol.map(i => ({
        ...i,
        w: i.y
            *
                i.gas.massaMolar
            /
                M
    }));
}

/** Massa molar média: Σ(yᵢ·Mᵢ), em kg/kmol. */
export const mixtureMolarMass = comp => comp.reduce((s, i) => s
    +
        i.y
            *
                i.gas.massaMolar, 0);

/** PCS da mistura: Σ(wᵢ·PCSᵢ), em MJ/kg. */
export const mixtureHHV = comp => comp.reduce((s, i) => s
    +
        i.w
            *
                i.gas.pcs, 0);

/** PCI da mistura: Σ(wᵢ·PCIᵢ), em MJ/kg. */
export const mixtureLHV = comp => comp.reduce((s, i) => s
    +
        i.w
            *
                i.gas.pci, 0);

/* =========================================================
   ESTEQUIOMETRIA
========================================================= */
/** Quantidade molar de átomos por kmol de combustível, usada na estequiometria. */
export function atomsOfMixture(comp) {
    const a = {
        C: 0,
        H: 0,
        N: 0,
        O: 0,
        S: 0
    };
    for (const i of comp) {
        a.C +=
            i.y
                *
                    i.gas.atomos.C;
        a.H +=
            i.y
                *
                    i.gas.atomos.H;
        a.N +=
            i.y
                *
                    i.gas.atomos.N;
        a.O +=
            i.y
                *
                    i.gas.atomos.O;
        a.S +=
            i.y
                *
                    i.gas.atomos.S;
    }
    return a;
}

export const ATOMIC_MASS = {
    C: 12.011,
    H: 1.008,
    N: 14.007,
    O: 15.999,
    S: 32.06
};

/** Frações mássicas elementares C, H, N, O e S da mistura. */
export function elementalMassPercentages(comp) {
    const masses = {
        C: 0,
        H: 0,
        N: 0,
        O: 0,
        S: 0
    };
    const totalMass = mixtureMolarMass(comp);
    for (const item of comp) {
        for (const e of [
            "C",
            "H",
            "N",
            "O",
            "S"
        ]) {
            masses[e] +=
                item.y
                    *
                        item.gas.atomos[e]
                    *
                        ATOMIC_MASS[e];
        }
    }
    const trackedMass = Object.values(masses)
        .reduce((a, b) => a + b, 0);
    const zMass = Math.max(0, totalMass
        -
            trackedMass);
    const pct = value => totalMass > 0
        ?
            value
                /
                    totalMass
                *
                    100
        :
            0;
    return {
        C: pct(masses.C),
        H: pct(masses.H),
        N: pct(masses.N),
        O: pct(masses.O),
        S: pct(masses.S),
        Z: pct(zMass)
    };
}
