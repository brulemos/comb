/**
 * Hidrocarbonetos C5–C10
 * COMPONENTES: C5H8_1PENTINO, C5H10_CICLOPENTANO, C5H10_CIS2PENTENO, C5H10_TRANS2PENTENO, C5H10_1PENTENO, C5H12_ISOPENTANO, C5H12_NPENTANO, C5H12_NEOPENTANO, C6H6_BENZENO, C6H12_METILCICLOPENTANO, C6H12_CICLOHEXANO, C6H14_22DMB, C6H14_23DMB, C6H14_2MP, C6H14_3MP, C6H14_NHEXANO, C7H8_TOLUENO, C7H14_METILCICLOHEXANO, C7H14_ETILCICLOPENTANO, C7H16_3EP, C7H16_223TMB, C7H16_NHEPTANO, C7H16_3MH, C8H18_4MH, C8H18_NOCTANO, C8H18_2M3EP, C8H18_22DMH, C8H18_25DMH, C8H18_223TMP, C8H18_224TMP, C8H18_2233TMB, C8H18_233TMP, C8H18_234TMP, C8H18_24DMH, C9H12_M_ETILBENZENO, C9H12_NPROPILBENZENO, C9H12_CUMENO, C9H12_P_ETILBENZENO, C9H12_O_ETILBENZENO, C9H18_NBUTILCICLOPENTANO, C9H18_NPROPILCICLOHEXANO, C10H14_NBUTILBENZENO, C10H20_NBUTILCICLOHEXANO
 * PCS e PCI [MJ/kg], massa molar [kg/kmol], Cp° Shomate [J/(mol.K)].
 * Os valores e a ordem dos registros foram preservados.
 */
import { G, N, J } from './construtores.js';

