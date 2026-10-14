/**
 * SO₂, componente auxiliar de produtos
 * COMPONENTES: SO2
 * PCS e PCI [MJ/kg], massa molar [kg/kmol], Cp° Shomate [J/(mol.K)].
 * Os valores e a ordem dos registros foram preservados.
 */
import { G, N, J } from './construtores.js';

export const GASES_AUXILIARES = [
    G(
        "SO2",
        "Dióxido de Enxofre",
        "SO₂",
        [0,0,0,2,1],
        64.058,
        0,
        0,
        "Não combustível; produto de combustão",

        N([

            [
                298,
                1200,
                21.43049,
                74.35094,
                -57.75217,
                16.35534,
                0.086731,
                -305.7688,
                254.8872,
                -296.8422
            ],

            [
                1200,
                6000,
                57.48188,
                1.009328,
                -0.07629,
                0.005174,
                -4.045401,
                -324.414,
                302.7798,
                -296.8422
            ]

        ])
    )
];
