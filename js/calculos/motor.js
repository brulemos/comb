/** Pacote JavaScript consolidado; as seções ORIGINAL preservam a origem do código.
 * Gerado a partir da versão-base auditada. Sem bibliotecas externas adicionais.
 */
const __modules={
  "formulas.js": (__load,__exports) => {
// ===== ORIGINAL: formulas.js =====

/**
 * API PÚBLICA DOS CÁLCULOS
 *
 * Ponto único de integração entre fórmulas e a interface.
 * Implementações agrupadas em js/calculos/; não modificar os nomes aqui
 * sem conferir dependências em script.js e misturador.js.
 *
 * Arquivo ES module. O auth-guard.js deve carregá-lo com type="module".
 */
const { CONFIG: CONFIG, getGas: getGas, clamp: clamp, tempToK: tempToK, pressureToKPa: pressureToKPa, powerToKW: powerToKW, convertPower: convertPower } = __load("js/calculos/01-utilidades.js");
const { compositionToYW: compositionToYW, normalizeMolarComposition: normalizeMolarComposition, mixtureMolarMass: mixtureMolarMass, mixtureHHV: mixtureHHV, mixtureLHV: mixtureLHV, atomsOfMixture: atomsOfMixture, elementalMassPercentages: elementalMassPercentages } = __load("js/calculos/02-composicao.js");
const { cpMolar: cpMolar, cpMass: cpMass, mixtureCp: mixtureCp, idealDensity: idealDensity, normalDensity: normalDensity, wobbe: wobbe, convertWobbe: convertWobbe } = __load("js/calculos/03-propriedades.js");
const { flowsFromInput: flowsFromInput, flowsFromPower: flowsFromPower } = __load("js/calculos/04-vazoes.js");
const { stoichO2PerKmol: stoichO2PerKmol, saturationPressureWaterKPa: saturationPressureWaterKPa, humidOxidizerComposition: humidOxidizerComposition, oxidizer: oxidizer } = __load("js/calculos/05-comburente.js");
const { combustionProducts: combustionProducts, productBasis: productBasis, fractions: fractions, productsCpMass: productsCpMass, productSummary: productSummary, dryAnalysis: dryAnalysis, lambdaFromMeasuredO2: lambdaFromMeasuredO2, correctedConcentrationAtO2: correctedConcentrationAtO2, massBalance: massBalance, elementalBalance: elementalBalance } = __load("js/calculos/06-produtos.js");
const { integrateCpMolar: integrateCpMolar, mixtureSensibleEnthalpy: mixtureSensibleEnthalpy, oxidizerSensibleEnthalpy: oxidizerSensibleEnthalpy, productsSensibleEnthalpy: productsSensibleEnthalpy, adiabaticFlameTemperature: adiabaticFlameTemperature, thermalBalance: thermalBalance, dewPointFromWaterPartialPressure: dewPointFromWaterPartialPressure, flueGasDewPoint: flueGasDewPoint, co2Emissions: co2Emissions } = __load("js/calculos/07-energia.js");

const { qualityWarnings: qualityWarnings } = __load("js/calculos/09-qualidade.js");

window.Combustion = {
    CONFIG,
    getGas,
    clamp,
    tempToK,
    pressureToKPa,
    powerToKW,
    convertPower,
    compositionToYW,
    normalizeMolarComposition,
    mixtureMolarMass,
    mixtureHHV,
    mixtureLHV,
    mixtureCp,
    cpMolar,
    cpMass,
    idealDensity,
    normalDensity,
    wobbe,
    convertWobbe,
    flowsFromInput,
    flowsFromPower,
    atomsOfMixture,
    elementalMassPercentages,
    stoichO2PerKmol,
    saturationPressureWaterKPa,
    humidOxidizerComposition,
    oxidizer,
    combustionProducts,
    productBasis,
    fractions,
    productsCpMass,
    productSummary,
    dryAnalysis,
    lambdaFromMeasuredO2,
    correctedConcentrationAtO2,
    massBalance,
    elementalBalance,
    integrateCpMolar,
    mixtureSensibleEnthalpy,
    oxidizerSensibleEnthalpy,
    productsSensibleEnthalpy,
    adiabaticFlameTemperature,
    thermalBalance,
    dewPointFromWaterPartialPressure,
    flueGasDewPoint,
    co2Emissions,

    qualityWarnings,
};

},
  "js/calculos/01-utilidades.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/01-utilidades.js =====
Object.defineProperty(__exports, "CONFIG", {enumerable:true,get:()=>CONFIG});
Object.defineProperty(__exports, "gases", {enumerable:true,get:()=>gases});
Object.defineProperty(__exports, "getGas", {enumerable:true,get:()=>getGas});
Object.defineProperty(__exports, "clamp", {enumerable:true,get:()=>clamp});
Object.defineProperty(__exports, "tempToK", {enumerable:true,get:()=>tempToK});
Object.defineProperty(__exports, "pressureToKPa", {enumerable:true,get:()=>pressureToKPa});
Object.defineProperty(__exports, "powerToKW", {enumerable:true,get:()=>powerToKW});
Object.defineProperty(__exports, "convertPower", {enumerable:true,get:()=>convertPower});
/**
 * CÁLCULOS / UTILIDADES
 * Constantes físicas, banco de dados e conversões de unidades.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */



const CONFIG = {
    R: 8.314462618,
    Tn: 273.15,
    Pn: 101.325,
    Tref: 298.15,
    Mair: 28.96546,
    tol: 0.01,
    waterMW: 18.01528
};

const gases = () => window.GAS_DATABASE || [];

const getGas = id => gases().find(g => g.id === id);

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Converte temperatura fornecida em °C, °F ou K para kelvin. */
function tempToK(value, unit) {
    if (unit === "C") {
        return value + 273.15;
    }
    if (unit === "F") {
        return (value - 32)
            *
                5 / 9
            +
                273.15;
    }
    return value;
}

/** Converte pressão para kPa; a pressão deve ser absoluta. */
function pressureToKPa(value, unit) {
    if (unit === "bar") {
        return value * 100;
    }
    if (unit === "atm") {
        return value * 101.325;
    }
    if (unit === "kgfcm2") {
        return value * 98.0665;
    }
    return value;
}

/** Converte potência informada para kW. */
function powerToKW(value, unit) {
    if (unit === "MW") {
        return value * 1000;
    }
    if (unit === "cv") {
        return value * 0.73549875;
    }
    if (unit === "hp") {
        return value * 0.745699872;
    }
    return value;
}

/** Converte potência de kW para a unidade escolhida. */
function convertPower(kW, unit) {
    if (unit === "MW") {
        return kW / 1000;
    }
    if (unit === "cv") {
        return kW / 0.73549875;
    }
    if (unit === "hp") {
        return kW / 0.745699872;
    }
    return kW;
}

},
  "js/calculos/02-composicao.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/02-composicao.js =====
