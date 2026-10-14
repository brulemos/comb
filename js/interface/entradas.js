/**
 * Leitura e validação de condições experimentais
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { $, C, els, fmt, num } from './contexto.js';

export function inputMode() {
        return $('input[name="modoEntrada"]:checked').value;
    }

export function combustionMode() {
        return $('input[name="modoCombustao"]:checked').value;
    }

export function updateInputModeUI() {
        const power = inputMode()
            ===
                "potencia";
        $("#flowInputBlock")
            .classList
            .toggle("hidden", power);
        $("#powerInputBlock")
            .classList
            .toggle("hidden", !power);
    }

export function updateFlowUI() {
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
        const v = map[els.flowType.value];
        els.flowLabel.textContent =
            v[0];
        els.flowUnit.textContent =
            v[1];
        els.flowHelp.textContent =
            v[2];
    }

export function updateN2() {
        const o2 = Number(els.o2.value);
        els.n2.value =
            Number.isFinite(o2)
                ?
                    Math.max(0, 100 - o2).toFixed(2)
                :
                    "";
        updateHumidityPreview();
    }

export function humiditySettings() {
        const enabled = $("#usarUmidadeAr").checked;
        const tempK = C.tempToK(num("#temperaturaComburente"), $("#unidadeTemperaturaComburente").value);
        const pressureKPa = C.pressureToKPa(num("#pressaoComburente"), $("#unidadePressaoComburente").value);
        return {
            enabled,
            rhPct: num("#umidadeRelativa"),
            tempK,
            pressureKPa
        };
    }

export function updateHumidityUI() {
        $("#humidityFields")
            .classList
            .toggle("hidden", !$("#usarUmidadeAr").checked);
        updateHumidityPreview();
    }

export function updateHumidityPreview() {
        try {
            const h = humiditySettings();
            const wet = C.humidOxidizerComposition({
                dryO2Pct: Number(els.o2.value),
                rhPct: h.rhPct,
                tempK: h.tempK,
                pressureKPa: h.pressureKPa,
                humidityEnabled: h.enabled
            });
            $("#previewH2OAir").textContent =
                h.enabled
                    ?
                        `${fmt(wet.xH2O * 100, 3)} % mol`
                    :
                        "0,000 % mol";
        }
        catch {
            $("#previewH2OAir").textContent =
                "—";
        }
    }

export function updateCombustionModeUI() {
        const measured = combustionMode()
            ===
                "o2medido";
        $("#fieldExcesso")
            .classList
            .toggle("hidden", measured);
        $("#fieldO2Medido")
            .classList
            .toggle("hidden", !measured);
        updateLambdaPreview();
    }

export function updateLambdaPreview() {
        if (combustionMode()
            ===
                "o2medido") {
            els.lambdaPreview.textContent =
                "λ = calculado pelo O₂ seco (válido para λ ≥ 1)";
            return;
        }
        els.lambdaPreview.textContent =
            `λ = ${fmt(1
                +
                    Number(els.excess.value
                        ||
                            0)
                        /
                            100, 3)}`;
    }

export function showError(msg) {
        els.error.textContent =
            msg;
        els.error.classList.remove("hidden");
    }

export function hideError() {
        els.error.classList.add("hidden");
    }

export function collectOptions() {
        const fuelT = C.tempToK(num("#temperatura"), $("#unidadeTemperatura").value);
        const fuelP = C.pressureToKPa(num("#pressao"), $("#unidadePressao").value);
        const stackT = C.tempToK(num("#temperaturaProdutos"), $("#unidadeTemperaturaProdutos").value);
        const stackP = C.pressureToKPa(num("#pressaoProdutos"), $("#unidadePressaoProdutos").value);
        const humidity = humiditySettings();
        const dryO2Pct = Number(els.o2.value);
        if (!(fuelT > 0)
            ||
                !(fuelP > 0)
            ||
                !(stackT > 0)
            ||
                !(stackP > 0)) {
            throw new Error("Temperaturas e pressões devem ser fisicamente válidas.");
        }
        if (!(dryO2Pct > 0
            &&
                dryO2Pct <= 100)) {
            throw new Error("O₂ seco do comburente deve estar entre 0 e 100 %.");
        }
        if (humidity.enabled
            &&
                (!(humidity.tempK > 0)
                    ||
                        !(humidity.pressureKPa > 0)
                    ||
                        humidity.rhPct < 0
                    ||
                        humidity.rhPct > 100)) {
            throw new Error("Verifique temperatura, pressão e umidade relativa do comburente.");
        }
        // A validação é feita no JS mesmo que o HTML tenha min/max:
        // entradas podem ser alteradas via scripts, colagem ou edição de atributos.
        const referencia = $("#o2Referencia");
        const referenciaO2 = Number(referencia?.value);
        if (!referencia || referencia.value.trim() === "" ||
            !Number.isFinite(referenciaO2) || referenciaO2 < 0 || referenciaO2 >= 20.9) {
            throw new Error("O₂ de referência inválido: informe valor de 0 até menos de 20,9%.");
        }
        const opts = {
            fuelT,
            fuelP,
            stackT,
            stackP,
            humidity,
            dryO2Pct,
            inputMode: inputMode(),
            flowType: els.flowType.value,
            flowValue: Number(els.flow.value),
            targetPowerKW: C.powerToKW(num("#potenciaDesejada"), $("#unidadePotenciaDesejada").value),
            combustionMode: combustionMode(),
            excessPct: Number(els.excess.value),
            measuredO2: Number(els.measuredO2.value)
        };
        if (opts.inputMode === "vazao"
            &&
                !(opts.flowValue > 0)) {
            throw new Error("Informe uma vazão positiva.");
        }
        if (opts.inputMode === "potencia"
            &&
                !(opts.targetPowerKW > 0)) {
            throw new Error("Informe uma potência desejada positiva.");
        }
        if (opts.combustionMode === "excesso"
            &&
                !(opts.excessPct >= 0)) {
            throw new Error("Excesso de comburente inválido.");
        }
        return opts;
    }
