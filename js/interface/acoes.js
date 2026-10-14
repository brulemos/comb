/**
 * Limpeza, restauração e exportação CSV
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { $, $$, C, DISPLAY_MAX_DECIMALS, VERSION, els, estado, num } from './contexto.js';
import { refreshEmissionCategory, updateEmissionUI } from './emissoes.js';
import { hideError, updateCombustionModeUI, updateFlowUI, updateHumidityUI, updateInputModeUI, updateN2 } from './entradas.js';
import { renderCharts } from './graficos.js';
import { addRow, refreshPresetSelect, updateCompositionBar } from './mistura.js';

export function applyState(s) {
        estado.carregando =
            true;
        refreshPresetSelect(s.preset
            ||
                "manual");
        const br = $(`input[name="baseComposicao"][value="${s.base || "molar"}"]`);
        if (br) {
            br.checked =
                true;
        }
        els.body.innerHTML =
            "";
        (s.mixture?.length
            ?
                s.mixture
            :
                [
                    {
                        id: "",
                        percentual: ""
                    },
                    {
                        id: "",
                        percentual: ""
                    }
                ])
            .forEach(i => addRow(i.id, i.percentual));
        const mir = $(`input[name="modoEntrada"][value="${s.modeInput || "vazao"}"]`);
        if (mir) {
            mir.checked =
                true;
        }
        els.flowType.value =
            s.flowType
                ||
                    "massica";
        els.flow.value =
            s.flow
                ??
                    10;
        $("#potenciaDesejada").value =
            s.targetPower
                ??
                    100;
        $("#unidadePotenciaDesejada").value =
            s.targetPowerUnit
                ||
                    "kW";
        $("#temperatura").value =
            s.fuelT
                ??
                    25;
        $("#unidadeTemperatura").value =
            s.fuelTUnit
                ||
                    "C";
        $("#pressao").value =
            s.fuelP
                ??
                    1.0;
        $("#unidadePressao").value =
            s.fuelPUnit
                ||
                    "bar";
        els.o2.value =
            s.o2
                ??
                    20.95;
        $("#usarUmidadeAr").checked =
            !!s.humidity;
        $("#temperaturaComburente").value =
            s.airT
                ??
                    25;
        $("#unidadeTemperaturaComburente").value =
            s.airTUnit
                ||
                    "C";
        $("#umidadeRelativa").value =
            s.rh
                ??
                    50;
        $("#pressaoComburente").value =
            s.airP
                ??
                    1.0;
        $("#unidadePressaoComburente").value =
            s.airPUnit
                ||
                    "bar";
        const cm = $(`input[name="modoCombustao"][value="${s.combustionMode || "excesso"}"]`);
        if (cm) {
            cm.checked =
                true;
        }
        els.excess.value =
            s.excess
                ??
                    10;
        els.measuredO2.value =
            s.measuredO2
                ??
                    3;
        $("#temperaturaProdutos").value =
            s.stackT
                ??
                    180;
        $("#unidadeTemperaturaProdutos").value =
            s.stackTUnit
                ||
                    "C";
        $("#pressaoProdutos").value =
            s.stackP
                ??
                    1.0;
        $("#unidadePressaoProdutos").value =
            s.stackPUnit
                ||
                    "bar";
        $("#o2Referencia").value =
            s.o2Ref
                ??
                    3;
        const em = s.emission
            ||
                {};
        if ($("#emissionModel")) {
            $("#emissionModel").value =
                em.model
                    ||
                        "factors";
        }
        if ($("#emissionEquipment")) {
            $("#emissionEquipment").value =
                em.equipment
                    ||
                        "boiler";
        }
        refreshEmissionCategory(em.category
            ||
                null);
        if ($("#customEFNOx"))
            $("#customEFNOx").value = em.customNOx ?? 0;
        if ($("#customEFCO"))
            $("#customEFCO").value = em.customCO ?? 0;
        if ($("#customEFCH4"))
            $("#customEFCH4").value = em.customCH4 ?? 0;
        if ($("#customEFVOC"))
            $("#customEFVOC").value = em.customVOC ?? 0;
        if ($("#customEFNote"))
            $("#customEFNote").value = em.customNote || "";
        if ($("#emissionFlameMode"))
            $("#emissionFlameMode").value = em.flameMode || "factor";
        if ($("#emissionTadFactor"))
            $("#emissionTadFactor").value = em.tadFactor ?? 1;
        if ($("#emissionFlameTemp"))
            $("#emissionFlameTemp").value = em.flameTemp ?? 1500;
        if ($("#emissionResidence"))
            $("#emissionResidence").value = em.residence ?? 0.5;
        if ($("#emissionBurnerType"))
            $("#emissionBurnerType").value = em.burnerType || "conventional";
        if ($("#emissionNOFraction"))
            $("#emissionNOFraction").value = em.noFraction ?? "";
        updateEmissionUI();
        estado.carregando =
            false;
        updateInputModeUI();
        updateFlowUI();
        updateN2();
        updateHumidityUI();
        updateCombustionModeUI();
        updateCompositionBar();
    }

export function reset() {
        applyState({
            mixture: [
                {
                    id: "",
                    percentual: ""
                },
                {
                    id: "",
                    percentual: ""
                }
            ]
        });
        estado.ultimoCaso =
            null;
        estado.estimativaEmissoes =
            null;
        clearResults();
        hideError();
        // Notifica módulos complementares para descartar o estado do caso limpo.
        // Presets e receitas salvos permanentemente não são excluídos.
        document.dispatchEvent(new Event("combustion:reset"));
    }

export function clearResults() {
        $$(".metric strong")
            .forEach(e => e.textContent =
            "—");
        els.mixtureDetail.innerHTML = `

        <tr>
            <td colspan="8">
                Execute o cálculo.
            </td>
        </tr>

    `;
        els.elementBody.innerHTML = `

        <tr>
            <td colspan="4">
                Execute o cálculo.
            </td>
        </tr>

    `;
        els.productBody.innerHTML = `

        <tr>
            <td colspan="5">
                Execute o cálculo.
            </td>
        </tr>

    `;
        els.warnings.innerHTML = `

        <div class="alert info">
            Execute um cálculo.
        </div>

    `;
        if ($("#emissionResultsBody")) {
            $("#emissionResultsBody").innerHTML = `
            <tr><td colspan="5">Execute o cálculo principal e atualize a estimativa.</td></tr>
        `;
        }
        if ($("#emissionFactorInfo")) {
            $("#emissionFactorInfo").textContent =
                "Execute o cálculo para visualizar a fonte.";
        }
        if ($("#emissionBalanceInfo")) {
            $("#emissionBalanceInfo").textContent =
                "CO e CH₄ serão realocados a partir do CO₂/H₂O ideal para preservar C/H/O. NOx permanece como massa equivalente de NO₂.";
        }
        if ($("#emissionWarnings")) {
            $("#emissionWarnings").innerHTML = "";
        }
        [
            "balFuel",
            "balOxid",
            "balInput",
            "balOutput",
            "balError",
            "sumFuel",
            "sumFlow",
            "sumPower",
            "sumLambda",
            "sumO2"
        ]
            .forEach(id => $("#" + id).textContent =
            "—");
        renderCharts();
    }

export function csvText() {
        if (!estado.ultimoCaso) {
            throw new Error("Execute o cálculo antes de exportar.");
        }
        const lines = [
            [
                "Versão",
                VERSION
            ],
            [
                "PCS MJ/kg",
                estado.ultimoCaso.pcs
            ],
            [
                "PCI MJ/kg",
                estado.ultimoCaso.pci
            ],
            [
                "Potência kW",
                estado.ultimoCaso.powerKW
            ],
            [
                "Lambda",
                estado.ultimoCaso.lambda
            ],
            [
                "O2 seco %",
                estado.ultimoCaso.dry.o2DryPct
            ],
            [
                "CO2 seco %",
                estado.ultimoCaso.dry.co2DryPct
            ],
            [
                "Ponto de orvalho C",
                estado.ultimoCaso.dew.dewPointC
            ],
            [
                "Perda chaminé kW",
                estado.ultimoCaso.thermal.stackSensibleKW
            ],
            [
                "CO2 kg/h",
                estado.ultimoCaso.emissions.kgH
            ],
            [],
            [
                "Mistura",
                "%mol",
                "%massa"
            ]
        ];
        estado.ultimoCaso.comp.forEach(i => lines.push([
            i.gas.nome,
            i.y * 100,
            i.w * 100
        ]));
        lines.push([], [
            "Produtos",
            "kmol/h",
            "kg/h",
            "%mol",
            "mg/Nm3 seco corrigido a O2 ref."
        ]);
        const csvO2Reference = num("#o2Referencia");
        const csvDryProducts = new Map(C.fractions(C.productBasis(estado.ultimoCaso.products, "seca"))
            .map(i => [
            i.id,
            i
        ]));
        const csvCorrectedAtO2Reference = i => {
            if (i.id === "O2"
                ||
                    i.id === "H2O") {
                return "";
            }
            const dryItem = csvDryProducts.get(i.id);
            if (!dryItem) {
                return "";
            }
            const corrected = C.correctedConcentrationAtO2(dryItem.mgNm3, estado.ultimoCaso.dry.o2DryPct, csvO2Reference, estado.ultimoCaso.opts.dryO2Pct);
            return Number.isFinite(corrected)
                ? corrected
                : "";
        };
        C.fractions(estado.ultimoCaso.products)
            .forEach(i => lines.push([
            i.nome,
            i.kmolH,
            i.kgH,
            i.y * 100,
            csvCorrectedAtO2Reference(i)
        ]));
        if (estado.estimativaEmissoes) {
            lines.push([], ["Emissões reais estimadas", "ppmvd", "mg/Nm3", "kg/h"], ["CO", estado.estimativaEmissoes.concentration.co.ppmvd, estado.estimativaEmissoes.concentration.co.mgNm3, estado.estimativaEmissoes.rates.coKgH], ["NOx como NO2", estado.estimativaEmissoes.concentration.nox.ppmvd, estado.estimativaEmissoes.concentration.nox.mgNm3, estado.estimativaEmissoes.rates.noxKgH], ["CH4 não queimado", estado.estimativaEmissoes.concentration.ch4.ppmvd, estado.estimativaEmissoes.concentration.ch4.mgNm3, estado.estimativaEmissoes.rates.ch4KgH], ["VOC/THC", "", estado.estimativaEmissoes.concentration.vocMgNm3, estado.estimativaEmissoes.rates.vocKgH], ["O2 referência %", estado.estimativaEmissoes.o2ReferencePct, "", ""], ["CO corrigido mg/Nm3", "", estado.estimativaEmissoes.concentration.co.mgNm3Ref, ""], ["NOx corrigido mg/Nm3", "", estado.estimativaEmissoes.concentration.nox.mgNm3Ref, ""], ["Fonte", estado.estimativaEmissoes.factor.source?.short || (estado.estimativaEmissoes.factor.custom ? "Personalizado" : "Modelo ideal"), "", ""]);
        }
        return lines
            .map(row => row
            .map(v => {
            const csvValue = typeof v === "number"
                &&
                    Number.isFinite(v)
                ?
                    Number(v.toFixed(DISPLAY_MAX_DECIMALS))
                :
                    (v ?? "");
            return `"${String(csvValue)
                .replace(/"/g, '""')}"`;
        })
            .join(";"))
            .join("\n");
    }

export function downloadText(text, type, filename) {
        const a = document.createElement("a");
        a.href =
            URL.createObjectURL(new Blob([
                text
            ], {
                type
            }));
        a.download =
            filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 0);
    }
