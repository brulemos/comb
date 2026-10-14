import { concentracaoCorrigidaO2 } from './correcao-o2.js';
/**
 * CÁLCULOS / PRODUTOS
 * Produtos, composições seca e úmida, lambda e balanços.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

import { CONFIG, getGas } from './01-utilidades.js';

import { cpMass, idealDensity } from './03-propriedades.js';

import { oxidizer } from './05-comburente.js';



/* =========================================================
   PRODUTOS
========================================================= */
/** Cria registro de espécie dos produtos a partir da vazão molar. */
export function product(id, kmolH) {
    const gas = getGas(id);
    return {
        id,
        nome: gas.nome,
        formula: gas.formula,
        kmolH,
        kgH: kmolH
            *
                gas.massaMolar
    };
}

/** Calcula espécies e vazões dos produtos de combustão conforme o modelo. */
export function combustionProducts({ atoms, fuelMolarFlow, oxid }) {
    const co2 = fuelMolarFlow
        *
            atoms.C;
    const h2oCombustion = fuelMolarFlow
        *
            atoms.H
        /
            2;
    const h2oAir = oxid.oxidRealMolar
        *
            oxid.xH2O;
    const so2 = fuelMolarFlow
        *
            atoms.S;
    const n2Fuel = fuelMolarFlow
        *
            atoms.N
        /
            2;
    const n2Air = oxid.oxidRealMolar
        *
            oxid.xN2;
    const o2Supplied = oxid.oxidRealMolar
        *
            oxid.xO2;
    const o2Excess = Math.max(0, o2Supplied
        -
            oxid.o2Stoich);
    return [
        product("CO2", co2),
        product("H2O", h2oCombustion + h2oAir),
        product("SO2", so2),
        product("N2", n2Fuel + n2Air),
        product("O2", o2Excess)
    ];
}

/** Aplica a seleção de base seca ou úmida aos produtos. */
export const productBasis = (products, basis) => basis === "seca"
    ?
        products.filter(p => p.id !== "H2O")
    :
        [
            ...products
        ];

/** Calcula frações molares e mássicas dos produtos. */
export function fractions(products) {
    const n = products.reduce((s, p) => s + p.kmolH, 0);
    const m = products.reduce((s, p) => s + p.kgH, 0);
    const VmN = CONFIG.R
        *
            CONFIG.Tn
        /
            CONFIG.Pn;
    return products.map(p => ({
        ...p,
        y: n > 0
            ?
                p.kmolH / n
            :
                0,
        w: m > 0
            ?
                p.kgH / m
            :
                0,
        ppmv: n > 0
            ?
                p.kmolH
                    /
                        n
                    *
                        1e6
            :
                0,
        mgNm3: n > 0
            ?
                (p.kmolH / n)
                    *
                        getGas(p.id).massaMolar
                    *
                        1e6
                    /
                        VmN
            :
                0
    }));
}

/** Determina Cp mássico dos gases de combustão para temperatura informada. */
export function productsCpMass(products, T) {
    const totalMass = products.reduce((s, p) => s + p.kgH, 0);
    if (!(totalMass > 0)) {
        return {
            value: 0,
            extrapolated: false
        };
    }
    let weightedCp = 0;
    let extrapolated = false;
    for (const p of products) {
        const gas = getGas(p.id);
        if (!gas) {
            continue;
        }
        const cp = cpMass(gas, T);
        weightedCp +=
            p.kgH
                *
                    cp.value;
        extrapolated ||=
            cp.extrapolated;
    }
    return {
        value: weightedCp
            /
                totalMass,
        extrapolated
    };
}

/** Resume vazão, massa molar, densidade e propriedades dos produtos. */
export function productSummary(products, T, P) {
    const n = products.reduce((s, p) => s + p.kmolH, 0);
    const m = products.reduce((s, p) => s + p.kgH, 0);
    const M = n > 0
        ?
            m / n
        :
            0;
    const rho = M > 0
        ?
            idealDensity(M, T, P)
        :
            0;
    const volume = rho > 0
        ?
            m / rho
        :
            0;
    const residualMJh = products.reduce((s, p) => s
        +
            p.kgH
                *
                    (getGas(p.id)?.pci
                        ||
                            0), 0);
    const pci = m > 0
        ?
            residualMJh / m
        :
            0;
    const f = fractions(products);
    const so2 = f.find(x => x.id === "SO2")
        ||
            {
                ppmv: 0,
                mgNm3: 0
            };
    return {
        molarFlow: n,
        massFlow: m,
        molarMass: M,
        density: rho,
        volumeFlow: volume,
        pci,
        powerKW: m
            *
                pci
            /
                3.6,
        so2Ppmv: so2.ppmv,
        so2MgNm3: so2.mgNm3
    };
}