export const GASES_ORGANICOS = [
    G(
        "C5H8_1PENTINO",
        "1-Pentino",
        "C₅H₈",
        [5,8,0,0,0],
        68.119,
        47.1,
        44.5,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "C#CCCC",
            {"1":1,"2":2,"9":1,"10":1},
            12.122,
            384.92,
            -244.13,
            66.69
        )
    ),

    G(
        "C5H10_CICLOPENTANO",
        "Ciclopentano",
        "C₅H₁₀",
        [5,10,0,0,0],
        70.135,
        47.3664,
        44.2005,
        "ISO 6976",
        J(
            "C1CCCC1",
            {"11":5},
            -68.08,
            637,
            -431,
            116
        )
    ),

    G(
        "C5H10_CIS2PENTENO",
        "cis-2-Penteno",
        "C₅H₁₀",
        [5,10,0,0,0],
        70.135,
        48.1588,
        44.9928,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "C/C=C\\CC",
            {"1":2,"2":1,"6":2},
            -15.839,
            498.84,
            -332,
            95.7
        )
    ),

    G(
        "C5H10_TRANS2PENTENO",
        "trans-2-Penteno",
        "C₅H₁₀",
        [5,10,0,0,0],
        70.135,
        48.1588,
        44.9928,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "C/C=C/CC",
            {"1":2,"2":1,"6":2},
            -15.839,
            498.84,
            -332,
            95.7
        )
    ),

    G(
        "C5H10_1PENTENO",
        "1-Penteno",
        "C₅H₁₀",
        [5,10,0,0,0],
        70.135,
        48.1588,
        44.9928,
        "ISO 6976",
        J(
            "C=CCCC",
            {"1":1,"2":2,"5":1,"6":1},
            -4.648,
            458.82,
            -271.1,
            65.7
        )
    ),

    G(
        "C5H12_ISOPENTANO",
        "2-Metilbutano (Isopentano)",
        "C₅H₁₂",
        [5,12,0,0,0],
        72.151,
        48.9462,
        45.2531,
        "ISO 6976",
        J(
            "CC(C)CC",
            {"1":3,"2":1,"3":1},
            -3.339,
            484.76,
            -251.4,
            47.8
        )
    ),

    G(
        "C5H12_NPENTANO",
        "n-Pentano",
        "C₅H₁₂",
        [5,12,0,0,0],
        72.151,
        49.0421,
        45.3491,
        "ISO 6976",
        J(
            "CCCCC",
            {"1":2,"2":3},
            -1.657,
            478.84,
            -248.2,
            48.3
        )
    ),

    G(
        "C5H12_NEOPENTANO",
        "Neopentano (2,2-Dimetilpropano)",
        "C₅H₁₂",
        [5,12,0,0,0],
        72.151,
        48.7487,
        45.0556,
        "ISO 6976",
        J(
            "CC(C)(C)C",
            {"1":4,"4":1},
            -26.13,
            604.68,
            -420,
            120.2
        )
    ),

    G(
        "C6H6_BENZENO",
        "Benzeno",
        "C₆H₆",
        [6,6,0,0,0],
        78.114,
        42.2815,
        40.576,
        "ISO 6976",
        J(
            "c1ccccc1",
            {"14":6},
            -50.77,
            554.4,
            -400.84,
            110.6
        )
    ),

    G(
        "C6H12_METILCICLOPENTANO",
        "Metilciclopentano",
        "C₆H₁₂",
        [6,12,0,0,0],
        84.162,
        47.1981,
        44.0321,
        "ISO 6976",
        J(
            "CC1CCCC1",
            {"1":1,"11":4,"12":1},
            -63.05,
            705.52,
            -430,
            99.7
        )
    ),

    G(
        "C6H12_CICLOHEXANO",
        "Ciclohexano",
        "C₆H₁₂",
        [6,12,0,0,0],
        84.162,
        47.0028,
        43.8368,
        "ISO 6976",
        J(
            "C1CCCCC1",
            {"11":6},
            -74.11,
            722.4,
            -439,
            98
        )
    ),

    G(
        "C6H14_22DMB",
        "2,2-Dimetilbutano",
        "C₆H₁₄",
        [6,14,0,0,0],
        86.178,
        48.5117,
        44.9045,
        "ISO 6976",
        J(
            "CC(C)(C)CC",
            {"1":4,"2":1,"4":1},
            -27.039,
            699.68,
            -474.4,
            132.1
        )
    ),

    G(
        "C6H14_23DMB",
        "2,3-Dimetilbutano",
        "C₆H₁₄",
        [6,14,0,0,0],
        86.178,
        48.6018,
        44.9947,
        "ISO 6976",
        J(
            "CC(C)C(C)C",
            {"1":4,"3":2},
            -5.93,
            585.68,
            -309,
            59.2
        )
    ),

    G(
        "C6H14_2MP",
        "2-Metilpentano",
        "C₆H₁₄",
        [6,14,0,0,0],
        86.178,
        48.6253,
        45.0181,
        "ISO 6976",
        J(
            "CC(C)CCC",
            {"1":3,"2":2,"3":1},
            -4.248,
            579.76,
            -305.8,
            59.7
        )
    ),

    G(
        "C6H14_3MP",
        "3-Metilpentano",
        "C₆H₁₄",
        [6,14,0,0,0],
        86.178,
        48.6555,
        45.0483,
        "ISO 6976",
        J(
            "CCC(C)CC",
            {"1":3,"2":2,"3":1},
            -4.248,
            579.76,
            -305.8,
            59.7
        )
    ),

    G(
        "C6H14_NHEXANO",
        "Hexano (n-Hexano)",
        "C₆H₁₄",
        [6,14,0,0,0],
        86.178,
        48.7138,
        45.1065,
        "ISO 6976",
        J(
            "CCCCCC",
            {"1":2,"2":4},
            -2.566,
            573.84,
            -302.6,
            60.2
        )
    ),

    G(
        "C7H8_TOLUENO",
        "Metilbenzeno (Tolueno)",
        "C₇H₈",
        [7,8,0,0,0],
        92.141,
        42.8658,
        40.938,
        "ISO 6976",
        J(
            "Cc1ccccc1",
            {"1":1,"14":5,"15":1},
            -37.38,
            589.92,
            -388.2,
            97.6
        )
    ),

    G(
        "C7H14_METILCICLOHEXANO",
        "Metilciclohexano",
        "C₇H₁₄",
        [7,14,0,0,0],
        98.189,
        46.8881,
        43.7221,
        "ISO 6976",
        J(
            "CC1CCCCC1",
            {"1":1,"11":5,"12":1},
            -69.08,
            790.92,
            -438,
            81.7
        )
    ),

    G(
        "C7H14_ETILCICLOPENTANO",
        "Etilciclopentano",
        "C₇H₁₄",
        [7,14,0,0,0],
        98.189,
        47.1718,
        44.0058,
        "ISO 6976",
        J(
            "CCC1CCCC1",
            {"1":1,"2":1,"11":4,"12":1},
            -63.959,
            800.52,
            -484.4,
            111.6
        )
    ),

    G(
        "C7H16_3EP",
        "3-Etilpentano",
        "C₇H₁₆",
        [7,16,0,0,0],
        100.205,
        48.4703,
        44.9248,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CCC(CC)CC",
            {"1":3,"2":3,"3":1},
            -5.157,
            674.76,
            -360.2,
            71.6
        )
    ),

    G(
        "C7H16_223TMB",
        "2,2,3-Trimetilbutano",
        "C₇H₁₆",
        [7,16,0,0,0],
        100.205,
        48.4703,
        44.9248,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)(C)C(C)C",
            {"1":5,"3":1,"4":1},
            -29.63,
            800.6,
            -532,
            143.5
        )
    ),

    G(
        "C7H16_NHEPTANO",
        "n-Heptano",
        "C₇H₁₆",
        [7,16,0,0,0],
        100.205,
        48.4703,
        44.9248,
        "ISO 6976",
        J(
            "CCCCCCC",
            {"1":2,"2":5},
            -3.475,
            668.84,
            -357,
            72.1
        )
    ),

    G(
        "C7H16_3MH",
        "3-Metilhexano",
        "C₇H₁₆",
        [7,16,0,0,0],
        100.205,
        48.4703,
        44.9248,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CCC(C)CCC",
            {"1":3,"2":3,"3":1},
            -5.157,
            674.76,
            -360.2,
            71.6
        )
    ),

    G(
        "C8H18_4MH",
        "4-Metilheptano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CCCC(C)CCC",
            {"1":3,"2":4,"3":1},
            -6.066,
            769.76,
            -414.6,
            83.5
        )
    ),

    G(
        "C8H18_NOCTANO",
        "n-Octano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "ISO 6976",
        J(
            "CCCCCCCC",
            {"1":2,"2":6},
            -4.384,
            763.84,
            -411.4,
            84
        )
    ),

    G(
        "C8H18_2M3EP",
        "2-Metil-3-etilpentano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)C(CC)CC",
            {"1":4,"2":2,"3":2},
            -7.748,
            775.68,
            -417.8,
            83
        )
    ),

    G(
        "C8H18_22DMH",
        "2,2-Dimetilhexano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)(C)CCCC",
            {"1":4,"2":3,"4":1},
            -28.857,
            889.68,
            -583.2,
            155.9
        )
    ),

    G(
        "C8H18_25DMH",
        "2,5-Dimetilhexano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)CCC(C)C",
            {"1":4,"2":2,"3":2},
            -7.748,
            775.68,
            -417.8,
            83
        )
    ),

    G(
        "C8H18_223TMP",
        "2,2,3-Trimetilpentano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)(C)C(C)CC",
            {"1":5,"2":1,"3":1,"4":1},
            -30.539,
            895.6,
            -586.4,
            155.4
        )
    ),

    G(
        "C8H18_224TMP",
        "2,2,4-Trimetilpentano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)CC(C)(C)C",
            {"1":5,"2":1,"3":1,"4":1},
            -30.539,
            895.6,
            -586.4,
            155.4
        )
    ),

    G(
        "C8H18_2233TMB",
        "2,2,3,3-Tetrametilbutano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)(C)C(C)(C)C",
            {"1":6,"4":2},
            -53.33,
            1015.52,
            -755,
            227.8
        )
    ),

    G(
        "C8H18_233TMP",
        "2,3,3-Trimetilpentano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)C(C)(C)CC",
            {"1":5,"2":1,"3":1,"4":1},
            -30.539,
            895.6,
            -586.4,
            155.4
        )
    ),

    G(
        "C8H18_234TMP",
        "2,3,4-Trimetilpentano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)C(C)C(C)C",
            {"1":5,"3":3},
            -9.43,
            781.6,
            -421,
            82.5
        )
    ),

    G(
        "C8H18_24DMH",
        "2,4-Dimetilhexano",
        "C₈H₁₈",
        [8,18,0,0,0],
        114.232,
        48.2857,
        44.7867,
        "Estimativa por analogia de isômero/homólogo",
        J(
            "CC(C)CC(C)CC",
            {"1":4,"2":2,"3":2},
            -7.748,
            775.68,
            -417.8,
            83
        )
    ),

    G(
        "C9H12_M_ETILBENZENO",
        "1-Metil-3-etilbenzeno",
        "C₉H₁₂",
        [9,12,0,0,0],
        120.195,
        43.2548,
        41.043,
        "Channiwala–Parikh + correção PCI",
        J(
            "Cc1cc(CC)ccc1",
            {"1":2,"2":1,"14":4,"15":2},
            -24.899,
            720.44,
            -429.96,
            96.5
        )
    ),

    G(
        "C9H12_NPROPILBENZENO",
        "n-Propilbenzeno",
        "C₉H₁₂",
        [9,12,0,0,0],
        120.195,
        43.2548,
        41.043,
        "Channiwala–Parikh + correção PCI",
        J(
            "CCCc1ccccc1",
            {"1":1,"2":2,"14":5,"15":1},
            -39.198,
            779.92,
            -497,
            121.4
        )
    ),

    G(
        "C9H12_CUMENO",
        "Isopropilbenzeno (cumeno)",
        "C₉H₁₂",
        [9,12,0,0,0],
        120.195,
        43.2548,
        41.043,
        "Channiwala–Parikh + correção PCI",
        J(
            "CC(C)c1ccccc1",
            {"1":2,"3":1,"14":5,"15":1},
            -40.88,
            785.84,
            -500.2,
            120.9
        )
    ),

    G(
        "C9H12_P_ETILBENZENO",
        "1-Metil-4-etilbenzeno",
        "C₉H₁₂",
        [9,12,0,0,0],
        120.195,
        43.2548,
        41.043,
        "Channiwala–Parikh + correção PCI",
        J(
            "Cc1ccc(CC)cc1",
            {"1":2,"2":1,"14":4,"15":2},
            -24.899,
            720.44,
            -429.96,
            96.5
        )
    ),

    G(
        "C9H12_O_ETILBENZENO",
        "1-Metil-2-etilbenzeno",
        "C₉H₁₂",
        [9,12,0,0,0],
        120.195,
        43.2548,
        41.043,
        "Channiwala–Parikh + correção PCI",
        J(
            "Cc1ccccc1CC",
            {"1":2,"2":1,"14":4,"15":2},
            -24.899,
            720.44,
            -429.96,
            96.5
        )
    ),

    G(
        "C9H18_NBUTILCICLOPENTANO",
        "n-Butilciclopentano",
        "C₉H₁₈",
        [9,18,0,0,0],
        126.243,
        46.8275,
        43.6688,
        "Channiwala–Parikh + correção PCI",
        J(
            "CCCCC1CCCC1",
            {"1":1,"2":3,"11":4,"12":1},
            -65.777,
            990.52,
            -593.2,
            135.4
        )
    ),

    G(
        "C9H18_NPROPILCICLOHEXANO",
        "n-Propilciclohexano",
        "C₉H₁₈",
        [9,18,0,0,0],
        126.243,
        46.8275,
        43.6688,
        "Channiwala–Parikh + correção PCI",
        J(
            "CCCC1CCCCC1",
            {"1":1,"2":2,"11":5,"12":1},
            -70.898,
            980.92,
            -546.8,
            105.5
        )
    ),

    G(
        "C10H14_NBUTILBENZENO",
        "n-Butilbenzeno",
        "C₁₀H₁₄",
        [10,14,0,0,0],
        134.222,
        43.6281,
        41.3174,
        "Channiwala–Parikh + correção PCI",
        J(
            "CCCCc1ccccc1",
            {"1":1,"2":3,"14":5,"15":1},
            -40.107,
            874.92,
            -551.4,
            133.3
        )
    ),

    G(
        "C10H20_NBUTILCICLOHEXANO",
        "n-Butilciclohexano",
        "C₁₀H₂₀",
        [10,20,0,0,0],
        140.27,
        46.8275,
        43.6688,
        "Channiwala–Parikh + correção PCI",
        J(
            "CCCCC1CCCCC1",
            {"1":1,"2":3,"11":5,"12":1},
            -71.807,
            1075.92,
            -601.2,
            117.4
        )
    )
];
