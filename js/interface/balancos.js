/**
 * Estequiometria, produtos, balanços e resumo
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { $, C, els, esc, estado, fmt, num } from './contexto.js';
import { combustionMode } from './entradas.js';
import { presetObject } from './mistura.js';

export function updateStoichiometryCards() {
        if (!estado.ultimoCaso)
            return;
        const mostrarComburenteEsteq = $("#modoExibicaoComburente").value === "esteq";
        const mostrarAFREsteq = $("#modoExibicaoAFR").value === "esteq";
        $("#resComburente").textContent = fmt(mostrarComburenteEsteq ? estado.ultimoCaso.oxid.oxidStoichMass : estado.ultimoCaso.oxid.oxidRealMass, 2);
        $("#resAFR").textContent = fmt(mostrarAFREsteq ? estado.ultimoCaso.oxid.afrStoich : estado.ultimoCaso.oxid.afrReal, 4);
    }

export function renderCombustion() {
        updateStoichiometryCards();
        $("#resLambda").textContent =
            fmt(estado.ultimoCaso.lambda, 4);
        $("#resExcesso").textContent =
            fmt((estado.ultimoCaso.lambda
                -
                    1)
                *
                    100, 2);
        $("#resTad").textContent =
            fmt(estado.ultimoCaso.tad.temperatureK
                -
                    273.15, 1);
        els.lambdaPreview.textContent =
            combustionMode() === "o2medido"
                ?
                    `λ = ${fmt(estado.ultimoCaso.lambda, 3)} (via O₂ seco; válido para λ ≥ 1)`
                :
                    `λ = ${fmt(estado.ultimoCaso.lambda, 3)}`;
    }

export function renderThermal() {
        const flue = C.productSummary(estado.ultimoCaso.products, estado.ultimoCaso.opts.stackT, estado.ultimoCaso.opts.stackP);
        const flueCp = C.productsCpMass(estado.ultimoCaso.products, estado.ultimoCaso.opts.stackT);
        const flueEnthalpy = C.productsSensibleEnthalpy(estado.ultimoCaso.products, C.CONFIG.Tref, estado.ultimoCaso.opts.stackT);
        const flueSpecificEnthalpy = flue.massFlow > 0
            ?
                flueEnthalpy.value
                    /
                        flue.massFlow
            :
                0;
        $("#resQChemical").textContent =
            fmt(estado.ultimoCaso.thermal.chemicalKW, 2);
        $("#resFlueMoles").textContent =
            fmt(flue.molarFlow, 6);
        $("#resFlueCp").textContent =
            fmt(flueCp.value, 4);
        $("#resFlueDensity").textContent =
            fmt(flue.density, 4);
        $("#resFluePCI").textContent =
            fmt(flue.pci, 4);
        $("#resFlueEnthalpy").textContent =
            fmt(flueSpecificEnthalpy, 3);
        $("#resDewPoint").textContent =
            fmt(estado.ultimoCaso.dew.dewPointC, 2);
    }

export function renderBalances() {
        $("#balFuel").textContent =
            `${fmt(estado.ultimoCaso.flows.mass, 3)} kg/h`;
        $("#balOxid").textContent =
            `${fmt(estado.ultimoCaso.oxid.oxidRealMass, 3)} kg/h`;
        $("#balInput").textContent =
            `${fmt(estado.ultimoCaso.massBal.input, 3)} kg/h`;
        $("#balOutput").textContent =
            `${fmt(estado.ultimoCaso.massBal.output, 3)} kg/h`;
        $("#balError").textContent =
            `${fmt(estado.ultimoCaso.massBal.errorPct, 6)} %`;
        els.elementBody.innerHTML =
            estado.ultimoCaso.elemBal
                .map(r => `

                    <tr>

                        <td>
                            <strong>${r.element}</strong>
                        </td>

                        <td class="num">
                            ${fmt(r.input, 6)}
                        </td>

                        <td class="num">
                            ${fmt(r.output, 6)}
                        </td>

                        <td class="num">
                            ${fmt(r.errorPct, 6)}
                        </td>

                    </tr>

                `)
                .join("");
    }

export function renderProducts() {
        if (!estado.ultimoCaso) {
            return;
        }
        const basis = $("#baseProdutos").value;
        const list = C.productBasis(estado.ultimoCaso.products, basis);
        const summary = C.productSummary(list, estado.ultimoCaso.opts.stackT, estado.ultimoCaso.opts.stackP);
        const f = C.fractions(list);
        const dryProducts = C.productBasis(estado.ultimoCaso.products, "seca");
        const dryFractions = C.fractions(dryProducts);
        const dryById = new Map(dryFractions.map(i => [
            i.id,
            i
        ]));
        const measuredO2DryPct = Number.isFinite(Number(estado.ultimoCaso?.dry?.o2DryPct))
            ?
                Number(estado.ultimoCaso.dry.o2DryPct)
            :
                (Number(dryById.get("O2")?.y)
                    ||
                        0)
                    *
                        100;
        const o2Reference = num("#o2Referencia");
        const oxidizerO2Pct = estado.ultimoCaso.opts.dryO2Pct;
        const correctedProductAtO2Reference = i => {
            if (i.id === "O2"
                ||
                    i.id === "H2O") {
                return NaN;
            }
            const dryItem = dryById.get(i.id);
            const dryMgNm3 = Number(dryItem?.mgNm3);
            if (!Number.isFinite(dryMgNm3)
                ||
                    !Number.isFinite(measuredO2DryPct)
                ||
                    !Number.isFinite(o2Reference)) {
                return NaN;
            }
            return C.correctedConcentrationAtO2(dryMgNm3, measuredO2DryPct, o2Reference, oxidizerO2Pct);
        };
        const massMode = $("#tipoVazaoProdutos").value
            ===
                "massica";
        $("#resVazaoProdutos").textContent =
            fmt(massMode
                ?
                    summary.massFlow
                :
                    summary.volumeFlow, 3);
        $("#resUnidadeVazaoProdutos").textContent =
            massMode
                ?
                    "kg/h"
                :
                    "m³/h";
        $("#resDensidadeProdutos").textContent =
            fmt(summary.density, 4);
        $("#resMassaMolarProdutos").textContent =
            fmt(summary.molarMass, 4);
        $("#resSO2Produtos").textContent =
            fmt(summary.so2Ppmv, 1);
        $("#resSO2BaseLabel").textContent =
            `ppmv (${basis})`;
        $("#resSO2mgProdutos").textContent =
            fmt(summary.so2MgNm3, 2);
        const drySummary = C.productSummary(C.productBasis(estado.ultimoCaso.products, "seca"), C.CONFIG.Tn, C.CONFIG.Pn);
        $("#resSO2Corrigido").textContent =
            fmt(C.correctedConcentrationAtO2(drySummary.so2MgNm3, measuredO2DryPct, o2Reference, oxidizerO2Pct), 2);
        const aviso = $("#avisoCorrecaoO2Gas");
        if (aviso) {
            const enriquecido = Math.abs(oxidizerO2Pct - 20.95) > 0.2;
            const invalido = !Number.isFinite(o2Reference) || o2Reference < 0 || o2Reference >= 20.9;
            aviso.classList.toggle("hidden", !enriquecido && !invalido);
            aviso.textContent = invalido
                ? "O₂ de referência inválido: informe um valor de 0 até menos de 20,9%."
                : "Correção convencional a O₂ de referência indisponível com comburente enriquecido/não atmosférico. Valores corrigidos exibidos como —; demais resultados não são alterados.";
        }
        const mode = $("#modoTabelaProdutos").value;
        const basisLabel = basis === "seca"
            ?
                "base seca"
            :
                "base úmida";
        const labels = {
            mol: `% molar (${basisLabel})`,
            massa: `% mássica (${basisLabel})`,
            ppmv: `ppmv (${basisLabel})`,
            mgnm3: `mg/Nm³ (${basisLabel})`
        };
        $("#productCompositionHeader").textContent =
            labels[mode];
        $("#resSO2mgBaseLabel").textContent =
            `mg/Nm³ (${basisLabel})`;
        $("#productO2RefHeader").innerHTML =
            `Corrigido a O₂ ref.<br><small>${fmt(o2Reference, 2)}% O₂ — mg/Nm³ seco</small>`;
        els.productBody.innerHTML =
            f
                .filter(i => i.kmolH > 1e-12)
                .map(i => {
                const value = mode === "mol"
                    ?
                        i.y * 100
                    :
                        mode === "massa"
                            ?
                                i.w * 100
                            :
                                mode === "ppmv"
                                    ?
                                        i.ppmv
                                    :
                                        i.mgNm3;
                const digits = mode === "ppmv"
                    ?
                        1
                    :
                        mode === "mgnm3"
                            ?
                                2
                            :
                                4;
                const corrected = correctedProductAtO2Reference(i);
                return `

                    <tr>

                        <td>

                            <strong>
                                ${esc(i.formula)}
                            </strong>

                            ${esc(i.nome)}

                        </td>

                        <td class="num">
                            ${fmt(i.kmolH, 4)}
                        </td>

                        <td class="num">
                            ${fmt(i.kgH, 3)}
                        </td>

                        <td class="num">
                            ${fmt(value, digits)}
                        </td>

                        <td class="num">
                            ${Number.isFinite(corrected)
                    ?
                        fmt(corrected, 2)
                    :
                        "—"}
                        </td>

                    </tr>

                `;
            })
                .join("");
        // Indicadores de emissões estequiométricas exibidos na seção 7.
        $("#resCO2kgH").textContent =
            fmt(estado.ultimoCaso.emissions.kgH, 3);
        $("#resCO2kgKg").textContent =
            fmt(estado.ultimoCaso.emissions.kgPerKgFuel, 4);
        $("#resCO2kgMJ").textContent =
            fmt(estado.ultimoCaso.emissions.kgPerMJFuel, 5);
        $("#resCO2kgKWh").textContent =
            fmt(estado.ultimoCaso.emissions.kgPerKWhThermal, 4);
        $("#resCO2tDay").textContent =
            fmt(estado.ultimoCaso.emissions.tonnesPerDay, 3);
    }

export function renderSummary() {
        const p = presetObject(els.preset.value);
        $("#sumFuel").textContent =
            p?.nome
                ||
                    "Mistura personalizada";
        $("#sumFlow").textContent =
            `${fmt(estado.ultimoCaso.flows.mass, 2)} kg/h`;
        $("#sumPower").textContent =
            `${fmt(estado.ultimoCaso.powerKW / 1000, 3)} MW`;
        $("#sumLambda").textContent =
            fmt(estado.ultimoCaso.lambda, 3);
        $("#sumO2").textContent =
            `${fmt(estado.ultimoCaso.dry.o2DryPct, 2)} %`;
    }
