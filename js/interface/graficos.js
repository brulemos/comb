/**
 * Gráficos e diagrama da combustão
 * Extraído do controlador original sem alterar as expressões dos cálculos.
 */

import { computeCase } from './calculo.js';
import { $, C, estado, fmt } from './contexto.js';

export function chartColors() {
        const css = getComputedStyle(document.documentElement);
        const v = k => css
            .getPropertyValue(k)
            .trim();
        return {
            blue: v("--blue")
                ||
                    "#0078a8",
            blueDark: v("--blue-dark")
                ||
                    "#003b5c",
            orange: v("--orange")
                ||
                    "#e65100",
            green: v("--green")
                ||
                    "#2e7d32",
            line: v("--line")
                ||
                    "#d8e0e5",
            text: v("--text")
                ||
                    "#263238",
            muted: v("--muted")
                ||
                    "#607d8b"
        };
    }

export function prepareCanvas(canvas, height = 300) {
        const width = Math.max(1, Math.floor(canvas
            .getBoundingClientRect()
            .width
            ||
                700));
        const dpr = Math.min(window.devicePixelRatio
            ||
                1, 2);
        canvas.width =
            Math.round(width * dpr);
        canvas.height =
            Math.round(height * dpr);
        canvas.style.height =
            `${height}px`;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        return {
            ctx,
            width,
            height,
            colors: chartColors()
        };
    }

export function drawEmpty(canvas) {
        const { ctx, width, colors } = prepareCanvas(canvas, 240);
        ctx.fillStyle =
            colors.muted;
        ctx.font =
            "14px Arial";
        ctx.textAlign =
            "center";
        ctx.fillText("Execute o cálculo para gerar o gráfico.", width / 2, 120);
    }

export function drawBars(canvas, data, unit = "%", note = "") {
        if (!data.length) {
            return drawEmpty(canvas);
        }
        const H = Math.max(250, 60
            +
                data.length * 38);
        const { ctx, width, height, colors } = prepareCanvas(canvas, H);
        const left = Math.min(160, Math.max(90, width * .24));
        const right = 95;
        const top = note
            ?
                44
            :
                20;
        const bottom = 18;
        const plotW = width
            -
                left
            -
                right;
        const plotH = height
            -
                top
            -
                bottom;
        const max = Math.max(...data.map(d => d.value), 1)
            *
                1.08;
        if (note) {
            ctx.fillStyle =
                colors.muted;
            ctx.font =
                "12px Arial";
            ctx.textAlign =
                "left";
            ctx.fillText(note, left, 18);
        }
        const rh = plotH
            /
                data.length;
        data.forEach((d, i) => {
            const y = top
                +
                    i * rh
                +
                    rh / 2;
            const bh = Math.min(23, rh * .58);
            const bw = plotW
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
            ctx.fillText(d.label, left - 10, y);
            ctx.fillStyle =
                "#eef2f4";
            ctx.fillRect(left, y - bh / 2, plotW, bh);
            ctx.fillStyle =
                d.color
                    ||
                        colors.blue;
            ctx.fillRect(left, y - bh / 2, bw, bh);
            ctx.textAlign =
                "left";
            ctx.fillStyle =
                colors.text;
            ctx.fillText(`${fmt(d.value, 2)} ${unit}`, left + bw + 7, y);
        });
    }