/** Calcula composição e O₂ dos gases em base seca. */
export function dryAnalysis(products) {
    const dry = fractions(productBasis(products, "seca"));
    const wet = fractions(products);
    const findDry = id => dry.find(x => x.id === id)?.y
        ||
            0;
    const water = wet.find(x => x.id === "H2O")?.y
        ||
            0;
    return {
        o2DryPct: findDry("O2")
            *
                100,
        co2DryPct: findDry("CO2")
            *
                100,
        so2DryPpmv: findDry("SO2")
            *
                1e6,
        h2oWetPct: water
            *
                100
    };
}

/* =========================================================
   LAMBDA INVERSO
========================================================= */
/** Estima λ a partir de O₂ seco medido com as hipóteses do modelo. */
export function lambdaFromMeasuredO2({ atoms, fuelMolarFlow, fuelMassFlow, o2StoichPerKmol, dryO2Pct, measuredO2DryPct, humidity }) {
    if (measuredO2DryPct < 0
        ||
            measuredO2DryPct >= dryO2Pct) {
        throw new Error("O₂ seco medido fora da faixa válida.");
    }
    if (measuredO2DryPct === 0) {
        return 1;
    }
    const calc = lambda => {
        const ox = oxidizer({
            fuelMolarFlow,
            fuelMassFlow,
            o2StoichPerKmol,
            dryO2Pct,
            lambda,
            humidity
        });
        return dryAnalysis(combustionProducts({
            atoms,
            fuelMolarFlow,
            oxid: ox
        })).o2DryPct;
    };
    let lo = 1;
    let hi = 20;
    if (measuredO2DryPct
        >
            calc(hi)) {
        throw new Error("O₂ seco medido incompatível com o modelo atual.");
    }
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi)
            /
                2;
        if (calc(mid)
            <
                measuredO2DryPct) {
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

/** Corrige concentração em base seca somente com comburente equivalente ao ar atmosférico. */
export function correctedConcentrationAtO2(value, o2Measured, o2Reference, o2Comburente = 20.95) {
    return concentracaoCorrigidaO2(value, o2Measured, o2Reference, o2Comburente);
}

/* =========================================================
   BALANÇOS
========================================================= */
/** Confere fechamento entre massas de entrada e produtos. */
export function massBalance({ fuelMassFlow, oxidMassFlow, products }) {
    const input = fuelMassFlow
        +
            oxidMassFlow;
    const output = products.reduce((s, p) => s + p.kgH, 0);
    return {
        input,
        output,
        errorPct: input
            ?
                (output
                    -
                        input)
                    /
                        input
                    *
                        100
            :
                0
    };
}

/** Confere conservação de átomos entre reagentes e produtos. */
export function elementalBalance({ comp, fuelMolarFlow, oxid, products }) {
    const input = {
        C: 0,
        H: 0,
        O: 0,
        N: 0,
        S: 0
    };
    for (const i of comp) {
        for (const e of [
            "C",
            "H",
            "O",
            "N",
            "S"
        ]) {
            input[e] +=
                fuelMolarFlow
                    *
                        i.y
                    *
                        i.gas.atomos[e];
        }
    }
    input.O +=
        2
            *
                oxid.oxidRealMolar
            *
                oxid.xO2
            +
                oxid.oxidRealMolar
                    *
                        oxid.xH2O;
    input.H +=
        2
            *
                oxid.oxidRealMolar
            *
                oxid.xH2O;
    input.N +=
        2
            *
                oxid.oxidRealMolar
            *
                oxid.xN2;
    const output = {
        C: 0,
        H: 0,
        O: 0,
        N: 0,
        S: 0
    };
    for (const p of products) {
        const g = getGas(p.id);
        for (const e of [
            "C",
            "H",
            "O",
            "N",
            "S"
        ]) {
            output[e] +=
                p.kmolH
                    *
                        g.atomos[e];
        }
    }
    return [
        "C",
        "H",
        "O",
        "N",
        "S"
    ].map(e => ({
        element: e,
        input: input[e],
        output: output[e],
        errorPct: input[e]
            ?
                (output[e]
                    -
                        input[e])
                    /
                        input[e]
                    *
                        100
            :
                (Math.abs(output[e])
                    <
                        1e-12
                    ?
                        0
                    :
                        NaN)
    }));
}
