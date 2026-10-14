/**
 * Exibição de propriedades, unidades e rastreabilidade da mistura
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { $, C, els, esc, estado, fmt } from './contexto.js';

export function renderWarnings() {
        els.warnings.innerHTML =
            estado.ultimoCaso.warnings.length
                ?
                    estado.ultimoCaso.warnings
                        .map(w => `

                        <div class="alert warning">

                            ⚠ ${esc(w)}

                        </div>

                    `)
                        .join("")
                :
                    `

                <div class="alert success">

                    ✓ Nenhuma advertência adicional.

                </div>

            `;
    }

export function updateWobbe() {
        if (!estado.ultimoCaso)
            return;
        $("#resWobbe").textContent = fmt(C.convertWobbe(estado.ultimoCaso.wobbe, $("#unidadeWobbe").value), 3);
        $("#resWobbeInferior").textContent = fmt(C.convertWobbe(estado.ultimoCaso.wobbeInferior, $("#unidadeWobbeInferior").value), 3);
    }

export function updatePower() {
        if (!estado.ultimoCaso)
            return;
        const unidadePCI = $("#unidadePotencia").value;
        $("#resPotencia").textContent = fmt(C.convertPower(estado.ultimoCaso.powerKW, unidadePCI), unidadePCI === "MW" ? 5 : 2);
        const unidadePCS = $("#unidadePotenciaPCS").value;
        $("#resPotenciaPCS").textContent = fmt(C.convertPower(estado.ultimoCaso.powerPCSKW, unidadePCS), unidadePCS === "MW" ? 5 : 2);
    }

export function updateDensity() {
        if (!estado.ultimoCaso)
            return;
        const normal = $("#modoDensidade").value === "normal";
        $("#resDensidade").textContent = fmt(normal ? estado.ultimoCaso.rhoN : estado.ultimoCaso.rho, 4);
        $("#resUnidadeDensidade").textContent = normal ? "kg/Nm³" : "kg/m³";
    }

export function renderProperties() {
        $("#resMassaMolar").textContent =
            fmt(estado.ultimoCaso.M, 4);
        $("#resPCS").textContent =
            fmt(estado.ultimoCaso.pcs, 3);
        $("#resPCI").textContent =
            fmt(estado.ultimoCaso.pci, 3);
        $("#resCp").textContent =
            fmt(estado.ultimoCaso.cp, 4);
        updateDensity();
        const elementPct = C.elementalMassPercentages(estado.ultimoCaso.comp);
        $("#resElemC").textContent =
            fmt(elementPct.C, 4);
        $("#resElemH").textContent =
            fmt(elementPct.H, 4);
        $("#resElemN").textContent =
            fmt(elementPct.N, 4);
        $("#resElemO").textContent =
            fmt(elementPct.O, 4);
        $("#resElemS").textContent =
            fmt(elementPct.S, 4);
        $("#resElemZ").textContent =
            fmt(elementPct.Z, 4);
        updateWobbe();
        updatePower();
    }

export function renderMixtureDetail() {
        els.mixtureDetail.innerHTML =
            estado.ultimoCaso.comp
                .map(i => {
                const cp = C.cpMass(i.gas, estado.ultimoCaso.opts.fuelT);
                return `

                        <tr>

                            <td>

                                <button
                                    type="button"
                                    class="trace-component-link"
                                    data-gas-id="${esc(i.gas.id)}"
                                    title="Abrir rastreabilidade de ${esc(i.gas.nome)}"
                                >
                                    <strong>
                                        ${esc(i.gas.formula)}
                                    </strong>

                                    ${esc(i.gas.nome)}
                                </button>

                            </td>

                            <td class="num">
                                ${fmt(i.y * 100, 4)}
                            </td>

                            <td class="num">
                                ${fmt(i.w * 100, 4)}
                            </td>

                            <td class="num">
                                ${fmt(i.gas.massaMolar, 4)}
                            </td>

                            <td class="num">
                                ${fmt(i.gas.pcs, 4)}
                            </td>

                            <td class="num">
                                ${fmt(i.gas.pci, 4)}
                            </td>

                            <td class="num">
                                ${fmt(cp.value, 4)}
                            </td>

                            <td>

                                ${esc(i.gas.cpShomate?.metodo
                    ||
                        "—")}

                                ${i.gas.cpShomate?.estimado
                    ?
                        " (estimado)"
                    :
                        ""}

                            </td>

                        </tr>

                    `;
            })
                .join("");
    }
