/**
 * Ligação dos controles HTML aos comandos.
 * Os listeners são registrados uma única vez, após a autenticação.
 */

import { csvText, downloadText, reset } from './acoes.js';
import { renderProducts, updateStoichiometryCards } from './balancos.js';
import { calculate } from './calculo.js';
import { closeComponentTrace, openComponentTrace, refreshComponentSelects, updateComponentFormulaCell } from './componentes.js';
import { $, $$, C, els, estado } from './contexto.js';
import { estimateEmissions, refreshEmissionCategory, syncAdvancedBurnerCategory, updateEmissionFlameModeUI, updateEmissionUI } from './emissoes.js';
import { showError, updateCombustionModeUI, updateFlowUI, updateHumidityPreview, updateHumidityUI, updateInputModeUI, updateLambdaPreview, updateN2 } from './entradas.js';
import { drawProcessCurve, renderCharts } from './graficos.js';
import { addRow, loadPreset, normalizeCompositionFractions, refreshPresetSelect, updateCompositionBar } from './mistura.js';
import { updateDensity, updatePower, updateWobbe } from './propriedades.js';

/** Instala listeners uma única vez e inicializa a calculadora limpa. */
export function iniciarInterface() {
els.body.addEventListener("change", e => {
        const select = e.target.closest(".component-select");
        if (!select) {
            return;
        }
        const tr = select.closest("tr");
        const gas = select.value
            ?
                C.getGas(select.value)
            :
                null;
        updateComponentFormulaCell(tr, gas);
        if (!estado.carregando) {
            refreshPresetSelect("manual");
        }
        refreshComponentSelects();
        updateCompositionBar();
    });

els.body.addEventListener("input", e => {
        if (e.target.matches(".component-percent")) {
            if (!estado.carregando) {
                refreshPresetSelect("manual");
            }
            updateCompositionBar();
        }
    });

els.body.addEventListener("click", e => {
        const infoButton = e.target.closest(".component-info-btn");
        if (infoButton) {
            openComponentTrace(infoButton.dataset.gasId);
            return;
        }
        const b = e.target.closest(".remove-row");
        if (!b) {
            return;
        }
        b
            .closest("tr")
            .remove();
        if (!els.body.children.length) {
            addRow();
        }
        refreshPresetSelect("manual");
        refreshComponentSelects();
        updateCompositionBar();
    });

els.mixtureDetail.addEventListener("click", e => {
        const link = e.target.closest(".trace-component-link");
        if (!link) {
            return;
        }
        openComponentTrace(link.dataset.gasId);
    });

els.traceBody
        ?.addEventListener("click", e => {
        const toggle = e.target.closest(".trace-jmol-toggle");
        if (!toggle) {
            return;
        }
        const panel = els.traceBody.querySelector("#traceJmolPanel");
        if (!panel) {
            return;
        }
        const isExpanded = toggle.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;
        toggle.setAttribute("aria-expanded", String(nextExpanded));
        panel.hidden =
            !nextExpanded;
        const label = toggle.querySelector(".trace-jmol-toggle-label");
        if (label) {
            label.textContent =
                nextExpanded
                    ? "Ocultar 3D"
                    : "Visualizar 3D";
        }
        if (!nextExpanded) {
            return;
        }
        const frame = panel.querySelector(".trace-jmol-frame");
        if (frame
            &&
                !frame.getAttribute("src")) {
            const frameLoadingPlaceholder = panel.querySelector(".trace-jmol-loading");
            frame.addEventListener("load", () => {
                if (frameLoadingPlaceholder) {
                    frameLoadingPlaceholder.hidden = true;
                }
            }, { once: true });
            frame.setAttribute("src", toggle.dataset.jmolSrc
                ||
                    frame.dataset.src);
        }
    });

$("#btnCloseTrace")
        ?.addEventListener("click", closeComponentTrace);

els.traceDialog
        ?.addEventListener("click", e => {
        if (e.target === els.traceDialog) {
            closeComponentTrace();
        }
    });

$("#btnAdicionar")
        .addEventListener("click", () => {
        refreshPresetSelect("manual");
        addRow();
    });

$("#btnNormalizarFracoes")
        .addEventListener("click", normalizeCompositionFractions);

els.search.addEventListener("input", refreshComponentSelects);

els.preset.addEventListener("change", () => loadPreset(els.preset.value));

$$('input[name="modoEntrada"]')
        .forEach(r => r.addEventListener("change", updateInputModeUI));

els.flowType.addEventListener("change", updateFlowUI);

els.o2.addEventListener("input", updateN2);

$("#usarUmidadeAr")
        .addEventListener("change", updateHumidityUI);

[
        "#temperaturaComburente",
        "#unidadeTemperaturaComburente",
        "#umidadeRelativa",
        "#pressaoComburente",
        "#unidadePressaoComburente"
    ]
        .forEach(s => $(s).addEventListener($(s).tagName === "INPUT"
        ?
            "input"
        :
            "change", updateHumidityPreview));

$$('input[name="modoCombustao"]')
        .forEach(r => r.addEventListener("change", updateCombustionModeUI));

els.excess.addEventListener("input", updateLambdaPreview);

$("#btnCalcular")
        .addEventListener("click", calculate);

$("#btnLimpar")
        .addEventListener("click", reset);

$("#unidadeWobbe")
        .addEventListener("change", updateWobbe);

$("#unidadeWobbeInferior").addEventListener("change", updateWobbe);

$("#unidadePotencia")
        .addEventListener("change", updatePower);

$("#unidadePotenciaPCS").addEventListener("change", updatePower);

$("#modoExibicaoComburente").addEventListener("change", updateStoichiometryCards);

$("#modoExibicaoAFR").addEventListener("change", updateStoichiometryCards);

$("#modoDensidade").addEventListener("change", updateDensity);

[
        "#baseProdutos",
        "#modoTabelaProdutos",
        "#tipoVazaoProdutos"
    ]
        .forEach(s => $(s).addEventListener("change", () => {
        renderProducts();
        estimateEmissions(true);
        renderCharts();
    }));

const refreshO2ReferenceResults = () => {
        if (!estado.ultimoCaso
            ||
                $("#o2Referencia").value.trim() === "") {
            return;
        }
        renderProducts();
        estimateEmissions(true);
        renderCharts();
    };

$("#o2Referencia")
        .addEventListener("input", refreshO2ReferenceResults);

$("#o2Referencia")
        .addEventListener("change", refreshO2ReferenceResults);

const scheduleProcessConditionRecalculation = () => {
        if (!estado.ultimoCaso
            ||
                $("#temperaturaProdutos").value.trim() === ""
            ||
                $("#pressaoProdutos").value.trim() === "") {
            return;
        }
        clearTimeout(estado.temporizadorCondicoesChamine);
        estado.temporizadorCondicoesChamine =
            setTimeout(calculate, 120);
    };

[
        "#temperaturaProdutos",
        "#pressaoProdutos"
    ]
        .forEach(s => {
        $(s).addEventListener("input", scheduleProcessConditionRecalculation);
        $(s).addEventListener("change", scheduleProcessConditionRecalculation);
    });

[
        "#unidadeTemperaturaProdutos",
        "#unidadePressaoProdutos"
    ]
        .forEach(s => $(s).addEventListener("change", scheduleProcessConditionRecalculation));

$("#emissionModel")
        ?.addEventListener("change", () => {
        updateEmissionUI();
        syncAdvancedBurnerCategory();
        estimateEmissions(true);
    });

$("#emissionEquipment")
        ?.addEventListener("change", () => {
        refreshEmissionCategory();
        updateEmissionUI();
        syncAdvancedBurnerCategory();
        estimateEmissions(true);
    });

$("#emissionCategory")
        ?.addEventListener("change", () => estimateEmissions(true));

$("#emissionFlameMode")
        ?.addEventListener("change", () => {
        updateEmissionFlameModeUI();
        estimateEmissions(true);
    });

$("#emissionBurnerType")
        ?.addEventListener("change", () => {
        syncAdvancedBurnerCategory();
        estimateEmissions(true);
    });

[
        "#customEFNOx",
        "#customEFCO",
        "#customEFCH4",
        "#customEFVOC",
        "#customEFNote",
        "#emissionTadFactor",
        "#emissionFlameTemp",
        "#emissionResidence",
        "#emissionNOFraction"
    ]
        .forEach(selector => $(selector)
        ?.addEventListener("input", () => estimateEmissions(true)));

$("#btnEstimateEmissions")
        ?.addEventListener("click", () => estimateEmissions(false));

$("#chartExcessMax")
        .addEventListener("change", drawProcessCurve);

$("#btnCsv")
        .addEventListener("click", () => {
        try {
            downloadText("\uFEFF"
                +
                    csvText(), "text/csv;charset=utf-8", "combustao.csv");
        }
        catch (e) {
            showError(e.message);
        }
    });

$("#btnPrint")
        .addEventListener("click", () => window.print());

window.addEventListener("resize", () => {
        clearTimeout(estado.temporizadorRedimensionamento);
        estado.temporizadorRedimensionamento =
            setTimeout(renderCharts, 150);
    });

  refreshPresetSelect("manual");
  reset();
}
