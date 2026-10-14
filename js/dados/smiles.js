/**
 * SMILES de espécies com Cp de referência
 * Apenas visualização 3D; não entra no cálculo.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
export const JMOL_SMILES_BY_ID = Object.freeze({
    N2: "N#N",
    NO: "[N]=O",
    O2: "O=O",
    NO2: "[N+](=O)[O-]",
    H2: "[H][H]",
    H2S: "S",
    H2O: "O",
    CO: "[C-]#[O+]",
    CO2: "O=C=O",
    CH4: "C",
    C2H2: "C#C",
    C2H4: "C=C",
    SO2: "O=S=O"
});
