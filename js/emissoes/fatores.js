/**
 * Catálogo AP-42 e seleção de fatores de emissão
 * Fatores normalizados em kg/GJ; detalhes da unidade original preservados.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
import { SOURCES, lbMmbtuToKgGJ, lbMmscfToKgGJ } from './referencias.js';
export const NG_COMMON = {
    ch4: lbMmscfToKgGJ(2.3),
    voc: lbMmscfToKgGJ(5.5),
    ratingCH4: "B",
    ratingVOC: "C"
};
export function externalFactor(noxLbMmscf, coLbMmscf, ratingNOx, ratingCO, meta = {}) {
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
export function directFactor(values, meta = {}) {
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
export const LIBRARY = {
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
export function equipmentList() {
    return Object.entries(LIBRARY).map(([id, v]) => ({ id, label: v.label }));
}
export function categoriesFor(equipment) {
    const e = LIBRARY[equipment];
    if (!e)
        return [];
    return Object.entries(e.categories).map(([id, v]) => ({ id, label: v.label }));
}
export function factorFor(equipment, category) {
    const entry = LIBRARY[equipment]?.categories?.[category];
    if (!entry)
        return null;
    return {
        ...entry.factor,
        label: entry.label,
        source: SOURCES[entry.factor.sourceKey] || null
    };
}
export function zeroFactor() {
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
export function customFactor(custom = {}) {
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
