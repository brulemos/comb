/**
 * Construtores de propriedades termodinâmicas
 * N: Shomate NIST; J: Joback em base Shomate; G: registro de gás.
 * Extraído da implementação validada, sem modificar fórmulas ou fatores.
 */
export const N = faixas => ({
    metodo: "NIST_SHOMATE",
    estimado: false,
    fonte: "NIST Chemistry WebBook, SRD 69",
    faixas: faixas.map(f => ({
        Tmin: f[0],
        Tmax: f[1],
        A: f[2],
        B: f[3],
        C: f[4],
        D: f[5],
        E: f[6],
        F: f[7],
        G: f[8],
        H: f[9]
    }))
});
export const J = (smiles, grupos, A, B, C, D) => ({
    metodo: "JOBACK_SHOMATE",
    estimado: true,
    fonte: "Joback-Reid; convertido para forma Shomate",
    gruposJoback: grupos,
    faixas: [
        {
            Tmin: 298.15,
            Tmax: 1000,
            A,
            B,
            C,
            D,
            E: 0,
            F: null,
            G: null,
            H: null
        }
    ],
    smiles
});
export const G = (id, nome, formula, a, M, pcs, pci, fonte, cp) => ({
    id,
    nome,
    formula,
    atomos: {
        C: a[0],
        H: a[1],
        N: a[2],
        O: a[3],
        S: a[4]
    },
    massaMolar: M,
    pcs,
    pci,
    fontePcsPci: fonte,
    ...(cp.smiles
        ? { smiles: cp.smiles }
        : {}),
    cpShomate: {
        metodo: cp.metodo,
        estimado: cp.estimado,
        fonte: cp.fonte,
        ...(cp.gruposJoback
            ? {
                gruposJoback: cp.gruposJoback
            }
            : {}),
        faixas: cp.faixas
    }
});
