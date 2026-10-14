/**
 * API PÚBLICA DOS CÁLCULOS
 *
 * Ponto único de integração entre fórmulas e a interface.
 * Implementações agrupadas em js/calculos/; não modificar os nomes aqui
 * sem conferir dependências em script.js, emissions.js e misturador.js.
 *
 * Arquivo ES module. O auth-guard.js deve carregá-lo com type="module".
 */
import { CONFIG, getGas, clamp, tempToK, pressureToKPa, powerToKW, convertPower } from './js/calculos/01-utilidades.js';
import { compositionToYW, normalizeMolarComposition, mixtureMolarMass, mixtureHHV, mixtureLHV, atomsOfMixture, elementalMassPercentages } from './js/calculos/02-composicao.js';
import { cpMolar, cpMass, mixtureCp, idealDensity, normalDensity, wobbe, convertWobbe } from './js/calculos/03-propriedades.js';
import { flowsFromInput, flowsFromPower } from './js/calculos/04-vazoes.js';
import { stoichO2PerKmol, saturationPressureWaterKPa, humidOxidizerComposition, oxidizer } from './js/calculos/05-comburente.js';
import { combustionProducts, productBasis, fractions, productsCpMass, productSummary, dryAnalysis, lambdaFromMeasuredO2, correctedConcentrationAtO2, massBalance, elementalBalance } from './js/calculos/06-produtos.js';
import { integrateCpMolar, mixtureSensibleEnthalpy, oxidizerSensibleEnthalpy, productsSensibleEnthalpy, adiabaticFlameTemperature, thermalBalance, dewPointFromWaterPartialPressure, flueGasDewPoint, co2Emissions } from './js/calculos/07-energia.js';
import { mixtureProperty, blendComposition, solveBlendTarget, perturbComponentRelative } from './js/calculos/08-misturas.js';
import { qualityWarnings } from './js/calculos/09-qualidade.js';

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
    mixtureProperty,
    blendComposition,
    solveBlendTarget,
    perturbComponentRelative,
    qualityWarnings,
};
