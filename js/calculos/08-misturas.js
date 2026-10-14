/**
 * CÁLCULOS / MISTURAS
 * Mistura de combustíveis e solução de composições-alvo.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { clamp } from './01-utilidades.js';

import { mixtureHHV, mixtureLHV, mixtureMolarMass, normalizeMolarComposition } from './02-composicao.js';

import { normalDensity, wobbe } from './03-propriedades.js';



/* =========================================================
   MISTURA POR ALVO
========================================================= */
/** Seleciona PCI, PCS ou Wobbe de mistura para ajuste por alvo. */
export function mixtureProperty(comp, property) {
    const M = mixtureMolarMass(comp);
    const pcs = mixtureHHV(comp);
    const pci = mixtureLHV(comp);
    const rhoN = normalDensity(M);
    const w = wobbe(pcs, rhoN, M);
    if (property === "PCI") {
        return pci;
    }
    if (property === "PCS") {
        return pcs;
    }
    if (property === "WOBBE") {
        return w.volumetricMJNm3;
    }
    throw new Error("Propriedade-alvo inválida.");
}

/** Mistura combustível de base com um componente adicional. */
export function blendComposition(baseComp, additiveGas, additiveMolarFraction) {
    const z = clamp(additiveMolarFraction, 0, 1);
    const entries = baseComp.map(i => ({
        gas: i.gas,
        y: i.y
            *
                (1 - z)
    }));
    entries.push({
        gas: additiveGas,
        y: z
    });
    return normalizeMolarComposition(entries);
}

/** Determina composição de mistura para atingir um alvo de propriedade. */
export function solveBlendTarget({ baseComp, additiveGas, property, target }) {
    if (!additiveGas) {
        throw new Error("Selecione o componente de adição.");
    }
    if (!Number.isFinite(target)) {
        throw new Error("Informe um alvo válido.");
    }
    let best = null;
    const samples = 2000;
    for (let i = 0; i <= samples; i++) {
        const z = i
            /
                samples;
        const comp = blendComposition(baseComp, additiveGas, z);
        const value = mixtureProperty(comp, property);
        const error = Math.abs(value
            -
                target);
        if (!best
            ||
                error < best.error) {
            best = {
                z,
                comp,
                value,
                error
            };
        }
    }
    let lo = Math.max(0, best.z
        -
            1 / samples);
    let hi = Math.min(1, best.z
        +
            1 / samples);
    for (let i = 0; i < 70; i++) {
        const m1 = lo
            +
                (hi - lo)
                    /
                        3;
        const m2 = hi
            -
                (hi - lo)
                    /
                        3;
        const v1 = mixtureProperty(blendComposition(baseComp, additiveGas, m1), property);
        const v2 = mixtureProperty(blendComposition(baseComp, additiveGas, m2), property);
        if (Math.abs(v1 - target)
            <
                Math.abs(v2 - target)) {
            hi =
                m2;
        }
        else {
            lo =
                m1;
        }
    }
    const z = (lo + hi)
        /
            2;
    const comp = blendComposition(baseComp, additiveGas, z);
    const value = mixtureProperty(comp, property);
    return {
        additiveMolarFraction: z,
        comp,
        achieved: value,
        error: Math.abs(value
            -
                target)
    };
}

/* =========================================================
   PERTURBAÇÃO DE COMPOSIÇÃO
========================================================= */
/** Perturba uma fração molar relativa e renormaliza a mistura. */
export function perturbComponentRelative(baseComp, componentId, relativePct) {
    const target = baseComp.find(i => i.gas.id
        ===
            componentId);
    if (!target) {
        return baseComp;
    }
    const factor = 1
        +
            relativePct / 100;
    const newTarget = clamp(target.y
        *
            factor, 0, 0.999999);
    const othersTotal = 1
        -
            target.y;
    const remaining = 1
        -
            newTarget;
    const entries = baseComp.map(i => {
        if (i.gas.id
            ===
                componentId) {
            return {
                gas: i.gas,
                y: newTarget
            };
        }
        const y = othersTotal > 0
            ?
                i.y
                    /
                        othersTotal
                    *
                        remaining
            :
                0;
        return {
            gas: i.gas,
            y
        };
    });
    return normalizeMolarComposition(entries);
}
