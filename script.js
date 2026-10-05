"use strict";


(() => {


const C =
    window.Combustion;


const E =
    window.EmissionEstimator;


const BUILTIN =
    window.COMBUSTION_PRESETS || {};


const VERSION =
    "0.7.1";


const CUSTOM_PRESET_KEY =
    "lbe_combustion_custom_presets_v05";


const CASE_KEY =
    "lbe_combustion_cases_v05";


let last =
    null;


let blendSolution =
    null;


let emissionEstimate =
    null;


let loading =
    false;


let resizeTimer =
    null;



const $ = s =>
    document.querySelector(s);


const $$ = s =>
    [
        ...document.querySelectorAll(s)
    ];



const fmt = (
    n,
    d = 2
) =>

    Number.isFinite(n)

        ?

        n.toLocaleString(

            "pt-BR",

            {

                minimumFractionDigits:
                    d,

                maximumFractionDigits:
                    d

            }

        )

        :

        "—";



const num = s =>

    Number(
        $(s)?.value
    );



const esc = v =>

    String(
        v ?? ""
    )
    .replace(

        /[&<>"']/g,

        ch => ({

            "&":
                "&amp;",

            "<":
                "&lt;",

            ">":
                "&gt;",

            "\"":
                "&quot;",

            "'":
                "&#39;"

        })[ch]

    );



const els = {

    body:
        $("#corpoMistura"),

    preset:
        $("#presetCombustivel"),

    search:
        $("#componentSearch"),

    total:
        $("#totalComposicao"),

    bar:
        $("#barraComposicao"),

    status:
        $("#statusComposicao"),

    error:
        $("#mensagemErro"),

    flowType:
        $("#tipoVazao"),

    flow:
        $("#vazaoEntrada"),

    flowLabel:
        $("#labelVazaoEntrada"),

    flowUnit:
        $("#unidadeVazao"),

    flowHelp:
        $("#ajudaVazao"),

    o2:
        $("#o2Comburente"),

    n2:
        $("#n2Comburente"),

    excess:
        $("#excessoAr"),

    measuredO2:
        $("#o2Medido"),

    lambdaPreview:
        $("#lambdaPreview"),

    warnings:
        $("#warningsList"),

    productBody:
        $("#corpoProdutos"),

    mixtureDetail:
        $("#mixtureDetailBody"),

    elementBody:
        $("#elementBalanceBody"),

    /*
    savedCases:
        $("#savedCases"),
    */

    traceDialog:
        $("#componentTraceDialog"),

    traceBody:
        $("#componentTraceBody")

};



/* =========================================================
   LOCALSTORAGE
========================================================= */

function readJSON(
    key,
    fallback = []
) {


    try {


        return JSON.parse(

            localStorage.getItem(
                key
            )

            ||

            JSON.stringify(
                fallback
            )

        );

    }

    catch {


        return fallback;

    }

}



function writeJSON(
    key,
    value
) {


    localStorage.setItem(

        key,

        JSON.stringify(
            value
        )

    );

}



/* =========================================================
   CATEGORIAS
========================================================= */

function category(
    gas
) {


    if (

        [
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
        .includes(
            gas.id
        )

    ) {

        return "Gases inorgânicos";

    }



    const name =

        (
            gas.nome

            ||

            ""
        )
        .toLowerCase();



    if (

        name.includes(
            "benzen"
        )

        ||

        name.includes(
            "tolu"
        )

        ||

        name.includes(
            "cumeno"
        )

    ) {

        return "Aromáticos";

    }



    if (
        name.includes(
            "ciclo"
        )
    ) {

        return "Cíclicos";

    }



    if (
        /eno|butadieno|propadieno/i
            .test(
                name
            )
    ) {

        return "Alcenos / dienos";

    }



    if (
        /ino|acetileno|propino/i
            .test(
                name
            )
    ) {

        return "Alcinos";

    }



    return "Alcanos e outros hidrocarbonetos";

}



/* =========================================================
   SELECT DOS COMPONENTES
========================================================= */

function selectedIds(
    except = null
) {


    return $$(".component-select")

        .filter(

            s =>
                s !== except
                &&
                s.value

        )

        .map(

            s =>
                s.value

        );

}



function gasOptions(
    current = "",
    query = "",
    selectRef = null
) {


    const q =

        query
            .trim()
            .toLowerCase();



    const used =

        selectedIds(
            selectRef
        );



    const groups =
        {};



    for (
        const gas
        of window.GAS_DATABASE
    ) {


        const text =

            `${gas.nome} ${gas.formula} ${gas.id}`
                .toLowerCase();



        if (

            q

            &&

            !text.includes(
                q
            )

            &&

            gas.id !== current

        ) {

            continue;

        }



        (
            groups[
                category(gas)
            ]

            ||=

            []
        )
        .push(
            gas
        );

    }



    let html =

        `<option value="">Selecione...</option>`;



    for (
        const [
            group,
            items
        ]
        of Object.entries(
            groups
        )
    ) {


        html +=

            `<optgroup label="${esc(group)}">`;



        for (
            const gas
            of items
        ) {


            const disabled =

                used.includes(
                    gas.id
                )

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



function refreshComponentSelects() {


    const q =
        els.search.value;



    $$(".component-select")
        .forEach(

            select => {


                const current =
                    select.value;



                select.innerHTML =

                    gasOptions(

                        current,

                        q,

                        select

                    );



                select.value =
                    current;

            }

        );

}



/* =========================================================
   RASTREABILIDADE DOS COMPONENTES
========================================================= */

function traceStatusFromSource(
    source,
    explicitEstimated = null
) {

    if (
        explicitEstimated === true
    ) {
        return {
            label: "Estimado",
            className: "estimated"
        };
    }

    if (
        explicitEstimated === false
    ) {
        return {
            label: "Referência",
            className: "reference"
        };
    }

    const text =
        String(source || "")
            .toLowerCase();

    if (
        /estimativa|analogia|channiwala|joback/.test(text)
    ) {
        return {
            label: "Estimado",
            className: "estimated"
        };
    }

    if (
        /nist|iso/.test(text)
    ) {
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


function traceBadge(status) {

    return `
        <span class="trace-badge ${esc(status.className)}">
            ${esc(status.label)}
        </span>
    `;
}


function componentFormulaCell(gas) {

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


function updateComponentFormulaCell(
    tr,
    gas
) {

    const cell =
        tr.querySelector(
            ".formula-cell"
        );

    if (
        cell
    ) {
        cell.innerHTML =
            componentFormulaCell(gas);
    }
}


function currentFuelTemperatureK() {

    const value =
        num("#temperatura");

    const unit =
        $("#unidadeTemperatura")?.value
        ||
        "C";

    return C.tempToK(
        value,
        unit
    );
}


function formatTraceRange(range) {

    if (
        !range
    ) {
        return "—";
    }

    return `${fmt(range.Tmin, 2)} a ${fmt(range.Tmax, 2)} K`;
}


function renderTraceCoefficients(gas) {

    const ranges =
        gas.cpShomate?.faixas
        ||
        [];

    if (
        !ranges.length
    ) {
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


function traceBibliographyForGas(gas) {

    const references = [];

    const energySource =
        String(gas?.fontePcsPci || "")
            .toLowerCase();

    const cpSource =
        String(gas?.cpShomate?.fonte || "")
            .toLowerCase();

    const cpMethod =
        String(gas?.cpShomate?.metodo || "")
            .toLowerCase();

    const sourceText =
        `${energySource} ${cpSource} ${cpMethod}`;

    if (
        sourceText.includes("nist")
    ) {
        references.push(
            TRACE_BIBLIOGRAPHY.nist
        );
    }

    if (
        energySource.includes("iso 6976")
        ||
        energySource.includes("iso6976")
    ) {
        references.push(
            TRACE_BIBLIOGRAPHY.iso6976
        );
    }

    if (
        sourceText.includes("joback")
        ||
        sourceText.includes("reid")
    ) {
        references.push(
            TRACE_BIBLIOGRAPHY.joback
        );
    }

    return references;
}


function renderTraceBibliography(gas) {

    const references =
        traceBibliographyForGas(gas);

    if (
        !references.length
    ) {
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


function openComponentTrace(gasId) {

    const gas =
        C.getGas(gasId);

    if (
        !gas
        ||
        !els.traceDialog
        ||
        !els.traceBody
    ) {
        return;
    }

    const energyStatus =
        traceStatusFromSource(
            gas.fontePcsPci
        );

    const cpStatus =
        traceStatusFromSource(
            gas.cpShomate?.fonte,
            gas.cpShomate?.estimado
        );

    const tempK =
        currentFuelTemperatureK();

    const cpAtT =
        Number.isFinite(tempK)

            ?

            C.cpMass(
                gas,
                tempK
            )

            :

            null;

    const ranges =
        gas.cpShomate?.faixas
        ||
        [];

    const atomos =
        gas.atomos
        ||
        {};

    const methodLabel =
        gas.cpShomate?.metodo === "NIST_SHOMATE"

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
        </div>

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

    if (
        typeof els.traceDialog.showModal === "function"
    ) {
        els.traceDialog.showModal();
    }
    else {
        els.traceDialog.setAttribute(
            "open",
            ""
        );
    }
}


function closeComponentTrace() {

    if (
        !els.traceDialog
    ) {
        return;
    }

    if (
        typeof els.traceDialog.close === "function"
        &&
        els.traceDialog.open
    ) {
        els.traceDialog.close();
    }
    else {
        els.traceDialog.removeAttribute(
            "open"
        );
    }
}


/* =========================================================
   LINHAS DA MISTURA
========================================================= */

function addRow(
    id = "",
    percentage = ""
) {


    const tr =

        document.createElement(
            "tr"
        );



    const gas =

        id

            ?

            C.getGas(id)

            :

            null;



    tr.innerHTML = `

        <td>

            <select class="component-select">

                ${gasOptions(
                    id,
                    els.search.value
                )}

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



    els.body.appendChild(
        tr
    );


    refreshComponentSelects();

    updateCompositionBar();

}



function rows() {


    return $$("#corpoMistura tr")
        .map(

            tr => {


                const id =

                    tr.querySelector(
                        ".component-select"
                    ).value;



                const raw =

                    tr.querySelector(
                        ".component-percent"
                    ).value;



                return {

                    id,

                    gas:

                        id

                            ?

                            C.getGas(id)

                            :

                            null,

                    percentual:

                        raw === ""

                            ?

                            0

                            :

                            Number(raw)

                };

            }

        );

}



/* =========================================================
   NORMALIZAÇÃO DA COMPOSIÇÃO
========================================================= */

function normalizeCompositionFractions() {


    const informed =

        $$("#corpoMistura .component-percent")
        .map(

            (input, index) => ({

                input,
                index,
                value: Number(input.value)

            })

        )
        .filter(

            item =>
                item.input.value.trim() !== ""
                && Number.isFinite(item.value)
                && item.value > 0

        );


    const total =

        informed.reduce(

            (sum, item) =>
                sum + item.value,

            0

        );


    if (
        !Number.isFinite(total)
        || total <= 0
    ) {

        showError(
            "Informe pelo menos uma fração maior que zero para normalizar."
        );

        return;

    }


    /*
       A normalização é feita em centésimos de %, usando o método
       dos maiores restos. Assim, o resultado fecha exatamente em
       100,00 % mesmo após o arredondamento para duas casas decimais.
    */
    const normalized =

        informed.map(

            item => {

                const exactHundredths =
                    item.value / total * 10000;

                const hundredths =
                    Math.floor(exactHundredths);

                return {

                    ...item,
                    exactHundredths,
                    hundredths,
                    remainder:
                        exactHundredths - hundredths

                };

            }

        );


    let missingHundredths =

        10000
        -
        normalized.reduce(

            (sum, item) =>
                sum + item.hundredths,

            0

        );


    normalized
        .slice()
        .sort(

            (a, b) =>
                (b.remainder - a.remainder)
                ||
                (a.index - b.index)

        )
        .forEach(

            item => {

                if (missingHundredths > 0) {

                    item.hundredths += 1;
                    missingHundredths -= 1;

                }

            }

        );


    normalized.forEach(

        item => {

            item.input.value =
                (item.hundredths / 100).toFixed(2);

        }

    );


    hideError();


    refreshPresetSelect(
        "manual"
    );


    updateCompositionBar();

}



/* =========================================================
   BARRA DE COMPOSIÇÃO
========================================================= */

function updateCompositionBar() {


    const total =

        rows().reduce(

            (s, i) =>

                s

                +

                (
                    Number.isFinite(
                        i.percentual
                    )

                        ?

                        i.percentual

                        :

                        0
                ),

            0

        );



    els.total.textContent =

        `${fmt(total, 2)} %`;



    els.bar.style.width =

        `${Math.min(
            Math.max(
                total,
                0
            ),
            100
        )}%`;



    els.bar.className =
        "";



    if (

        Math.abs(
            total - 100
        )

        <=

        C.CONFIG.tol

    ) {


        els.bar.classList.add(
            "ok"
        );


        els.status.textContent =
            "✓ Composição válida.";


        return true;

    }



    if (
        total > 100
    ) {


        els.bar.classList.add(
            "error"
        );


        els.status.textContent =

            `Excede 100 % em ${fmt(
                total - 100,
                2
            )} %.`;

    }

    else {


        els.status.textContent =

            `Faltam ${fmt(
                100 - total,
                2
            )} %.`;

    }



    return false;

}



/* =========================================================
   PRESETS PRÓPRIOS
========================================================= */

function customPresets() {


    return readJSON(

        CUSTOM_PRESET_KEY,

        []

    );

}



function refreshPresetSelect(
    selected = null
) {


    const current =

        selected

        ??

        els.preset.value;



    let html =

        `<option value="manual">Composição manual</option>`;



    html +=

        `<optgroup label="Presets do programa">`;



    for (
        const [
            key,
            p
        ]
        of Object.entries(
            BUILTIN
        )
    ) {


        html += `

            <option value="builtin:${key}">

                ${esc(p.nome)}

            </option>

        `;

    }



    html +=
        `</optgroup>`;


    /*
    const customs =
        customPresets();



    if (
        customs.length
    ) {


        html +=

            `<optgroup label="Meus presets">`;



        customs.forEach(

            p =>

                html += `

                    <option value="custom:${esc(p.id)}">

                        ${esc(p.nome)}

                    </option>

                `

        );



        html +=
            `</optgroup>`;

    }
    */


    els.preset.innerHTML =
        html;



    if (

        [
            ...els.preset.options
        ]
        .some(
            o =>
                o.value === current
        )

    ) {

        els.preset.value =
            current;

    }

    else {

        els.preset.value =
            "manual";

    }



    /*
    $("#btnDeletePreset").disabled =

    !els.preset.value
        .startsWith(
            "custom:"
        );
*/

}



function presetObject(
    value
) {


    if (
        value.startsWith(
            "builtin:"
        )
    ) {


        return BUILTIN[

            value.split(":")[1]

        ];

    }



    /*
    if (
        value.startsWith(
            "custom:"
        )
    ) {

        return customPresets()
            .find(

                p =>
                    p.id

                    ===

                    value.split(":")[1]

            );

    }
    */



    return null;

}



function loadPreset(
    value
) {


    const p =

        presetObject(
            value
        );



    /*
$("#btnDeletePreset").disabled =

    !value.startsWith(
        "custom:"
    );
*/



    if (
        !p
    ) {

        return;

    }



    loading =
        true;


    els.body.innerHTML =
        "";



    $(
        'input[name="baseComposicao"][value="molar"]'
    ).checked =
        true;



    p.componentes.forEach(

        i =>

            addRow(

                i.id,

                i.percentual

            )

    );



    loading =
        false;


    updateCompositionBar();

}



function currentComposition() {


    if (
        !updateCompositionBar()
    ) {

        throw new Error(

            "A composição deve totalizar 100 %."

        );

    }



    const r =
        rows();



    if (

        r.some(

            i =>
                !i.gas
                &&
                i.percentual > 0

        )

    ) {

        throw new Error(

            "Existe percentual informado sem componente selecionado."

        );

    }



    const ids =

        r

        .filter(

            i =>
                i.gas
                &&
                i.percentual > 0

        )

        .map(
            i =>
                i.id
        );



    if (
        !ids.length
    ) {

        throw new Error(

            "Selecione pelo menos um componente."

        );

    }



    if (
        new Set(ids).size

        !==

        ids.length
    ) {

        throw new Error(

            "Há componentes duplicados na mistura."

        );

    }



    const base =

        $(
            'input[name="baseComposicao"]:checked'
        ).value;



    return C.compositionToYW(

        r,

        base

    );

}



function saveCustomPreset() {


    try {


        const comp =

            currentComposition();



        const name =

            prompt(

                "Nome do novo preset:",

                "Minha mistura"

            );



        if (
            !name
        ) {

            return;

        }



        const presets =

            customPresets();



        const id =

            `${Date.now()}`;



        presets.push({

            id,

            nome:
                name,

            observacao:
                "Preset criado pelo usuário em base molar.",

            componentes:

                comp.map(

                    i => ({

                        id:
                            i.gas.id,

                        percentual:
                            i.y * 100

                    })

                )

        });



        writeJSON(

            CUSTOM_PRESET_KEY,

            presets

        );



        refreshPresetSelect(

            `custom:${id}`

        );

    }

    catch (
        e
    ) {

        showError(
            e.message
        );

    }

}



function deleteCustomPreset() {


    const value =
        els.preset.value;



    if (
        !value.startsWith(
            "custom:"
        )
    ) {

        return;

    }



    const id =

        value.split(":")[1];



    const preset =

        customPresets()
        .find(

            p =>
                p.id === id

        );



    if (

        !preset

        ||

        !confirm(

            `Excluir o preset "${preset.nome}"?`

        )

    ) {

        return;

    }



    writeJSON(

        CUSTOM_PRESET_KEY,

        customPresets()
            .filter(
                p =>
                    p.id !== id
            )

    );



    refreshPresetSelect(
        "manual"
    );

}



/* =========================================================
   MODOS
========================================================= */

function inputMode() {


    return $(

        'input[name="modoEntrada"]:checked'

    ).value;

}



function combustionMode() {


    return $(

        'input[name="modoCombustao"]:checked'

    ).value;

}



function updateInputModeUI() {


    const power =

        inputMode()

        ===

        "potencia";



    $("#flowInputBlock")
        .classList
        .toggle(

            "hidden",

            power

        );



    $("#powerInputBlock")
        .classList
        .toggle(

            "hidden",

            !power

        );

}



/* =========================================================
   INTERFACE VAZÃO
========================================================= */

function updateFlowUI() {


    const map = {

        massica: [

            "Vazão mássica",

            "kg/h",

            "Vazão mássica do combustível."

        ],

        volumetrica: [

            "Vazão volumétrica real",

            "m³/h",

            "Nas condições de temperatura e pressão do combustível."

        ],

        normal: [

            "Vazão volumétrica normal",

            "Nm³/h",

            "Referência: 0 °C e 101,325 kPa."

        ]

    };



    const v =

        map[
            els.flowType.value
        ];



    els.flowLabel.textContent =
        v[0];


    els.flowUnit.textContent =
        v[1];


    els.flowHelp.textContent =
        v[2];

}



/* =========================================================
   COMBURENTE
========================================================= */

function updateN2() {


    const o2 =

        Number(
            els.o2.value
        );



    els.n2.value =

        Number.isFinite(o2)

            ?

            Math.max(

                0,

                100 - o2

            ).toFixed(2)

            :

            "";



    updateHumidityPreview();

}



function humiditySettings() {


    const enabled =

        $("#usarUmidadeAr").checked;



    const tempK =

        C.tempToK(

            num(
                "#temperaturaComburente"
            ),

            $("#unidadeTemperaturaComburente").value

        );



    const pressureKPa =

        C.pressureToKPa(

            num(
                "#pressaoComburente"
            ),

            $("#unidadePressaoComburente").value

        );



    return {

        enabled,

        rhPct:

            num(
                "#umidadeRelativa"
            ),

        tempK,

        pressureKPa

    };

}



function updateHumidityUI() {


    $("#humidityFields")
        .classList
        .toggle(

            "hidden",

            !$("#usarUmidadeAr").checked

        );



    updateHumidityPreview();

}



function updateHumidityPreview() {


    try {


        const h =

            humiditySettings();



        const wet =

            C.humidOxidizerComposition({

                dryO2Pct:

                    Number(
                        els.o2.value
                    ),

                rhPct:
                    h.rhPct,

                tempK:
                    h.tempK,

                pressureKPa:
                    h.pressureKPa,

                humidityEnabled:
                    h.enabled

            });



        $("#previewH2OAir").textContent =

            h.enabled

                ?

                `${fmt(
                    wet.xH2O * 100,
                    3
                )} % mol`

                :

                "0,000 % mol";

    }

    catch {


        $("#previewH2OAir").textContent =
            "—";

    }

}



function updateCombustionModeUI() {


    const measured =

        combustionMode()

        ===

        "o2medido";



    $("#fieldExcesso")
        .classList
        .toggle(

            "hidden",

            measured

        );



    $("#fieldO2Medido")
        .classList
        .toggle(

            "hidden",

            !measured

        );



    updateLambdaPreview();

}



function updateLambdaPreview() {


    if (
        combustionMode()
        ===
        "o2medido"
    ) {


        els.lambdaPreview.textContent =
            "λ = calculado pelo O₂ seco";


        return;

    }



    els.lambdaPreview.textContent =

        `λ = ${fmt(

            1

            +

            Number(
                els.excess.value

                ||

                0
            )

            /

            100,

            3

        )}`;

}



/* =========================================================
   ERROS
========================================================= */

function showError(
    msg
) {


    els.error.textContent =
        msg;


    els.error.classList.remove(
        "hidden"
    );

}



function hideError() {


    els.error.classList.add(
        "hidden"
    );

}



/* =========================================================
   OPÇÕES NUMÉRICAS
========================================================= */

function collectOptions() {


    const fuelT =

        C.tempToK(

            num(
                "#temperatura"
            ),

            $("#unidadeTemperatura").value

        );



    const fuelP =

        C.pressureToKPa(

            num(
                "#pressao"
            ),

            $("#unidadePressao").value

        );



    const stackT =

        C.tempToK(

            num(
                "#temperaturaProdutos"
            ),

            $("#unidadeTemperaturaProdutos").value

        );



    const stackP =

        C.pressureToKPa(

            num(
                "#pressaoProdutos"
            ),

            $("#unidadePressaoProdutos").value

        );



    const humidity =

        humiditySettings();



    const dryO2Pct =

        Number(
            els.o2.value
        );



    if (

        !(fuelT > 0)

        ||

        !(fuelP > 0)

        ||

        !(stackT > 0)

        ||

        !(stackP > 0)

    ) {

        throw new Error(

            "Temperaturas e pressões devem ser fisicamente válidas."

        );

    }



    if (

        !(
            dryO2Pct > 0

            &&

            dryO2Pct <= 100
        )

    ) {

        throw new Error(

            "O₂ seco do comburente deve estar entre 0 e 100 %."

        );

    }



    if (

        humidity.enabled

        &&

        (
            !(humidity.tempK > 0)

            ||

            !(humidity.pressureKPa > 0)

            ||

            humidity.rhPct < 0

            ||

            humidity.rhPct > 100
        )

    ) {

        throw new Error(

            "Verifique temperatura, pressão e umidade relativa do comburente."

        );

    }



    const opts = {

        fuelT,

        fuelP,

        stackT,

        stackP,

        humidity,

        dryO2Pct,

        inputMode:
            inputMode(),

        flowType:
            els.flowType.value,

        flowValue:

            Number(
                els.flow.value
            ),

        targetPowerKW:

            C.powerToKW(

                num(
                    "#potenciaDesejada"
                ),

                $("#unidadePotenciaDesejada").value

            ),

        combustionMode:
            combustionMode(),

        excessPct:

            Number(
                els.excess.value
            ),

        measuredO2:

            Number(
                els.measuredO2.value
            )

    };



    if (

        opts.inputMode === "vazao"

        &&

        !(opts.flowValue > 0)

    ) {

        throw new Error(

            "Informe uma vazão positiva."

        );

    }



    if (

        opts.inputMode === "potencia"

        &&

        !(opts.targetPowerKW > 0)

    ) {

        throw new Error(

            "Informe uma potência desejada positiva."

        );

    }



    if (

        opts.combustionMode === "excesso"

        &&

        !(opts.excessPct >= 0)

    ) {

        throw new Error(

            "Excesso de comburente inválido."

        );

    }



    return opts;

}



/* =========================================================
   MOTOR ÚNICO DE CÁLCULO
========================================================= */

function computeCase(
    comp,
    opts,
    presetName = null
) {


    const M =

        C.mixtureMolarMass(
            comp
        );



    const pcs =

        C.mixtureHHV(
            comp
        );



    const pci =

        C.mixtureLHV(
            comp
        );



    const cpR =

        C.mixtureCp(

            comp,

            opts.fuelT

        );



    const rho =

        C.idealDensity(

            M,

            opts.fuelT,

            opts.fuelP

        );



    const rhoN =

        C.normalDensity(
            M
        );



    const flows =

        opts.inputMode === "potencia"

            ?

            C.flowsFromPower(

                opts.targetPowerKW,

                pci,

                rho,

                rhoN

            )

            :

            C.flowsFromInput(

                opts.flowType,

                opts.flowValue,

                rho,

                rhoN

            );



    const fuelMolar =

        flows.mass

        /

        M;



    const powerKW =

        flows.mass

        *

        pci

        /

        3.6;



    const atoms =

        C.atomsOfMixture(
            comp
        );



    const o2Per =

        C.stoichO2PerKmol(
            atoms
        );



    if (
        !(o2Per > 0)
    ) {

        throw new Error(

            "A mistura não apresenta demanda positiva de O₂ no modelo atual."

        );

    }



    let lambda;



    if (
        opts.combustionMode
        ===
        "o2medido"
    ) {


        lambda =

            C.lambdaFromMeasuredO2({

                atoms,

                fuelMolarFlow:
                    fuelMolar,

                fuelMassFlow:
                    flows.mass,

                o2StoichPerKmol:
                    o2Per,

                dryO2Pct:
                    opts.dryO2Pct,

                measuredO2DryPct:
                    opts.measuredO2,

                humidity:
                    opts.humidity

            });

    }

    else {


        lambda =

            1

            +

            opts.excessPct

            /

            100;

    }



    const oxid =

        C.oxidizer({

            fuelMolarFlow:
                fuelMolar,

            fuelMassFlow:
                flows.mass,

            o2StoichPerKmol:
                o2Per,

            dryO2Pct:
                opts.dryO2Pct,

            lambda,

            humidity:
                opts.humidity

        });



    const products =

        C.combustionProducts({

            atoms,

            fuelMolarFlow:
                fuelMolar,

            oxid

        });



    const dry =

        C.dryAnalysis(
            products
        );



    const massBal =

        C.massBalance({

            fuelMassFlow:
                flows.mass,

            oxidMassFlow:
                oxid.oxidRealMass,

            products

        });



    const elemBal =

        C.elementalBalance({

            comp,

            fuelMolarFlow:
                fuelMolar,

            oxid,

            products

        });



    const tad =

        C.adiabaticFlameTemperature({

            comp,

            fuelMolarFlow:
                fuelMolar,

            fuelMassFlow:
                flows.mass,

            pci,

            oxid,

            products,

            fuelT:
                opts.fuelT,

            oxidizerT:
                opts.humidity.tempK

        });



    const thermal =

        C.thermalBalance({

            comp,

            fuelMolarFlow:
                fuelMolar,

            fuelMassFlow:
                flows.mass,

            pci,

            oxid,

            products,

            fuelT:
                opts.fuelT,

            oxidizerT:
                opts.humidity.tempK,

            stackT:
                opts.stackT

        });



    const dew =

        C.flueGasDewPoint(

            products,

            opts.stackP

        );



    const emissions =

        C.co2Emissions({

            products,

            fuelMassFlow:
                flows.mass,

            powerKW,

            pci

        });



    const w =

        C.wobbe(

            pcs,

            rhoN,

            M

        );



    const warnings = [

        ...C.qualityWarnings({

            comp,

            fuelT:
                opts.fuelT,

            oxidizerT:
                opts.humidity.tempK,

            stackT:
                opts.stackT,

            presetName,

            humidityEnabled:
                opts.humidity.enabled

        }),

        ...cpR.warnings,

        ...(
            tad.warnings

            ||

            []
        )

    ];



    if (
        thermal.extrapolated
    ) {

        warnings.push(

            "Balanço térmico/perda de chaminé utiliza extrapolação de Cp em pelo menos uma espécie."

        );

    }



    if (
        opts.combustionMode
        ===
        "o2medido"
    ) {

        warnings.push(

            "Modo inverso: λ foi determinado a partir do O₂ seco informado."

        );

    }



    warnings.push(

        "Perda de chaminé = calor sensível dos produtos acima de 25 °C em base PCI; não representa a eficiência total de uma caldeira/forno."

    );



    warnings.push(

        "Ponto de orvalho calculado é o da água; não inclui ponto de orvalho ácido."

    );



    warnings.push(

        "CO₂ reportado é emissão estequiométrica bruta; não distingue carbono fóssil e biogênico."

    );



    return {

        opts,

        comp,

        M,

        pcs,

        pci,

        cp:
            cpR.value,

        rho,

        rhoN,

        flows,

        fuelMolar,

        powerKW,

        atoms,

        o2Per,

        lambda,

        oxid,

        products,

        dry,

        massBal,

        elemBal,

        tad,

        thermal,

        dew,

        emissions,

        wobbe:
            w,

        warnings:

            [
                ...new Set(
                    warnings
                )
            ]

    };

}



/* =========================================================
   CÁLCULO PRINCIPAL
========================================================= */

function calculate() {


    try {


        hideError();



        const comp =

            currentComposition();



        const opts =

            collectOptions();



        const p =

            presetObject(
                els.preset.value
            );



        last =

            computeCase(

                comp,

                opts,

                p?.nome

                ||

                null

            );



        blendSolution =
            null;



        $("#btnApplyBlend").disabled =
            true;



        renderAll();

    }

    catch (
        e
    ) {


        showError(

            e.message

            ||

            String(e)

        );

    }

}



/* =========================================================
   RENDER GERAL
========================================================= */

function renderAll() {


    renderWarnings();

    renderProperties();

    renderMixtureDetail();

    renderCombustion();

    renderThermal();

    renderBalances();

    renderProducts();

    estimateEmissions(
        true
    );

    renderSummary();

    renderSensitivityComponent();

    renderCharts();

}



/* =========================================================
   AVISOS
========================================================= */

function renderWarnings() {


    els.warnings.innerHTML =

        last.warnings.length

            ?

            last.warnings
                .map(

                    w => `

                        <div class="alert warning">

                            ⚠ ${esc(w)}

                        </div>

                    `

                )
                .join("")

            :

            `

                <div class="alert success">

                    ✓ Nenhuma advertência adicional.

                </div>

            `;

}



/* =========================================================
   PROPRIEDADES
========================================================= */

function updateWobbe() {


    if (
        last
    ) {


        $("#resWobbe").textContent =

            fmt(

                C.convertWobbe(

                    last.wobbe,

                    $("#unidadeWobbe").value

                ),

                3

            );

    }

}



function updatePower() {


    if (
        last
    ) {


        const u =

            $("#unidadePotencia").value;



        $("#resPotencia").textContent =

            fmt(

                C.convertPower(

                    last.powerKW,

                    u

                ),

                u === "MW"

                    ?

                    5

                    :

                    2

            );

    }

}



function updateResultFlow() {


    if (
        !last
    ) {

        return;

    }



    const u =

        $("#unidadeVazaoResultado").value;



    const v =

        u === "kgh"

            ?

            last.flows.mass

            :

            (
                u === "m3h"

                    ?

                    last.flows.volume

                    :

                    last.flows.normal
            );



    $("#resVazaoResultado").textContent =

        fmt(
            v,
            3
        );

}



function renderProperties() {


    $("#resMassaMolar").textContent =
        fmt(
            last.M,
            4
        );


    $("#resPCS").textContent =
        fmt(
            last.pcs,
            3
        );


    $("#resPCI").textContent =
        fmt(
            last.pci,
            3
        );


    $("#resCp").textContent =
        fmt(
            last.cp,
            4
        );


    $("#resDensidade").textContent =
        fmt(
            last.rho,
            4
        );


    $("#resDensidadeNormal").textContent =
        fmt(
            last.rhoN,
            4
        );


    const elementPct =

        C.elementalMassPercentages(
            last.comp
        );


    $("#resElemC").textContent =
        fmt(
            elementPct.C,
            4
        );


    $("#resElemH").textContent =
        fmt(
            elementPct.H,
            4
        );


    $("#resElemN").textContent =
        fmt(
            elementPct.N,
            4
        );


    $("#resElemO").textContent =
        fmt(
            elementPct.O,
            4
        );


    $("#resElemS").textContent =
        fmt(
            elementPct.S,
            4
        );


    $("#resElemZ").textContent =
        fmt(
            elementPct.Z,
            4
        );


    updateWobbe();

    updatePower();

    updateResultFlow();

}



function renderMixtureDetail() {


    els.mixtureDetail.innerHTML =

        last.comp

            .map(

                i => {


                    const cp =

                        C.cpMass(

                            i.gas,

                            last.opts.fuelT

                        );



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

                                ${esc(
                                    i.gas.cpShomate?.metodo
                                    ||
                                    "—"
                                )}

                                ${
                                    i.gas.cpShomate?.estimado

                                        ?

                                        " (estimado)"

                                        :

                                        ""
                                }

                            </td>

                        </tr>

                    `;

                }

            )
            .join("");

}



/* =========================================================
   COMBUSTÃO
========================================================= */

function renderCombustion() {


    $("#resArEsteq").textContent =
        fmt(
            last.oxid.oxidStoichMass,
            2
        );


    $("#resArReal").textContent =
        fmt(
            last.oxid.oxidRealMass,
            2
        );


    $("#resAFREsteq").textContent =
        fmt(
            last.oxid.afrStoich,
            4
        );


    $("#resAFRReal").textContent =
        fmt(
            last.oxid.afrReal,
            4
        );


    $("#resLambda").textContent =
        fmt(
            last.lambda,
            4
        );


    $("#resExcesso").textContent =

        fmt(

            (
                last.lambda
                -
                1
            )

            *

            100,

            2

        );


    $("#resO2Seco").textContent =
        fmt(
            last.dry.o2DryPct,
            3
        );


    $("#resCO2Seco").textContent =
        fmt(
            last.dry.co2DryPct,
            3
        );


    $("#resH2OUmido").textContent =
        fmt(
            last.dry.h2oWetPct,
            3
        );


    $("#resTad").textContent =

        fmt(

            last.tad.temperatureK

            -

            273.15,

            1

        );


    els.lambdaPreview.textContent =

        `λ = ${fmt(
            last.lambda,
            3
        )}`;

}



/* =========================================================
   TÉRMICO / EMISSÕES
========================================================= */

function renderThermal() {


    const flue =

        C.productSummary(

            last.products,

            last.opts.stackT,

            last.opts.stackP

        );


    const flueCp =

        C.productsCpMass(

            last.products,

            last.opts.stackT

        );


    const flueEnthalpy =

        C.productsSensibleEnthalpy(

            last.products,

            C.CONFIG.Tref,

            last.opts.stackT

        );


    const flueSpecificEnthalpy =

        flue.massFlow > 0

            ?

            flueEnthalpy.value

            /

            flue.massFlow

            :

            0;


    $("#resQChemical").textContent =
        fmt(
            last.thermal.chemicalKW,
            2
        );


    $("#resFlueMoles").textContent =
        fmt(
            flue.molarFlow,
            6
        );


    $("#resFlueCp").textContent =
        fmt(
            flueCp.value,
            4
        );


    $("#resFlueDensity").textContent =
        fmt(
            flue.density,
            4
        );


    $("#resFluePCI").textContent =
        fmt(
            flue.pci,
            4
        );


    $("#resFlueEnthalpy").textContent =
        fmt(
            flueSpecificEnthalpy,
            3
        );


    $("#resDewPoint").textContent =
        fmt(
            last.dew.dewPointC,
            2
        );


    $("#resCO2kgH").textContent =
        fmt(
            last.emissions.kgH,
            3
        );


    $("#resCO2kgKg").textContent =
        fmt(
            last.emissions.kgPerKgFuel,
            4
        );


    $("#resCO2kgMJ").textContent =
        fmt(
            last.emissions.kgPerMJFuel,
            5
        );


    $("#resCO2kgKWh").textContent =
        fmt(
            last.emissions.kgPerKWhThermal,
            4
        );


    $("#resCO2tDay").textContent =
        fmt(
            last.emissions.tonnesPerDay,
            3
        );

}




/* =========================================================
   EMISSÕES REAIS ESTIMADAS
========================================================= */

function refreshEmissionCategory(
    preferred = null
) {

    if (!E) {
        return;
    }

    const equipment =
        $("#emissionEquipment")?.value
        ||
        "boiler";

    const select =
        $("#emissionCategory");

    if (!select) {
        return;
    }

    const current =
        preferred
        ??
        select.value;

    const categories =
        E.categoriesFor(
            equipment
        );

    select.innerHTML =
        categories.length

            ?

            categories
                .map(
                    item =>
                        `<option value="${esc(item.id)}">${esc(item.label)}</option>`
                )
                .join("")

            :

            '<option value="">Fator personalizado</option>';

    if (
        current
        &&
        categories.some(
            item => item.id === current
        )
    ) {
        select.value =
            current;
    }

    $("#emissionCategoryField")
        ?.classList
        .toggle(
            "hidden",
            equipment === "custom"
        );
}


function updateEmissionFlameModeUI() {

    const manual =
        $("#emissionFlameMode")?.value
        ===
        "manual";

    $("#emissionTadFactorField")
        ?.classList
        .toggle(
            "hidden",
            manual
        );

    $("#emissionFlameTempField")
        ?.classList
        .toggle(
            "hidden",
            !manual
        );
}


function updateEmissionUI() {

    const model =
        $("#emissionModel")?.value
        ||
        "factors";

    const equipment =
        $("#emissionEquipment")?.value
        ||
        "boiler";

    const ideal =
        model === "ideal";

    const custom =
        equipment === "custom"
        &&
        !ideal;

    const advanced =
        model === "advanced";

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
        .toggle(
            "hidden",
            !custom
        );

    $("#emissionAdvancedFields")
        ?.classList
        .toggle(
            "hidden",
            !advanced
        );

    updateEmissionFlameModeUI();
}


function syncAdvancedBurnerCategory() {

    if (
        $("#emissionModel")?.value
        !==
        "advanced"
    ) {
        return;
    }

    const equipment =
        $("#emissionEquipment")?.value;

    const burner =
        $("#emissionBurnerType")?.value;

    const maps = {
        boiler: {
            conventional:
                "small_uncontrolled",
            low_nox:
                "small_lnb",
            low_nox_fgr:
                "small_lnb_fgr"
        },
        furnace: {
            conventional:
                "external_proxy",
            low_nox:
                "external_proxy_lnb",
            low_nox_fgr:
                "external_proxy_lnb_fgr"
        },
        burner: {
            conventional:
                "external_proxy",
            low_nox:
                "external_proxy_lnb",
            low_nox_fgr:
                "external_proxy_lnb_fgr"
        }
    };

    const category =
        maps[equipment]?.[burner];

    if (
        category
        &&
        [
            ...$("#emissionCategory")?.options
            ||
            []
        ]
        .some(
            option => option.value === category
        )
    ) {
        $("#emissionCategory").value =
            category;
    }
}


function emissionFlameTemperatureC() {

    const mode =
        $("#emissionFlameMode")?.value
        ||
        "factor";

    if (
        mode === "manual"
    ) {
        return num(
            "#emissionFlameTemp"
        );
    }

    const tadC =
        last

            ?

            last.tad.temperatureK
            -
            273.15

            :

            NaN;

    const factor =
        num(
            "#emissionTadFactor"
        );

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


function collectEmissionOptions() {

    return {
        model:
            $("#emissionModel")?.value
            ||
            "factors",

        equipment:
            $("#emissionEquipment")?.value
            ||
            "boiler",

        category:
            $("#emissionCategory")?.value
            ||
            "",

        custom: {
            nox:
                num(
                    "#customEFNOx"
                ),
            co:
                num(
                    "#customEFCO"
                ),
            ch4:
                num(
                    "#customEFCH4"
                ),
            voc:
                num(
                    "#customEFVOC"
                ),
            note:
                $("#customEFNote")?.value
                ||
                ""
        },

        advanced: {
            flameTemperatureC:
                emissionFlameTemperatureC(),
            residenceTimeS:
                num(
                    "#emissionResidence"
                ),
            burnerType:
                $("#emissionBurnerType")?.value
                ||
                "",
            noFractionPct:
                $("#emissionNOFraction")?.value === ""

                    ?

                    NaN

                    :

                    num(
                        "#emissionNOFraction"
                    )
        }
    };
}


function emissionO2CorrectionFactor(
    measured,
    reference
) {

    if (
        !Number.isFinite(measured)
        ||
        !Number.isFinite(reference)
        ||
        measured >= 20.9
        ||
        reference >= 20.9
    ) {
        return NaN;
    }

    return (
        20.9
        -
        reference
    )
    /
    (
        20.9
        -
        measured
    );
}


function renderEstimatedEmissionResults() {

    if (
        !emissionEstimate
    ) {
        return;
    }

    const e =
        emissionEstimate;

    const c =
        e.concentration;

    const ref =
        e.o2ReferencePct;

    $("#emissionO2RefHeader").textContent =
        `Corrigido @ ${fmt(ref, 1)}% O₂`;

    $("#resEmCOkgH").textContent =
        fmt(
            e.rates.coKgH,
            5
        );

    $("#resEmNOxkgH").textContent =
        fmt(
            e.rates.noxKgH,
            5
        );

    $("#resEmO2Dry").textContent =
        fmt(
            e.dry.o2Pct,
            3
        );

    $("#resEmCarbonClosure").textContent =
        fmt(
            e.balance.carbonClosurePct,
            4
        )
        +
        "%";

    const corrFactor =
        emissionO2CorrectionFactor(
            e.dry.o2Pct,
            ref
        );

    const speciesFromPpm = (
        ppm,
        molarMass
    ) => {

        if (
            !Number.isFinite(ppm)
        ) {
            return null;
        }

        const kmolH =
            ppm
            /
            1e6
            *
            e.dry.kmolH;

        const kgH =
            kmolH
            *
            molarMass;

        const mgNm3 =
            e.dry.nm3H > 0

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
            mgNm3Ref:
                Number.isFinite(corrFactor)

                    ?

                    mgNm3
                    *
                    corrFactor

                    :

                    NaN
        };
    };

    const no =
        speciesFromPpm(
            c.noPpmvd,
            E.MW.NO
        );

    const no2 =
        speciesFromPpm(
            c.no2Ppmvd,
            E.MW.NO2
        );

    const ch4MgRef =
        Number.isFinite(corrFactor)

            ?

            c.ch4.mgNm3
            *
            corrFactor

            :

            NaN;

    const refCell = value =>
        Number.isFinite(value)

            ?

            `${fmt(value, 2)} mg/Nm³`

            :

            "—";

    const row = (
        label,
        ppm,
        mg,
        kg,
        corrected,
        note = ""
    ) => `
        <tr>
            <td>
                <strong>${esc(label)}</strong>
                ${
                    note

                        ?

                        `<small class="table-note">${esc(note)}</small>`

                        :

                        ""
                }
            </td>
            <td class="num">${Number.isFinite(ppm) ? fmt(ppm, 2) : "n/d"}</td>
            <td class="num">${Number.isFinite(mg) ? fmt(mg, 2) : "n/d"}</td>
            <td class="num">${Number.isFinite(kg) ? fmt(kg, 5) : "n/d"}</td>
            <td class="num">${refCell(corrected)}</td>
        </tr>
    `;

    $("#emissionResultsBody").innerHTML =
        [
            row(
                "CO",
                c.co.ppmvd,
                c.co.mgNm3,
                e.rates.coKgH,
                c.co.mgNm3Ref
            ),

            row(
                "NO",
                no?.ppm,
                no?.mgNm3,
                no?.kgH,
                no?.mgNm3Ref,
                no
                    ?
                    "Especiação definida pelo usuário."
                    :
                    "AP-42 não separa NO/NO₂ no fator total."
            ),

            row(
                "NO₂",
                no2?.ppm,
                no2?.mgNm3,
                no2?.kgH,
                no2?.mgNm3Ref,
                no2
                    ?
                    "Especiação definida pelo usuário."
                    :
                    "AP-42 não separa NO/NO₂ no fator total."
            ),

            row(
                "NOx (como NO₂)",
                c.nox.ppmvd,
                c.nox.mgNm3,
                e.rates.noxKgH,
                c.nox.mgNm3Ref,
                "Massa regulatória/equivalente como NO₂."
            ),

            row(
                "CH₄ não queimado",
                c.ch4.ppmvd,
                c.ch4.mgNm3,
                e.rates.ch4KgH,
                ch4MgRef
            ),

            row(
                "THC/VOC",
                NaN,
                c.vocMgNm3,
                e.rates.vocKgH,
                c.vocMgNm3Ref,
                "Classe agregada; ppm não é calculado sem massa molar representativa."
            )
        ]
        .join("");

    renderEmissionFactorInfo();
    renderEmissionBalanceInfo();
    renderEmissionWarnings();
}


function renderEmissionFactorInfo() {

    if (
        !emissionEstimate
    ) {
        return;
    }

    const e =
        emissionEstimate;

    const f =
        e.factor;

    const source =
        f.source;

    const rating = value =>
        `<span class="emission-rating">${esc(value || "—")}</span>`;

    const sourceHtml =
        source

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


function renderEmissionBalanceInfo() {

    if (
        !emissionEstimate
    ) {
        return;
    }

    const e =
        emissionEstimate;

    const advanced =
        e.model === "advanced"

            ?

            `
                <p>
                    <strong>Contexto avançado:</strong>
                    T chama = ${fmt(e.advanced.flameTemperatureC, 1)} °C;
                    τ = ${fmt(e.advanced.residenceTimeS, 3)} s;
                    λ = ${fmt(last?.lambda, 3)}.
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


function renderEmissionWarnings() {

    if (
        !emissionEstimate
    ) {
        return;
    }

    const list = [
        ...emissionEstimate.warnings,
        "Estimativa por fator de emissão: não substitui ensaio de chaminé, analisador de gases ou dados específicos do fabricante/equipamento.",
        "A EPA ressalta que fatores AP-42 são médias de uma população de fontes e não devem ser usados como limites de conformidade."
    ];

    $("#emissionWarnings").innerHTML =
        [
            ...new Set(
                list
            )
        ]
        .map(
            text => `
                <div class="alert warning">
                    ⚠ ${esc(text)}
                </div>
            `
        )
        .join("");
}


function estimateEmissions(
    silent = false
) {

    try {

        if (
            !last
        ) {
            if (!silent) {
                throw new Error(
                    "Execute primeiro o cálculo principal de combustão."
                );
            }
            return;
        }

        if (!E) {
            throw new Error(
                "Módulo de emissões não carregado."
            );
        }

        const opts =
            collectEmissionOptions();

        const energyInputGJH =
            last.flows.mass
            *
            last.pcs
            /
            1000;

        emissionEstimate =
            E.estimate({
                ...opts,
                energyInputGJH,
                products:
                    last.products,
                comp:
                    last.comp,
                config:
                    C.CONFIG,
                o2ReferencePct:
                    num(
                        "#o2Referencia"
                    )
            });

        renderEstimatedEmissionResults();
    }
    catch (error) {
        if (!silent) {
            showError(
                error.message
                ||
                String(error)
            );
        }
    }
}



/* =========================================================
   BALANÇOS
========================================================= */

function renderBalances() {


    $("#balFuel").textContent =

        `${fmt(
            last.flows.mass,
            3
        )} kg/h`;


    $("#balOxid").textContent =

        `${fmt(
            last.oxid.oxidRealMass,
            3
        )} kg/h`;


    $("#balInput").textContent =

        `${fmt(
            last.massBal.input,
            3
        )} kg/h`;


    $("#balOutput").textContent =

        `${fmt(
            last.massBal.output,
            3
        )} kg/h`;


    $("#balError").textContent =

        `${fmt(
            last.massBal.errorPct,
            6
        )} %`;



    els.elementBody.innerHTML =

        last.elemBal

            .map(

                r => `

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

                `

            )
            .join("");

}



/* =========================================================
   PRODUTOS
========================================================= */

function renderProducts() {


    if (
        !last
    ) {

        return;

    }



    const basis =

        $("#baseProdutos").value;



    const list =

        C.productBasis(

            last.products,

            basis

        );



    const summary =

        C.productSummary(

            list,

            last.opts.stackT,

            last.opts.stackP

        );



    const f =

        C.fractions(
            list
        );


    const dryFractions =

        C.fractions(

            C.productBasis(

                last.products,

                "seca"

            )

        );


    const dryById =

        new Map(

            dryFractions.map(

                i => [
                    i.id,
                    i
                ]

            )

        );


    const o2Reference =

        num(
            "#o2Referencia"
        );


    const correctedProductAtO2Reference = i => {

        if (
            i.id === "O2"
            ||
            i.id === "H2O"
        ) {

            return NaN;

        }

        const dryItem =

            dryById.get(
                i.id
            );

        if (
            !dryItem
        ) {

            return NaN;

        }

        return C.correctedConcentrationAtO2(

            dryItem.mgNm3,

            last.dry.o2DryPct,

            o2Reference

        );

    };



    const massMode =

        $("#tipoVazaoProdutos").value

        ===

        "massica";



    $("#resVazaoProdutos").textContent =

        fmt(

            massMode

                ?

                summary.massFlow

                :

                summary.volumeFlow,

            3

        );



    $("#resUnidadeVazaoProdutos").textContent =

        massMode

            ?

            "kg/h"

            :

            "m³/h";



    $("#resDensidadeProdutos").textContent =
        fmt(
            summary.density,
            4
        );


    $("#resMassaMolarProdutos").textContent =
        fmt(
            summary.molarMass,
            4
        );


    $("#resSO2Produtos").textContent =
        fmt(
            summary.so2Ppmv,
            1
        );


    $("#resSO2BaseLabel").textContent =
        `ppmv (${basis})`;


    $("#resSO2mgProdutos").textContent =
        fmt(
            summary.so2MgNm3,
            2
        );



    const drySummary =

        C.productSummary(

            C.productBasis(

                last.products,

                "seca"

            ),

            C.CONFIG.Tn,

            C.CONFIG.Pn

        );



    $("#resSO2Corrigido").textContent =

        fmt(

            C.correctedConcentrationAtO2(

                drySummary.so2MgNm3,

                last.dry.o2DryPct,

                o2Reference

            ),

            2

        );



    const mode =

        $("#modoTabelaProdutos").value;



    const labels = {

        mol:
            "% molar",

        massa:
            "% mássica",

        ppmv:
            "ppmv",

        mgnm3:
            "mg/Nm³"

    };



    $("#productCompositionHeader").textContent =
        labels[mode];


    $("#productO2RefHeader").innerHTML =

        `Corrigido a O₂ ref.<br><small>${fmt(
            o2Reference,
            2
        )}% O₂ — mg/Nm³ seco</small>`;



    els.productBody.innerHTML =

        f

        .filter(
            i =>
                i.kmolH > 1e-12
        )

        .map(

            i => {


                const value =

                    mode === "mol"

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



                const digits =

                    mode === "ppmv"

                        ?

                        1

                        :

                        mode === "mgnm3"

                            ?

                            2

                            :

                            4;


                const corrected =

                    correctedProductAtO2Reference(
                        i
                    );



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
                            ${
                                Number.isFinite(corrected)
                                    ?
                                    fmt(corrected, 2)
                                    :
                                    "—"
                            }
                        </td>

                    </tr>

                `;

            }

        )
        .join("");

}



/* =========================================================
   RESUMO SUPERIOR
========================================================= */

function renderSummary() {


    const p =

        presetObject(
            els.preset.value
        );



    $("#sumFuel").textContent =

        p?.nome

        ||

        "Mistura personalizada";



    $("#sumFlow").textContent =

        `${fmt(
            last.flows.mass,
            2
        )} kg/h`;


    $("#sumPower").textContent =

        `${fmt(
            last.powerKW / 1000,
            3
        )} MW`;


    $("#sumLambda").textContent =
        fmt(
            last.lambda,
            3
        );


    $("#sumO2").textContent =

        `${fmt(
            last.dry.o2DryPct,
            2
        )} %`;

}



/* =========================================================
   SELECT SIMPLES DE GASES
========================================================= */

function fillSimpleGasSelect(
    select,
    current = ""
) {


    select.innerHTML =

        `<option value="">Selecione...</option>`

        +

        window.GAS_DATABASE
            .map(

                g => `

                    <option value="${esc(g.id)}">

                        ${esc(g.nome)}
                        —
                        ${esc(g.formula)}

                    </option>

                `

            )
            .join("");



    if (
        current
    ) {

        select.value =
            current;

    }

}



/* =========================================================
   COMPONENTE DA SENSIBILIDADE
========================================================= */

function renderSensitivityComponent() {


    const select =

        $("#sensitivityComponent");



    const current =
        select.value;



    select.innerHTML =

        last.comp
            .map(

                i => `

                    <option value="${esc(i.gas.id)}">

                        ${esc(i.gas.nome)}
                        —
                        ${esc(i.gas.formula)}

                    </option>

                `

            )
            .join("");



    if (

        [
            ...select.options
        ]
        .some(
            o =>
                o.value === current
        )

    ) {

        select.value =
            current;

    }

}



/* =========================================================
   MISTURA AUTOMÁTICA
========================================================= */

function solveBlend() {


    try {


        if (
            !last
        ) {

            throw new Error(

                "Execute o cálculo principal primeiro."

            );

        }



        const gas =

            C.getGas(

                $("#blendAdditive").value

            );



        const property =

            $("#blendProperty").value;



        const target =

            num(
                "#blendTarget"
            );



        blendSolution =

            C.solveBlendTarget({

                baseComp:
                    last.comp,

                additiveGas:
                    gas,

                property,

                target

            });



        const labels = {

            WOBBE:
                "MJ/Nm³",

            PCI:
                "MJ/kg",

            PCS:
                "MJ/kg"

        };



        $("#blendResult").innerHTML = `

            <strong>
                Adição necessária:
            </strong>

            ${fmt(
                blendSolution.additiveMolarFraction
                *
                100,
                4
            )} % mol de ${esc(gas.nome)}.

            <br>

            <strong>
                Valor atingido:
            </strong>

            ${fmt(
                blendSolution.achieved,
                5
            )}
            ${labels[property]}

            · erro absoluto

            ${fmt(
                blendSolution.error,
                6
            )}.

        `;



        $("#btnApplyBlend").disabled =
            false;

    }

    catch (
        e
    ) {


        blendSolution =
            null;


        $("#btnApplyBlend").disabled =
            true;


        showError(
            e.message
        );

    }

}



function applyBlend() {


    if (
        !blendSolution
    ) {

        return;

    }



    loading =
        true;


    els.body.innerHTML =
        "";



    $(
        'input[name="baseComposicao"][value="molar"]'
    ).checked =
        true;



    blendSolution.comp
        .forEach(

            i =>

                addRow(

                    i.gas.id,

                    i.y * 100

                )

        );



    loading =
        false;



    refreshPresetSelect(
        "manual"
    );


    updateCompositionBar();


    calculate();

}



/* =========================================================
   SENSIBILIDADE
========================================================= */

function sensitivityValue(
    result,
    key
) {


    if (
        key === "power"
    ) {

        return {

            value:
                result.powerKW,

            unit:
                "kW"

        };

    }



    if (
        key === "wobbe"
    ) {

        return {

            value:
                result.wobbe.volumetricMJNm3,

            unit:
                "MJ/Nm³"

        };

    }



    if (
        key === "density"
    ) {

        return {

            value:
                result.rho,

            unit:
                "kg/m³"

        };

    }



    if (
        key === "o2dry"
    ) {

        return {

            value:
                result.dry.o2DryPct,

            unit:
                "%"

        };

    }



    if (
        key === "co2dry"
    ) {

        return {

            value:
                result.dry.co2DryPct,

            unit:
                "%"

        };

    }



    if (
        key === "tad"
    ) {

        return {

            value:

                result.tad.temperatureK

                -

                273.15,

            unit:
                "°C"

        };

    }



    if (
        key === "stackloss"
    ) {

        return {

            value:
                result.thermal.stackLossPct,

            unit:
                "%"

        };

    }



    return {

        value:
            result.emissions.kgH,

        unit:
            "kg/h"

    };

}



function analyzeSensitivity() {


    try {


        if (
            !last
        ) {

            throw new Error(

                "Execute o cálculo principal primeiro."

            );

        }



        const output =

            $("#sensitivityOutput").value;



        const componentId =

            $("#sensitivityComponent").value;



        const dComp =

            num(
                "#sensCompDelta"
            );



        const dT =

            num(
                "#sensTempDelta"
            );



        const dP =

            num(
                "#sensPressureDelta"
            )

            *

            100;



        const dO2 =

            num(
                "#sensO2Delta"
            );



        const base =

            sensitivityValue(

                last,

                output

            );



        const rowsResult =
            [];



        const evaluate = (

            label,

            minusComp,

            plusComp,

            minusOpts,

            plusOpts

        ) => {


            const rMinus =

                computeCase(

                    minusComp

                    ||

                    last.comp,

                    minusOpts

                    ||

                    last.opts

                );



            const rPlus =

                computeCase(

                    plusComp

                    ||

                    last.comp,

                    plusOpts

                    ||

                    last.opts

                );



            const a =

                sensitivityValue(

                    rMinus,

                    output

                ).value;



            const b =

                sensitivityValue(

                    rPlus,

                    output

                ).value;



            const rel =

                Math.abs(
                    base.value
                )

                >
                1e-12

                    ?

                    Math.max(

                        Math.abs(
                            a - base.value
                        ),

                        Math.abs(
                            b - base.value
                        )

                    )

                    /

                    Math.abs(
                        base.value
                    )

                    *

                    100

                    :

                    NaN;



            rowsResult.push({

                label,

                minus:
                    a,

                plus:
                    b,

                rel

            });

        };



        evaluate(

            `Componente ${C.getGas(componentId)?.formula || componentId} ±${fmt(dComp, 1)}% rel.`,

            C.perturbComponentRelative(

                last.comp,

                componentId,

                -dComp

            ),

            C.perturbComponentRelative(

                last.comp,

                componentId,

                dComp

            ),

            last.opts,

            last.opts

        );



        evaluate(

            `Temperatura combustível ±${fmt(dT, 1)} °C`,

            null,

            null,

            {

                ...last.opts,

                fuelT:

                    Math.max(

                        1,

                        last.opts.fuelT
                        -
                        dT

                    )

            },

            {

                ...last.opts,

                fuelT:

                    last.opts.fuelT

                    +

                    dT

            }

        );



        evaluate(

            `Pressão combustível ±${fmt(dP / 100, 2)} bar`,

            null,

            null,

            {

                ...last.opts,

                fuelP:

                    Math.max(

                        .001,

                        last.opts.fuelP
                        -
                        dP

                    )

            },

            {

                ...last.opts,

                fuelP:

                    last.opts.fuelP

                    +

                    dP

            }

        );



        evaluate(

            `O₂ comburente ±${fmt(dO2, 1)} p.p.`,

            null,

            null,

            {

                ...last.opts,

                dryO2Pct:

                    C.clamp(

                        last.opts.dryO2Pct

                        -

                        dO2,

                        .01,

                        99.99

                    )

            },

            {

                ...last.opts,

                dryO2Pct:

                    C.clamp(

                        last.opts.dryO2Pct

                        +

                        dO2,

                        .01,

                        99.99

                    )

            }

        );



        rowsResult.sort(

            (a, b) =>

                (
                    b.rel

                    ||

                    0
                )

                -

                (
                    a.rel

                    ||

                    0
                )

        );



        $("#sensitivityBody").innerHTML =

            rowsResult

                .map(

                    r => `

                        <tr>

                            <td>
                                ${esc(r.label)}
                            </td>

                            <td class="num">
                                ${fmt(r.minus, 4)}
                                ${esc(base.unit)}
                            </td>

                            <td class="num">
                                ${fmt(base.value, 4)}
                                ${esc(base.unit)}
                            </td>

                            <td class="num">
                                ${fmt(r.plus, 4)}
                                ${esc(base.unit)}
                            </td>

                            <td class="num">

                                <strong>
                                    ${fmt(r.rel, 3)} %
                                </strong>

                            </td>

                        </tr>

                    `

                )
                .join("");

    }

    catch (
        e
    ) {

        showError(
            e.message
        );

    }

}



/* =========================================================
   GRÁFICOS
========================================================= */

function chartColors() {


    const css =

        getComputedStyle(
            document.documentElement
        );



    const v = k =>

        css
            .getPropertyValue(k)
            .trim();



    return {

        blue:

            v("--blue")

            ||

            "#0078a8",

        blueDark:

            v("--blue-dark")

            ||

            "#003b5c",

        orange:

            v("--orange")

            ||

            "#e65100",

        green:

            v("--green")

            ||

            "#2e7d32",

        line:

            v("--line")

            ||

            "#d8e0e5",

        text:

            v("--text")

            ||

            "#263238",

        muted:

            v("--muted")

            ||

            "#607d8b"

    };

}



function prepareCanvas(
    canvas,
    height = 300
) {


    const width =

        Math.max(

            1,

            Math.floor(

                canvas
                    .getBoundingClientRect()
                    .width

                ||

                700

            )

        );



    const dpr =

        Math.min(

            window.devicePixelRatio

            ||

            1,

            2

        );



    canvas.width =

        Math.round(
            width * dpr
        );


    canvas.height =

        Math.round(
            height * dpr
        );


    canvas.style.height =

        `${height}px`;



    const ctx =

        canvas.getContext(
            "2d"
        );



    ctx.setTransform(

        dpr,

        0,

        0,

        dpr,

        0,

        0

    );



    ctx.clearRect(

        0,

        0,

        width,

        height

    );



    return {

        ctx,

        width,

        height,

        colors:
            chartColors()

    };

}



function drawEmpty(
    canvas
) {


    const {

        ctx,
        width,
        colors

    } =

        prepareCanvas(

            canvas,

            240

        );



    ctx.fillStyle =
        colors.muted;


    ctx.font =
        "14px Arial";


    ctx.textAlign =
        "center";



    ctx.fillText(

        "Execute o cálculo para gerar o gráfico.",

        width / 2,

        120

    );

}



function drawBars(
    canvas,
    data,
    unit = "%",
    note = ""
) {


    if (
        !data.length
    ) {

        return drawEmpty(
            canvas
        );

    }



    const H =

        Math.max(

            250,

            60

            +

            data.length * 38

        );



    const {

        ctx,
        width,
        height,
        colors

    } =

        prepareCanvas(

            canvas,

            H

        );



    const left =

        Math.min(

            160,

            Math.max(

                90,

                width * .24

            )

        );



    const right =
        95;


    const top =

        note

            ?

            44

            :

            20;


    const bottom =
        18;



    const plotW =

        width

        -

        left

        -

        right;



    const plotH =

        height

        -

        top

        -

        bottom;



    const max =

        Math.max(

            ...data.map(
                d =>
                    d.value
            ),

            1

        )

        *

        1.08;



    if (
        note
    ) {


        ctx.fillStyle =
            colors.muted;


        ctx.font =
            "12px Arial";


        ctx.textAlign =
            "left";


        ctx.fillText(

            note,

            left,

            18

        );

    }



    const rh =

        plotH

        /

        data.length;



    data.forEach(

        (
            d,
            i
        ) => {


            const y =

                top

                +

                i * rh

                +

                rh / 2;



            const bh =

                Math.min(

                    23,

                    rh * .58

                );



            const bw =

                plotW

                *

                d.value

                /

                max;



            ctx.font =
                "13px Arial";


            ctx.textBaseline =
                "middle";


            ctx.textAlign =
                "right";


            ctx.fillStyle =
                colors.text;


            ctx.fillText(

                d.label,

                left - 10,

                y

            );



            ctx.fillStyle =
                "#eef2f4";


            ctx.fillRect(

                left,

                y - bh / 2,

                plotW,

                bh

            );



            ctx.fillStyle =

                d.color

                ||

                colors.blue;



            ctx.fillRect(

                left,

                y - bh / 2,

                bw,

                bh

            );



            ctx.textAlign =
                "left";


            ctx.fillStyle =
                colors.text;


            ctx.fillText(

                `${fmt(
                    d.value,
                    2
                )} ${unit}`,

                left + bw + 7,

                y

            );

        }

    );

}



function drawProcessCurve() {


    const canvas =

        $("#processCurveChart");



    if (
        !last
    ) {

        return drawEmpty(
            canvas
        );

    }



    const maxSelected =

        Number(

            $("#chartExcessMax").value

        )

        ||

        50;



    const currentExcess =

        Math.max(

            0,

            (
                last.lambda
                -
                1
            )

            *

            100

        );



    const maxExcess =

        Math.max(

            maxSelected,

            Math.ceil(

                currentExcess

                /

                10

            )

            *

            10

        );



    const step =

        maxExcess <= 50

            ?

            5

            :

            maxExcess <= 100

                ?

                10

                :

                20;



    const data =
        [];



    for (

        let excess = 0;

        excess <= maxExcess + 1e-9;

        excess += step

    ) {


        const opts = {

            ...last.opts,

            combustionMode:
                "excesso",

            excessPct:
                excess

        };



        const r =

            computeCase(

                last.comp,

                opts

            );



        data.push({

            excess,

            o2:
                r.dry.o2DryPct,

            co2:
                r.dry.co2DryPct

        });

    }



    const {

        ctx,
        width,
        height,
        colors

    } =

        prepareCanvas(

            canvas,

            400

        );



    const left =
        60;


    const right =
        25;


    const top =
        45;


    const bottom =
        55;



    const pw =

        width

        -

        left

        -

        right;



    const ph =

        height

        -

        top

        -

        bottom;



    const maxY =

        Math.ceil(

            Math.max(

                ...data.flatMap(

                    d => [

                        d.o2,

                        d.co2

                    ]

                ),

                5

            )

            *

            1.15

            /

            5

        )

        *

        5;



    const X = x =>

        left

        +

        x

        /

        maxExcess

        *

        pw;



    const Y = y =>

        top

        +

        ph

        -

        y

        /

        maxY

        *

        ph;



    ctx.font =
        "11px Arial";



    for (
        let i = 0;
        i <= 5;
        i++
    ) {


        const yv =

            maxY

            *

            i

            /

            5;



        const y =

            Y(yv);



        ctx.strokeStyle =
            colors.line;


        ctx.beginPath();


        ctx.moveTo(
            left,
            y
        );


        ctx.lineTo(
            left + pw,
            y
        );


        ctx.stroke();



        ctx.fillStyle =
            colors.muted;


        ctx.textAlign =
            "right";


        ctx.fillText(

            fmt(
                yv,
                1
            ),

            left - 7,

            y + 3

        );



        const xv =

            maxExcess

            *

            i

            /

            5;



        const x =

            X(xv);



        ctx.beginPath();


        ctx.moveTo(
            x,
            top
        );


        ctx.lineTo(
            x,
            top + ph
        );


        ctx.stroke();



        ctx.textAlign =
            "center";


        ctx.fillText(

            `${fmt(
                xv,
                0
            )}%`,

            x,

            top + ph + 18

        );

    }



    const line = (
        key,
        color
    ) => {


        ctx.strokeStyle =
            color;


        ctx.lineWidth =
            3;


        ctx.beginPath();



        data.forEach(

            (
                d,
                i
            ) =>


                i

                    ?

                    ctx.lineTo(

                        X(d.excess),

                        Y(d[key])

                    )

                    :

                    ctx.moveTo(

                        X(d.excess),

                        Y(d[key])

                    )

        );



        ctx.stroke();

    };



    line(
        "o2",
        colors.blue
    );


    line(
        "co2",
        colors.orange
    );



    const xa =

        X(
            currentExcess
        );



    ctx.save();


    ctx.strokeStyle =
        colors.green;


    ctx.setLineDash(
        [
            7,
            5
        ]
    );


    ctx.beginPath();


    ctx.moveTo(
        xa,
        top
    );


    ctx.lineTo(
        xa,
        top + ph
    );


    ctx.stroke();


    ctx.restore();



    ctx.fillStyle =
        colors.text;


    ctx.font =
        "12px Arial";


    ctx.textAlign =
        "left";


    ctx.fillText(

        "O₂ seco",

        left,

        20

    );


    ctx.fillStyle =
        colors.blue;


    ctx.fillRect(

        left - 18,

        14,

        12,

        4

    );


    ctx.fillStyle =
        colors.text;


    ctx.fillText(

        "CO₂ seco",

        left + 95,

        20

    );


    ctx.fillStyle =
        colors.orange;


    ctx.fillRect(

        left + 77,

        14,

        12,

        4

    );

}



function renderCharts() {


    if (
        !last
    ) {


        return [

            "fuelChart",

            "oxidizerChart",

            "productsChart",

            "oxidizerDemandChart",

            "processCurveChart"

        ]
        .forEach(

            id =>

                drawEmpty(

                    $(
                        "#" + id
                    )

                )

        );

    }



    const colors =
        chartColors();



    drawBars(

        $("#fuelChart"),

        last.comp

        .filter(
            i =>
                i.y > 1e-10
        )

        .map(

            i => ({

                label:
                    i.gas.formula,

                value:
                    i.y * 100,

                color:
                    colors.blue

            })

        )

        .sort(

            (a, b) =>
                b.value - a.value

        )

    );



    drawBars(

        $("#oxidizerChart"),

        [

            {

                label:
                    "O₂",

                value:

                    last.oxid.xO2

                    *

                    100,

                color:
                    colors.blue

            },

            {

                label:
                    "N₂",

                value:

                    last.oxid.xN2

                    *

                    100,

                color:
                    colors.blueDark

            },

            ...(

                last.oxid.xH2O

                >

                1e-8

                    ?

                    [

                        {

                            label:
                                "H₂O",

                            value:

                                last.oxid.xH2O

                                *

                                100,

                            color:
                                colors.green

                        }

                    ]

                    :

                    []
            )

        ]

    );



    drawBars(

        $("#productsChart"),

        C.fractions(

            C.productBasis(

                last.products,

                $("#baseProdutos").value

            )

        )

        .filter(
            i =>
                i.y > 1e-8
        )

        .map(

            i => ({

                label:
                    i.formula,

                value:
                    i.y * 100,

                color:
                    colors.orange

            })

        )

        .sort(

            (a, b) =>
                b.value - a.value

        )

    );



    drawBars(

        $("#oxidizerDemandChart"),

        [

            {

                label:
                    "Estequiométrico",

                value:
                    last.oxid.oxidStoichMass,

                color:
                    colors.blueDark

            },

            {

                label:
                    "Real",

                value:
                    last.oxid.oxidRealMass,

                color:
                    colors.green

            }

        ],

        "kg/h",

        `λ=${fmt(
            last.lambda,
            3
        )} · excesso=${fmt(
            (last.lambda - 1) * 100,
            2
        )}%`

    );



    drawProcessCurve();

}



/* =========================================================
   SALVAR / CARREGAR CASO
========================================================= */

function stateFromUI() {


    return {

        preset:
            els.preset.value,

        base:
            $('input[name="baseComposicao"]:checked').value,

        mixture:

            rows().map(

                i => ({

                    id:
                        i.id,

                    percentual:
                        i.percentual

                })

            ),

        modeInput:
            inputMode(),

        flowType:
            els.flowType.value,

        flow:
            els.flow.value,

        targetPower:
            $("#potenciaDesejada").value,

        targetPowerUnit:
            $("#unidadePotenciaDesejada").value,

        fuelT:
            $("#temperatura").value,

        fuelTUnit:
            $("#unidadeTemperatura").value,

        fuelP:
            $("#pressao").value,

        fuelPUnit:
            $("#unidadePressao").value,

        o2:
            els.o2.value,

        humidity:
            $("#usarUmidadeAr").checked,

        airT:
            $("#temperaturaComburente").value,

        airTUnit:
            $("#unidadeTemperaturaComburente").value,

        rh:
            $("#umidadeRelativa").value,

        airP:
            $("#pressaoComburente").value,

        airPUnit:
            $("#unidadePressaoComburente").value,

        combustionMode:
            combustionMode(),

        excess:
            els.excess.value,

        measuredO2:
            els.measuredO2.value,

        stackT:
            $("#temperaturaProdutos").value,

        stackTUnit:
            $("#unidadeTemperaturaProdutos").value,

        stackP:
            $("#pressaoProdutos").value,

        stackPUnit:
            $("#unidadePressaoProdutos").value,

        o2Ref:
            $("#o2Referencia").value,

        emission: {
            model: $("#emissionModel")?.value || "factors",
            equipment: $("#emissionEquipment")?.value || "boiler",
            category: $("#emissionCategory")?.value || "",
            customNOx: $("#customEFNOx")?.value ?? 0,
            customCO: $("#customEFCO")?.value ?? 0,
            customCH4: $("#customEFCH4")?.value ?? 0,
            customVOC: $("#customEFVOC")?.value ?? 0,
            customNote: $("#customEFNote")?.value || "",
            flameMode: $("#emissionFlameMode")?.value || "factor",
            tadFactor: $("#emissionTadFactor")?.value ?? 1,
            flameTemp: $("#emissionFlameTemp")?.value ?? 1500,
            residence: $("#emissionResidence")?.value ?? 0.5,
            burnerType: $("#emissionBurnerType")?.value || "conventional",
            noFraction: $("#emissionNOFraction")?.value ?? ""
        }

    };

}



function applyState(
    s
) {


    loading =
        true;



    refreshPresetSelect(

        s.preset

        ||

        "manual"

    );



    const br =

        $(

            `input[name="baseComposicao"][value="${s.base || "molar"}"]`

        );



    if (
        br
    ) {

        br.checked =
            true;

    }



    els.body.innerHTML =
        "";



    (

        s.mixture?.length

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

            ]

    )
    .forEach(

        i =>

            addRow(

                i.id,

                i.percentual

            )

    );



    const mir =

        $(

            `input[name="modoEntrada"][value="${s.modeInput || "vazao"}"]`

        );



    if (
        mir
    ) {

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

        1.0


    $("#unidadePressaoComburente").value =
        s.airPUnit

        ||

        "bar";



    const cm =

        $(

            `input[name="modoCombustao"][value="${s.combustionMode || "excesso"}"]`

        );



    if (
        cm
    ) {

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


    const em =
        s.emission
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

    refreshEmissionCategory(
        em.category
        ||
        null
    );

    if ($("#customEFNOx")) $("#customEFNOx").value = em.customNOx ?? 0;
    if ($("#customEFCO")) $("#customEFCO").value = em.customCO ?? 0;
    if ($("#customEFCH4")) $("#customEFCH4").value = em.customCH4 ?? 0;
    if ($("#customEFVOC")) $("#customEFVOC").value = em.customVOC ?? 0;
    if ($("#customEFNote")) $("#customEFNote").value = em.customNote || "";
    if ($("#emissionFlameMode")) $("#emissionFlameMode").value = em.flameMode || "factor";
    if ($("#emissionTadFactor")) $("#emissionTadFactor").value = em.tadFactor ?? 1;
    if ($("#emissionFlameTemp")) $("#emissionFlameTemp").value = em.flameTemp ?? 1500;
    if ($("#emissionResidence")) $("#emissionResidence").value = em.residence ?? 0.5;
    if ($("#emissionBurnerType")) $("#emissionBurnerType").value = em.burnerType || "conventional";
    if ($("#emissionNOFraction")) $("#emissionNOFraction").value = em.noFraction ?? "";

    updateEmissionUI();



    loading =
        false;



    updateInputModeUI();

    updateFlowUI();

    updateN2();

    updateHumidityUI();

    updateCombustionModeUI();

    updateCompositionBar();

}



/* =========================================================
   RESET
========================================================= */

function reset() {


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



    last =
        null;


    blendSolution =
        null;


    emissionEstimate =
        null;


    clearResults();

    hideError();

}



function clearResults() {


    $$(".metric strong")
        .forEach(

            e =>
                e.textContent =
                    "—"

        );



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



    $("#sensitivityBody").innerHTML = `

        <tr>
            <td colspan="5">
                Execute o cálculo principal e depois a análise.
            </td>
        </tr>

    `;



    $("#blendResult").textContent =
        "Defina o alvo e execute a solução.";


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
    .forEach(

        id =>

            $(
                "#" + id
            ).textContent =
                "—"

    );



    renderCharts();

}



/* =========================================================
   CASOS
========================================================= */

function refreshCases() {


    const cases =

        readJSON(
            CASE_KEY,
            []
        );



    els.savedCases.innerHTML =

        `<option value="">Carregar caso...</option>`

        +

        cases

            .map(

                (
                    c,
                    i
                ) => `

                    <option value="${i}">
                        ${esc(c.name)}
                    </option>

                `

            )
            .join("");

}



function saveCase() {


    const name =

        prompt(

            "Nome do caso:",

            presetObject(
                els.preset.value
            )?.nome

            ||

            "Caso de combustão"

        );



    if (
        !name
    ) {

        return;

    }



    const cases =

        readJSON(
            CASE_KEY,
            []
        );



    cases.push({

        name,

        savedAt:

            new Date()
                .toISOString(),

        state:

            stateFromUI()

    });



    writeJSON(

        CASE_KEY,

        cases

    );


    refreshCases();

}



function loadCase(
    index
) {


    const c =

        readJSON(

            CASE_KEY,

            []

        )[

            Number(index)

        ];



    if (
        !c
    ) {

        return;

    }



    applyState(
        c.state
    );


    calculate();

}



/* =========================================================
   CSV
========================================================= */

function csvText() {


    if (
        !last
    ) {

        throw new Error(

            "Execute o cálculo antes de exportar."

        );

    }



    const lines = [

        [
            "Versão",
            VERSION
        ],

        [
            "PCS MJ/kg",
            last.pcs
        ],

        [
            "PCI MJ/kg",
            last.pci
        ],

        [
            "Potência kW",
            last.powerKW
        ],

        [
            "Lambda",
            last.lambda
        ],

        [
            "O2 seco %",
            last.dry.o2DryPct
        ],

        [
            "CO2 seco %",
            last.dry.co2DryPct
        ],

        [
            "Ponto de orvalho C",
            last.dew.dewPointC
        ],

        [
            "Perda chaminé kW",
            last.thermal.stackSensibleKW
        ],

        [
            "CO2 kg/h",
            last.emissions.kgH
        ],

        [],

        [
            "Mistura",
            "%mol",
            "%massa"
        ]

    ];



    last.comp.forEach(

        i =>

            lines.push([

                i.gas.nome,

                i.y * 100,

                i.w * 100

            ])

    );



    lines.push(

        [],

        [
            "Produtos",
            "kmol/h",
            "kg/h",
            "%mol",
            "mg/Nm3 seco corrigido a O2 ref."
        ]

    );



    const csvO2Reference =

        num(
            "#o2Referencia"
        );


    const csvDryProducts =

        new Map(

            C.fractions(

                C.productBasis(

                    last.products,

                    "seca"

                )

            )
            .map(

                i => [
                    i.id,
                    i
                ]

            )

        );


    const csvCorrectedAtO2Reference = i => {

        if (
            i.id === "O2"
            ||
            i.id === "H2O"
        ) {

            return "";

        }

        const dryItem =

            csvDryProducts.get(
                i.id
            );

        if (
            !dryItem
        ) {

            return "";

        }

        const corrected =

            C.correctedConcentrationAtO2(

                dryItem.mgNm3,

                last.dry.o2DryPct,

                csvO2Reference

            );

        return Number.isFinite(corrected)
            ? corrected
            : "";

    };


    C.fractions(
        last.products
    )
    .forEach(

        i =>

            lines.push([

                i.nome,

                i.kmolH,

                i.kgH,

                i.y * 100,

                csvCorrectedAtO2Reference(i)

            ])

    );


    if (emissionEstimate) {

        lines.push(
            [],
            ["Emissões reais estimadas", "ppmvd", "mg/Nm3", "kg/h"],
            ["CO", emissionEstimate.concentration.co.ppmvd, emissionEstimate.concentration.co.mgNm3, emissionEstimate.rates.coKgH],
            ["NOx como NO2", emissionEstimate.concentration.nox.ppmvd, emissionEstimate.concentration.nox.mgNm3, emissionEstimate.rates.noxKgH],
            ["CH4 não queimado", emissionEstimate.concentration.ch4.ppmvd, emissionEstimate.concentration.ch4.mgNm3, emissionEstimate.rates.ch4KgH],
            ["VOC/THC", "", emissionEstimate.concentration.vocMgNm3, emissionEstimate.rates.vocKgH],
            ["O2 referência %", emissionEstimate.o2ReferencePct, "", ""],
            ["CO corrigido mg/Nm3", "", emissionEstimate.concentration.co.mgNm3Ref, ""],
            ["NOx corrigido mg/Nm3", "", emissionEstimate.concentration.nox.mgNm3Ref, ""],
            ["Fonte", emissionEstimate.factor.source?.short || (emissionEstimate.factor.custom ? "Personalizado" : "Modelo ideal"), "", ""]
        );
    }



    return lines

        .map(

            row =>

                row

                    .map(

                        v =>

                            `"${String(
                                v ?? ""
                            )
                            .replace(
                                /"/g,
                                '""'
                            )}"`

                    )

                    .join(";")

        )

        .join("\n");

}



function downloadText(
    text,
    type,
    filename
) {


    const a =

        document.createElement(
            "a"
        );



    a.href =

        URL.createObjectURL(

            new Blob(

                [
                    text
                ],

                {
                    type
                }

            )

        );



    a.download =
        filename;


    document.body.appendChild(
        a
    );


    a.click();



    setTimeout(

        () => {


            URL.revokeObjectURL(
                a.href
            );


            a.remove();

        },

        0

    );

}



/* =========================================================
   EVENTOS DA MISTURA
========================================================= */

els.body.addEventListener(

    "change",

    e => {


        const select =

            e.target.closest(
                ".component-select"
            );



        if (
            !select
        ) {

            return;

        }



        const tr =

            select.closest(
                "tr"
            );



        const gas =

            select.value

                ?

                C.getGas(
                    select.value
                )

                :

                null;



        updateComponentFormulaCell(
            tr,
            gas
        );



        if (
            !loading
        ) {

            refreshPresetSelect(
                "manual"
            );

        }



        refreshComponentSelects();

        updateCompositionBar();

    }

);



els.body.addEventListener(

    "input",

    e => {


        if (
            e.target.matches(
                ".component-percent"
            )
        ) {


            if (
                !loading
            ) {

                refreshPresetSelect(
                    "manual"
                );

            }


            updateCompositionBar();

        }

    }

);



els.body.addEventListener(

    "click",

    e => {


        const infoButton =

            e.target.closest(
                ".component-info-btn"
            );


        if (
            infoButton
        ) {

            openComponentTrace(
                infoButton.dataset.gasId
            );

            return;

        }


        const b =

            e.target.closest(
                ".remove-row"
            );



        if (
            !b
        ) {

            return;

        }



        b
            .closest("tr")
            .remove();



        if (
            !els.body.children.length
        ) {

            addRow();

        }



        refreshPresetSelect(
            "manual"
        );


        refreshComponentSelects();

        updateCompositionBar();

    }

);



els.mixtureDetail.addEventListener(

    "click",

    e => {

        const link =
            e.target.closest(
                ".trace-component-link"
            );

        if (
            !link
        ) {
            return;
        }

        openComponentTrace(
            link.dataset.gasId
        );
    }

);


$("#btnCloseTrace")
    ?.addEventListener(

        "click",

        closeComponentTrace

    );


els.traceDialog
    ?.addEventListener(

        "click",

        e => {

            if (
                e.target === els.traceDialog
            ) {
                closeComponentTrace();
            }
        }

    );


/* =========================================================
   EVENTOS
========================================================= */

$("#btnAdicionar")
    .addEventListener(

        "click",

        () => {


            refreshPresetSelect(
                "manual"
            );


            addRow();

        }

    );



$("#btnNormalizarFracoes")
    .addEventListener(

        "click",

        normalizeCompositionFractions

    );



els.search.addEventListener(

    "input",

    refreshComponentSelects

);



els.preset.addEventListener(

    "change",

    () =>

        loadPreset(
            els.preset.value
        )

);



/*
$("#btnSavePreset")
    .addEventListener(

        "click",

        saveCustomPreset

    );
*/



/*
$("#btnDeletePreset")
    .addEventListener(

        "click",

        deleteCustomPreset

    );
*/



$$(
    'input[name="modoEntrada"]'
)
.forEach(

    r =>

        r.addEventListener(

            "change",

            updateInputModeUI

        )

);



els.flowType.addEventListener(

    "change",

    updateFlowUI

);



els.o2.addEventListener(

    "input",

    updateN2

);



$("#usarUmidadeAr")
    .addEventListener(

        "change",

        updateHumidityUI

    );



[

    "#temperaturaComburente",

    "#unidadeTemperaturaComburente",

    "#umidadeRelativa",

    "#pressaoComburente",

    "#unidadePressaoComburente"

]
.forEach(

    s =>

        $(s).addEventListener(

            $(s).tagName === "INPUT"

                ?

                "input"

                :

                "change",

            updateHumidityPreview

        )

);



$$(
    'input[name="modoCombustao"]'
)
.forEach(

    r =>

        r.addEventListener(

            "change",

            updateCombustionModeUI

        )

);



els.excess.addEventListener(

    "input",

    updateLambdaPreview

);



$("#btnCalcular")
    .addEventListener(

        "click",

        calculate

    );



$("#btnLimpar")
    .addEventListener(

        "click",

        reset

    );



/*
$("#btnNew")
    .addEventListener(

        "click",

        reset

    );
*/



$("#unidadeWobbe")
    .addEventListener(

        "change",

        updateWobbe

    );



$("#unidadePotencia")
    .addEventListener(

        "change",

        updatePower

    );



$("#unidadeVazaoResultado")
    .addEventListener(

        "change",

        updateResultFlow

    );



[

    "#baseProdutos",

    "#modoTabelaProdutos",

    "#tipoVazaoProdutos",

    "#o2Referencia"

]
.forEach(

    s =>

        $(s).addEventListener(

            "change",

            () => {


                renderProducts();

                estimateEmissions(
                    true
                );

                renderCharts();

            }

        )

);



/* =========================================================
   EVENTOS — EMISSÕES ESTIMADAS
========================================================= */

$("#emissionModel")
    ?.addEventListener(
        "change",
        () => {
            updateEmissionUI();
            syncAdvancedBurnerCategory();
            estimateEmissions(true);
        }
    );

$("#emissionEquipment")
    ?.addEventListener(
        "change",
        () => {
            refreshEmissionCategory();
            updateEmissionUI();
            syncAdvancedBurnerCategory();
            estimateEmissions(true);
        }
    );

$("#emissionCategory")
    ?.addEventListener(
        "change",
        () => estimateEmissions(true)
    );

$("#emissionFlameMode")
    ?.addEventListener(
        "change",
        () => {
            updateEmissionFlameModeUI();
            estimateEmissions(true);
        }
    );

$("#emissionBurnerType")
    ?.addEventListener(
        "change",
        () => {
            syncAdvancedBurnerCategory();
            estimateEmissions(true);
        }
    );

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
.forEach(
    selector =>
        $(selector)
            ?.addEventListener(
                "input",
                () => estimateEmissions(true)
            )
);

$("#btnEstimateEmissions")
    ?.addEventListener(
        "click",
        () => estimateEmissions(false)
    );


$("#btnSolveBlend")
    .addEventListener(

        "click",

        solveBlend

    );



$("#btnApplyBlend")
    .addEventListener(

        "click",

        applyBlend

    );



$("#btnSensitivity")
    .addEventListener(

        "click",

        analyzeSensitivity

    );



$("#chartExcessMax")
    .addEventListener(

        "change",

        drawProcessCurve

    );



/*
$("#btnSaveCase")
    .addEventListener(

        "click",

        saveCase

    );
*/



/*
els.savedCases.addEventListener(

    "change",

    () => {

        if (
            els.savedCases.value !== ""
        ) {

            loadCase(
                els.savedCases.value
            );

        }

    }

);
*/



$("#btnCsv")
    .addEventListener(

        "click",

        () => {


            try {


                downloadText(

                    "\uFEFF"

                    +

                    csvText(),

                    "text/csv;charset=utf-8",

                    "combustao.csv"

                );

            }

            catch (
                e
            ) {

                showError(
                    e.message
                );

            }

        }

    );



$("#btnPrint")
    .addEventListener(

        "click",

        () =>
            window.print()

    );



window.addEventListener(

    "resize",

    () => {


        clearTimeout(
            resizeTimer
        );


        resizeTimer =

            setTimeout(

                renderCharts,

                150

            );

    }

);



/* =========================================================
   INICIALIZAÇÃO
========================================================= */

refreshPresetSelect(
    "manual"
);


//refreshCases();


fillSimpleGasSelect(

    $("#blendAdditive"),

    "H2"

);


reset();


})();
