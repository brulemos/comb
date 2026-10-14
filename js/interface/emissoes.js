/**
 * Emissões estimadas, fatores e suas informações de origem
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { category } from './componentes.js';
import { $, C, E, esc, estado, fmt, num } from './contexto.js';
import { showError } from './entradas.js';

export function refreshEmissionCategory(preferred = null) {
        if (!E) {
            return;
        }
        const equipment = $("#emissionEquipment")?.value
            ||
                "boiler";
        const select = $("#emissionCategory");
        if (!select) {
            return;
        }
        const current = preferred
            ??
                select.value;
        const categories = E.categoriesFor(equipment);
        select.innerHTML =
            categories.length
                ?
                    categories
                        .map(item => `<option value="${esc(item.id)}">${esc(item.label)}</option>`)
                        .join("")
                :
                    '<option value="">Fator personalizado</option>';
        if (current
            &&
                categories.some(item => item.id === current)) {
            select.value =
                current;
        }
        $("#emissionCategoryField")
            ?.classList
            .toggle("hidden", equipment === "custom");
    }

export function updateEmissionFlameModeUI() {
        const manual = $("#emissionFlameMode")?.value
            ===
                "manual";
        $("#emissionTadFactorField")
            ?.classList
            .toggle("hidden", manual);
        $("#emissionFlameTempField")
            ?.classList
            .toggle("hidden", !manual);
    }

export function updateEmissionUI() {
        const model = $("#emissionModel")?.value
            ||
                "factors";
        const equipment = $("#emissionEquipment")?.value
            ||
                "boiler";
        const ideal = model === "ideal";
        const custom = equipment === "custom"
            &&
                !ideal;
        const advanced = model === "advanced";
        if ($("#emissionEquipment")) {
            $("#emissionEquipment").disabled =
                ideal;
        }
        if ($("#emissionCategory")) {
            $("#emissionCategory").disabled =
                ideal
                    ||
                        custom;
        }
        $("#emissionCustomFields")
            ?.classList
            .toggle("hidden", !custom);
        $("#emissionAdvancedFields")
            ?.classList
            .toggle("hidden", !advanced);
        updateEmissionFlameModeUI();
    }

export function syncAdvancedBurnerCategory() {
        if ($("#emissionModel")?.value
            !==
                "advanced") {
            return;
        }
        const equipment = $("#emissionEquipment")?.value;
        const burner = $("#emissionBurnerType")?.value;
        const maps = {
            boiler: {
                conventional: "small_uncontrolled",
                low_nox: "small_lnb",
                low_nox_fgr: "small_lnb_fgr"
            },
            furnace: {
                conventional: "external_proxy",
                low_nox: "external_proxy_lnb",
                low_nox_fgr: "external_proxy_lnb_fgr"
            },
            burner: {
                conventional: "external_proxy",
                low_nox: "external_proxy_lnb",
                low_nox_fgr: "external_proxy_lnb_fgr"
            }
        };
        const category = maps[equipment]?.[burner];
        if (category
            &&
                [
                    ...$("#emissionCategory")?.options
                        ||
                            []
                ]
                    .some(option => option.value === category)) {
            $("#emissionCategory").value =
                category;
        }
    }

export function emissionFlameTemperatureC() {
        const mode = $("#emissionFlameMode")?.value
            ||
                "factor";
        if (mode === "manual") {
            return num("#emissionFlameTemp");
        }
        const tadC = estado.ultimoCaso
            ?
                estado.ultimoCaso.tad.temperatureK
                    -
                        273.15
            :
                NaN;
        const factor = num("#emissionTadFactor");
        return Number.isFinite(tadC)
            &&
                Number.isFinite(factor)
            ?
                tadC
                    *
                        factor
            :
                NaN;
    }

export function collectEmissionOptions() {
        return {
            model: $("#emissionModel")?.value
                ||
                    "factors",
            equipment: $("#emissionEquipment")?.value
                ||
                    "boiler",
            category: $("#emissionCategory")?.value
                ||
                    "",
            custom: {
                nox: num("#customEFNOx"),
                co: num("#customEFCO"),
                ch4: num("#customEFCH4"),
                voc: num("#customEFVOC"),
                note: $("#customEFNote")?.value
                    ||
                        ""
            },
            advanced: {
                flameTemperatureC: emissionFlameTemperatureC(),
                residenceTimeS: num("#emissionResidence"),
                burnerType: $("#emissionBurnerType")?.value
                    ||
                        "",
                noFractionPct: $("#emissionNOFraction")?.value === ""
                    ?
                        NaN
                    :
                        num("#emissionNOFraction")
            }
        };
    }

export function emissionO2CorrectionFactor(measured, reference) {
        if (!Number.isFinite(measured)
            ||
                !Number.isFinite(reference)
            ||
                measured >= 20.9
            ||
                reference >= 20.9) {
            return NaN;
        }
        return (20.9
            -
                reference)
            /
                (20.9
                    -
                        measured);
    }

export function renderEstimatedEmissionResults() {
        if (!estado.estimativaEmissoes) {
            return;
        }
        const e = estado.estimativaEmissoes;
        const c = e.concentration;
        const ref = e.o2ReferencePct;
        $("#emissionO2RefHeader").textContent =
            `Corrigido @ ${fmt(ref, 1)}% O₂`;
        $("#resEmCOkgH").textContent =
            fmt(e.rates.coKgH, 5);
        $("#resEmNOxkgH").textContent =
            fmt(e.rates.noxKgH, 5);
        $("#resEmO2Dry").textContent =
            fmt(e.dry.o2Pct, 3);
        $("#resEmCarbonClosure").textContent =
            fmt(e.balance.carbonClosurePct, 4)
                +
                    "%";
        const corrFactor = emissionO2CorrectionFactor(e.dry.o2Pct, ref);
        const speciesFromPpm = (ppm, molarMass) => {
            if (!Number.isFinite(ppm)) {
                return null;
            }
            const kmolH = ppm
                /
                    1e6
                *
                    e.dry.kmolH;
            const kgH = kmolH
                *
                    molarMass;
            const mgNm3 = e.dry.nm3H > 0
                ?
                    kgH
                        *
                            1e6
                        /
                            e.dry.nm3H
                :
                    0;
            return {
                ppm,
                kgH,
                mgNm3,
                mgNm3Ref: Number.isFinite(corrFactor)
                    ?
                        mgNm3
                            *
                                corrFactor
                    :
                        NaN
            };
        };
        const no = speciesFromPpm(c.noPpmvd, E.MW.NO);
        const no2 = speciesFromPpm(c.no2Ppmvd, E.MW.NO2);
        const ch4MgRef = Number.isFinite(corrFactor)
            ?
                c.ch4.mgNm3
                    *
                        corrFactor
            :
                NaN;
        const refCell = value => Number.isFinite(value)
            ?
                `${fmt(value, 2)} mg/Nm³`
            :
                "—";
        const row = (label, ppm, mg, kg, corrected, note = "") => `
        <tr>
            <td>
                <strong>${esc(label)}</strong>
                ${note
            ?
                `<small class="table-note">${esc(note)}</small>`
            :
                ""}
            </td>
            <td class="num">${Number.isFinite(ppm) ? fmt(ppm, 2) : "n/d"}</td>
            <td class="num">${Number.isFinite(mg) ? fmt(mg, 2) : "n/d"}</td>
            <td class="num">${Number.isFinite(kg) ? fmt(kg, 5) : "n/d"}</td>
            <td class="num">${refCell(corrected)}</td>
        </tr>
    `;
        $("#emissionResultsBody").innerHTML =
            [
                row("CO", c.co.ppmvd, c.co.mgNm3, e.rates.coKgH, c.co.mgNm3Ref),
                row("NO", no?.ppm, no?.mgNm3, no?.kgH, no?.mgNm3Ref, no
                    ?
                        "Especiação definida pelo usuário."
                    :
                        "AP-42 não separa NO/NO₂ no fator total."),
                row("NO₂", no2?.ppm, no2?.mgNm3, no2?.kgH, no2?.mgNm3Ref, no2
                    ?
                        "Especiação definida pelo usuário."
                    :
                        "AP-42 não separa NO/NO₂ no fator total."),
                row("NOx (como NO₂)", c.nox.ppmvd, c.nox.mgNm3, e.rates.noxKgH, c.nox.mgNm3Ref, "Massa regulatória/equivalente como NO₂."),
                row("CH₄ não queimado", c.ch4.ppmvd, c.ch4.mgNm3, e.rates.ch4KgH, ch4MgRef),
                row("THC/VOC", NaN, c.vocMgNm3, e.rates.vocKgH, c.vocMgNm3Ref, "Classe agregada; ppm não é calculado sem massa molar representativa.")
            ]
                .join("");
        renderEmissionFactorInfo();
        renderEmissionBalanceInfo();
        renderEmissionWarnings();
    }

export function renderEmissionFactorInfo() {
        if (!estado.estimativaEmissoes) {
            return;
        }
        const e = estado.estimativaEmissoes;
        const f = e.factor;
        const source = f.source;
        const rating = value => `<span class="emission-rating">${esc(value || "—")}</span>`;
        const sourceHtml = source
            ?
                `
                <p>
                    <strong>Fonte:</strong>
                    ${esc(source.short)} — ${esc(source.edition)}.
                </p>
                <p><strong>Tabela:</strong> ${esc(f.table || "—")}</p>
                <a class="emission-source-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Abrir documento da fonte ↗</a>
            `
            :
                `
                <p><strong>Fonte:</strong> ${f.custom ? "Definida pelo usuário." : "Modelo ideal."}</p>
                <p><strong>Referência:</strong> ${esc(f.applicability || "—")}</p>
            `;
        $("#emissionFactorInfo").innerHTML = `
        ${sourceHtml}

        <p>
            <strong>Categoria aplicada:</strong>
            ${esc(f.label || (f.custom ? "Personalizado" : "Modelo ideal"))}
        </p>

        <div class="emission-factor-list">
            <div class="emission-factor-item">
                <strong>NOx: ${fmt(f.nox, 6)} kg/GJ ${rating(f.ratingNOx)}</strong>
                <span>Original: ${esc(f.original?.nox || "—")}</span>
            </div>
            <div class="emission-factor-item">
                <strong>CO: ${fmt(f.co, 6)} kg/GJ ${rating(f.ratingCO)}</strong>
                <span>Original: ${esc(f.original?.co || "—")}</span>
            </div>
            <div class="emission-factor-item">
                <strong>CH₄: ${fmt(f.ch4, 6)} kg/GJ ${rating(f.ratingCH4)}</strong>
                <span>Original: ${esc(f.original?.ch4 || "—")}</span>
            </div>
            <div class="emission-factor-item">
                <strong>VOC: ${fmt(f.voc, 6)} kg/GJ ${rating(f.ratingVOC)}</strong>
                <span>Original: ${esc(f.original?.voc || "—")}</span>
            </div>
        </div>

        <p class="emission-note">
            <strong>Aplicabilidade:</strong>
            ${esc(f.applicability || "—")}
        </p>

        <p class="emission-note">
            As letras A–E são as classificações de qualidade do fator AP-42 quando disponíveis; A representa a melhor base de dados e E a mais limitada. Não são limites de emissão.
        </p>
    `;
    }

export function renderEmissionBalanceInfo() {
        if (!estado.estimativaEmissoes) {
            return;
        }
        const e = estado.estimativaEmissoes;
        const advanced = e.model === "advanced"
            ?
                `
                <p>
                    <strong>Contexto avançado:</strong>
                    T chama = ${fmt(e.advanced.flameTemperatureC, 1)} °C;
                    τ = ${fmt(e.advanced.residenceTimeS, 3)} s;
                    λ = ${fmt(estado.ultimoCaso?.lambda, 3)}.
                </p>
            `
            :
                "";
        $("#emissionBalanceInfo").innerHTML = `
        <p>
            <strong>Entrada térmica usada:</strong>
            ${fmt(e.energyInputGJH, 6)} GJ/h em base PCS.
        </p>

        <p>
            <strong>Vazão seca estimada:</strong>
            ${fmt(e.dry.nm3H, 3)} Nm³/h;
            O₂ seco = ${fmt(e.dry.o2Pct, 3)}%.
        </p>

        <p>
            <strong>CO₂ ideal:</strong>
            ${fmt(e.balance.theoreticalCO2KgH, 5)} kg/h
            → <strong>CO₂ após realocação de CO/CH₄:</strong>
            ${fmt(e.balance.correctedCO2KgH, 5)} kg/h.
        </p>

        <p>
            <strong>Fechamento de carbono (CO₂ + CO + CH₄):</strong>
            ${fmt(e.balance.carbonClosurePct, 6)}%.
            VOC não entra no fechamento atômico porque o fator representa uma classe de espécies sem fórmula molecular única.
        </p>

        <p>
            <strong>NOx:</strong>
            reportado como NO₂ equivalente, conforme a convenção do fator. NO e NO₂ individuais só são mostrados quando uma fração de NO é informada no modo avançado.
        </p>

        ${advanced}
    `;
    }

export function renderEmissionWarnings() {
        if (!estado.estimativaEmissoes) {
            return;
        }
        const list = [
            ...estado.estimativaEmissoes.warnings,
            "Estimativa por fator de emissão: não substitui ensaio de chaminé, analisador de gases ou dados específicos do fabricante/equipamento.",
            "A EPA ressalta que fatores AP-42 são médias de uma população de fontes e não devem ser usados como limites de conformidade."
        ];
        $("#emissionWarnings").innerHTML =
            [
                ...new Set(list)
            ]
                .map(text => `
                <div class="alert warning">
                    ⚠ ${esc(text)}
                </div>
            `)
                .join("");
    }

export function estimateEmissions(silent = false) {
        try {
            if (!estado.ultimoCaso) {
                if (!silent) {
                    throw new Error("Execute primeiro o cálculo principal de combustão.");
                }
                return;
            }
            if (!E) {
                throw new Error("Módulo de emissões não carregado.");
            }
            const opts = collectEmissionOptions();
            const energyInputGJH = estado.ultimoCaso.flows.mass
                *
                    estado.ultimoCaso.pcs
                /
                    1000;
            estado.estimativaEmissoes =
                E.estimate({
                    ...opts,
                    energyInputGJH,
                    products: estado.ultimoCaso.products,
                    comp: estado.ultimoCaso.comp,
                    config: C.CONFIG,
                    o2ReferencePct: num("#o2Referencia")
                });
            renderEstimatedEmissionResults();
        }
        catch (error) {
            if (!silent) {
                showError(error.message
                    ||
                        String(error));
            }
        }
    }