export function drawProcessCurve() {
        const canvas = $("#processCurveChart");
        if (!estado.ultimoCaso) {
            return drawEmpty(canvas);
        }
        const maxSelected = Number($("#chartExcessMax").value)
            ||
                50;
        const currentExcess = Math.max(0, (estado.ultimoCaso.lambda
            -
                1)
            *
                100);
        const maxExcess = Math.max(maxSelected, Math.ceil(currentExcess
            /
                10)
            *
                10);
        const step = maxExcess <= 50
            ?
                5
            :
                maxExcess <= 100
                    ?
                        10
                    :
                        20;
        const data = [];
        for (let excess = 0; excess <= maxExcess + 1e-9; excess += step) {
            const opts = {
                ...estado.ultimoCaso.opts,
                combustionMode: "excesso",
                excessPct: excess
            };
            const r = computeCase(estado.ultimoCaso.comp, opts);
            data.push({
                excess,
                o2: r.dry.o2DryPct,
                co2: r.dry.co2DryPct
            });
        }
        const { ctx, width, height, colors } = prepareCanvas(canvas, 400);
        const left = 60;
        const right = 25;
        const top = 45;
        const bottom = 55;
        const pw = width
            -
                left
            -
                right;
        const ph = height
            -
                top
            -
                bottom;
        const maxY = Math.ceil(Math.max(...data.flatMap(d => [
            d.o2,
            d.co2
        ]), 5)
            *
                1.15
            /
                5)
            *
                5;
        const X = x => left
            +
                x
                    /
                        maxExcess
                    *
                        pw;
        const Y = y => top
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
        for (let i = 0; i <= 5; i++) {
            const yv = maxY
                *
                    i
                /
                    5;
            const y = Y(yv);
            ctx.strokeStyle =
                colors.line;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + pw, y);
            ctx.stroke();
            ctx.fillStyle =
                colors.muted;
            ctx.textAlign =
                "right";
            ctx.fillText(fmt(yv, 1), left - 7, y + 3);
            const xv = maxExcess
                *
                    i
                /
                    5;
            const x = X(xv);
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + ph);
            ctx.stroke();
            ctx.textAlign =
                "center";
            ctx.fillText(`${fmt(xv, 0)}%`, x, top + ph + 18);
        }
        const line = (key, color) => {
            ctx.strokeStyle =
                color;
            ctx.lineWidth =
                3;
            ctx.beginPath();
            data.forEach((d, i) => i
                ?
                    ctx.lineTo(X(d.excess), Y(d[key]))
                :
                    ctx.moveTo(X(d.excess), Y(d[key])));
            ctx.stroke();
        };
        line("o2", colors.blue);
        line("co2", colors.orange);
        const xa = X(currentExcess);
        ctx.save();
        ctx.strokeStyle =
            colors.green;
        ctx.setLineDash([
            7,
            5
        ]);
        ctx.beginPath();
        ctx.moveTo(xa, top);
        ctx.lineTo(xa, top + ph);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle =
            colors.text;
        ctx.font =
            "12px Arial";
        ctx.textAlign =
            "left";
        ctx.fillText("O₂ seco", left, 20);
        ctx.fillStyle =
            colors.blue;
        ctx.fillRect(left - 18, 14, 12, 4);
        ctx.fillStyle =
            colors.text;
        ctx.fillText("CO₂ seco", left + 95, 20);
        ctx.fillStyle =
            colors.orange;
        ctx.fillRect(left + 77, 14, 12, 4);
    }

export function renderCharts() {
        if (!estado.ultimoCaso) {
            return [
                "fuelChart",
                "oxidizerChart",
                "productsChart",
                "oxidizerDemandChart",
                "processCurveChart"
            ]
                .forEach(id => drawEmpty($("#" + id)));
        }
        const colors = chartColors();
        drawBars($("#fuelChart"), estado.ultimoCaso.comp
            .filter(i => i.y > 1e-10)
            .map(i => ({
            label: i.gas.formula,
            value: i.y * 100,
            color: colors.blue
        }))
            .sort((a, b) => b.value - a.value));
        drawBars($("#oxidizerChart"), [
            {
                label: "O₂",
                value: estado.ultimoCaso.oxid.xO2
                    *
                        100,
                color: colors.blue
            },
            {
                label: "N₂",
                value: estado.ultimoCaso.oxid.xN2
                    *
                        100,
                color: colors.blueDark
            },
            ...(estado.ultimoCaso.oxid.xH2O
                >
                    1e-8
                ?
                    [
                        {
                            label: "H₂O",
                            value: estado.ultimoCaso.oxid.xH2O
                                *
                                    100,
                            color: colors.green
                        }
                    ]
                :
                    [])
        ]);
        drawBars($("#productsChart"), C.fractions(C.productBasis(estado.ultimoCaso.products, $("#baseProdutos").value))
            .filter(i => i.y > 1e-8)
            .map(i => ({
            label: i.formula,
            value: i.y * 100,
            color: colors.orange
        }))
            .sort((a, b) => b.value - a.value));
        drawBars($("#oxidizerDemandChart"), [
            {
                label: "Estequiométrico",
                value: estado.ultimoCaso.oxid.oxidStoichMass,
                color: colors.blueDark
            },
            {
                label: "Real",
                value: estado.ultimoCaso.oxid.oxidRealMass,
                color: colors.green
            }
        ], "kg/h", `λ=${fmt(estado.ultimoCaso.lambda, 3)} · excesso=${fmt((estado.ultimoCaso.lambda - 1) * 100, 2)}%`);
        drawProcessCurve();
    }
