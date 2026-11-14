import { lerPercentual, escreverPercentual, vincularPercentual, normalizarPercentuais } from "./percentuais.js";
import { normalizarNomeMistura } from "./nome-mistura.js";
import { clonarModelo } from "../html/fragmentos.js";
/**
 * Linhas da mistura, normalização e presets de combustíveis
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { componentFormulaCell, gasOptions, refreshComponentSelects } from "./componentes.js";
import { $, $$, BUILTIN, C, els, esc, estado, fmt } from "./contexto.js";
import { hideError, showError } from "./entradas.js";

export function addRow(id = "", percentage = "") {
  const tr = clonarModelo("linhaComposicao");
  const gas = id ? C.getGas(id) : null;
  tr.querySelector(".component-select").innerHTML = gasOptions(id, els.search.value);
  tr.querySelector(".formula-cell").innerHTML = componentFormulaCell(gas);
  const input = tr.querySelector(".component-percent");
  const base = () => $('input[name="baseComposicao"]:checked').value;
  escreverPercentual(input, percentage, base());
  vincularPercentual(input, base);
  els.body.appendChild(tr);
  refreshComponentSelects();
  updateCompositionBar();
}

export function rows() {
  return $$("#corpoMistura tr").map((tr) => {
    const id = tr.querySelector(".component-select").value;
    const input = tr.querySelector(".component-percent");
    const raw = input.value;
    return {
      id,
      gas: id ? C.getGas(id) : null,
      percentual: raw === "" ? 0 : lerPercentual(input)
    };
  });
}

export function normalizeCompositionFractions() {
  if (rows().some((i) => !Number.isFinite(i.percentual) || i.percentual < 0)) {
    showError("Corrija percentuais negativos ou inválidos antes de normalizar.");
    return;
  }
  const informed = $$("#corpoMistura .component-percent")
    .filter((input) => input.value.trim() !== "");
  try {
    const normalized = normalizarPercentuais(informed.map(lerPercentual));
    const base = $('input[name="baseComposicao"]:checked').value;
    informed.forEach((input, index) => escreverPercentual(input, normalized[index], base));
  } catch (error) {
    showError(error.message);
    return;
  }
  hideError();
  refreshPresetSelect("manual");
  updateCompositionBar();
}

export function updateCompositionBar() {
  const total = rows().reduce((s, i) => s + (Number.isFinite(i.percentual) ? i.percentual : 0), 0);
  els.total.textContent = `${fmt(total, 2)} %`;
  els.bar.style.width = `${Math.min(Math.max(total, 0), 100)}%`;
  els.bar.className = "";
  if (
    rows().some((i) => !Number.isFinite(i.percentual) || i.percentual < 0 || i.percentual > 100)
  ) {
    els.bar.classList.add("error");
    els.status.textContent = "Cada percentual deve estar entre 0 e 100%.";
    return false;
  }
  if (Math.abs(total - 100) <= C.CONFIG.tol) {
    els.bar.classList.add("ok");
    els.status.textContent = "✓ Composição válida.";
    return true;
  }
  if (total > 100) {
    els.bar.classList.add("error");
    els.status.textContent = `Excede 100 % em ${fmt(total - 100, 2)} %.`;
  } else {
    els.status.textContent = `Faltam ${fmt(100 - total, 2)} %.`;
  }
  return false;
}

export function nomeMisturaAtual() {
  return presetObject(els.preset.value)?.nome || normalizarNomeMistura($("#nomeMistura").value) || "Mistura personalizada";
}

export function atualizarNomeMistura() {
  $("#nomeMistura").disabled = els.preset.value !== "manual";
  if ($("#tipoCombustivel").value !== "biomassa") {
    $("#sumFuel").textContent = nomeMisturaAtual();
    $("#sumFuel").title = nomeMisturaAtual();
  }
}

export function refreshPresetSelect(selected = null) {
  const current = selected ?? els.preset.value;
  let html = `<option value="manual">Composição manual</option>`;
  html += `<optgroup label="Presets do programa">`;
  for (const [key, p] of Object.entries(BUILTIN)) {
    html += `

            <option value="builtin:${key}">

                ${esc(p.nome)}

            </option>

        `;
  }
  html += `</optgroup>`;

  els.preset.innerHTML = html;
  if ([...els.preset.options].some((o) => o.value === current)) {
    els.preset.value = current;
  } else {
    els.preset.value = "manual";
  }
  atualizarNomeMistura();
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
  $("#nomeMistura").value = "";
  atualizarNomeMistura();
  estado.carregando = true;
  els.body.innerHTML = "";
  $('input[name="baseComposicao"][value="molar"]').checked = true;
  p.componentes.forEach((i) => addRow(i.id, i.percentual));
  estado.carregando = false;
  updateCompositionBar();
}

export function currentComposition() {
  const r = rows();
  if (r.some((i) => !Number.isFinite(i.percentual) || i.percentual < 0 || i.percentual > 100))
    throw new Error("Cada percentual deve ser um número entre 0 e 100%.");
  if (!updateCompositionBar()) {
    throw new Error("A composição deve totalizar 100 %.");
  }
  if (r.some((i) => !i.gas && i.percentual > 0)) {
    throw new Error("Existe percentual informado sem componente selecionado.");
  }
  const ids = r.filter((i) => i.gas && i.percentual > 0).map((i) => i.id);
  if (!ids.length) {
    throw new Error("Selecione pelo menos um componente.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("Há componentes duplicados na mistura.");
  }
  const base = $('input[name="baseComposicao"]:checked').value;
  return C.compositionToYW(r, base);
}
