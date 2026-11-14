/** Cenários isolados: os cálculos são executados pelos motores existentes. */
import { computeCase } from "../interface/calculo.js";
import { calcularBiomassa } from "../biomassa/modelo.js";
const C = window.Combustion;
export const cloneCase = (value) => structuredClone(value);

export function normalizeScenarioAir(air) {
  const h = { ...air };
  if (h.captureLinked !== false) {
    h.captureTempK = h.tempK;
    h.capturePressureKPa = h.pressureKPa;
    h.captureLinked = true;
  }
  return h;
}

export function referenceFromResult(kind, result) {
  if (!result) throw new Error("Execute um cálculo válido antes de comparar.");
  if (kind === "gasosa") {
    const options = cloneCase(result.opts);
    options.flowType = "massica";
    options.flowValue = result.flows.mass;
    options.targetPowerKW = result.powerKW;
    options.humidity = normalizeScenarioAir(options.humidity);
    return {
      kind,
      name: "Referência",
      source: "reference",
      input: {
        composition: result.comp.map((i) => ({ id: i.gas.id, percentual: i.y * 100 })),
        options
      }
    };
  }
  if (kind === "biomassa") {
    const input = cloneCase(result.entrada);
    input.vazaoKgH = result.f.recebida;
    input.potenciaDesejadaKW = result.f.potenciaPCIKW;
    input.umidadeAr = normalizeScenarioAir(input.umidadeAr);
    return { kind, name: "Referência", source: "reference", input };
  }
  throw new Error("Tipo de combustível não suportado pelo comparador.");
}

export function evaluateScenario(scenario, basis = "livre", anchor = null) {
  if (!["livre", "massica", "potencia"].includes(basis))
    throw new Error("Base de comparação inválida.");
  const effective = cloneCase(scenario);
  if (
    basis !== "livre" &&
    (!anchor || !Number.isFinite(anchor.fuelMassKgH) || !Number.isFinite(anchor.powerKW))
  )
    throw new Error("A referência de comparação é inválida.");
  let result;
  if (effective.kind === "gasosa") {
    const opts = effective.input.options;
    opts.humidity = normalizeScenarioAir(opts.humidity);
    if (basis === "potencia") {
      opts.inputMode = "potencia";
      opts.targetPowerKW = anchor.powerKW;
    }
    if (basis === "massica") {
      opts.inputMode = "vazao";
      opts.flowType = "massica";
      opts.flowValue = anchor.fuelMassKgH;
    }
    const comp = C.compositionToYW(
      effective.input.composition.map((i) => ({ gas: C.getGas(i.id), percentual: i.percentual })),
      "molar"
    );
    result = computeCase(comp, opts);
  } else if (effective.kind === "biomassa") {
    const input = effective.input;
    input.umidadeAr = normalizeScenarioAir(input.umidadeAr);
    if (basis === "potencia") {
      input.entrada = "potencia";
      input.potenciaDesejadaKW = anchor.powerKW;
    }
    if (basis === "massica") {
      input.entrada = "vazao";
      input.vazaoKgH = anchor.fuelMassKgH;
    }
    result = calcularBiomassa(input);
  } else throw new Error("Tipo de combustível inválido.");
  return {
    effective,
    result,
    metrics: scenarioMetrics(effective.kind, result),
    warnings: result.warnings || result.avisos || []
  };
}

export function scenarioMetrics(kind, r) {
  if (kind === "gasosa") {
    const stack = C.productSummary(r.products, r.opts.stackT, r.opts.stackP);
    return {
      fuelMassKgH: r.flows.mass,
      powerKW: r.powerKW,
      powerHHVKW: r.powerPCSKW,
      pci: r.pci,
      airKgH: r.oxid.oxidRealMass,
      lambda: r.lambda,
      o2DryPct: r.dry.o2DryPct,
      tadC: r.tad.temperatureK - 273.15,
      productsKgH: stack.massFlow,
      productsM3H: stack.volumeFlow,
      stackSensibleKW: r.thermal.stackSensibleKW,
      co2KgH: r.emissions.kgH,
      wobbe: r.wobbe.volumetricMJNm3
    };
  }
  return {
    fuelMassKgH: r.f.recebida,
    powerKW: r.f.potenciaPCIKW,
    powerHHVKW: r.f.potenciaPCSKW,
    pci: r.c.pciRecebido,
    airKgH: r.oxid.realMassa,
    lambda: r.oxid.lambda,
    o2DryPct: r.o2Dry,
    tadC: r.tad.K - 273.15,
    productsKgH: r.stack.mass,
    productsM3H: r.stack.volume,
    stackSensibleKW: (r.stack.entalpiaEspecifica * r.stack.mass) / 3600,
    co2KgH: r.co2.kgH,
    wobbe: NaN
  };
}

/** Converte o caso efetivo para a API já existente de preenchimento da tela gasosa. */
export function gasStateFromScenario(effective, o2Ref = 3) {
  const { options: o, composition } = effective.input,
    h = normalizeScenarioAir(o.humidity);
  const source = effective.source === "reference" ? effective.referencePreset : effective.source;
  return {
    preset: source?.startsWith("builtin:") ? source : "manual",
    base: "molar",
    mixture: cloneCase(composition),
    modeInput: o.inputMode,
    flowType: o.flowType,
    flow: o.flowValue,
    targetPower: o.targetPowerKW,
    targetPowerUnit: "kW",
    fuelT: o.fuelT - 273.15,
    fuelTUnit: "C",
    fuelP: o.fuelP / 100,
    fuelPUnit: "bar",
    o2: o.dryO2Pct,
    humidity: h.enabled,
    rh: h.rhPct,
    airT: h.tempK - 273.15,
    airTUnit: "C",
    airP: h.pressureKPa / 100,
    airPUnit: "bar",
    captureLinked: h.captureLinked,
    captureT: h.captureTempK - 273.15,
    captureTUnit: "C",
    captureP: h.capturePressureKPa / 100,
    capturePUnit: "bar",
    combustionMode: o.combustionMode,
    excess: o.excessPct,
    measuredO2: o.measuredO2,
    stackT: o.stackT - 273.15,
    stackTUnit: "C",
    stackP: o.stackP / 100,
    stackPUnit: "bar",
    o2Ref
  };
}

export const COMPARISON_METRICS = [
  ["powerKW", "Potência química — PCI", "kW", true],
  ["powerHHVKW", "Potência química — PCS", "kW", true],
  ["fuelMassKgH", "Consumo de combustível", "kg/h", true],
  ["pci", "PCI do combustível alimentado", "MJ/kg", true],
  ["airKgH", "Comburente real", "kg/h", true],
  ["lambda", "λ", "", true],
  ["o2DryPct", "O₂ dos produtos — base seca", "%", false],
  ["tadC", "Tad estimada, sem dissociação", "°C", false],
  ["productsKgH", "Produtos gasosos — base úmida", "kg/h", true],
  ["productsM3H", "Produtos gasosos nas condições de chaminé", "m³/h", true],
  ["stackSensibleKW", "Entalpia sensível dos gases acima de 25 °C", "kW", true],
  ["co2KgH", "CO₂ bruto na saída", "kg/h", true],
  ["wobbe", "Wobbe superior (gases)", "MJ/Nm³", true]
];
