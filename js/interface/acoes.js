/**
 * Limpeza e restauração dos controles
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { $, $$, els, estado } from './contexto.js';
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
