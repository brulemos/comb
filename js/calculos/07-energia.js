/**
 * CÁLCULOS / ENERGIA
 * Entalpias, temperatura adiabática, balanço térmico, ponto de orvalho e CO₂.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { CONFIG, getGas } from './01-utilidades.js';

import { cpMolar } from './03-propriedades.js';

import { saturationPressureWaterKPa } from './05-comburente.js';

import { fractions } from './06-produtos.js';



/* =========================================================
   INTEGRAÇÃO DE CP
========================================================= */
/** Integra Cp(T) entre T1 e T2 por Simpson (240 subintervalos). */
export function integrateCpMolar(gas, T1, T2) {
    if (T1 === T2) {
        return {
            value: 0,
            extrapolated: false
        };
    }
    const sign = T2 > T1
        ?
            1
        :
            -1;
    const a = Math.min(T1, T2);
    const b = Math.max(T1, T2);
    const n = 240;
    const h = (b - a)
        /
            n;
    let sum = 0;
    let extrapolated = false;
    for (let i = 0; i <= n; i++) {
        const T = a
            +
                i
                    *
                        h;
        const cp = cpMolar(gas, T);
        extrapolated ||=
            cp.extrapolated;
        const factor = (i === 0
            ||
                i === n)
            ?
                1
            :
                (i % 2 === 0
                    ?
                        2
                    :
                        4);
        sum +=
            factor
                *
                    cp.value;
    }
    return {
        value: sign
            *
                h
            *
                sum
            /
                3,
        extrapolated
    };
}

/** Entalpia sensível do combustível entre temperaturas de referência. */
export function mixtureSensibleEnthalpy(comp, molarFlow, T1, T2) {
    let value = 0;
    let extrapolated = false;
    for (const i of comp) {
        const dh = integrateCpMolar(i.gas, T1, T2);
        value +=
            molarFlow
                *
                    i.y
                *
                    dh.value;
        extrapolated ||=
            dh.extrapolated;
    }
    return {
        value,
        extrapolated
    };
}

/** Entalpia sensível do comburente entre temperaturas de referência. */
export function oxidizerSensibleEnthalpy(oxid, T1, T2) {
    const o2 = integrateCpMolar(getGas("O2"), T1, T2);
    const n2 = integrateCpMolar(getGas("N2"), T1, T2);
    const h2o = integrateCpMolar(getGas("H2O"), T1, T2);
    const value = oxid.oxidRealMolar
        *
            (oxid.xO2
                *
                    o2.value
                +
                    oxid.xN2
                        *
                            n2.value
                +
                    oxid.xH2O
                        *
                            h2o.value);
    return {
        value,
        extrapolated: o2.extrapolated
            ||
                n2.extrapolated
            ||
                h2o.extrapolated
    };
}

/** Entalpia sensível dos gases de combustão entre temperaturas de referência. */
export function productsSensibleEnthalpy(products, T1, T2) {
    let value = 0;
    let extrapolated = false;
    for (const p of products) {
        const dh = integrateCpMolar(getGas(p.id), T1, T2);
        value +=
            p.kmolH
                *
                    dh.value;
        extrapolated ||=
            dh.extrapolated;
    }
    return {
        value,
        extrapolated
    };
}

/* =========================================================
   TEMPERATURA ADIABÁTICA
========================================================= */
/** Resolve temperatura adiabática estimada SEM dissociação química. */
export function adiabaticFlameTemperature({ comp, fuelMolarFlow, fuelMassFlow, pci, oxid, products, fuelT, oxidizerT }) {
    const qFuel = fuelMassFlow
        *
            pci
        *
            1000;
    const hFuel = mixtureSensibleEnthalpy(comp, fuelMolarFlow, CONFIG.Tref, fuelT);
    const hOx = oxidizerSensibleEnthalpy(oxid, CONFIG.Tref, oxidizerT);
    const target = qFuel
        +
            hFuel.value
        +
            hOx.value;
    const residual = T => productsSensibleEnthalpy(products, CONFIG.Tref, T).value
        -
            target;
    let lo = CONFIG.Tref;
    let hi = 4000;
    if (residual(hi) < 0) {
        hi =
            6000;
    }
    if (residual(hi) < 0) {
        return {
            temperatureK: NaN,
            warnings: [
                "Não foi possível fechar o balanço de entalpia até 6000 K."
            ]
        };
    }
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi)
            /
                2;
        if (residual(mid) < 0) {
            lo =
                mid;
        }
        else {
            hi =
                mid;
        }
    }
    const T = (lo + hi)
        /
            2;
    const hp = productsSensibleEnthalpy(products, CONFIG.Tref, T);
    const warnings = [
        "Tad assume combustão completa, gás ideal, processo adiabático e sem dissociação química."
    ];
    if (hFuel.extrapolated
        ||
            hOx.extrapolated
        ||
            hp.extrapolated) {
        warnings.push("Tad utiliza extrapolação de Cp em pelo menos uma espécie.");
    }
    if (T > 2500) {
        warnings.push("Tad elevada: a ausência de dissociação tende a superestimar a temperatura real.");
    }
    return {
        temperatureK: T,
        warnings
    };
}

