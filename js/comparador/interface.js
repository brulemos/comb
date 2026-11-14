import { clonarModelo } from "../html/fragmentos.js";
import { selecionar as $ } from "../interface/dom.js";
/** Interface isolada do comparador; somente Aplicar escreve na calculadora. */
import { C, estado, esc, fmt } from "../interface/contexto.js";
import { applyState } from "../interface/acoes.js";
import { calculate } from "../interface/calculo.js";
import {
  cloneCase,
  referenceFromResult,
  evaluateScenario,
  gasStateFromScenario,
  COMPARISON_METRICS
} from "./modelo.js";
let state = null;
export function comparisonSnapshot() {
  return state
    ? cloneCase({ reference: state.reference, scenarios: state.scenarios, basis: state.basis })
    : null;
}
const get = (o, path) => path.split(".").reduce((v, key) => v?.[key], o);
const set = (o, path, value) => {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((v, key) => v[key], o)[last] = value;
};
const number = (input) => (input.value.trim() === "" ? NaN : Number(input.value));
const display = (v, conversion) =>
  conversion === "temperature" ? v - 273.15 : conversion === "pressure" ? v / 100 : v;
const canonical = (v, conversion) =>
  conversion === "temperature" ? v + 273.15 : conversion === "pressure" ? v * 100 : v;
const field = (label, path, value, unit = "", conversion = "") =>
  `<label class="field">${esc(label)}${unit ? ` <small>(${esc(unit)})</small>` : ""}<input type="number" step="any" data-path="${path}" data-convert="${conversion}" value="${Number.isFinite(value) ? esc(Number(display(value, conversion).toPrecision(12))) : ""}"></label>`;
const check = (label, path, value) =>
  `<label class="check-field"><input type="checkbox" data-path="${path}" ${value ? "checked" : ""}>${esc(label)}</label>`;
