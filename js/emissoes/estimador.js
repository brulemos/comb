/**
 * Estimativa de emissões e ajustes dos produtos
 * Base seca, O₂ de referência e balanço de carbono. Mesmas equações da versão original.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
import { MW } from './referencias.js';
import { factorFor, zeroFactor, customFactor } from './fatores.js';
export function findProduct(products, id) {
    return (products || []).find(p => p.id === id) || null;
}
export function adjustedProductsForIncomplete(products, coKmolH, ch4KmolH) {
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
        if (M)
            p.kgH = Math.max(0, p.kmolH) * M;
        delete p._M;
    }
    return { products: cloned, coKmolH: coAdj, ch4KmolH: ch4Adj, scaled };
}
export function dryTotals(products, config) {
    const dry = (products || []).filter(p => p.id !== "H2O");
    const kmolH = dry.reduce((s, p) => s + Math.max(0, Number(p.kmolH) || 0), 0);
    const vmN = config.R * config.Tn / config.Pn;
    const nm3H = kmolH * vmN;
    const o2 = dry.find(p => p.id === "O2");
    const o2Pct = kmolH > 0 ? (Math.max(0, o2?.kmolH || 0) / kmolH) * 100 : 0;
    return { kmolH, nm3H, o2Pct, vmN };
}
export function concentration(rateKgH, molarMass, dry) {
    const kmolH = molarMass > 0 ? rateKgH / molarMass : 0;
    return {
        kmolH,
        ppmvd: dry.kmolH > 0 ? kmolH / dry.kmolH * 1e6 : 0,
        mgNm3: dry.nm3H > 0 ? rateKgH * 1e6 / dry.nm3H : 0
    };
}
export function o2Correct(value, measuredO2, referenceO2) {
    const cm = Number(measuredO2);
    const cr = Number(referenceO2);
    if (!Number.isFinite(value) || !Number.isFinite(cm) || !Number.isFinite(cr))
        return NaN;
    if (cm >= 20.9 || cr >= 20.9)
        return NaN;
    return value * (20.9 - cr) / (20.9 - cm);
}
export function naturalGasApplicability(comp) {
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
export function estimate({ model = "factors", equipment = "boiler", category, custom, energyInputGJH, products, comp, config, o2ReferencePct = 3, advanced = {} }) {
    const warnings = [];
    let factor;
    if (model === "ideal")
        factor = zeroFactor();
    else if (equipment === "custom")
        factor = customFactor(custom);
    else
        factor = factorFor(equipment, category);
    if (!factor)
        throw new Error("Selecione uma categoria válida de fator de emissão.");
    const input = Number(energyInputGJH);
    if (!(input >= 0))
        throw new Error("Entrada térmica inválida para estimativa de emissões.");
    const applicability = naturalGasApplicability(comp);
    if (model !== "ideal" && equipment !== "custom" && !applicability.naturalGasLike) {
        warnings.push(`O fator selecionado é baseado em gás natural. A mistura atual contém ${applicability.methanePct.toFixed(2)}% mol de CH₄; use o resultado como extrapolação ou informe fatores personalizados.`);
    }
    if (model !== "ideal" && equipment !== "custom" && applicability.fuelBoundNPct > 0.01) {
        warnings.push("A mistura contém nitrogênio quimicamente ligado ao combustível. Os fatores de gás natural não representam adequadamente fuel-NOx.");
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
    const correctedCO2KgH = Math.max(0, theoreticalCO2 - adjusted.coKmolH * MW.CO2 - adjusted.ch4KmolH * MW.CO2);
    const carbonOutKgH = correctedCO2KgH * (12.011 / MW.CO2) +
        coKgH * (12.011 / MW.CO) +
        ch4KgH * (12.011 / MW.CH4);
    const carbonClosurePct = theoreticalCarbonKgH > 0
        ? carbonOutKgH / theoreticalCarbonKgH * 100
        : 100;
    if (model === "advanced") {
        warnings.push("No modo avançado, temperatura real de chama e tempo de residência são contexto de engenharia e tendência; eles não corrigem numericamente o fator AP-42 sem uma correlação calibrada para o equipamento.");
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
