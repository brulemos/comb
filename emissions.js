"use strict";

(() => {

const LB_MMBTU_TO_KG_GJ = 0.45359237 / 1.05505585262;
const NG_HHV_BTU_SCF = 1020;
const MW = {
    CO: 28.0101,
    CO2: 44.0095,
    CH4: 16.04246,
    NO: 30.0061,
    NO2: 46.0055,
    O2: 31.9988,
    H2O: 18.01528
};

const SOURCES = {
    ap42_14: {
        short: "US EPA AP-42, Seção 1.4 — Natural Gas Combustion",
        edition: "Fifth Edition; seção de 1998, correção editorial de abril/2026",
        url: "https://www.epa.gov/sites/default/files/2020-09/documents/1.4_natural_gas_combustion.pdf"
    },
    ap42_31: {
        short: "US EPA AP-42, Seção 3.1 — Stationary Gas Turbines",
        edition: "Fifth Edition, Supplement F, abril/2000",
        url: "https://www.epa.gov/sites/default/files/2020-10/documents/c03s01.pdf"
    },
    ap42_32: {
        short: "US EPA AP-42, Seção 3.2 — Natural Gas-fired Reciprocating Engines",
        edition: "Fifth Edition, atualização de outubro/2024",
        url: "https://www.epa.gov/system/files/documents/2024-10/c03s02_2024-update_0.pdf"
    }
};

function lbMmbtuToKgGJ(value) {
    return Number(value) * LB_MMBTU_TO_KG_GJ;
}

function lbMmscfToKgGJ(value) {
    return lbMmbtuToKgGJ(Number(value) / NG_HHV_BTU_SCF);
}

const NG_COMMON = {
    ch4: lbMmscfToKgGJ(2.3),
    voc: lbMmscfToKgGJ(5.5),
    ratingCH4: "B",
    ratingVOC: "C"
};

function externalFactor(noxLbMmscf, coLbMmscf, ratingNOx, ratingCO, meta = {}) {
    return {
        nox: lbMmscfToKgGJ(noxLbMmscf),
        co: lbMmscfToKgGJ(coLbMmscf),
        ch4: NG_COMMON.ch4,
        voc: NG_COMMON.voc,
        ratingNOx,
        ratingCO,
        ratingCH4: NG_COMMON.ratingCH4,
        ratingVOC: NG_COMMON.ratingVOC,
        original: {
            nox: `${noxLbMmscf} lb/10⁶ scf`,
            co: `${coLbMmscf} lb/10⁶ scf`,
            ch4: "2,3 lb/10⁶ scf",
            voc: "5,5 lb/10⁶ scf"
        },
        sourceKey: "ap42_14",
        table: "Tabelas 1.4-1 e 1.4-2",
        ...meta
    };
}

function directFactor(values, meta = {}) {
    return {
        nox: lbMmbtuToKgGJ(values.nox),
        co: lbMmbtuToKgGJ(values.co),
        ch4: lbMmbtuToKgGJ(values.ch4),
        voc: lbMmbtuToKgGJ(values.voc),
        ratingNOx: values.ratingNOx,
        ratingCO: values.ratingCO,
        ratingCH4: values.ratingCH4,
        ratingVOC: values.ratingVOC,
        original: {
            nox: `${values.nox} lb/MMBtu`,
            co: `${values.co} lb/MMBtu`,
            ch4: `${values.ch4} lb/MMBtu`,
            voc: `${values.voc} lb/MMBtu`
        },
        ...meta
    };
}

const LIBRARY = {
    boiler: {
        label: "Caldeira industrial",
        categories: {
            small_uncontrolled: {
                label: "< 100 MMBtu/h — sem controle",
                factor: externalFactor(100, 84, "B", "B", {
                    applicability: "Caldeiras a gás natural com entrada térmica < 100 MMBtu/h, sem controle de NOx."
                })
            },
            small_lnb: {
                label: "< 100 MMBtu/h — queimador Low-NOx",
                factor: externalFactor(50, 84, "D", "B", {
                    applicability: "Caldeiras a gás natural < 100 MMBtu/h com queimador Low-NOx."
                })
            },
            small_lnb_fgr: {
                label: "< 100 MMBtu/h — Low-NOx + FGR",
                factor: externalFactor(32, 84, "C", "B", {
                    applicability: "Caldeiras a gás natural < 100 MMBtu/h com Low-NOx + recirculação de gases (FGR)."
                })
            },
            large_pre: {
                label: "> 100 MMBtu/h — wall-fired, pre-NSPS",
                factor: externalFactor(280, 84, "A", "B", {
                    applicability: "Caldeiras wall-fired a gás natural > 100 MMBtu/h, categoria pre-NSPS."
                })
            },
            large_post: {
                label: "> 100 MMBtu/h — wall-fired, post-NSPS",
                factor: externalFactor(190, 84, "A", "B", {
                    applicability: "Caldeiras wall-fired a gás natural > 100 MMBtu/h, categoria post-NSPS."
                })
            },
            large_lnb: {
                label: "> 100 MMBtu/h — Low-NOx",
                factor: externalFactor(140, 84, "A", "B", {
                    applicability: "Caldeiras wall-fired a gás natural > 100 MMBtu/h com queimadores Low-NOx."
                })
            },
            large_fgr: {
                label: "> 100 MMBtu/h — FGR",
                factor: externalFactor(100, 84, "D", "B", {
                    applicability: "Caldeiras wall-fired a gás natural > 100 MMBtu/h com FGR."
                })
            },
            tangential: {
                label: "Tangencial — sem controle",
                factor: externalFactor(170, 24, "A", "C", {
                    applicability: "Caldeiras tangential-fired a gás natural, sem controle."
                })
            },
            tangential_fgr: {
                label: "Tangencial — FGR",
                factor: externalFactor(76, 98, "D", "D", {
                    applicability: "Caldeiras tangential-fired a gás natural com FGR."
                })
            }
        }
    },

    furnace: {
        label: "Forno",
        categories: {
            external_proxy: {
                label: "Combustão externa — proxy AP-42 1.4",
                factor: externalFactor(100, 84, "B", "B", {
                    proxy: true,
                    applicability: "Proxy para forno a gás natural. AP-42 1.4 agrupa boilers/furnaces, mas o fator selecionado corresponde à categoria de pequenas caldeiras; valide com dados do equipamento."
                })
            },
            external_proxy_lnb: {
                label: "Combustão externa — proxy Low-NOx",
                factor: externalFactor(50, 84, "D", "B", {
                    proxy: true,
                    applicability: "Proxy de pequena unidade de combustão externa com Low-NOx; não substitui fator específico do forno."
                })
            },
            external_proxy_lnb_fgr: {
                label: "Combustão externa — proxy Low-NOx + FGR",
                factor: externalFactor(32, 84, "C", "B", {
                    proxy: true,
                    applicability: "Proxy de pequena unidade de combustão externa com Low-NOx + FGR; não substitui fator específico do forno."
                })
            }
        }
    },

    burner: {
        label: "Queimador",
        categories: {
            external_proxy: {
                label: "Convencional — proxy AP-42 1.4",
                factor: externalFactor(100, 84, "B", "B", {
                    proxy: true,
                    applicability: "Proxy de pequena unidade de combustão externa a gás natural. O fator é do conjunto combustor/equipamento, não do queimador isolado."
                })
            },
            external_proxy_lnb: {
                label: "Low-NOx — proxy AP-42 1.4",
                factor: externalFactor(50, 84, "D", "B", {
                    proxy: true,
                    applicability: "Proxy de pequena unidade de combustão externa com queimador Low-NOx."
                })
            },
            external_proxy_lnb_fgr: {
                label: "Low-NOx + FGR — proxy AP-42 1.4",
                factor: externalFactor(32, 84, "C", "B", {
                    proxy: true,
                    applicability: "Proxy de pequena unidade de combustão externa com Low-NOx + FGR."
                })
            }
        }
    },

    turbine: {
        label: "Turbina a gás",
        categories: {
            uncontrolled: {
                label: "Gás natural — sem controle (carga ≥ 80%)",
                factor: directFactor({
                    nox: 0.32,
                    co: 0.082,
                    ch4: 0.0086,
                    voc: 0.0021,
                    ratingNOx: "A",
                    ratingCO: "A",
                    ratingCH4: "C",
                    ratingVOC: "D"
                }, {
                    sourceKey: "ap42_31",
                    table: "Tabelas 3.1-1 e 3.1-2a",
                    applicability: "Turbina estacionária a gás natural em alta carga (≥ 80%), sem controle adicional."
                })
            },
            water_steam: {
                label: "Injeção de água/vapor (carga ≥ 80%)",
                factor: directFactor({
                    nox: 0.13,
                    co: 0.03,
                    ch4: 0.0086,
                    voc: 0.0021,
                    ratingNOx: "A",
                    ratingCO: "A",
                    ratingCH4: "C",
                    ratingVOC: "D"
                }, {
                    sourceKey: "ap42_31",
                    table: "Tabelas 3.1-1 e 3.1-2a",
                    applicability: "Turbina a gás natural em alta carga com injeção de água/vapor. CH4/VOC são fatores gerais da seção e têm limitações próprias."
                })
            },
            lean_premix: {
                label: "Lean-premix / Dry Low-NOx (carga ≥ 80%)",
                factor: directFactor({
                    nox: 0.099,
                    co: 0.015,
                    ch4: 0.0086,
                    voc: 0.0021,
                    ratingNOx: "D",
                    ratingCO: "D",
                    ratingCH4: "C",
                    ratingVOC: "D"
                }, {
                    sourceKey: "ap42_31",
                    table: "Tabelas 3.1-1 e 3.1-2a",
                    applicability: "Turbina a gás natural em alta carga com combustão lean-premix/Dry Low-NOx."
                })
            }
        }
    },

    engine: {
        label: "Motor a gás",
        categories: {
            slb2_high: {
                label: "2 tempos lean-burn — 90–105% carga",
                factor: directFactor({
                    nox: 3.17,
                    co: 0.386,
                    ch4: 1.45,
                    voc: 0.120,
                    ratingNOx: "A",
                    ratingCO: "A",
                    ratingCH4: "C",
                    ratingVOC: "C"
                }, {
                    sourceKey: "ap42_32",
                    table: "Tabela 3.2-1",
                    applicability: "Motor estacionário a gás natural, 2 tempos lean-burn, carga de 90 a 105%."
                })
            },
            slb2_low: {
                label: "2 tempos lean-burn — < 90% carga",
                factor: directFactor({
                    nox: 1.94,
                    co: 0.353,
                    ch4: 1.45,
                    voc: 0.120,
                    ratingNOx: "A",
                    ratingCO: "A",
                    ratingCH4: "C",
                    ratingVOC: "C"
                }, {
                    sourceKey: "ap42_32",
                    table: "Tabela 3.2-1",
                    applicability: "Motor estacionário a gás natural, 2 tempos lean-burn, carga < 90%."
                })
            },
            slb4_high: {
                label: "4 tempos lean-burn — 90–105% carga",
                factor: directFactor({
                    nox: 4.08,
                    co: 0.317,
                    ch4: 1.25,
                    voc: 0.118,
                    ratingNOx: "B",
                    ratingCO: "C",
                    ratingCH4: "C",
                    ratingVOC: "C"
                }, {
                    sourceKey: "ap42_32",
                    table: "Tabela 3.2-2",
                    applicability: "Motor estacionário a gás natural, 4 tempos lean-burn, carga de 90 a 105%."
                })
            },
            slb4_low: {
                label: "4 tempos lean-burn — < 90% carga",
                factor: directFactor({
                    nox: 0.847,
                    co: 0.557,
                    ch4: 1.25,
                    voc: 0.118,
                    ratingNOx: "B",
                    ratingCO: "B",
                    ratingCH4: "C",
                    ratingVOC: "C"
                }, {
                    sourceKey: "ap42_32",
                    table: "Tabela 3.2-2",
                    applicability: "Motor estacionário a gás natural, 4 tempos lean-burn, carga < 90%."
                })
            },
            srb4_high: {
                label: "4 tempos rich-burn — 90–105% carga",
                factor: directFactor({
                    nox: 2.21,
                    co: 3.72,
                    ch4: 0.230,
                    voc: 0.0296,
                    ratingNOx: "A",
                    ratingCO: "A",
                    ratingCH4: "C",
                    ratingVOC: "C"
                }, {
                    sourceKey: "ap42_32",
                    table: "Tabela 3.2-3",
                    applicability: "Motor estacionário a gás natural, 4 tempos rich-burn, carga de 90 a 105%."
                })
            },
            srb4_low: {
                label: "4 tempos rich-burn — < 90% carga",
                factor: directFactor({
                    nox: 2.27,
                    co: 3.51,
                    ch4: 0.230,
                    voc: 0.0296,
                    ratingNOx: "C",
                    ratingCO: "C",
                    ratingCH4: "C",
                    ratingVOC: "C"
                }, {
                    sourceKey: "ap42_32",
                    table: "Tabela 3.2-3",
                    applicability: "Motor estacionário a gás natural, 4 tempos rich-burn, carga < 90%."
                })
            }
        }
    },

    custom: {
        label: "Personalizado",
        categories: {}
    }
};

function equipmentList() {
    return Object.entries(LIBRARY).map(([id, v]) => ({ id, label: v.label }));
}

function categoriesFor(equipment) {
    const e = LIBRARY[equipment];
    if (!e) return [];
    return Object.entries(e.categories).map(([id, v]) => ({ id, label: v.label }));
}

function factorFor(equipment, category) {
    const entry = LIBRARY[equipment]?.categories?.[category];
    if (!entry) return null;
    return {
        ...entry.factor,
        label: entry.label,
        source: SOURCES[entry.factor.sourceKey] || null
    };
}

function zeroFactor() {
    return {
        nox: 0,
        co: 0,
        ch4: 0,
        voc: 0,
        ratingNOx: "—",
        ratingCO: "—",
        ratingCH4: "—",
        ratingVOC: "—",
        original: { nox: "0", co: "0", ch4: "0", voc: "0" },
        sourceKey: null,
        source: null,
        table: "Modelo ideal",
        applicability: "Combustão completa ideal: emissões reais não são estimadas."
    };
}

function customFactor(custom = {}) {
    const clean = key => {
        const v = Number(custom[key]);
        return Number.isFinite(v) && v >= 0 ? v : 0;
    };

    return {
        nox: clean("nox"),
        co: clean("co"),
        ch4: clean("ch4"),
        voc: clean("voc"),
        ratingNOx: "usuário",
        ratingCO: "usuário",
        ratingCH4: "usuário",
        ratingVOC: "usuário",
        original: {
            nox: `${clean("nox")} kg/GJ`,
            co: `${clean("co")} kg/GJ`,
            ch4: `${clean("ch4")} kg/GJ`,
            voc: `${clean("voc")} kg/GJ`
        },
        sourceKey: null,
        source: null,
        table: "Fatores personalizados",
        applicability: custom.note || "Fatores definidos pelo usuário.",
        custom: true
    };
}

function findProduct(products, id) {
    return (products || []).find(p => p.id === id) || null;
}

function adjustedProductsForIncomplete(products, coKmolH, ch4KmolH) {
    const cloned = (products || []).map(p => ({ ...p }));
    const byId = new Map(cloned.map(p => [p.id, p]));

    const ensure = (id, nome, M) => {
        if (!byId.has(id)) {
            const p = { id, nome, kmolH: 0, kgH: 0 };
            cloned.push(p);
            byId.set(id, p);
        }
        const p = byId.get(id);
        p._M = M;
        return p;
    };

    const co2 = ensure("CO2", "Dióxido de Carbono", MW.CO2);
    const h2o = ensure("H2O", "Água", MW.H2O);
    const o2 = ensure("O2", "Oxigênio", MW.O2);
    const co = ensure("CO", "Monóxido de Carbono", MW.CO);
    const ch4 = ensure("CH4", "Metano", MW.CH4);

    const maxByCarbon = Math.max(0, co2.kmolH);
    let coAdj = Math.max(0, coKmolH);
    let ch4Adj = Math.max(0, ch4KmolH);

    const carbonNeed = coAdj + ch4Adj;
    let scaled = false;

    if (carbonNeed > maxByCarbon && carbonNeed > 0) {
        const f = maxByCarbon / carbonNeed;
        coAdj *= f;
        ch4Adj *= f;
        scaled = true;
    }

    if (2 * ch4Adj > Math.max(0, h2o.kmolH) && ch4Adj > 0) {
        const f = Math.max(0, h2o.kmolH) / (2 * ch4Adj);
        coAdj *= f;
        ch4Adj *= f;
        scaled = true;
    }

    co2.kmolH -= coAdj + ch4Adj;
    h2o.kmolH -= 2 * ch4Adj;
    o2.kmolH += 0.5 * coAdj + 2 * ch4Adj;
    co.kmolH += coAdj;
    ch4.kmolH += ch4Adj;

    for (const p of cloned) {
        const M = p._M || ({ CO2: MW.CO2, H2O: MW.H2O, O2: MW.O2, CO: MW.CO, CH4: MW.CH4 }[p.id]);
        if (M) p.kgH = Math.max(0, p.kmolH) * M;
        delete p._M;
    }

    return { products: cloned, coKmolH: coAdj, ch4KmolH: ch4Adj, scaled };
}

function dryTotals(products, config) {
    const dry = (products || []).filter(p => p.id !== "H2O");
    const kmolH = dry.reduce((s, p) => s + Math.max(0, Number(p.kmolH) || 0), 0);
    const vmN = config.R * config.Tn / config.Pn;
    const nm3H = kmolH * vmN;
    const o2 = dry.find(p => p.id === "O2");
    const o2Pct = kmolH > 0 ? (Math.max(0, o2?.kmolH || 0) / kmolH) * 100 : 0;
    return { kmolH, nm3H, o2Pct, vmN };
}

function concentration(rateKgH, molarMass, dry) {
    const kmolH = molarMass > 0 ? rateKgH / molarMass : 0;
    return {
        kmolH,
        ppmvd: dry.kmolH > 0 ? kmolH / dry.kmolH * 1e6 : 0,
        mgNm3: dry.nm3H > 0 ? rateKgH * 1e6 / dry.nm3H : 0
    };
}

function o2Correct(value, measuredO2, referenceO2) {
    const cm = Number(measuredO2);
    const cr = Number(referenceO2);
    if (!Number.isFinite(value) || !Number.isFinite(cm) || !Number.isFinite(cr)) return NaN;
    if (cm >= 20.9 || cr >= 20.9) return NaN;
    return value * (20.9 - cr) / (20.9 - cm);
}

function naturalGasApplicability(comp) {
    const ch4 = (comp || []).find(i => i.gas?.id === "CH4");
    const methanePct = (ch4?.y || 0) * 100;
    const fuelBoundN = (comp || []).filter(i => (i.gas?.atomos?.N || 0) > 0 && i.gas?.id !== "N2")
        .reduce((s, i) => s + (i.y || 0), 0) * 100;

    return {
        methanePct,
        fuelBoundNPct: fuelBoundN,
        naturalGasLike: methanePct >= 85 && fuelBoundN < 0.01
    };
}

function estimate({
    model = "factors",
    equipment = "boiler",
    category,
    custom,
    energyInputGJH,
    products,
    comp,
    config,
    o2ReferencePct = 3,
    advanced = {}
}) {
    const warnings = [];

    let factor;
    if (model === "ideal") factor = zeroFactor();
    else if (equipment === "custom") factor = customFactor(custom);
    else factor = factorFor(equipment, category);

    if (!factor) throw new Error("Selecione uma categoria válida de fator de emissão.");

    const input = Number(energyInputGJH);
    if (!(input >= 0)) throw new Error("Entrada térmica inválida para estimativa de emissões.");

    const applicability = naturalGasApplicability(comp);
    if (model !== "ideal" && equipment !== "custom" && !applicability.naturalGasLike) {
        warnings.push(
            `O fator selecionado é baseado em gás natural. A mistura atual contém ${applicability.methanePct.toFixed(2)}% mol de CH₄; use o resultado como extrapolação ou informe fatores personalizados.`
        );
    }
    if (model !== "ideal" && equipment !== "custom" && applicability.fuelBoundNPct > 0.01) {
        warnings.push(
            "A mistura contém nitrogênio quimicamente ligado ao combustível. Os fatores de gás natural não representam adequadamente fuel-NOx."
        );
    }
    if (factor.proxy) {
        warnings.push("O fator selecionado é um proxy de categoria AP-42; confirme a aplicabilidade ao equipamento real.");
    }

    let coKgH = factor.co * input;
    let noxKgH = factor.nox * input;
    let ch4KgH = factor.ch4 * input;
    let vocKgH = factor.voc * input;

    const theoreticalCO2 = findProduct(products, "CO2")?.kgH || 0;
    const theoreticalCarbonKgH = theoreticalCO2 * (12.011 / MW.CO2);

    if (theoreticalCarbonKgH <= 1e-12) {
        if (coKgH > 0 || ch4KgH > 0 || vocKgH > 0) {
            warnings.push("A mistura não contém carbono disponível no balanço ideal; CO, CH₄ e VOC foram zerados por consistência elementar.");
        }
        coKgH = 0;
        ch4KgH = 0;
        vocKgH = 0;
    }

    const rawCoKmol = coKgH / MW.CO;
    const rawCh4Kmol = ch4KgH / MW.CH4;
    const adjusted = adjustedProductsForIncomplete(products, rawCoKmol, rawCh4Kmol);

    if (adjusted.scaled) {
        warnings.push("CO/CH₄ estimados excederam a disponibilidade estequiométrica de C/H; as parcelas foram limitadas para manter o balanço elementar físico.");
        coKgH = adjusted.coKmolH * MW.CO;
        ch4KgH = adjusted.ch4KmolH * MW.CH4;
    }

    const dry = dryTotals(adjusted.products, config);
    const co = concentration(coKgH, MW.CO, dry);
    const ch4 = concentration(ch4KgH, MW.CH4, dry);
    const nox = concentration(noxKgH, MW.NO2, dry); // NOx expresso como NO2 equivalente

    const vocMgNm3 = dry.nm3H > 0 ? vocKgH * 1e6 / dry.nm3H : 0;

    const ref = Number(o2ReferencePct);
    co.mgNm3Ref = o2Correct(co.mgNm3, dry.o2Pct, ref);
    co.ppmvdRef = o2Correct(co.ppmvd, dry.o2Pct, ref);
    nox.mgNm3Ref = o2Correct(nox.mgNm3, dry.o2Pct, ref);
    nox.ppmvdRef = o2Correct(nox.ppmvd, dry.o2Pct, ref);
    ch4.ppmvdRef = o2Correct(ch4.ppmvd, dry.o2Pct, ref);
    const vocMgNm3Ref = o2Correct(vocMgNm3, dry.o2Pct, ref);

    let noPpmvd = NaN;
    let no2Ppmvd = NaN;
    const split = Number(advanced.noFractionPct);
    if (model === "advanced" && Number.isFinite(split) && split >= 0 && split <= 100) {
        const f = split / 100;
        noPpmvd = nox.ppmvd * f;
        no2Ppmvd = nox.ppmvd * (1 - f);
    }

    const correctedCO2KgH = Math.max(
        0,
        theoreticalCO2 - adjusted.coKmolH * MW.CO2 - adjusted.ch4KmolH * MW.CO2
    );

    const carbonOutKgH =
        correctedCO2KgH * (12.011 / MW.CO2) +
        coKgH * (12.011 / MW.CO) +
        ch4KgH * (12.011 / MW.CH4);

    const carbonClosurePct = theoreticalCarbonKgH > 0
        ? carbonOutKgH / theoreticalCarbonKgH * 100
        : 100;

    if (model === "advanced") {
        warnings.push(
            "No modo avançado, temperatura real de chama e tempo de residência são contexto de engenharia e tendência; eles não corrigem numericamente o fator AP-42 sem uma correlação calibrada para o equipamento."
        );
    }

    return {
        model,
        equipment,
        category,
        factor,
        energyInputGJH: input,
        o2ReferencePct: ref,
        dry,
        rates: {
            coKgH,
            noxKgH,
            ch4KgH,
            vocKgH
        },
        concentration: {
            co,
            nox,
            ch4,
            vocMgNm3,
            vocMgNm3Ref,
            noPpmvd,
            no2Ppmvd
        },
        adjustedProducts: adjusted.products,
        balance: {
            theoreticalCO2KgH: theoreticalCO2,
            correctedCO2KgH,
            carbonClosurePct,
            vocIncludedInAtomicClosure: false
        },
        applicability,
        advanced: {
            flameTemperatureC: Number(advanced.flameTemperatureC),
            residenceTimeS: Number(advanced.residenceTimeS),
            noFractionPct: Number.isFinite(split) ? split : NaN,
            burnerType: advanced.burnerType || ""
        },
        warnings
    };
}

window.EmissionEstimator = {
    SOURCES,
    LIBRARY,
    MW,
    equipmentList,
    categoriesFor,
    factorFor,
    estimate,
    lbMmbtuToKgGJ,
    lbMmscfToKgGJ
};

})();
