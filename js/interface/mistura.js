/**
 * Linhas da mistura, normalização e presets de combustíveis
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { componentFormulaCell, gasOptions, refreshComponentSelects } from './componentes.js';
import { $, $$, BUILTIN, C, els, esc, estado, fmt } from './contexto.js';
import { hideError, showError } from './entradas.js';

export function addRow(id = "", percentage = "") {
        const tr = document.createElement("tr");
        const gas = id
            ?
                C.getGas(id)
            :
                null;
        tr.innerHTML = `

        <td>

            <select class="component-select">

                ${gasOptions(id, els.search.value)}

            </select>

        </td>


        <td class="formula-cell">

            ${componentFormulaCell(gas)}

        </td>


        <td>

            <input
                class="component-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value="${esc(percentage)}"
            >

        </td>


        <td>

            <button
                type="button"
                class="remove-row"
                aria-label="Remover componente"
            >
                ×
            </button>

        </td>

    `;
        els.body.appendChild(tr);
        refreshComponentSelects();
        updateCompositionBar();
    }

export function rows() {
        return $$("#corpoMistura tr")
            .map(tr => {
            const id = tr.querySelector(".component-select").value;
            const raw = tr.querySelector(".component-percent").value;
            return {
                id,
                gas: id
                    ?
                        C.getGas(id)
                    :
                        null,
                percentual: raw === ""
                    ?
                        0
                    :
                        Number(raw)
            };
        });
    }

export function normalizeCompositionFractions() {
        const informed = $$("#corpoMistura .component-percent")
            .map((input, index) => ({
            input,
            index,
            value: Number(input.value)
        }))
            .filter(item => item.input.value.trim() !== ""
            && Number.isFinite(item.value)
            && item.value > 0);
        const total = informed.reduce((sum, item) => sum + item.value, 0);
        if (!Number.isFinite(total)
            || total <= 0) {
            showError("Informe pelo menos uma fração maior que zero para normalizar.");
            return;
        }
        /*
           A normalização é feita em centésimos de %, usando o método
           dos maiores restos. Assim, o resultado fecha exatamente em
           100,00 % mesmo após o arredondamento para duas casas decimais.
        */
        const normalized = informed.map(item => {
            const exactHundredths = item.value / total * 10000;
            const hundredths = Math.floor(exactHundredths);
            return {
                ...item,
                exactHundredths,
                hundredths,
                remainder: exactHundredths - hundredths
            };
        });
        let missingHundredths = 10000
            -
                normalized.reduce((sum, item) => sum + item.hundredths, 0);
        normalized
            .slice()
            .sort((a, b) => (b.remainder - a.remainder)
            ||
                (a.index - b.index))
            .forEach(item => {
            if (missingHundredths > 0) {
                item.hundredths += 1;
                missingHundredths -= 1;
            }
        });
        normalized.forEach(item => {
            item.input.value =
                (item.hundredths / 100).toFixed(2);
        });
        hideError();
        refreshPresetSelect("manual");
        updateCompositionBar();
    }

export function updateCompositionBar() {
        const total = rows().reduce((s, i) => s
            +
                (Number.isFinite(i.percentual)
                    ?
                        i.percentual
                    :
                        0), 0);
        els.total.textContent =
            `${fmt(total, 2)} %`;
        els.bar.style.width =
            `${Math.min(Math.max(total, 0), 100)}%`;
        els.bar.className =
            "";
        if (Math.abs(total - 100)
            <=
                C.CONFIG.tol) {
            els.bar.classList.add("ok");
            els.status.textContent =
                "✓ Composição válida.";
            return true;
        }
        if (total > 100) {
            els.bar.classList.add("error");
            els.status.textContent =
                `Excede 100 % em ${fmt(total - 100, 2)} %.`;
        }
        else {
            els.status.textContent =
                `Faltam ${fmt(100 - total, 2)} %.`;
        }
        return false;
    }

export function refreshPresetSelect(selected = null) {
        const current = selected
            ??
                els.preset.value;
        let html = `<option value="manual">Composição manual</option>`;
        html +=
            `<optgroup label="Presets do programa">`;
        for (const [key, p] of Object.entries(BUILTIN)) {
            html += `

            <option value="builtin:${key}">

                ${esc(p.nome)}

            </option>

        `;
        }
        html +=
            `</optgroup>`;
        
        els.preset.innerHTML =
            html;
        if ([
            ...els.preset.options
        ]
            .some(o => o.value === current)) {
            els.preset.value =
                current;
        }
        else {
            els.preset.value =
                "manual";
        }
        
    }

export function presetObject(value) {
        if (value.startsWith("builtin:")) {
            return BUILTIN[value.split(":")[1]];
        }
        
        return null;
    }

export function loadPreset(value) {
        const p = presetObject(value);
        
        if (!p) {
            return;
        }
        estado.carregando =
            true;
        els.body.innerHTML =
            "";
        $('input[name="baseComposicao"][value="molar"]').checked =
            true;
        p.componentes.forEach(i => addRow(i.id, i.percentual));
        estado.carregando =
            false;
        updateCompositionBar();
    }

export function currentComposition() {
        if (!updateCompositionBar()) {
            throw new Error("A composição deve totalizar 100 %.");
        }
        const r = rows();
        if (r.some(i => !i.gas
            &&
                i.percentual > 0)) {
            throw new Error("Existe percentual informado sem componente selecionado.");
        }
        const ids = r
            .filter(i => i.gas
            &&
                i.percentual > 0)
            .map(i => i.id);
        if (!ids.length) {
            throw new Error("Selecione pelo menos um componente.");
        }
        if (new Set(ids).size
            !==
                ids.length) {
            throw new Error("Há componentes duplicados na mistura.");
        }
        const base = $('input[name="baseComposicao"]:checked').value;
        return C.compositionToYW(r, base);
    }
