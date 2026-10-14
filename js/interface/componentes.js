/**
 * Seleção de gases, composição dos campos e rastreabilidade das fontes
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { $, $$, C, els, esc, fmt, num } from './contexto.js';

export function category(gas) {
        if ([
            "H2",
            "N2",
            "O2",
            "CO",
            "CO2",
            "NO",
            "NO2",
            "H2O",
            "H2S",
            "SO2"
        ]
            .includes(gas.id)) {
            return "Gases inorgânicos";
        }
        const name = (gas.nome
            ||
                "")
            .toLowerCase();
        if (name.includes("benzen")
            ||
                name.includes("tolu")
            ||
                name.includes("cumeno")) {
            return "Aromáticos";
        }
        if (name.includes("ciclo")) {
            return "Cíclicos";
        }
        if (/eno|butadieno|propadieno/i
            .test(name)) {
            return "Alcenos / dienos";
        }
        if (/ino|acetileno|propino/i
            .test(name)) {
            return "Alcinos";
        }
        return "Alcanos e outros hidrocarbonetos";
    }

export function selectedIds(except = null) {
        return $$(".component-select")
            .filter(s => s !== except
            &&
                s.value)
            .map(s => s.value);
    }

export function gasOptions(current = "", query = "", selectRef = null) {
        const q = query
            .trim()
            .toLowerCase();
        const used = selectedIds(selectRef);
        const groups = {};
        for (const gas of window.GAS_DATABASE) {
            const text = `${gas.nome} ${gas.formula} ${gas.id}`
                .toLowerCase();
            if (q
                &&
                    !text.includes(q)
                &&
                    gas.id !== current) {
                continue;
            }
            (groups[category(gas)]
                ||=
                    [])
                .push(gas);
        }
        let html = `<option value="">Selecione...</option>`;
        for (const [group, items] of Object.entries(groups)) {
            html +=
                `<optgroup label="${esc(group)}">`;
            for (const gas of items) {
                const disabled = used.includes(gas.id)
                    &&
                        gas.id !== current
                    ?
                        "disabled"
                    :
                        "";
                html += `

                <option
                    value="${esc(gas.id)}"
                    ${gas.id === current ? "selected" : ""}
                    ${disabled}
                >

                    ${esc(gas.nome)}
                    —
                    ${esc(gas.formula)}

                </option>

            `;
            }
            html +=
                `</optgroup>`;
        }
        return html;
    }

export function refreshComponentSelects() {
        const q = els.search.value;
        $$(".component-select")
            .forEach(select => {
            const current = select.value;
            select.innerHTML =
                gasOptions(current, q, select);
            select.value =
                current;
        });
    }

export function traceStatusFromSource(source, explicitEstimated = null) {
        if (explicitEstimated === true) {
            return {
                label: "Estimado",
                className: "estimated"
            };
        }
        if (explicitEstimated === false) {
            return {
                label: "Referência",
                className: "reference"
            };
        }
        const text = String(source || "")
            .toLowerCase();
        if (/estimativa|analogia|channiwala|joback/.test(text)) {
            return {
                label: "Estimado",
                className: "estimated"
            };
        }
        if (/nist|iso/.test(text)) {
            return {
                label: "Referência",
                className: "reference"
            };
        }
        return {
            label: "Informado no banco",
            className: "database"
        };
    }

export function traceBadge(status) {
        return `
        <span class="trace-badge ${esc(status.className)}">
            ${esc(status.label)}
        </span>
    `;
    }

export function componentFormulaCell(gas) {
        return `
        <div class="formula-with-info">
            <span class="component-formula">
                ${gas ? esc(gas.formula) : "—"}
            </span>

            <button
                type="button"
                class="component-info-btn"
                data-gas-id="${gas ? esc(gas.id) : ""}"
                aria-label="${gas ? `Abrir ficha técnica de ${esc(gas.nome)}` : "Selecione um componente"}"
                title="Rastreabilidade dos dados"
                ${gas ? "" : "disabled"}
            >
                i
            </button>
        </div>
    `;
    }

export function updateComponentFormulaCell(tr, gas) {
        const cell = tr.querySelector(".formula-cell");
        if (cell) {
            cell.innerHTML =
                componentFormulaCell(gas);
        }
    }

export function currentFuelTemperatureK() {
        const value = num("#temperatura");
        const unit = $("#unidadeTemperatura")?.value
            ||
                "C";
        return C.tempToK(value, unit);
    }

export function formatTraceRange(range) {
        if (!range) {
            return "—";
        }
        return `${fmt(range.Tmin, 2)} a ${fmt(range.Tmax, 2)} K`;
    }

export function renderTraceCoefficients(gas) {
        const ranges = gas.cpShomate?.faixas
            ||
                [];
        if (!ranges.length) {
            return `
            <p class="trace-empty">
                Não há coeficientes de Cp registrados para este componente.
            </p>
        `;
        }
        return `
        <div class="trace-table-wrap">
            <table class="trace-table">
                <thead>
                    <tr>
                        <th>Faixa [K]</th>
                        <th>A</th>
                        <th>B</th>
                        <th>C</th>
                        <th>D</th>
                        <th>E</th>
                        <th>F</th>
                        <th>G</th>
                        <th>H</th>
                    </tr>
                </thead>
                <tbody>
                    ${ranges.map(range => `
                        <tr>
                            <td>${esc(formatTraceRange(range))}</td>
                            <td>${fmt(range.A, 6)}</td>
                            <td>${fmt(range.B, 6)}</td>
                            <td>${fmt(range.C, 6)}</td>
                            <td>${fmt(range.D, 6)}</td>
                            <td>${fmt(range.E, 6)}</td>
                            <td>${Number.isFinite(range.F) ? fmt(range.F, 6) : "—"}</td>
                            <td>${Number.isFinite(range.G) ? fmt(range.G, 6) : "—"}</td>
                            <td>${Number.isFinite(range.H) ? fmt(range.H, 6) : "—"}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
    }

const TRACE_BIBLIOGRAPHY = {
        nist: {
            key: "NIST",
            title: "NIST Chemistry WebBook — SRD 69",
            citation: "Linstrom, P. J.; Mallard, W. G. (Eds.). NIST Chemistry WebBook, NIST Standard Reference Database Number 69. National Institute of Standards and Technology, Gaithersburg, MD. Última atualização dos dados: 2025.",
            href: "https://doi.org/10.18434/T4D303",
            linkLabel: "DOI 10.18434/T4D303"
        },
        iso6976: {
            key: "ISO 6976",
            title: "ISO 6976:2016",
            citation: "International Organization for Standardization (ISO). ISO 6976:2016 — Natural gas — Calculation of calorific values, density, relative density and Wobbe indices from composition. 3ª edição, publicada em agosto de 2016; confirmada em 2022 e vigente.",
            href: "https://www.iso.org/standard/55842.html",
            linkLabel: "Página oficial da ISO 6976:2016"
        },
        joback: {
            key: "Joback–Reid",
            title: "Método de Joback–Reid",
            citation: "Joback, K. G.; Reid, R. C. Estimation of Pure-Component Properties from Group-Contributions. Chemical Engineering Communications, v. 57, n. 1–6, p. 233–243, 1987.",
            href: "https://doi.org/10.1080/00986448708960487",
            linkLabel: "DOI 10.1080/00986448708960487"
        }
    };

export function traceBibliographyForGas(gas) {
        const references = [];
        const energySource = String(gas?.fontePcsPci || "")
            .toLowerCase();
        const cpSource = String(gas?.cpShomate?.fonte || "")
            .toLowerCase();
        const cpMethod = String(gas?.cpShomate?.metodo || "")
            .toLowerCase();
        const sourceText = `${energySource} ${cpSource} ${cpMethod}`;
        if (sourceText.includes("nist")) {
            references.push(TRACE_BIBLIOGRAPHY.nist);
        }
        if (energySource.includes("iso 6976")
            ||
                energySource.includes("iso6976")) {
            references.push(TRACE_BIBLIOGRAPHY.iso6976);
        }
        if (sourceText.includes("joback")
            ||
                sourceText.includes("reid")) {
            references.push(TRACE_BIBLIOGRAPHY.joback);
        }
        return references;
    }

export function renderTraceBibliography(gas) {
        const references = traceBibliographyForGas(gas);
        if (!references.length) {
            return `
            <section class="trace-section trace-section-wide trace-bibliography">
                <div class="trace-section-heading">
                    <h3>Referências bibliográficas</h3>
                </div>
                <p class="trace-empty">
                    Nenhuma referência NIST, ISO 6976 ou Joback–Reid está associada aos dados deste componente no banco atual.
                </p>
            </section>
        `;
        }
        return `
        <section class="trace-section trace-section-wide trace-bibliography">
            <div class="trace-section-heading">
                <h3>Referências bibliográficas</h3>
            </div>

            <ol class="trace-reference-list">
                ${references.map(reference => `
                    <li>
                        <strong>${esc(reference.title)}</strong>
                        <p>${esc(reference.citation)}</p>
                        <a
                            href="${esc(reference.href)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${esc(reference.linkLabel)}
                            <span aria-hidden="true">↗</span>
                        </a>
                    </li>
                `).join("")}
            </ol>
        </section>
    `;
    }

export function jmolUrlForGas(gas) {
        const model = String(gas?.smiles || "")
            .trim();
        if (!model) {
            return "";
        }
        return `https://chemapps.stolaf.edu/jmol/jmol.php?model=${encodeURIComponent(model)}`;
    }

export function jmolEmbeddedUrlForGas(gas) {
        const model = String(gas?.smiles || "")
            .trim();
        if (!model) {
            return "";
        }
        // Não apontamos o iframe diretamente para chemapps.stolaf.edu,
        // pois o servidor pode recusar enquadramento por outro domínio.
        // Em vez disso, carregamos uma página local do próprio site; ela
        // usa o modo oficial &inline do Jmol por <script>.
        return `jmol-viewer.html?model=${encodeURIComponent(model)}`;
    }

export function openComponentTrace(gasId) {
        const gas = C.getGas(gasId);
        if (!gas
            ||
                !els.traceDialog
            ||
                !els.traceBody) {
            return;
        }
        const energyStatus = traceStatusFromSource(gas.fontePcsPci);
        const cpStatus = traceStatusFromSource(gas.cpShomate?.fonte, gas.cpShomate?.estimado);
        const tempK = currentFuelTemperatureK();
        const cpAtT = Number.isFinite(tempK)
            ?
                C.cpMass(gas, tempK)
            :
                null;
        const ranges = gas.cpShomate?.faixas
            ||
                [];
        const atomos = gas.atomos
            ||
                {};
        const jmolUrl = jmolUrlForGas(gas);
        const jmolEmbeddedUrl = jmolEmbeddedUrlForGas(gas);
        const methodLabel = gas.cpShomate?.metodo === "NIST_SHOMATE"
            ?
                "Shomate — coeficientes NIST"
            :
                gas.cpShomate?.metodo === "JOBACK_SHOMATE"
                    ?
                        "Joback–Reid convertido para Shomate"
                    :
                        gas.cpShomate?.metodo
                            ||
                                "—";
        els.traceBody.innerHTML = `
        <div class="trace-identity">
            <div>
                <strong class="trace-formula">${esc(gas.formula)}</strong>
                <h3>${esc(gas.nome)}</h3>
                <span class="trace-id">ID: ${esc(gas.id)}</span>
            </div>

            ${jmolEmbeddedUrl ? `
                <button
                    type="button"
                    class="trace-jmol-toggle"
                    aria-expanded="false"
                    aria-controls="traceJmolPanel"
                    data-jmol-src="${esc(jmolEmbeddedUrl)}"
                    title="Exibir o modelo molecular 3D dentro desta ficha técnica"
                >
                    <span class="trace-jmol-icon" aria-hidden="true">3D</span>
                    <span class="trace-jmol-toggle-label">Visualizar 3D</span>
                    <span class="trace-jmol-chevron" aria-hidden="true">⌄</span>
                </button>
            ` : ""}
        </div>

        ${jmolEmbeddedUrl ? `
            <section
                id="traceJmolPanel"
                class="trace-jmol-panel"
                aria-label="Modelo molecular 3D interativo"
                hidden
            >
                <div class="trace-jmol-panel-header">
                    <div>
                        <strong>Modelo molecular 3D</strong>
                        <span>Jmol/JSmol · estrutura gerada a partir do SMILES</span>
                    </div>

                    <a
                        class="trace-jmol-open-external"
                        href="${esc(jmolUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Abrir em nova aba
                        <span aria-hidden="true">↗</span>
                    </a>
                </div>

                <div class="trace-jmol-viewer">
                    <div class="trace-jmol-loading" role="status">
                        Carregando visualizador 3D…
                    </div>
                    <iframe
                        class="trace-jmol-frame"
                        title="Modelo 3D interativo de ${esc(gas.nome)}"
                        data-src="${esc(jmolEmbeddedUrl)}"
                        loading="lazy"
                        allow="fullscreen"
                    ></iframe>
                </div>

                <p class="trace-jmol-help">
                    Arraste para girar a molécula e use a roda do mouse ou gesto de pinça para aplicar zoom.
                    O visualizador é carregado pelo modo inline oficial do Jmol e requer conexão com a internet.
                    Se ele não carregar, use “Abrir em nova aba”.
                </p>
            </section>
        ` : ""}

        <div class="trace-grid">
            <section class="trace-section">
                <div class="trace-section-heading">
                    <h3>Propriedades básicas</h3>
                </div>

                <dl class="trace-dl">
                    <div>
                        <dt>Massa molar</dt>
                        <dd>${fmt(gas.massaMolar, 6)} kg/kmol</dd>
                    </div>
                    <div>
                        <dt>Composição atômica</dt>
                        <dd>C=${esc(atomos.C ?? 0)} · H=${esc(atomos.H ?? 0)} · N=${esc(atomos.N ?? 0)} · O=${esc(atomos.O ?? 0)} · S=${esc(atomos.S ?? 0)}</dd>
                    </div>
                    ${gas.smiles ? `
                        <div>
                            <dt>SMILES</dt>
                            <dd><code>${esc(gas.smiles)}</code></dd>
                        </div>
                    ` : ""}
                    <div>
                        <dt>Fonte da massa molar</dt>
                        <dd>Não individualizada no banco atual.</dd>
                    </div>
                </dl>
            </section>

            <section class="trace-section">
                <div class="trace-section-heading">
                    <h3>PCS / PCI</h3>
                    ${traceBadge(energyStatus)}
                </div>

                <dl class="trace-dl">
                    <div>
                        <dt>PCS</dt>
                        <dd>${fmt(gas.pcs, 6)} MJ/kg</dd>
                    </div>
                    <div>
                        <dt>PCI</dt>
                        <dd>${fmt(gas.pci, 6)} MJ/kg</dd>
                    </div>
                    <div>
                        <dt>Fonte / método declarado</dt>
                        <dd>${esc(gas.fontePcsPci || "Não informado")}</dd>
                    </div>
                </dl>
            </section>

            <section class="trace-section trace-section-wide">
                <div class="trace-section-heading">
                    <h3>Calor específico Cp(T)</h3>
                    ${traceBadge(cpStatus)}
                </div>

                <dl class="trace-dl trace-dl-two">
                    <div>
                        <dt>Método</dt>
                        <dd>${esc(methodLabel)}</dd>
                    </div>
                    <div>
                        <dt>Fonte</dt>
                        <dd>${esc(gas.cpShomate?.fonte || "Não informada")}</dd>
                    </div>
                    <div>
                        <dt>Faixa(s) declarada(s)</dt>
                        <dd>${ranges.length ? ranges.map(formatTraceRange).map(esc).join("<br>") : "—"}</dd>
                    </div>
                    <div>
                        <dt>Cp na temperatura atual do combustível</dt>
                        <dd>
                            ${cpAtT ? `${fmt(cpAtT.value, 6)} kJ/(kg·K) a ${fmt(tempK, 2)} K` : "—"}
                            ${cpAtT?.extrapolated ? `<span class="trace-inline-warning">Extrapolado fora da faixa declarada</span>` : ""}
                        </dd>
                    </div>
                </dl>

                <details class="trace-coefficients">
                    <summary>Ver coeficientes da equação de Shomate</summary>
                    <p>
                        Cp° = A + B·t + C·t² + D·t³ + E/t², com t = T/1000.
                    </p>
                    ${renderTraceCoefficients(gas)}
                </details>
            </section>

            ${renderTraceBibliography(gas)}
        </div>

        <div class="trace-note">
            <strong>Critério de rastreabilidade:</strong>
            valores de Cp com <code>estimado: true</code> são identificados como estimados;
            coeficientes NIST são identificados como referência. Para PCS/PCI, a classificação
            usa o método/fonte declarado no próprio banco. O banco atual não possui um campo
            específico que identifique um valor como “medido”, portanto essa classificação não é atribuída sem metadado explícito.
        </div>
    `;
        if (typeof els.traceDialog.showModal === "function") {
            els.traceDialog.showModal();
        }
        else {
            els.traceDialog.setAttribute("open", "");
        }
    }

export function closeComponentTrace() {
        if (!els.traceDialog) {
            return;
        }
        const jmolFrame = els.traceBody
            ?.querySelector(".trace-jmol-frame");
        if (jmolFrame?.getAttribute("src")) {
            // Encerra o JSmol ao fechar a ficha; uma nova abertura cria
            // um visualizador limpo e evita processamento oculto.
            jmolFrame.setAttribute("src", "about:blank");
        }
        if (typeof els.traceDialog.close === "function"
            &&
                els.traceDialog.open) {
            els.traceDialog.close();
        }
        else {
            els.traceDialog.removeAttribute("open");
        }
    }
