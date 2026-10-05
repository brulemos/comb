"use strict";


window.COMBUSTION_PRESETS = {


    cog: {

        nome:
            "Gás de coqueria",

        observacao:
            "Composição representativa em base molar; ajuste pela análise real.",

        componentes: [

            {
                id: "H2",
                percentual: 57.0
            },

            {
                id: "CH4",
                percentual: 27.0
            },

            {
                id: "CO",
                percentual: 7.0
            },

            {
                id: "CO2",
                percentual: 2.0
            },

            {
                id: "N2",
                percentual: 5.0
            },

            {
                id: "C2H4",
                percentual: 2.0
            }

        ]

    },


    bfg: {

        nome:
            "Gás de alto-forno",

        observacao:
            "Composição representativa em base molar; ajuste pela análise real.",

        componentes: [

            {
                id: "CO",
                percentual: 22.0
            },

            {
                id: "CO2",
                percentual: 19.0
            },

            {
                id: "H2",
                percentual: 4.5
            },

            {
                id: "N2",
                percentual: 54.1
            },

            {
                id: "O2",
                percentual: 0.4
            }

        ]

    },


    bof: {

        nome:
            "Gás de aciaria / BOF / LD",

        observacao:
            "Composição representativa em base molar; ajuste pela análise real.",

        componentes: [

            {
                id: "CO",
                percentual: 65.0
            },

            {
                id: "CO2",
                percentual: 18.0
            },

            {
                id: "N2",
                percentual: 16.9
            },

            {
                id: "O2",
                percentual: 0.1
            }

        ]

    },


    gn: {

        nome:
            "Gás natural",

        observacao:
            "Composição representativa em base molar; ajuste conforme cromatografia/fornecedor.",

        componentes: [

            {
                id: "CH4",
                percentual: 93.9
            },

            {
                id: "C2H6",
                percentual: 3.2
            },

            {
                id: "C3H8",
                percentual: 0.7
            },

            {
                id: "C4H10_NBUTANO",
                percentual: 0.2
            },

            {
                id: "C4H10_ISOBUTANO",
                percentual: 0.2
            },

            {
                id: "N2",
                percentual: 1.0
            },

            {
                id: "CO2",
                percentual: 0.8
            }

        ]

    },


    glp: {

        nome:
            "GLP",

        observacao:
            "Exemplo 60/40 molar de propano/n-butano; ajuste conforme produto real.",

        componentes: [

            {
                id: "C3H8",
                percentual: 60.0
            },

            {
                id: "C4H10_NBUTANO",
                percentual: 40.0
            }

        ]

    }


};