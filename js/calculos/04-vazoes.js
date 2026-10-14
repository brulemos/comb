/**
 * CÁLCULOS / VAZÕES
 * Conversão entre vazões e potência química desejada.
 *
 * Cada função mantém a implementação matemática original.
 * Os imports explicitam dependências para facilitar revisão e rastreabilidade.
 */



/* =========================================================
   VAZÕES
========================================================= */
/** Obtém vazões mássica (kg/h), volumétrica real (m³/h) e normal (Nm³/h). */
export function flowsFromInput(type, value, rho, rhoN) {
    let mass;
    let volume;
    let normal;
    if (type === "massica") {
        mass =
            value;
        volume =
            mass / rho;
        normal =
            mass / rhoN;
    }
    else if (type === "volumetrica") {
        volume =
            value;
        mass =
            volume * rho;
        normal =
            mass / rhoN;
    }
    else {
        normal =
            value;
        mass =
            normal * rhoN;
        volume =
            mass / rho;
    }
    return {
        mass,
        volume,
        normal
    };
}

/** Obtém vazões equivalentes para potência desejada no PCI (kW). */
export function flowsFromPower(targetPowerKW, pci, rho, rhoN) {
    if (!(pci > 0)) {
        throw new Error("PCI da mistura deve ser positivo para o modo por potência.");
    }
    const mass = targetPowerKW
        *
            3.6
        /
            pci;
    return {
        mass,
        volume: mass / rho,
        normal: mass / rhoN
    };
}
