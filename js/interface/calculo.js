/**
 * Execução do cálculo e atualização da tela
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { renderBalances, renderCombustion, renderProducts, renderSummary, renderThermal } from './balancos.js';
import { C, els, estado } from './contexto.js';
import { estimateEmissions } from './emissoes.js';
import { collectOptions, hideError, showError } from './entradas.js';
import { renderCharts } from './graficos.js';
import { currentComposition, presetObject } from './mistura.js';
import { renderMixtureDetail, renderProperties, renderWarnings } from './propriedades.js';

/**
 * Executa UM caso com entradas já validadas, sem ler ou alterar o HTML.
 * comp: composição devolvida por currentComposition().
 * opts: temperaturas em K, pressões em kPa e vazões com unidades do formulário.
 * Retorna o resultado completo para os painéis e gráficos.
 */
export function computeCase(comp, opts, presetName = null) {
        const M = C.mixtureMolarMass(comp);
        const pcs = C.mixtureHHV(comp);
        const pci = C.mixtureLHV(comp);
        const cpR = C.mixtureCp(comp, opts.fuelT);
        const rho = C.idealDensity(M, opts.fuelT, opts.fuelP);
        const rhoN = C.normalDensity(M);
        const flows = opts.inputMode === "potencia"
            ?
                C.flowsFromPower(opts.targetPowerKW, pci, rho, rhoN)
            :
                C.flowsFromInput(opts.flowType, opts.flowValue, rho, rhoN);
        const fuelMolar = flows.mass
            /
                M;
        const powerKW = flows.mass
            *
                pci
            /
                3.6;
        const atoms = C.atomsOfMixture(comp);
        const o2Per = C.stoichO2PerKmol(atoms);
        if (!(o2Per > 0)) {
            throw new Error("A mistura não apresenta demanda positiva de O₂ no modelo atual.");
        }
        let lambda;
        if (opts.combustionMode
            ===
                "o2medido") {
            lambda =
                C.lambdaFromMeasuredO2({
                    atoms,
                    fuelMolarFlow: fuelMolar,
                    fuelMassFlow: flows.mass,
                    o2StoichPerKmol: o2Per,
                    dryO2Pct: opts.dryO2Pct,
                    measuredO2DryPct: opts.measuredO2,
                    humidity: opts.humidity
                });
        }
        else {
            lambda =
                1
                    +
                        opts.excessPct
                            /
                                100;
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
            ...(tad.warnings
                ||
                    [])
        ];
        if (thermal.extrapolated) {
            warnings.push("Balanço térmico/perda de chaminé utiliza extrapolação de Cp em pelo menos uma espécie.");
        }
        if (opts.combustionMode
            ===
                "o2medido") {
            warnings.push("Modo inverso: λ foi determinado a partir do O₂ seco informado.");
        }
        warnings.push("Perda de chaminé = calor sensível dos produtos acima de 25 °C em base PCI; não representa a eficiência total de uma caldeira/forno.");
        warnings.push("Ponto de orvalho calculado é o da água; não inclui ponto de orvalho ácido.");
        warnings.push("CO₂ reportado é emissão estequiométrica bruta; não distingue carbono fóssil e biogênico.");
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
            powerPCSKW: flows.mass * pcs / 3.6,
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
            warnings: [
                ...new Set(warnings)
            ]
        };
    }

/** Lê as entradas, executa o motor e atualiza os painéis (tratando erros). */
export function calculate() {
        try {
            hideError();
            const comp = currentComposition();
            const opts = collectOptions();
            const p = presetObject(els.preset.value);
            estado.ultimoCaso =
                computeCase(comp, opts, p?.nome
                    ||
                        null);
            renderAll();
        }
        catch (e) {
            showError(e.message
                ||
                    String(e));
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
        estimateEmissions(true);
        renderSummary();
        renderCharts();
    }