const choice = (label, path, value, options) =>
  `<label class="field">${esc(label)}<select data-path="${path}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;

export function iniciarComparador({ getBiomass, applyBiomass }) {
  const button = $("#btnComparar");
  if (!button || $("#compareDialog")) return;
  const dialog = clonarModelo("comparador");
  document.body.append(dialog);
  const cards = $("#compareScenarios"),
    table = $("#compareTable"),
    status = $("#compareStatus");
  let timer = null,
    returnFocus = button;
  const syncButton = () => {
    const activeKind = $("#tipoCombustivel").value;
    const valid = activeKind === "gasosa" ? !!estado.ultimoCaso : !!getBiomass();
    button.disabled = !valid || $("#resultStatus")?.dataset.status !== "atualizado";
    button.title = button.disabled
      ? "Execute ou atualize o cálculo para comparar."
      : "Comparar alternativas com o cálculo atual.";
  };
  document.addEventListener("combustion:result-status", syncButton);
  const close = () => {
    clearTimeout(timer);
    dialog.close();
  };
  $("#compareClose").addEventListener("click", close);
  dialog.addEventListener("close", () => {
    clearTimeout(timer);
    if (!button.disabled) returnFocus.focus();
  });
  dialog.addEventListener("cancel", () => clearTimeout(timer));
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
  document.addEventListener("combustion:reset", () => {
    state = null;
    clearTimeout(timer);
    if (dialog.open) dialog.close();
    syncButton();
  });

  function gasCompositionCard(s) {
    const presets = Object.entries(window.COMBUSTION_PRESETS || {}).filter(
      ([key]) => key !== "ar_seco"
    );
    const options = [
      ["reference", "Composição da referência"],
      ...presets.map(([key, p]) => ["builtin:" + key, p.nome]),
      ["manual", "Composição manual"]
    ];
    return `<label class="field">Combustível<select data-action="fuel-source">${options.map(([v, l]) => `<option value="${v}" ${s.source === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
          <details class="compare-details"><summary>Composição molar — editar (%)</summary><table class="compare-composition"><thead><tr><th>Componente</th><th>% molar</th><th><span class="sr-only">Ação</span></th></tr></thead><tbody>${s.input.composition.map((part, i) => `<tr data-component="${i}"><td><select data-component-id aria-label="Componente ${i + 1}">${window.GAS_DATABASE.map((g) => `<option value="${esc(g.id)}" ${g.id === part.id ? "selected" : ""}>${esc(g.nome)}</option>`).join("")}</select></td><td><input type="number" min="0" max="100" step="any" data-component-percent aria-label="Percentual do componente ${i + 1}" value="${Number.isFinite(part.percentual) ? part.percentual : ""}"></td><td><button type="button" class="compare-remove-component" data-action="remove-component" aria-label="Remover componente ${i + 1}">×</button></td></tr>`).join("")}</tbody></table><button type="button" class="btn secondary" data-action="add-component">+ Componente</button><small>A soma deve fechar 100%. A calculadora mantém as validações e restrições do motor.</small></details>`;
  }
  function biomassCompositionCard(s) {
    const e = s.input;
    return `${field("Umidade como recebida", "umidadePct", e.umidadePct, "%")}
          <details class="compare-details"><summary>Análise seca e PCS — editar</summary><div class="compare-form-grid">${["C", "H", "O", "N", "S"].map((k) => field(k, "elementos." + k, e.elementos[k], "% seco")).join("")}${field("Cinzas", "cinzasPct", e.cinzasPct, "% seco")}</div>
          ${choice("Origem do PCS", "pcsModo", e.pcsModo, [
            ["estimado", "Estimado pela análise elementar"],
            ["medido", "Medido a 25 °C"]
          ])}${field("PCS seco medido", "pcsSecoMedido", e.pcsSecoMedido, "MJ/kg")}${field("Cp do sólido seco", "cpBiomassa", e.cpBiomassa, "kJ/(kg·K)")}</details>`;
  }
  function conditionsCard(s) {
    const gas = s.kind === "gasosa",
      prefix = gas ? "options." : "",
      e = gas ? s.input.options : s.input;
    const air = gas ? "options.humidity" : "umidadeAr",
      h = gas ? e.humidity : e.umidadeAr;
    return `<details class="compare-details"><summary>Combustão, ar e temperaturas — editar</summary>
          <div class="compare-form-grid">${field("Temperatura do combustível", prefix + "fuelT", e.fuelT, "°C", "temperature")}${field("Temperatura de chaminé", prefix + "stackT", e.stackT, "°C", "temperature")}${field("Pressão de chaminé", prefix + "stackP", e.stackP, "bar abs.", "pressure")}${gas ? field("Pressão do combustível", "options.fuelP", e.fuelP, "bar abs.", "pressure") : ""}</div>
          ${choice(
            "Controle de combustão",
            prefix + (gas ? "combustionMode" : "modoCombustao"),
            gas ? e.combustionMode : e.modoCombustao,
            [
              ["excesso", "Excesso de comburente"],
              ["o2medido", "O₂ seco medido"]
            ]
          )}
          <div class="compare-form-grid">${field("Excesso de comburente", prefix + (gas ? "excessPct" : "excessoPct"), gas ? e.excessPct : e.excessoPct, "%")}${field("O₂ seco medido", prefix + (gas ? "measuredO2" : "o2Medido"), gas ? e.measuredO2 : e.o2Medido, "%")}${field("O₂ do comburente seco", prefix + (gas ? "dryO2Pct" : "o2SecoPct"), gas ? e.dryO2Pct : e.o2SecoPct, "%")}</div>
          <h4>Entrada do comburente</h4><div class="compare-form-grid">${field("Temperatura de entrada", air + ".tempK", h.tempK, "°C", "temperature")}${field("Pressão de entrada", air + ".pressureKPa", h.pressureKPa, "bar abs.", "pressure")}</div>
          ${check("Considerar umidade do ar", air + ".enabled", h.enabled)}
          <div data-capture-block>${check("Captação nas mesmas T e P da entrada", air + ".captureLinked", h.captureLinked !== false)}<div class="compare-form-grid">${field("Temperatura na captação", air + ".captureTempK", h.captureTempK ?? h.tempK, "°C", "temperature")}${field("Pressão na captação", air + ".capturePressureKPa", h.capturePressureKPa ?? h.pressureKPa, "bar abs.", "pressure")}${field("UR na captação", air + ".rhPct", h.rhPct, "%")}</div></div>
        </details>`;
  }
  function renderCards() {
    cards.innerHTML = state.scenarios
      .map((s) => {
        const gas = s.kind === "gasosa",
          e = gas ? s.input.options : s.input,
          prefix = gas ? "options." : "";
        const modePath = prefix + (gas ? "inputMode" : "entrada"),
          massPath = prefix + (gas ? "flowValue" : "vazaoKgH"),
          powerPath = prefix + (gas ? "targetPowerKW" : "potenciaDesejadaKW");
        return `<article class="compare-scenario" data-scenario-id="${s.id}"><div class="compare-scenario-header"><label class="field">Nome<input type="text" maxlength="60" data-name value="${esc(s.name)}"></label><button type="button" class="btn ghost" data-action="remove" aria-label="Remover ${esc(s.name)}">×</button></div>
              ${gas ? gasCompositionCard(s) : biomassCompositionCard(s)}
              <div class="compare-amount">${choice(
                "Alimentação",
                modePath,
                gas ? e.inputMode : e.entrada,
                [
                  ["vazao", "Vazão de combustível"],
                  ["potencia", "Potência química — PCI"]
                ]
              )}${field("Vazão alimentada", massPath, gas ? e.flowValue : e.vazaoKgH, "kg/h")}${field("Potência desejada — PCI", powerPath, gas ? e.targetPowerKW : e.potenciaDesejadaKW, "kW")}</div>
              ${conditionsCard(s)}<p class="compare-scenario-status" role="status"></p><button type="button" class="btn primary compare-apply" data-action="apply">Aplicar cenário</button></article>`;
      })
      .join("");
    $("#compareAdd").disabled = state.scenarios.length >= 3;
    $("#compareWorkspace").classList.toggle(
      "compare-workspace-multiple",
      state.scenarios.length > 1
    );
    for (const s of state.scenarios) syncCard(s);
  }
  function syncCard(s) {
    const card = cards.querySelector(`[data-scenario-id="${s.id}"]`),
      gas = s.kind === "gasosa",
      e = gas ? s.input.options : s.input;
    const prefix = gas ? "options." : "",
      air = gas ? "options.humidity" : "umidadeAr",
      h = gas ? e.humidity : e.umidadeAr;
    const control = (path) => card.querySelector(`[data-path="${path}"]`);
    const mode =
      state.basis === "livre"
        ? gas
          ? e.inputMode
          : e.entrada
        : state.basis === "potencia"
          ? "potencia"
          : "vazao";
    const modeControl = control(prefix + (gas ? "inputMode" : "entrada"));
    modeControl.value = mode;
    modeControl.disabled = state.basis !== "livre";
    for (const [path, forced, visible] of [
      [
        prefix + (gas ? "flowValue" : "vazaoKgH"),
        state.referenceEvaluation.metrics.fuelMassKgH,
        mode === "vazao"
      ],
      [
        prefix + (gas ? "targetPowerKW" : "potenciaDesejadaKW"),
        state.referenceEvaluation.metrics.powerKW,
        mode === "potencia"
      ]
    ]) {
      const input = control(path);
      input.closest("label").hidden = !visible;
      input.disabled = state.basis !== "livre";
      const value = state.basis === "livre" ? get(s.input, path) : forced;
      input.value = Number.isFinite(value)
        ? String(state.basis === "livre" ? Number(value.toPrecision(12)) : Number(value.toFixed(3)))
        : "";
    }
    card.querySelector("[data-capture-block]").hidden = !h.enabled;
    for (const [cap, entry] of [
      ["captureTempK", "tempK"],
      ["capturePressureKPa", "pressureKPa"]
    ]) {
      const input = control(air + "." + cap);
      input.disabled = h.captureLinked !== false;
      if (h.captureLinked !== false)
        input.value = Number.isFinite(h[entry])
          ? String(display(h[entry], input.dataset.convert))
          : "";
    }
    const inverse = (gas ? e.combustionMode : e.modoCombustao) === "o2medido";
    control(prefix + (gas ? "excessPct" : "excessoPct")).closest("label").hidden = inverse;
    control(prefix + (gas ? "measuredO2" : "o2Medido")).closest("label").hidden = !inverse;
    const pcs = control("pcsSecoMedido");
    if (pcs) pcs.closest("label").hidden = e.pcsModo !== "medido";
  }
  function difference(value, reference, unit, relative) {
    if (!Number.isFinite(value) || !Number.isFinite(reference)) return "";
    const delta = value - reference,
      sign = delta > 0 ? "+" : "";
    const suffix = unit === "%" ? "p.p." : unit;
    return `Δ ${sign}${fmt(delta, 3)} ${suffix}${relative && Math.abs(reference) > 1e-12 ? ` (${delta / reference > 0 ? "+" : ""}${fmt((delta / reference) * 100, 2)}%)` : ""}`;
  }
  function updateResults() {
    if (!state) return;
    state.evaluations = new Map();
    for (const s of state.scenarios) {
      const card = cards.querySelector(`[data-scenario-id="${s.id}"]`),
        message = card.querySelector(".compare-scenario-status");
      try {
        const result = evaluateScenario(s, state.basis, state.referenceEvaluation.metrics);
        state.evaluations.set(s.id, { ok: true, ...result });
        message.textContent = "Cenário calculado.";
        message.className = "compare-scenario-status compare-ok";
      } catch (error) {
        state.evaluations.set(s.id, { ok: false, error: error.message });
        message.textContent = error.message;
        message.className = "compare-scenario-status compare-error";
      }
      card.querySelector('[data-action="apply"]').disabled = !state.evaluations.get(s.id).ok;
    }
    const ref = state.referenceEvaluation;
    table.innerHTML = `<table><caption>${state.reference.kind === "gasosa" ? "Misturas gasosas" : "Biomassa"} — ${esc($("#compareBasis").selectedOptions[0].textContent)}</caption><thead><tr><th scope="col">Grandeza</th><th scope="col">Referência</th>${state.scenarios.map((s) => `<th scope="col">${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${COMPARISON_METRICS.filter(
      ([key]) => key !== "wobbe" || state.reference.kind === "gasosa"
    )
      .map(
        ([key, label, unit, relative]) =>
          `<tr><th scope="row">${esc(label)} <small>${esc(unit)}</small></th><td>${fmt(ref.metrics[key], 3)}</td>${state.scenarios
            .map((s) => {
              const r = state.evaluations.get(s.id),
                value = r.ok ? r.metrics[key] : NaN;
              return `<td><strong>${fmt(value, 3)}</strong><small class="compare-delta">${esc(r.ok ? difference(value, ref.metrics[key], unit, relative) : "Cenário inválido")}</small></td>`;
            })
            .join("")}</tr>`
      )
      .join("")}</tbody></table>`;
    $("#compareWarnings").innerHTML = [
      ["Referência", ref],
      ...state.scenarios.map((s) => [s.name, state.evaluations.get(s.id)])
    ]
      .map(
        ([name, r]) =>
          `<section><h4>${esc(name)}</h4>${r.ok === false ? `<p class="compare-error">${esc(r.error)}</p>` : `<ul>${r.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>`}</section>`
      )
      .join("");
    status.textContent = `${state.scenarios.filter((s) => state.evaluations.get(s.id).ok).length} de ${state.scenarios.length} alternativas válidas. O caso principal permanece inalterado até aplicar um cenário.`;
  }
  function addScenario() {
    if (state.scenarios.length >= 3) return;
    const s = cloneCase(state.reference);
    s.id = "scenario-" + ++state.counter;
    s.name = "Alternativa " + state.counter;
    state.scenarios.push(s);
    renderCards();
    updateResults();
  }
  button.addEventListener("click", () => {
    syncButton();
    if (button.disabled) return;
    try {
      const kind = $("#tipoCombustivel").value;
      const reference = referenceFromResult(
        kind,
        kind === "gasosa" ? estado.ultimoCaso : getBiomass()
      );
      if (kind === "gasosa") reference.referencePreset = $("#presetCombustivel").value;
      state = {
        reference,
        referenceEvaluation: evaluateScenario(reference),
        basis: "potencia",
        scenarios: [],
        counter: 0,
        referenceO2: Number($("#o2Referencia").value)
      };
      $("#compareBasis").value = "potencia";
      $("#compareReferenceInfo").textContent =
        `Referência fixa: ${$("#sumFuel").textContent.trim()} · ${fmt(state.referenceEvaluation.metrics.fuelMassKgH, 3)} kg/h · ${fmt(state.referenceEvaluation.metrics.powerKW, 3)} kW (PCI).`;
      addScenario();
      dialog.showModal();
      dialog.querySelector(".compare-content").scrollTop = 0;
    } catch (error) {
      status.textContent = error.message;
    }
  });
  $("#compareAdd").addEventListener("click", addScenario);
  $("#compareBasis").addEventListener("change", () => {
    state.basis = $("#compareBasis").value;
    for (const s of state.scenarios) syncCard(s);
    updateResults();
  });
  const edit = (event) => {
    const card = event.target.closest("[data-scenario-id]");
    if (!card || !state) return;
    const s = state.scenarios.find((s) => s.id === card.dataset.scenarioId),
      input = event.target;
    if (input.matches("[data-name]")) s.name = input.value.trim() || "Alternativa";
    else if (input.matches("[data-path]")) {
      if (input.disabled) return;
      const value =
        input.type === "checkbox"
          ? input.checked
          : input.tagName === "SELECT"
            ? input.value
            : canonical(number(input), input.dataset.convert);
      set(s.input, input.dataset.path, value);
      syncCard(s);
    } else if (input.matches("[data-component-id], [data-component-percent]")) {
      const i = Number(input.closest("[data-component]").dataset.component),
        part = s.input.composition[i];
      if (input.matches("[data-component-id]")) part.id = input.value;
      else part.percentual = number(input);
      s.source = "manual";
      card.querySelector('[data-action="fuel-source"]').value = "manual";
    } else if (input.matches('[data-action="fuel-source"]') && event.type === "change") {
      s.source = input.value;
      if (s.source === "reference")
        s.input.composition = cloneCase(state.reference.input.composition);
      else if (s.source.startsWith("builtin:"))
        s.input.composition = cloneCase(window.COMBUSTION_PRESETS[s.source.slice(8)].componentes);
      renderCards();
    } else return;
    clearTimeout(timer);
    // Invalidate old apply results immediately, before the debounce finishes.
    for (const b of cards.querySelectorAll('[data-action="apply"]')) b.disabled = true;
    if (event.type === "change") updateResults();
    else timer = setTimeout(updateResults, 180);
  };
  cards.addEventListener("input", edit);
  cards.addEventListener("change", edit);
  cards.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action || action.tagName !== "BUTTON" || !state) return;
    const card = action.closest("[data-scenario-id]"),
      s = state.scenarios.find((s) => s.id === card.dataset.scenarioId);
    clearTimeout(timer);
    if (action.dataset.action === "remove") {
      state.scenarios = state.scenarios.filter((i) => i.id !== s.id);
      renderCards();
      updateResults();
    }
    if (action.dataset.action === "add-component") {
      s.input.composition.push({ id: "N2", percentual: 0 });
      s.source = "manual";
      renderCards();
      updateResults();
    }
    if (action.dataset.action === "remove-component") {
      s.input.composition.splice(Number(action.closest("[data-component]").dataset.component), 1);
      s.source = "manual";
      renderCards();
      updateResults();
    }
    if (action.dataset.action === "apply") {
      updateResults();
      const evaluation = state.evaluations.get(s.id);
      if (!evaluation?.ok) return;
      let applied = false;
      if (s.kind === "gasosa") {
        applyState(gasStateFromScenario(evaluation.effective, state.referenceO2));
        applied = calculate();
      } else applied = applyBiomass(evaluation.effective.input);
      if (applied) close();
      else
        status.textContent = "Não foi possível aplicar. Revise a mensagem de erro na calculadora.";
    }
  });
  syncButton();
}