Object.defineProperty(__exports, "compositionToYW", {enumerable:true,get:()=>compositionToYW});
Object.defineProperty(__exports, "normalizeMolarComposition", {enumerable:true,get:()=>normalizeMolarComposition});
Object.defineProperty(__exports, "mixtureMolarMass", {enumerable:true,get:()=>mixtureMolarMass});
Object.defineProperty(__exports, "mixtureHHV", {enumerable:true,get:()=>mixtureHHV});
Object.defineProperty(__exports, "mixtureLHV", {enumerable:true,get:()=>mixtureLHV});
Object.defineProperty(__exports, "atomsOfMixture", {enumerable:true,get:()=>atomsOfMixture});
Object.defineProperty(__exports, "ATOMIC_MASS", {enumerable:true,get:()=>ATOMIC_MASS});
Object.defineProperty(__exports, "elementalMassPercentages", {enumerable:true,get:()=>elementalMassPercentages});
/**
 * CÁLCULOS / COMPOSIÇÃO
 * Frações molares e mássicas, poderes caloríficos e balanço elementar.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

const { getGas: getGas } = __load("js/calculos/01-utilidades.js");



/* =========================================================
   COMPOSIÇÃO
========================================================= */
/** Transforma percentuais dos componentes em frações molares (y) e mássicas (w). */
function compositionToYW(items, base) {
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
function normalizeMolarComposition(entries) {
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
const mixtureMolarMass = comp => comp.reduce((s, i) => s
    +
        i.y
            *
                i.gas.massaMolar, 0);

/** PCS da mistura: Σ(wᵢ·PCSᵢ), em MJ/kg. */
const mixtureHHV = comp => comp.reduce((s, i) => s
    +
        i.w
            *
                i.gas.pcs, 0);

/** PCI da mistura: Σ(wᵢ·PCIᵢ), em MJ/kg. */
const mixtureLHV = comp => comp.reduce((s, i) => s
    +
        i.w
            *
                i.gas.pci, 0);

/* =========================================================
   ESTEQUIOMETRIA
========================================================= */
/** Quantidade molar de átomos por kmol de combustível, usada na estequiometria. */
function atomsOfMixture(comp) {
    const a = {
        C: 0,
        H: 0,
        N: 0,
        O: 0,
        S: 0,
        Ar: 0
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
        a.Ar += i.y * (i.gas.atomos.Ar || 0);
    }
    return a;
}

const ATOMIC_MASS = {
    C: 12.011,
    H: 1.008,
    N: 14.007,
    O: 15.999,
    S: 32.06
};

/** Frações mássicas elementares C, H, N, O e S da mistura. */
function elementalMassPercentages(comp) {
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

},
  "js/calculos/03-propriedades.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/03-propriedades.js =====
Object.defineProperty(__exports, "selectCpRange", {enumerable:true,get:()=>selectCpRange});
Object.defineProperty(__exports, "cpMolar", {enumerable:true,get:()=>cpMolar});
Object.defineProperty(__exports, "cpMass", {enumerable:true,get:()=>cpMass});
Object.defineProperty(__exports, "mixtureCp", {enumerable:true,get:()=>mixtureCp});
Object.defineProperty(__exports, "idealDensity", {enumerable:true,get:()=>idealDensity});
Object.defineProperty(__exports, "normalDensity", {enumerable:true,get:()=>normalDensity});
Object.defineProperty(__exports, "wobbe", {enumerable:true,get:()=>wobbe});
Object.defineProperty(__exports, "convertWobbe", {enumerable:true,get:()=>convertWobbe});
/**
 * CÁLCULOS / PROPRIEDADES
 * Cp(T), densidade ideal, densidade normal e índices de Wobbe.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

const { CONFIG: CONFIG } = __load("js/calculos/01-utilidades.js");



/* =========================================================
   CP SHOMATE
========================================================= */
/** Seleciona a faixa cadastrada de coeficientes de Cp ou sinaliza extrapolação. */
function selectCpRange(gas, T) {
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
function cpMolar(gas, T) {
    const { range, extrapolated } = selectCpRange(gas, T);
    if (!range) {
        return {
            value: NaN,
            extrapolated: true
        };
    }
    if (!Number.isFinite(T) || T <= 0) {
        throw new Error(`Temperatura inválida no cálculo de Cp de ${gas?.nome || gas?.id || 'espécie'}.`);
    }
    const t = T / 1000;
    const value = range.A
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
                        t ** 2;
    // Extrapolação é mantida quando positiva, com o aviso preexistente.
    // Cp ≤ 0 não é fisicamente admissível: nunca propagar ao balanço térmico.
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Cp não físico para ${gas?.nome || gas?.id || 'espécie'} a ${T.toFixed(2)} K: ${value} J/(mol·K). Correlação fora do domínio; utilize dados válidos.`);
    }
    return { value, extrapolated };
}

/** Converte Cp molar para Cp mássico em kJ/(kg·K), usando massa molar. */
function cpMass(gas, T) {
    const r = cpMolar(gas, T);
    return {
        value: r.value
            /
                gas.massaMolar,
        extrapolated: r.extrapolated
    };
}

/** Cp mássico da mistura: Σ(wᵢ·Cpᵢ(T)), em kJ/(kg·K). */
function mixtureCp(comp, T) {
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
const idealDensity = (M, T, PkPa) => PkPa
    *
        M
    /
        (CONFIG.R
            *
                T);

/** Densidade ideal em condição normal cadastrada no CONFIG, em kg/Nm³. */
const normalDensity = M => idealDensity(M, CONFIG.Tn, CONFIG.Pn);

/** Calcula densidade relativa e índices de Wobbe para uma base de PCS. */
function wobbe(pcsMass, rhoN, M) {
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
function convertWobbe(w, unit) {
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

/* Índice de Weaver */

},
  "js/calculos/04-vazoes.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/04-vazoes.js =====
Object.defineProperty(__exports, "flowsFromInput", {enumerable:true,get:()=>flowsFromInput});
Object.defineProperty(__exports, "flowsFromPower", {enumerable:true,get:()=>flowsFromPower});
/**
 * CÁLCULOS / VAZÕES
 * Conversão entre vazões e potência química desejada.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */



/* =========================================================
   VAZÕES
========================================================= */
/** Obtém vazões mássica (kg/h), volumétrica real (m³/h) e normal (Nm³/h). */
function flowsFromInput(type, value, rho, rhoN) {
    let mass;
    let volume;
    let normal;
    if (type === "massica") {
        mass =
            value;
        volume =
            mass / rho;
        normal =
            mass / rhoN;
    }
    else if (type === "volumetrica") {
        volume =
            value;
        mass =
            volume * rho;
        normal =
            mass / rhoN;
    }
    else {
        normal =
            value;
        mass =
            normal * rhoN;
        volume =
            mass / rho;
    }
    return {
        mass,
        volume,
        normal
    };
}

/** Obtém vazões equivalentes para potência desejada no PCI (kW). */
function flowsFromPower(targetPowerKW, pci, rho, rhoN) {
    if (!(pci > 0)) {
        throw new Error("PCI da mistura deve ser positivo para o modo por potência.");
    }
    const mass = targetPowerKW
        *
            3.6
        /
            pci;
    return {
        mass,
        volume: mass / rho,
        normal: mass / rhoN
    };
}

},
  "js/calculos/05-comburente.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/05-comburente.js =====
Object.defineProperty(__exports, "stoichO2PerKmol", {enumerable:true,get:()=>stoichO2PerKmol});
Object.defineProperty(__exports, "saturationPressureWaterKPa", {enumerable:true,get:()=>saturationPressureWaterKPa});
Object.defineProperty(__exports, "humidOxidizerComposition", {enumerable:true,get:()=>humidOxidizerComposition});
Object.defineProperty(__exports, "oxidizer", {enumerable:true,get:()=>oxidizer});
/**
 * CÁLCULOS / COMBURENTE
 * Ar, umidade, oxigênio estequiométrico e excesso de comburente.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

const { clamp: clamp, getGas: getGas } = __load("js/calculos/01-utilidades.js");



/** Demanda estequiométrica de O₂ por kmol de combustível a partir dos átomos. */
const stoichO2PerKmol = a => a.C
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
function saturationPressureWaterKPa(tempC) {
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
function humidOxidizerComposition({ dryO2Pct, rhPct = 0, tempK, pressureKPa, humidityEnabled = false }) {
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
function oxidizer({ fuelMolarFlow, fuelMassFlow, o2StoichPerKmol, dryO2Pct, lambda, humidity }) {
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

},
  "js/calculos/06-produtos.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/06-produtos.js =====
Object.defineProperty(__exports, "product", {enumerable:true,get:()=>product});
Object.defineProperty(__exports, "combustionProducts", {enumerable:true,get:()=>combustionProducts});
Object.defineProperty(__exports, "productBasis", {enumerable:true,get:()=>productBasis});
Object.defineProperty(__exports, "fractions", {enumerable:true,get:()=>fractions});
Object.defineProperty(__exports, "productsCpMass", {enumerable:true,get:()=>productsCpMass});
Object.defineProperty(__exports, "productSummary", {enumerable:true,get:()=>productSummary});
Object.defineProperty(__exports, "dryAnalysis", {enumerable:true,get:()=>dryAnalysis});
Object.defineProperty(__exports, "lambdaFromMeasuredO2", {enumerable:true,get:()=>lambdaFromMeasuredO2});
Object.defineProperty(__exports, "correctedConcentrationAtO2", {enumerable:true,get:()=>correctedConcentrationAtO2});
Object.defineProperty(__exports, "massBalance", {enumerable:true,get:()=>massBalance});
Object.defineProperty(__exports, "elementalBalance", {enumerable:true,get:()=>elementalBalance});
const { concentracaoCorrigidaO2: concentracaoCorrigidaO2 } = __load("js/calculos/correcao-o2.js");
/**
 * CÁLCULOS / PRODUTOS
 * Produtos, composições seca e úmida, lambda e balanços.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

const { CONFIG: CONFIG, getGas: getGas } = __load("js/calculos/01-utilidades.js");

const { cpMass: cpMass, idealDensity: idealDensity } = __load("js/calculos/03-propriedades.js");

const { oxidizer: oxidizer } = __load("js/calculos/05-comburente.js");



/* =========================================================
   PRODUTOS
========================================================= */
/** Cria registro de espécie dos produtos a partir da vazão molar. */
function product(id, kmolH) {
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
function combustionProducts({ atoms, fuelMolarFlow, oxid }) {
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
    const products = [
        product("CO2", co2),
        product("H2O", h2oCombustion + h2oAir),
        product("SO2", so2),
        product("N2", n2Fuel + n2Air),
        product("O2", o2Excess)
    ];
    // Conserva o argônio inerte presente na mistura de entrada, inclusive
    // nos cálculos de vazão, Cp, entalpia, O2 seco, λ e balanço de massa.
    if (atoms.Ar > 0) {
        products.push(product("AR", fuelMolarFlow * atoms.Ar));
    }
    return products;
}

/** Aplica a seleção de base seca ou úmida aos produtos. */
const productBasis = (products, basis) => basis === "seca"
    ?
        products.filter(p => p.id !== "H2O")
    :
        [
            ...products
        ];

/** Calcula frações molares e mássicas dos produtos. */
function fractions(products) {
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
function productsCpMass(products, T) {
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
function productSummary(products, T, P) {
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
function dryAnalysis(products) {
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
function lambdaFromMeasuredO2({ atoms, fuelMolarFlow, fuelMassFlow, o2StoichPerKmol, dryO2Pct, measuredO2DryPct, humidity }) {
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
function correctedConcentrationAtO2(value, o2Measured, o2Reference, o2Comburente = 20.95) {
    return concentracaoCorrigidaO2(value, o2Measured, o2Reference, o2Comburente);
}

/* =========================================================
   BALANÇOS
========================================================= */
/** Confere fechamento entre massas de entrada e produtos. */
function massBalance({ fuelMassFlow, oxidMassFlow, products }) {
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
function elementalBalance({ comp, fuelMolarFlow, oxid, products }) {
    const input = {
        C: 0,
        H: 0,
        O: 0,
        N: 0,
        S: 0,
        Ar: 0
    };
    for (const i of comp) {
        for (const e of [
            "C",
            "H",
            "O",
            "N",
            "S",
            "Ar"
        ]) {
            input[e] +=
                fuelMolarFlow
                    *
                        i.y
                    *
                        (i.gas.atomos[e] || 0);
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
        S: 0,
        Ar: 0
    };
    for (const p of products) {
        const g = getGas(p.id);
        for (const e of [
            "C",
            "H",
            "O",
            "N",
            "S",
            "Ar"
        ]) {
            output[e] +=
                p.kmolH
                    *
                        (g.atomos[e] || 0);
        }
    }
    return [
        "C",
        "H",
        "O",
        "N",
        "S",
        ...(input.Ar > 0 || output.Ar > 0 ? ["Ar"] : [])
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

},
  "js/calculos/correcao-o2.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/correcao-o2.js =====
Object.defineProperty(__exports, "O2_AR_REFERENCIA_PCT", {enumerable:true,get:()=>O2_AR_REFERENCIA_PCT});
Object.defineProperty(__exports, "O2_AR_ATMOSFERICO_PCT", {enumerable:true,get:()=>O2_AR_ATMOSFERICO_PCT});
Object.defineProperty(__exports, "comburenteAtmosferico", {enumerable:true,get:()=>comburenteAtmosferico});
Object.defineProperty(__exports, "referenciaO2Valida", {enumerable:true,get:()=>referenciaO2Valida});
Object.defineProperty(__exports, "fatorCorrecaoO2", {enumerable:true,get:()=>fatorCorrecaoO2});
Object.defineProperty(__exports, "concentracaoCorrigidaO2", {enumerable:true,get:()=>concentracaoCorrigidaO2});
/**
 * Correção convencional de concentrações para O₂ de referência (base seca).
 * Aplicável somente a comburente com composição equivalente ao ar atmosférico.
 * O modelo com oxigênio enriquecido exige metodologia própria de normalização.
 * 20,9%: constante convencional da equação de correção;
 * 20,95%: composição atmosférica nominal usada no formulário.
 */
const O2_AR_REFERENCIA_PCT = 20.9;
const O2_AR_ATMOSFERICO_PCT = 20.95;
const TOLERANCIA_O2_AR_PCT = 0.2; // tolera 20,9% ou 20,95%; não aceita enriquecimento

function comburenteAtmosferico(o2ComburentePct = O2_AR_ATMOSFERICO_PCT) {
  return Number.isFinite(o2ComburentePct) &&
    Math.abs(o2ComburentePct - O2_AR_ATMOSFERICO_PCT) <= TOLERANCIA_O2_AR_PCT;
}

function referenciaO2Valida(referenciaPct) {
  return Number.isFinite(referenciaPct) &&
    referenciaPct >= 0 && referenciaPct < O2_AR_REFERENCIA_PCT;
}

function fatorCorrecaoO2(o2MedidoSecoPct, o2ReferenciaPct, o2ComburentePct = O2_AR_ATMOSFERICO_PCT) {
  if (!comburenteAtmosferico(o2ComburentePct) ||
      !referenciaO2Valida(o2ReferenciaPct) ||
      !Number.isFinite(o2MedidoSecoPct) ||
      o2MedidoSecoPct < 0 || o2MedidoSecoPct >= O2_AR_REFERENCIA_PCT) return NaN;
  return (O2_AR_REFERENCIA_PCT - o2ReferenciaPct) /
    (O2_AR_REFERENCIA_PCT - o2MedidoSecoPct);
}

function concentracaoCorrigidaO2(valor, o2MedidoSecoPct, o2ReferenciaPct, o2ComburentePct = O2_AR_ATMOSFERICO_PCT) {
  const fator = fatorCorrecaoO2(o2MedidoSecoPct, o2ReferenciaPct, o2ComburentePct);
  return Number.isFinite(valor) && Number.isFinite(fator) ? valor * fator : NaN;
}

},
  "js/calculos/07-energia.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/07-energia.js =====
Object.defineProperty(__exports, "integrateCpMolar", {enumerable:true,get:()=>integrateCpMolar});
Object.defineProperty(__exports, "mixtureSensibleEnthalpy", {enumerable:true,get:()=>mixtureSensibleEnthalpy});
Object.defineProperty(__exports, "oxidizerSensibleEnthalpy", {enumerable:true,get:()=>oxidizerSensibleEnthalpy});
Object.defineProperty(__exports, "productsSensibleEnthalpy", {enumerable:true,get:()=>productsSensibleEnthalpy});
Object.defineProperty(__exports, "adiabaticFlameTemperature", {enumerable:true,get:()=>adiabaticFlameTemperature});
Object.defineProperty(__exports, "thermalBalance", {enumerable:true,get:()=>thermalBalance});
Object.defineProperty(__exports, "dewPointFromWaterPartialPressure", {enumerable:true,get:()=>dewPointFromWaterPartialPressure});
Object.defineProperty(__exports, "flueGasDewPoint", {enumerable:true,get:()=>flueGasDewPoint});
Object.defineProperty(__exports, "co2Emissions", {enumerable:true,get:()=>co2Emissions});
/**
 * CÁLCULOS / ENERGIA
 * Entalpias, temperatura adiabática, balanço térmico, ponto de orvalho e CO₂.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

const { CONFIG: CONFIG, getGas: getGas } = __load("js/calculos/01-utilidades.js");

const { cpMolar: cpMolar } = __load("js/calculos/03-propriedades.js");

const { saturationPressureWaterKPa: saturationPressureWaterKPa } = __load("js/calculos/05-comburente.js");

const { fractions: fractions } = __load("js/calculos/06-produtos.js");



/* =========================================================
   INTEGRAÇÃO DE CP
========================================================= */
/** Integra Cp(T) entre T1 e T2 por Simpson (240 subintervalos). */
function integrateCpMolar(gas, T1, T2) {
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
function mixtureSensibleEnthalpy(comp, molarFlow, T1, T2) {
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
function oxidizerSensibleEnthalpy(oxid, T1, T2) {
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
function productsSensibleEnthalpy(products, T1, T2) {
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
function adiabaticFlameTemperature({ comp, fuelMolarFlow, fuelMassFlow, pci, oxid, products, fuelT, oxidizerT }) {
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
    // A solução deve estar entre dois extremos com sinais opostos no resíduo.
    // Temperaturas abaixo de 25 °C são possíveis em misturas muito diluídas
    // e pré-resfriadas, portanto Tref não pode ser sempre o limite inferior.
    const limiteBaixoK = 150; // faixa numérica mínima; não significa validade das correlações
    const limiteAltoK = 6000;
    const resRef = residual(CONFIG.Tref);
    let lo = resRef > 0 ? limiteBaixoK : CONFIG.Tref;
    let hi = resRef > 0 ? CONFIG.Tref : 4000;
    let resLo = resRef > 0 ? residual(lo) : resRef;
    let resHi = residual(hi);
    if (resRef <= 0 && resHi < 0) {
        hi = limiteAltoK;
        resHi = residual(hi);
    }
    if (!Number.isFinite(resLo) || !Number.isFinite(resHi) ||
        resLo > 0 || resHi < 0) {
        return {
            temperatureK: NaN,
            energyResidualKJH: NaN,
            warnings: ["Não foi possível encontrar temperatura adiabática com fechamento energético no intervalo de 150 a 6000 K. Verifique composição, propriedades e temperaturas de entrada."]
        };
    }
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (residual(mid) < 0) lo = mid;
        else hi = mid;
    }
    const T = (lo + hi) / 2;
    const energyResidualKJH = residual(T);
    const tolerancia = 1e-7 * Math.max(1, Math.abs(target));
    if (!Number.isFinite(energyResidualKJH) || Math.abs(energyResidualKJH) > tolerancia) {
        return {
            temperatureK: NaN,
            energyResidualKJH,
            warnings: ["Temperatura adiabática não convergiu: resíduo do balanço energético excede a tolerância."]
        };
    }
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
        energyResidualKJH,
        warnings
    };
}

/* =========================================================
   BALANÇO TÉRMICO / CHAMINÉ
========================================================= */
/** Balanço entre potência química, entalpia sensível e perda térmica de chaminé. */
function thermalBalance({ comp, fuelMolarFlow, fuelMassFlow, pci, oxid, products, fuelT, oxidizerT, stackT }) {
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
function dewPointFromWaterPartialPressure(partialPressureKPa) {
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
function flueGasDewPoint(products, pressureKPa) {
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
function co2Emissions({ products, fuelMassFlow, powerKW, pci }) {
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

},
  "js/calculos/09-qualidade.js": (__load,__exports) => {
// ===== ORIGINAL: js/calculos/09-qualidade.js =====
Object.defineProperty(__exports, "qualityWarnings", {enumerable:true,get:()=>qualityWarnings});
/**
 * CÁLCULOS / QUALIDADE
 * Alertas para propriedades, extrapolações e condições de cálculo.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */

const { getGas: getGas } = __load("js/calculos/01-utilidades.js");

const { selectCpRange: selectCpRange } = __load("js/calculos/03-propriedades.js");



/* =========================================================
   AVISOS
========================================================= */
/** Emite alertas sobre dados estimados e Cp fora das faixas cadastradas. */
function qualityWarnings({ comp, fuelT, oxidizerT, stackT, presetName = null, humidityEnabled = false }) {
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

},
};
const __cache=new Map();
function __load(id){
 if(__cache.has(id))return __cache.get(id);
 const load=__modules[id];
 if(!load)throw new Error('Módulo ausente: '+id);
 const exports=Object.create(null);__cache.set(id,exports);
 try{load(__load,exports);}catch(error){__cache.delete(id);throw error;}
 return exports;
}
__load("formulas.js");
const __out0=__load("js/calculos/01-utilidades.js");
export const {CONFIG,tempToK,pressureToKPa,powerToKW,convertPower,getGas}=__out0;
const __out1=__load("js/calculos/03-propriedades.js");
export const {cpMolar,cpMass,idealDensity,normalDensity}=__out1;
const __out2=__load("js/calculos/05-comburente.js");
export const {saturationPressureWaterKPa,humidOxidizerComposition}=__out2;
const __out3=__load("js/calculos/07-energia.js");
export const {integrateCpMolar}=__out3;