/* =========================================================
   BALANÇO TÉRMICO / CHAMINÉ
========================================================= */
/** Balanço entre potência química, entalpia sensível e perda térmica de chaminé. */
export function thermalBalance({ comp, fuelMolarFlow, fuelMassFlow, pci, oxid, products, fuelT, oxidizerT, stackT }) {
    const qChemical = fuelMassFlow
        *
            pci
        *
            1000;
    const hFuel = mixtureSensibleEnthalpy(comp, fuelMolarFlow, CONFIG.Tref, fuelT);
    const hOx = oxidizerSensibleEnthalpy(oxid, CONFIG.Tref, oxidizerT);
    const hReactants = hFuel.value
        +
            hOx.value;
    const hStack = productsSensibleEnthalpy(products, CONFIG.Tref, stackT);
    const totalInput = qChemical
        +
            hReactants;
    const available = totalInput
        -
            hStack.value;
    return {
        chemicalKW: qChemical
            /
                3600,
        reactantsSensibleKW: hReactants
            /
                3600,
        stackSensibleKW: hStack.value
            /
                3600,
        availableKW: available
            /
                3600,
        stackLossPct: totalInput > 0
            ?
                hStack.value
                    /
                        totalInput
                    *
                        100
            :
                NaN,
        extrapolated: hFuel.extrapolated
            ||
                hOx.extrapolated
            ||
                hStack.extrapolated
    };
}

/* =========================================================
   PONTO DE ORVALHO
========================================================= */
/** Resolve o ponto de orvalho da água pela sua pressão parcial. */
export function dewPointFromWaterPartialPressure(partialPressureKPa) {
    if (!(partialPressureKPa > 0)) {
        return NaN;
    }
    let lo = -100;
    let hi = 200;
    if (saturationPressureWaterKPa(hi)
        <
            partialPressureKPa) {
        hi =
            350;
    }
    for (let i = 0; i < 120; i++) {
        const mid = (lo + hi)
            /
                2;
        if (saturationPressureWaterKPa(mid)
            <
                partialPressureKPa) {
            lo =
                mid;
        }
        else {
            hi =
                mid;
        }
    }
    return (lo + hi)
        /
            2;
}

/** Calcula pressão parcial de H₂O e ponto de orvalho da chaminé. */
export function flueGasDewPoint(products, pressureKPa) {
    const f = fractions(products);
    const yH2O = f.find(x => x.id === "H2O")?.y
        ||
            0;
    const pH2O = yH2O
        *
            pressureKPa;
    return {
        yH2O,
        partialPressureKPa: pH2O,
        dewPointC: dewPointFromWaterPartialPressure(pH2O)
    };
}

/* =========================================================
   EMISSÕES DE CO2
========================================================= */
/** Emissões estequiométricas de CO₂ em kg/h e fatores específicos. */
export function co2Emissions({ products, fuelMassFlow, powerKW, pci }) {
    const co2 = products.find(p => p.id === "CO2");
    const kgH = co2?.kgH
        ||
            0;
    return {
        kgH,
        kgPerKgFuel: fuelMassFlow > 0
            ?
                kgH
                    /
                        fuelMassFlow
            :
                NaN,
        kgPerMJFuel: fuelMassFlow > 0
            &&
                pci > 0
            ?
                kgH
                    /
                        (fuelMassFlow
                            *
                                pci)
            :
                NaN,
        kgPerKWhThermal: powerKW > 0
            ?
                kgH
                    /
                        powerKW
            :
                NaN,
        tonnesPerDay: kgH
            *
                24
            /
                1000
    };
}
