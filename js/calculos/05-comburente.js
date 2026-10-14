/**
 * CÁLCULOS / COMBURENTE
 * Ar, umidade, oxigênio estequiométrico e excesso de comburente.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { clamp, getGas } from './01-utilidades.js';



/** Demanda estequiométrica de O₂ por kmol de combustível a partir dos átomos. */
export const stoichO2PerKmol = a => a.C
    +
        a.H / 4
    +
        a.S
    -
        a.O / 2;

/* =========================================================
   UMIDADE DO AR
========================================================= */
/*
Pressão de saturação da água.

Saída em kPa.

Correlação psicrométrica tipo Buck.
*/
/** Pressão de saturação do vapor de água em kPa. */
export function saturationPressureWaterKPa(tempC) {
    if (tempC >= 0) {
        return (0.61121
            *
                Math.exp((18.678
                    -
                        tempC / 234.5)
                    *
                        (tempC
                            /
                                (257.14
                                    +
                                        tempC))));
    }
    return (0.61115
        *
            Math.exp((23.036
                -
                    tempC / 333.7)
                *
                    (tempC
                        /
                            (279.82
                                +
                                    tempC))));
}

/** Calcula frações molares de O₂, N₂ e H₂O no comburente úmido. */
export function humidOxidizerComposition({ dryO2Pct, rhPct = 0, tempK, pressureKPa, humidityEnabled = false }) {
    const dryO2 = dryO2Pct / 100;
    const dryN2 = 1 - dryO2;
    let xH2O = 0;
    let pv = 0;
    if (humidityEnabled
        &&
            rhPct > 0) {
        const tempC = tempK
            -
                273.15;
        const psat = saturationPressureWaterKPa(tempC);
        pv =
            clamp(rhPct, 0, 100)
                /
                    100
                *
                    psat;
        if (pv >= pressureKPa) {
            throw new Error("Pressão parcial de vapor calculada maior ou igual à pressão total do comburente.");
        }
        xH2O =
            pv
                /
                    pressureKPa;
    }
    const dryFraction = 1
        -
            xH2O;
    return {
        xO2: dryO2
            *
                dryFraction,
        xN2: dryN2
            *
                dryFraction,
        xH2O,
        dryO2,
        dryN2,
        vaporPressureKPa: pv
    };
}

/** Determina vazões e composição do comburente real e estequiométrico. */
export function oxidizer({ fuelMolarFlow, fuelMassFlow, o2StoichPerKmol, dryO2Pct, lambda, humidity }) {
    const wet = humidOxidizerComposition({
        dryO2Pct,
        rhPct: humidity.rhPct,
        tempK: humidity.tempK,
        pressureKPa: humidity.pressureKPa,
        humidityEnabled: humidity.enabled
    });
    if (!(wet.xO2 > 0)) {
        throw new Error("Fração molar de O₂ do comburente deve ser positiva.");
    }
    const o2Stoich = fuelMolarFlow
        *
            o2StoichPerKmol;
    const oxidStoichMolar = o2Stoich
        /
            wet.xO2;
    const Moxid = wet.xO2
        *
            getGas("O2").massaMolar
        +
            wet.xN2
                *
                    getGas("N2").massaMolar
        +
            wet.xH2O
                *
                    getGas("H2O").massaMolar;
    const oxidStoichMass = oxidStoichMolar
        *
            Moxid;
    const oxidRealMolar = oxidStoichMolar
        *
            lambda;
    const oxidRealMass = oxidStoichMass
        *
            lambda;
    return {
        ...wet,
        lambda,
        o2Stoich,
        oxidStoichMolar,
        oxidRealMolar,
        oxidStoichMass,
        oxidRealMass,
        afrStoich: oxidStoichMass
            /
                fuelMassFlow,
        afrReal: oxidRealMass
            /
                fuelMassFlow,
        Moxid,
        humidity
    };
}
