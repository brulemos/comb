/**
 * CÁLCULOS / UTILIDADES
 * Constantes físicas, banco de dados e conversões de unidades.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */



export const CONFIG = {
    R: 8.314462618,
    Tn: 273.15,
    Pn: 101.325,
    Tref: 298.15,
    Mair: 28.96546,
    tol: 0.01,
    waterMW: 18.01528
};

export const gases = () => window.GAS_DATABASE || [];

export const getGas = id => gases().find(g => g.id === id);

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Converte temperatura fornecida em °C, °F ou K para kelvin. */
export function tempToK(value, unit) {
    if (unit === "C") {
        return value + 273.15;
    }
    if (unit === "F") {
        return (value - 32)
            *
                5 / 9
            +
                273.15;
    }
    return value;
}

/** Converte pressão para kPa; a pressão deve ser absoluta. */
export function pressureToKPa(value, unit) {
    if (unit === "bar") {
        return value * 100;
    }
    if (unit === "atm") {
        return value * 101.325;
    }
    if (unit === "kgfcm2") {
        return value * 98.0665;
    }
    return value;
}

/** Converte potência informada para kW. */
export function powerToKW(value, unit) {
    if (unit === "MW") {
        return value * 1000;
    }
    if (unit === "cv") {
        return value * 0.73549875;
    }
    if (unit === "hp") {
        return value * 0.745699872;
    }
    return value;
}

/** Converte potência de kW para a unidade escolhida. */
export function convertPower(kW, unit) {
    if (unit === "MW") {
        return kW / 1000;
    }
    if (unit === "cv") {
        return kW / 0.73549875;
    }
    if (unit === "hp") {
        return kW / 0.745699872;
    }
    return kW;
}
