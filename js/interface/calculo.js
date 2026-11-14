/**
 * Execução do cálculo e atualização da tela
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { clearResults } from "./acoes.js";
import {
  renderBalances,
  renderCombustion,
  renderProducts,
  renderSummary,
  renderThermal
} from "./balancos.js";
import { C, els, estado, setResultStatus } from "./contexto.js";
import { collectOptions, hideError, showError } from "./entradas.js";
import { renderCharts } from "./graficos.js";
import { currentComposition, presetObject } from "./mistura.js";
import { renderMixtureDetail, renderProperties, renderWarnings } from "./propriedades.js";

/**
 * Executa UM caso com entradas já validadas, sem ler ou alterar o HTML.
 * comp: composição devolvida por currentComposition().
 * opts: temperaturas em K, pressões em kPa e vazões com unidades do formulário.
 * Retorna o resultado completo para os painéis e gráficos.
 */
export function computeCase(comp, opts, presetName = null) {
  if (
    !Array.isArray(comp) ||
    !comp.length ||
    comp.some(
      (i) => !i.gas || !Number.isFinite(i.y) || !Number.isFinite(i.w) || i.y < 0 || i.w < 0
    ) ||
    Math.abs(comp.reduce((s, i) => s + i.y, 0) - 1) > 1e-8 ||
    Math.abs(comp.reduce((s, i) => s + i.w, 0) - 1) > 1e-8
  )
    throw new Error(
      "Composição inválida: as frações molares e mássicas devem ser finitas, não negativas e normalizadas."
    );
  if (![opts.fuelT, opts.fuelP, opts.stackT, opts.stackP].every((v) => Number.isFinite(v) && v > 0))
    throw new Error("Temperaturas Kelvin e pressões absolutas devem ser finitas e positivas.");
  if (opts.inputMode === "vazao" && (!Number.isFinite(opts.flowValue) || opts.flowValue <= 0))
    throw new Error("Informe uma vazão finita e positiva.");
  if (
    opts.inputMode === "potencia" &&
    (!Number.isFinite(opts.targetPowerKW) || opts.targetPowerKW <= 0)
  )
    throw new Error("Informe uma potência finita e positiva.");
  if (
    !["vazao", "potencia"].includes(opts.inputMode) ||
    !["excesso", "o2medido"].includes(opts.combustionMode) ||
    (opts.inputMode === "vazao" && !["massica", "volumetrica", "normal"].includes(opts.flowType))
  )
    throw new Error("Modo de entrada, combustão ou unidade de vazão inválido.");
  const compositionM = C.mixtureMolarMass(comp);
  if (
    !(compositionM > 0) ||
    comp.some((i) => Math.abs(i.w - (i.y * i.gas.massaMolar) / compositionM) > 1e-8)
  )
    throw new Error("Frações molares e mássicas inconsistentes.");
  // Valida a química antes de avaliar propriedades e energia.
  C.atomsOfMixture(comp);
  const M = C.mixtureMolarMass(comp);
  const pcs = C.mixtureHHV(comp);
  const pci = C.mixtureLHV(comp);
  const cpR = C.mixtureCp(comp, opts.fuelT);
  const rho = C.idealDensity(M, opts.fuelT, opts.fuelP);
  const rhoN = C.normalDensity(M);
  const flows =
    opts.inputMode === "potencia"
      ? C.flowsFromPower(opts.targetPowerKW, pci, rho, rhoN)
      : C.flowsFromInput(opts.flowType, opts.flowValue, rho, rhoN);
  const fuelMolar = flows.mass / M;
  const powerKW = (flows.mass * pci) / 3.6;
  const atoms = C.atomsOfMixture(comp);
  const o2Per = C.stoichO2PerKmol(atoms);
  if (!(o2Per > 0)) {
    throw new Error("A mistura não apresenta demanda positiva de O₂ no modelo atual.");
  }
  let lambda;
  if (opts.combustionMode === "o2medido") {
    lambda = C.lambdaFromMeasuredO2({
      atoms,
      fuelMolarFlow: fuelMolar,
      fuelMassFlow: flows.mass,
      o2StoichPerKmol: o2Per,
      dryO2Pct: opts.dryO2Pct,
      measuredO2DryPct: opts.measuredO2,
      humidity: opts.humidity
    });
  } else {
    lambda = 1 + opts.excessPct / 100;
  }
  const oxid = C.oxidizer({
    fuelMolarFlow: fuelMolar,
    fuelMassFlow: flows.mass,
    o2StoichPerKmol: o2Per,
    dryO2Pct: opts.dryO2Pct,
    lambda,
    humidity: opts.humidity
  });
  const products = C.combustionProducts({
    atoms,
    fuelMolarFlow: fuelMolar,
    oxid
  });
  const dry = C.dryAnalysis(products);
  const massBal = C.massBalance({
    fuelMassFlow: flows.mass,
    oxidMassFlow: oxid.oxidRealMass,
    products
  });
  const elemBal = C.elementalBalance({
    comp,
    fuelMolarFlow: fuelMolar,
    oxid,
    products
  });
  const tad = C.adiabaticFlameTemperature({
    comp,
    fuelMolarFlow: fuelMolar,
    fuelMassFlow: flows.mass,
    pci,
    oxid,
    products,
    fuelT: opts.fuelT,
    oxidizerT: opts.humidity.tempK
  });
  const thermal = C.thermalBalance({
    comp,
    fuelMolarFlow: fuelMolar,
    fuelMassFlow: flows.mass,
    pci,
    oxid,
    products,
    fuelT: opts.fuelT,
    oxidizerT: opts.humidity.tempK,
    stackT: opts.stackT
  });
  const dew = C.flueGasDewPoint(products, opts.stackP);
  const emissions = C.co2Emissions({
    products,
    fuelMassFlow: flows.mass,
    powerKW,
    pci
  });
  const w = C.wobbe(pcs, rhoN, M);
  // Índice de Wobbe inferior: PCI volumétrico / raiz da densidade relativa.
  const wInferior = C.wobbe(pci, rhoN, M);
  const warnings = [
    ...C.qualityWarnings({
      comp,
      fuelT: opts.fuelT,
      oxidizerT: opts.humidity.tempK,
      stackT: opts.stackT,
      presetName,
      humidityEnabled: opts.humidity.enabled
    }),
    ...cpR.warnings,
    ...(tad.warnings || [])
  ];
  if (!Number.isFinite(dry.o2DryPct))
    warnings.push("Corrente seca de produtos nula: composição seca e O₂ seco são indefinidos (—).");
  if (Number.isFinite(dew.dewPointC) && opts.stackT - 273.15 < dew.dewPointC)
    warnings.push(
      "Chaminé abaixo do ponto de orvalho: há possibilidade de condensação. Vazões úmidas, densidade, Cp e energia são valores hipotéticos com toda a água no vapor; o modelo não calcula líquido nem calor latente de condensação."
    );
  if (dew.partialPressureKPa > 0 && !Number.isFinite(dew.dewPointC))
    warnings.push(
      "Ponto de orvalho fora da faixa válida (−80 a 100 °C); condensação não pode ser verificada por esta aproximação."
    );
  if (
    thermal.availableKW < 0 ||
    (Number.isFinite(tad.temperatureK) && opts.stackT > tad.temperatureK)
  )
    warnings.push(
      "A condição de chaminé requer aporte externo de calor: a energia disponível é negativa ou a temperatura de saída excede Tad. Não interpretar a perda como eficiência do equipamento."
    );
  if (comp.some((i) => i.gas.atomos.C >= 5 && i.y > 0))
    warnings.push(
      "Mistura com hidrocarbonetos condensáveis: a fase gasosa não foi verificada. Densidade, vazão e energia pressupõem combustível totalmente gasoso; confirme temperatura, pressão e equilíbrio de fases."
    );
  const fuelWater = comp.find((i) => i.gas.id === "H2O")?.y || 0;
  const fuelDew = C.dewPointFromWaterPartialPressure(fuelWater * opts.fuelP);
  if (Number.isFinite(fuelDew) && opts.fuelT - 273.15 < fuelDew)
    warnings.push(
      "Água na mistura combustível acima da saturação: a entrada não foi verificada como fase gasosa única. O modelo não calcula água líquida na alimentação gasosa."
    );
  if (opts.fuelP > 500 || opts.stackP > 500)
    warnings.push(
      "Pressão acima de 5 bar: gás ideal sem fator de compressibilidade Z; a precisão de densidades e vazões requer verificação."
    );
  if (
    opts.humidity.enabled &&
    Number.isFinite(opts.humidity.captureTempK) &&
    (Math.abs(opts.humidity.tempK - opts.humidity.captureTempK) > 1e-8 ||
      Math.abs(opts.humidity.pressureKPa - opts.humidity.capturePressureKPa) > 1e-8)
  )
    warnings.push(
      "Ar condicionado após a captação: a composição úmida é conservada; a entalpia usa a temperatura de entrada na combustão. Sem adição/remoção de água."
    );
  if (thermal.extrapolated) {
    warnings.push(
      "Balanço térmico/perda de chaminé utiliza extrapolação de Cp em pelo menos uma espécie."
    );
  }
  if (Math.abs(opts.dryO2Pct - 20.95) > 0.2) {
    warnings.push(
      "Correção a O₂ de referência não aplicável com comburente enriquecido/não atmosférico; utilize concentrações secas não corrigidas."
    );
  }
  if (opts.combustionMode === "o2medido") {
    warnings.push("Modo inverso: λ foi determinado a partir do O₂ seco informado.");
  }
  warnings.push(
    "Perda de chaminé = calor sensível dos produtos acima de 25 °C em base PCI; não representa a eficiência total de uma caldeira/forno."
  );
  warnings.push("Ponto de orvalho calculado é o da água; não inclui ponto de orvalho ácido.");
  warnings.push(
    "CO₂ reportado é emissão estequiométrica bruta; não distingue carbono fóssil e biogênico."
  );
  return {
    opts,
    comp,
    M,
    pcs,
    pci,
    cp: cpR.value,
    rho,
    rhoN,
    flows,
    fuelMolar,
    powerKW,
    powerPCSKW: (flows.mass * pcs) / 3.6,
    atoms,
    o2Per,
    lambda,
    oxid,
    products,
    dry,
    massBal,
    elemBal,
    tad,
    thermal,
    dew,
    emissions,
    wobbe: w,
    wobbeInferior: wInferior,
    warnings: [...new Set(warnings)]
  };
}

/** Lê as entradas, executa o motor e atualiza os painéis (tratando erros). */
export function calculate() {
  try {
    hideError();
    const comp = currentComposition();
    const opts = collectOptions();
    const p = presetObject(els.preset.value);
    estado.ultimoCaso = computeCase(comp, opts, p?.nome || null);
    renderAll();
    setResultStatus("atualizado");
    return true;
  } catch (e) {
    estado.ultimoCaso = null;
    clearResults();
    setResultStatus("invalido");
    showError(e.message || String(e));
    return false;
  }
}

/** Distribui o último resultado aos módulos de apresentação. */
export function renderAll() {
  renderWarnings();
  renderProperties();
  renderMixtureDetail();
  renderCombustion();
  renderThermal();
  renderBalances();
  renderProducts();
  renderSummary();
  renderCharts();
}
