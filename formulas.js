"use strict";


(() => {


const CONFIG = {

    R:
        8.314462618,

    Tn:
        273.15,

    Pn:
        101.325,

    Tref:
        298.15,

    Mair:
        28.96546,

    tol:
        0.01,

    waterMW:
        18.01528

};



const gases = () =>
    window.GAS_DATABASE || [];



const getGas = id =>
    gases().find(
        g => g.id === id
    );



const clamp = (
    v,
    min,
    max
) =>

    Math.max(
        min,
        Math.min(
            max,
            v
        )
    );



function tempToK(
    value,
    unit
) {


    if (
        unit === "C"
    ) {

        return value + 273.15;

    }


    if (
        unit === "F"
    ) {

        return (

            value - 32

        )

        *

        5 / 9

        +

        273.15;

    }


    return value;

}



function pressureToKPa(
    value,
    unit
) {


    if (
        unit === "bar"
    ) {

        return value * 100;

    }


    if (
        unit === "atm"
    ) {

        return value * 101.325;

    }


    if (
        unit === "kgfcm2"
    ) {

        return value * 98.0665;

    }


    return value;

}



function powerToKW(
    value,
    unit
) {


    if (
        unit === "MW"
    ) {

        return value * 1000;

    }


    if (
        unit === "cv"
    ) {

        return value * 0.73549875;

    }


    if (
        unit === "hp"
    ) {

        return value * 0.745699872;

    }


    return value;

}



function convertPower(
    kW,
    unit
) {


    if (
        unit === "MW"
    ) {

        return kW / 1000;

    }


    if (
        unit === "cv"
    ) {

        return kW / 0.73549875;

    }


    if (
        unit === "hp"
    ) {

        return kW / 0.745699872;

    }


    return kW;

}



/* =========================================================
   COMPOSIÇÃO
========================================================= */

function compositionToYW(
    items,
    base
) {


    const valid =

        items

            .filter(
                i =>
                    i.gas
                    &&
                    Number(
                        i.percentual
                    )
                    >
                    0
            )

            .map(
                i => ({

                    gas:
                        i.gas,

                    f:

                        Number(
                            i.percentual
                        )

                        /

                        100

                })
            );



    if (
        !valid.length
    ) {

        return [];

    }



    if (
        base === "molar"
    ) {


        const M =

            valid.reduce(

                (s, i) =>

                    s

                    +

                    i.f

                    *

                    i.gas.massaMolar,

                0

            );



        return valid.map(

            i => ({

                gas:
                    i.gas,

                y:
                    i.f,

                w:

                    i.f

                    *

                    i.gas.massaMolar

                    /

                    M

            })

        );

    }



    const denom =

        valid.reduce(

            (s, i) =>

                s

                +

                i.f

                /

                i.gas.massaMolar,

            0

        );



    return valid.map(

        i => ({

            gas:
                i.gas,

            w:
                i.f,

            y:

                (
                    i.f
                    /
                    i.gas.massaMolar
                )

                /

                denom

        })

    );

}



function normalizeMolarComposition(
    entries
) {


    const merged =
        new Map();



    for (
        const entry
        of entries
    ) {


        if (
            !entry.gas

            ||

            !(entry.y > 0)
        ) {

            continue;

        }



        merged.set(

            entry.gas.id,

            (
                merged.get(
                    entry.gas.id
                )

                ||

                0
            )

            +

            entry.y

        );

    }



    const total =

        [
            ...merged.values()
        ]
        .reduce(
            (a, b) =>
                a + b,
            0
        );



    if (
        !(total > 0)
    ) {

        return [];

    }



    const mol =

        [
            ...merged.entries()
        ]
        .map(

            (
                [
                    id,
                    y
                ]
            ) => ({

                gas:
                    getGas(id),

                y:
                    y / total

            })

        );



    const M =

        mol.reduce(

            (s, i) =>

                s

                +

                i.y

                *

                i.gas.massaMolar,

            0

        );



    return mol.map(

        i => ({

            ...i,

            w:

                i.y

                *

                i.gas.massaMolar

                /

                M

        })

    );

}



const mixtureMolarMass = comp =>

    comp.reduce(

        (s, i) =>

            s

            +

            i.y

            *

            i.gas.massaMolar,

        0

    );



const mixtureHHV = comp =>

    comp.reduce(

        (s, i) =>

            s

            +

            i.w

            *

            i.gas.pcs,

        0

    );



const mixtureLHV = comp =>

    comp.reduce(

        (s, i) =>

            s

            +

            i.w

            *

            i.gas.pci,

        0

    );



/* =========================================================
   CP SHOMATE
========================================================= */

function selectCpRange(
    gas,
    T
) {


    const ranges =

        gas?.cpShomate?.faixas

        ||

        [];



    if (
        !ranges.length
    ) {

        return {

            range:
                null,

            extrapolated:
                true

        };

    }



    const inside =

        ranges.find(

            r =>

                T >= r.Tmin

                &&

                T <= r.Tmax

        );



    if (
        inside
    ) {

        return {

            range:
                inside,

            extrapolated:
                false

        };

    }



    return {

        range:

            T < ranges[0].Tmin

                ?

                ranges[0]

                :

                ranges[
                    ranges.length - 1
                ],

        extrapolated:
            true

    };

}



function cpMolar(
    gas,
    T
) {


    const {

        range,
        extrapolated

    } =

        selectCpRange(
            gas,
            T
        );



    if (
        !range
    ) {

        return {

            value:
                NaN,

            extrapolated:
                true

        };

    }



    const t =
        T / 1000;



    return {

        value:

            range.A

            +

            range.B
            *
            t

            +

            range.C
            *
            t ** 2

            +

            range.D
            *
            t ** 3

            +

            range.E
            /
            t ** 2,

        extrapolated

    };

}



function cpMass(
    gas,
    T
) {


    const r =

        cpMolar(
            gas,
            T
        );



    return {

        value:

            r.value

            /

            gas.massaMolar,

        extrapolated:
            r.extrapolated

    };

}



function mixtureCp(
    comp,
    T
) {


    let value =
        0;


    const warnings =
        [];



    for (
        const item
        of comp
    ) {


        const cp =

            cpMass(
                item.gas,
                T
            );



        if (
            !Number.isFinite(
                cp.value
            )
        ) {

            throw new Error(

                `Não há correlação de Cp para ${item.gas.nome}.`

            );

        }



        value +=

            item.w

            *

            cp.value;



        if (
            item.gas.cpShomate?.estimado
        ) {

            warnings.push(

                `${item.gas.nome}: Cp estimado por ${item.gas.cpShomate.metodo}.`

            );

        }



        if (
            cp.extrapolated
        ) {

            warnings.push(

                `${item.gas.nome}: Cp extrapolado fora da faixa cadastrada em ${T.toFixed(2)} K.`

            );

        }

    }



    return {

        value,

        warnings:
            [
                ...new Set(
                    warnings
                )
            ]

    };

}



/* =========================================================
   DENSIDADE / WOBBE
========================================================= */

const idealDensity = (
    M,
    T,
    PkPa
) =>

    PkPa

    *

    M

    /

    (
        CONFIG.R
        *
        T
    );



const normalDensity = M =>

    idealDensity(

        M,

        CONFIG.Tn,

        CONFIG.Pn

    );



function wobbe(
    pcsMass,
    rhoN,
    M
) {


    const d =

        M

        /

        CONFIG.Mair;



    return {

        relativeDensity:
            d,

        volumetricMJNm3:

            pcsMass

            *

            rhoN

            /

            Math.sqrt(d),

        massEquivalentMJkg:

            pcsMass

            /

            Math.sqrt(d)

    };

}



function convertWobbe(
    w,
    unit
) {


    const base =

        unit.includes("kg")

            ?

            w.massEquivalentMJkg

            :

            w.volumetricMJNm3;



    if (
        unit.startsWith(
            "kWh"
        )
    ) {

        return base / 3.6;

    }



    if (
        unit.startsWith(
            "kcal"
        )
    ) {

        return base * 238.8458966;

    }



    return base;

}



/* =========================================================
   VAZÕES
========================================================= */

function flowsFromInput(
    type,
    value,
    rho,
    rhoN
) {


    let mass;

    let volume;

    let normal;



    if (
        type === "massica"
    ) {


        mass =
            value;


        volume =
            mass / rho;


        normal =
            mass / rhoN;

    }

    else if (
        type === "volumetrica"
    ) {


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



function flowsFromPower(
    targetPowerKW,
    pci,
    rho,
    rhoN
) {


    if (
        !(pci > 0)
    ) {

        throw new Error(

            "PCI da mistura deve ser positivo para o modo por potência."

        );

    }



    const mass =

        targetPowerKW

        *

        3.6

        /

        pci;



    return {

        mass,

        volume:
            mass / rho,

        normal:
            mass / rhoN

    };

}



/* =========================================================
   ESTEQUIOMETRIA
========================================================= */

function atomsOfMixture(
    comp
) {


    const a = {

        C: 0,
        H: 0,
        N: 0,
        O: 0,
        S: 0

    };



    for (
        const i
        of comp
    ) {


        a.C +=
            i.y
            *
            i.gas.atomos.C;


        a.H +=
            i.y
            *
            i.gas.atomos.H;


        a.N +=
            i.y
            *
            i.gas.atomos.N;


        a.O +=
            i.y
            *
            i.gas.atomos.O;


        a.S +=
            i.y
            *
            i.gas.atomos.S;

    }



    return a;

}



const ATOMIC_MASS = {

    C:
        12.011,

    H:
        1.008,

    N:
        14.007,

    O:
        15.999,

    S:
        32.06

};



function elementalMassPercentages(
    comp
) {


    const masses = {

        C: 0,
        H: 0,
        N: 0,
        O: 0,
        S: 0

    };


    const totalMass =

        mixtureMolarMass(
            comp
        );


    for (
        const item
        of comp
    ) {


        for (
            const e
            of [
                "C",
                "H",
                "N",
                "O",
                "S"
            ]
        ) {


            masses[e] +=

                item.y

                *

                item.gas.atomos[e]

                *

                ATOMIC_MASS[e];

        }

    }


    const trackedMass =

        Object.values(
            masses
        )
        .reduce(
            (a, b) =>
                a + b,
            0
        );


    const zMass =

        Math.max(

            0,

            totalMass
            -
            trackedMass

        );


    const pct = value =>

        totalMass > 0

            ?

            value
            /
            totalMass
            *
            100

            :

            0;


    return {

        C:
            pct(
                masses.C
            ),

        H:
            pct(
                masses.H
            ),

        N:
            pct(
                masses.N
            ),

        O:
            pct(
                masses.O
            ),

        S:
            pct(
                masses.S
            ),

        Z:
            pct(
                zMass
            )

    };

}



const stoichO2PerKmol = a =>

    a.C

    +

    a.H / 4

    +

    a.S

    -

    a.O / 2;



/* =========================================================
   UMIDADE DO AR
========================================================= */

/*
Pressão de saturação da água.

Saída em kPa.

Correlação psicrométrica tipo Buck.
*/

function saturationPressureWaterKPa(
    tempC
) {


    if (
        tempC >= 0
    ) {


        return (

            0.61121

            *

            Math.exp(

                (
                    18.678

                    -

                    tempC / 234.5
                )

                *

                (
                    tempC

                    /

                    (
                        257.14
                        +
                        tempC
                    )
                )

            )

        );

    }



    return (

        0.61115

        *

        Math.exp(

            (
                23.036

                -

                tempC / 333.7
            )

            *

            (
                tempC

                /

                (
                    279.82
                    +
                    tempC
                )
            )

        )

    );

}



function humidOxidizerComposition({

    dryO2Pct,

    rhPct = 0,

    tempK,

    pressureKPa,

    humidityEnabled = false

}) {


    const dryO2 =
        dryO2Pct / 100;


    const dryN2 =
        1 - dryO2;



    let xH2O =
        0;


    let pv =
        0;



    if (
        humidityEnabled

        &&

        rhPct > 0
    ) {


        const tempC =

            tempK

            -

            273.15;



        const psat =

            saturationPressureWaterKPa(
                tempC
            );



        pv =

            clamp(
                rhPct,
                0,
                100
            )

            /

            100

            *

            psat;



        if (
            pv >= pressureKPa
        ) {

            throw new Error(

                "Pressão parcial de vapor calculada maior ou igual à pressão total do comburente."

            );

        }



        xH2O =

            pv

            /

            pressureKPa;

    }



    const dryFraction =

        1

        -

        xH2O;



    return {

        xO2:

            dryO2

            *

            dryFraction,

        xN2:

            dryN2

            *

            dryFraction,

        xH2O,

        dryO2,
        dryN2,

        vaporPressureKPa:
            pv

    };

}



function oxidizer({

    fuelMolarFlow,

    fuelMassFlow,

    o2StoichPerKmol,

    dryO2Pct,

    lambda,

    humidity

}) {


    const wet =

        humidOxidizerComposition({

            dryO2Pct,

            rhPct:
                humidity.rhPct,

            tempK:
                humidity.tempK,

            pressureKPa:
                humidity.pressureKPa,

            humidityEnabled:
                humidity.enabled

        });



    if (
        !(wet.xO2 > 0)
    ) {

        throw new Error(

            "Fração molar de O₂ do comburente deve ser positiva."

        );

    }



    const o2Stoich =

        fuelMolarFlow

        *

        o2StoichPerKmol;



    const oxidStoichMolar =

        o2Stoich

        /

        wet.xO2;



    const Moxid =

        wet.xO2

        *

        getGas(
            "O2"
        ).massaMolar

        +

        wet.xN2

        *

        getGas(
            "N2"
        ).massaMolar

        +

        wet.xH2O

        *

        getGas(
            "H2O"
        ).massaMolar;



    const oxidStoichMass =

        oxidStoichMolar

        *

        Moxid;



    const oxidRealMolar =

        oxidStoichMolar

        *

        lambda;



    const oxidRealMass =

        oxidStoichMass

        *

        lambda;



    return {

        ...wet,

        lambda,

        o2Stoich,

        oxidStoichMolar,

        oxidRealMolar,

        oxidStoichMass,

        oxidRealMass,

        afrStoich:

            oxidStoichMass

            /

            fuelMassFlow,

        afrReal:

            oxidRealMass

            /

            fuelMassFlow,

        Moxid,

        humidity

    };

}



/* =========================================================
   PRODUTOS
========================================================= */

function product(
    id,
    kmolH
) {


    const gas =
        getGas(id);



    return {

        id,

        nome:
            gas.nome,

        formula:
            gas.formula,

        kmolH,

        kgH:

            kmolH

            *

            gas.massaMolar

    };

}



function combustionProducts({

    atoms,

    fuelMolarFlow,

    oxid

}) {


    const co2 =

        fuelMolarFlow

        *

        atoms.C;



    const h2oCombustion =

        fuelMolarFlow

        *

        atoms.H

        /

        2;



    const h2oAir =

        oxid.oxidRealMolar

        *

        oxid.xH2O;



    const so2 =

        fuelMolarFlow

        *

        atoms.S;



    const n2Fuel =

        fuelMolarFlow

        *

        atoms.N

        /

        2;



    const n2Air =

        oxid.oxidRealMolar

        *

        oxid.xN2;



    const o2Supplied =

        oxid.oxidRealMolar

        *

        oxid.xO2;



    const o2Excess =

        Math.max(

            0,

            o2Supplied

            -

            oxid.o2Stoich

        );



    return [

        product(
            "CO2",
            co2
        ),

        product(
            "H2O",
            h2oCombustion + h2oAir
        ),

        product(
            "SO2",
            so2
        ),

        product(
            "N2",
            n2Fuel + n2Air
        ),

        product(
            "O2",
            o2Excess
        )

    ];

}



const productBasis = (
    products,
    basis
) =>

    basis === "seca"

        ?

        products.filter(
            p =>
                p.id !== "H2O"
        )

        :

        [
            ...products
        ];



function fractions(
    products
) {


    const n =

        products.reduce(

            (s, p) =>
                s + p.kmolH,

            0

        );



    const m =

        products.reduce(

            (s, p) =>
                s + p.kgH,

            0

        );



    const VmN =

        CONFIG.R

        *

        CONFIG.Tn

        /

        CONFIG.Pn;



    return products.map(

        p => ({

            ...p,

            y:

                n > 0

                    ?

                    p.kmolH / n

                    :

                    0,

            w:

                m > 0

                    ?

                    p.kgH / m

                    :

                    0,

            ppmv:

                n > 0

                    ?

                    p.kmolH
                    /
                    n
                    *
                    1e6

                    :

                    0,

            mgNm3:

                n > 0

                    ?

                    (
                        p.kmolH / n
                    )

                    *

                    getGas(
                        p.id
                    ).massaMolar

                    *

                    1e6

                    /

                    VmN

                    :

                    0

        })

    );

}



function productsCpMass(
    products,
    T
) {


    const totalMass =

        products.reduce(

            (s, p) =>
                s + p.kgH,

            0

        );


    if (
        !(totalMass > 0)
    ) {

        return {

            value:
                0,

            extrapolated:
                false

        };

    }


    let weightedCp =
        0;


    let extrapolated =
        false;


    for (
        const p
        of products
    ) {


        const gas =

            getGas(
                p.id
            );


        if (
            !gas
        ) {

            continue;

        }


        const cp =

            cpMass(

                gas,

                T

            );


        weightedCp +=

            p.kgH

            *

            cp.value;


        extrapolated ||=

            cp.extrapolated;

    }


    return {

        value:

            weightedCp

            /

            totalMass,

        extrapolated

    };

}



function productSummary(
    products,
    T,
    P
) {


    const n =

        products.reduce(

            (s, p) =>
                s + p.kmolH,

            0

        );



    const m =

        products.reduce(

            (s, p) =>
                s + p.kgH,

            0

        );



    const M =

        n > 0

            ?

            m / n

            :

            0;



    const rho =

        M > 0

            ?

            idealDensity(
                M,
                T,
                P
            )

            :

            0;



    const volume =

        rho > 0

            ?

            m / rho

            :

            0;



    const residualMJh =

        products.reduce(

            (s, p) =>

                s

                +

                p.kgH

                *

                (
                    getGas(
                        p.id
                    )?.pci

                    ||

                    0
                ),

            0

        );



    const pci =

        m > 0

            ?

            residualMJh / m

            :

            0;



    const f =

        fractions(
            products
        );



    const so2 =

        f.find(
            x =>
                x.id === "SO2"
        )

        ||

        {
            ppmv: 0,
            mgNm3: 0
        };



    return {

        molarFlow:
            n,

        massFlow:
            m,

        molarMass:
            M,

        density:
            rho,

        volumeFlow:
            volume,

        pci,

        powerKW:

            m

            *

            pci

            /

            3.6,

        so2Ppmv:
            so2.ppmv,

        so2MgNm3:
            so2.mgNm3

    };

}



function dryAnalysis(
    products
) {


    const dry =

        fractions(

            productBasis(
                products,
                "seca"
            )

        );



    const wet =

        fractions(
            products
        );



    const findDry = id =>

        dry.find(
            x =>
                x.id === id
        )?.y

        ||

        0;



    const water =

        wet.find(
            x =>
                x.id === "H2O"
        )?.y

        ||

        0;



    return {

        o2DryPct:

            findDry(
                "O2"
            )

            *

            100,

        co2DryPct:

            findDry(
                "CO2"
            )

            *

            100,

        so2DryPpmv:

            findDry(
                "SO2"
            )

            *

            1e6,

        h2oWetPct:

            water

            *

            100

    };

}



/* =========================================================
   LAMBDA INVERSO
========================================================= */

function lambdaFromMeasuredO2({

    atoms,

    fuelMolarFlow,

    fuelMassFlow,

    o2StoichPerKmol,

    dryO2Pct,

    measuredO2DryPct,

    humidity

}) {


    if (

        measuredO2DryPct < 0

        ||

        measuredO2DryPct >= dryO2Pct

    ) {

        throw new Error(

            "O₂ seco medido fora da faixa válida."

        );

    }



    if (
        measuredO2DryPct === 0
    ) {

        return 1;

    }



    const calc = lambda => {


        const ox =

            oxidizer({

                fuelMolarFlow,

                fuelMassFlow,

                o2StoichPerKmol,

                dryO2Pct,

                lambda,

                humidity

            });



        return dryAnalysis(

            combustionProducts({

                atoms,

                fuelMolarFlow,

                oxid:
                    ox

            })

        ).o2DryPct;

    };



    let lo =
        1;


    let hi =
        20;



    if (
        measuredO2DryPct
        >
        calc(hi)
    ) {

        throw new Error(

            "O₂ seco medido incompatível com o modelo atual."

        );

    }



    for (
        let i = 0;
        i < 100;
        i++
    ) {


        const mid =

            (
                lo + hi
            )

            /

            2;



        if (
            calc(mid)
            <
            measuredO2DryPct
        ) {

            lo =
                mid;

        }

        else {

            hi =
                mid;

        }

    }



    return (

        lo + hi

    )

    /

    2;

}



function correctedConcentrationAtO2(
    value,
    o2Measured,
    o2Reference
) {


    const denom =

        20.9

        -

        o2Measured;



    if (
        denom <= 0
    ) {

        return NaN;

    }



    return (

        value

        *

        (
            20.9
            -
            o2Reference
        )

        /

        denom

    );

}



/* =========================================================
   BALANÇOS
========================================================= */

function massBalance({

    fuelMassFlow,

    oxidMassFlow,

    products

}) {


    const input =

        fuelMassFlow

        +

        oxidMassFlow;



    const output =

        products.reduce(

            (s, p) =>
                s + p.kgH,

            0

        );



    return {

        input,

        output,

        errorPct:

            input

                ?

                (
                    output
                    -
                    input
                )

                /

                input

                *

                100

                :

                0

    };

}



function elementalBalance({

    comp,

    fuelMolarFlow,

    oxid,

    products

}) {


    const input = {

        C: 0,
        H: 0,
        O: 0,
        N: 0,
        S: 0

    };



    for (
        const i
        of comp
    ) {


        for (
            const e
            of [
                "C",
                "H",
                "O",
                "N",
                "S"
            ]
        ) {


            input[e] +=

                fuelMolarFlow

                *

                i.y

                *

                i.gas.atomos[e];

        }

    }



    input.O +=

        2

        *

        oxid.oxidRealMolar

        *

        oxid.xO2

        +

        oxid.oxidRealMolar

        *

        oxid.xH2O;



    input.H +=

        2

        *

        oxid.oxidRealMolar

        *

        oxid.xH2O;



    input.N +=

        2

        *

        oxid.oxidRealMolar

        *

        oxid.xN2;



    const output = {

        C: 0,
        H: 0,
        O: 0,
        N: 0,
        S: 0

    };



    for (
        const p
        of products
    ) {


        const g =

            getGas(
                p.id
            );



        for (
            const e
            of [
                "C",
                "H",
                "O",
                "N",
                "S"
            ]
        ) {


            output[e] +=

                p.kmolH

                *

                g.atomos[e];

        }

    }



    return [

        "C",
        "H",
        "O",
        "N",
        "S"

    ].map(

        e => ({

            element:
                e,

            input:
                input[e],

            output:
                output[e],

            errorPct:

                input[e]

                    ?

                    (
                        output[e]
                        -
                        input[e]
                    )

                    /

                    input[e]

                    *

                    100

                    :

                    (
                        Math.abs(
                            output[e]
                        )

                        <
                        1e-12

                            ?

                            0

                            :

                            NaN
                    )

        })

    );

}



/* =========================================================
   INTEGRAÇÃO DE CP
========================================================= */

function integrateCpMolar(
    gas,
    T1,
    T2
) {


    if (
        T1 === T2
    ) {

        return {

            value:
                0,

            extrapolated:
                false

        };

    }



    const sign =

        T2 > T1

            ?

            1

            :

            -1;



    const a =

        Math.min(
            T1,
            T2
        );


    const b =

        Math.max(
            T1,
            T2
        );



    const n =
        240;



    const h =

        (
            b - a
        )

        /

        n;



    let sum =
        0;


    let extrapolated =
        false;



    for (
        let i = 0;
        i <= n;
        i++
    ) {


        const T =

            a

            +

            i

            *

            h;



        const cp =

            cpMolar(
                gas,
                T
            );



        extrapolated ||=

            cp.extrapolated;



        const factor =

            (
                i === 0

                ||

                i === n
            )

                ?

                1

                :

                (
                    i % 2 === 0

                        ?

                        2

                        :

                        4
                );



        sum +=

            factor

            *

            cp.value;

    }



    return {

        value:

            sign

            *

            h

            *

            sum

            /

            3,

        extrapolated

    };

}



function mixtureSensibleEnthalpy(
    comp,
    molarFlow,
    T1,
    T2
) {


    let value =
        0;


    let extrapolated =
        false;



    for (
        const i
        of comp
    ) {


        const dh =

            integrateCpMolar(

                i.gas,

                T1,

                T2

            );



        value +=

            molarFlow

            *

            i.y

            *

            dh.value;



        extrapolated ||=

            dh.extrapolated;

    }



    return {

        value,

        extrapolated

    };

}



function oxidizerSensibleEnthalpy(
    oxid,
    T1,
    T2
) {


    const o2 =

        integrateCpMolar(

            getGas(
                "O2"
            ),

            T1,

            T2

        );



    const n2 =

        integrateCpMolar(

            getGas(
                "N2"
            ),

            T1,

            T2

        );



    const h2o =

        integrateCpMolar(

            getGas(
                "H2O"
            ),

            T1,

            T2

        );



    const value =

        oxid.oxidRealMolar

        *

        (
            oxid.xO2

            *

            o2.value

            +

            oxid.xN2

            *

            n2.value

            +

            oxid.xH2O

            *

            h2o.value
        );



    return {

        value,

        extrapolated:

            o2.extrapolated

            ||

            n2.extrapolated

            ||

            h2o.extrapolated

    };

}



function productsSensibleEnthalpy(
    products,
    T1,
    T2
) {


    let value =
        0;


    let extrapolated =
        false;



    for (
        const p
        of products
    ) {


        const dh =

            integrateCpMolar(

                getGas(
                    p.id
                ),

                T1,

                T2

            );



        value +=

            p.kmolH

            *

            dh.value;



        extrapolated ||=

            dh.extrapolated;

    }



    return {

        value,

        extrapolated

    };

}



/* =========================================================
   TEMPERATURA ADIABÁTICA
========================================================= */

function adiabaticFlameTemperature({

    comp,

    fuelMolarFlow,

    fuelMassFlow,

    pci,

    oxid,

    products,

    fuelT,

    oxidizerT

}) {


    const qFuel =

        fuelMassFlow

        *

        pci

        *

        1000;



    const hFuel =

        mixtureSensibleEnthalpy(

            comp,

            fuelMolarFlow,

            CONFIG.Tref,

            fuelT

        );



    const hOx =

        oxidizerSensibleEnthalpy(

            oxid,

            CONFIG.Tref,

            oxidizerT

        );



    const target =

        qFuel

        +

        hFuel.value

        +

        hOx.value;



    const residual = T =>

        productsSensibleEnthalpy(

            products,

            CONFIG.Tref,

            T

        ).value

        -

        target;



    let lo =
        CONFIG.Tref;


    let hi =
        4000;



    if (
        residual(hi) < 0
    ) {

        hi =
            6000;

    }



    if (
        residual(hi) < 0
    ) {


        return {

            temperatureK:
                NaN,

            warnings: [

                "Não foi possível fechar o balanço de entalpia até 6000 K."

            ]

        };

    }



    for (
        let i = 0;
        i < 100;
        i++
    ) {


        const mid =

            (
                lo + hi
            )

            /

            2;



        if (
            residual(mid) < 0
        ) {

            lo =
                mid;

        }

        else {

            hi =
                mid;

        }

    }



    const T =

        (
            lo + hi
        )

        /

        2;



    const hp =

        productsSensibleEnthalpy(

            products,

            CONFIG.Tref,

            T

        );



    const warnings = [

        "Tad assume combustão completa, gás ideal, processo adiabático e sem dissociação química."

    ];



    if (

        hFuel.extrapolated

        ||

        hOx.extrapolated

        ||

        hp.extrapolated

    ) {

        warnings.push(

            "Tad utiliza extrapolação de Cp em pelo menos uma espécie."

        );

    }



    if (
        T > 2500
    ) {

        warnings.push(

            "Tad elevada: a ausência de dissociação tende a superestimar a temperatura real."

        );

    }



    return {

        temperatureK:
            T,

        warnings

    };

}



/* =========================================================
   BALANÇO TÉRMICO / CHAMINÉ
========================================================= */

function thermalBalance({

    comp,

    fuelMolarFlow,

    fuelMassFlow,

    pci,

    oxid,

    products,

    fuelT,

    oxidizerT,

    stackT

}) {


    const qChemical =

        fuelMassFlow

        *

        pci

        *

        1000;



    const hFuel =

        mixtureSensibleEnthalpy(

            comp,

            fuelMolarFlow,

            CONFIG.Tref,

            fuelT

        );



    const hOx =

        oxidizerSensibleEnthalpy(

            oxid,

            CONFIG.Tref,

            oxidizerT

        );



    const hReactants =

        hFuel.value

        +

        hOx.value;



    const hStack =

        productsSensibleEnthalpy(

            products,

            CONFIG.Tref,

            stackT

        );



    const totalInput =

        qChemical

        +

        hReactants;



    const available =

        totalInput

        -

        hStack.value;



    return {

        chemicalKW:

            qChemical

            /

            3600,

        reactantsSensibleKW:

            hReactants

            /

            3600,

        stackSensibleKW:

            hStack.value

            /

            3600,

        availableKW:

            available

            /

            3600,

        stackLossPct:

            totalInput > 0

                ?

                hStack.value
                /
                totalInput
                *
                100

                :

                NaN,

        extrapolated:

            hFuel.extrapolated

            ||

            hOx.extrapolated

            ||

            hStack.extrapolated

    };

}



/* =========================================================
   PONTO DE ORVALHO
========================================================= */

function dewPointFromWaterPartialPressure(
    partialPressureKPa
) {


    if (
        !(partialPressureKPa > 0)
    ) {

        return NaN;

    }



    let lo =
        -100;


    let hi =
        200;



    if (
        saturationPressureWaterKPa(
            hi
        )

        <
        partialPressureKPa
    ) {

        hi =
            350;

    }



    for (
        let i = 0;
        i < 120;
        i++
    ) {


        const mid =

            (
                lo + hi
            )

            /

            2;



        if (
            saturationPressureWaterKPa(
                mid
            )

            <
            partialPressureKPa
        ) {

            lo =
                mid;

        }

        else {

            hi =
                mid;

        }

    }



    return (

        lo + hi

    )

    /

    2;

}



function flueGasDewPoint(
    products,
    pressureKPa
) {


    const f =

        fractions(
            products
        );



    const yH2O =

        f.find(
            x =>
                x.id === "H2O"
        )?.y

        ||

        0;



    const pH2O =

        yH2O

        *

        pressureKPa;



    return {

        yH2O,

        partialPressureKPa:
            pH2O,

        dewPointC:

            dewPointFromWaterPartialPressure(
                pH2O
            )

    };

}



/* =========================================================
   EMISSÕES DE CO2
========================================================= */

function co2Emissions({

    products,

    fuelMassFlow,

    powerKW,

    pci

}) {


    const co2 =

        products.find(
            p =>
                p.id === "CO2"
        );



    const kgH =

        co2?.kgH

        ||

        0;



    return {

        kgH,

        kgPerKgFuel:

            fuelMassFlow > 0

                ?

                kgH
                /
                fuelMassFlow

                :

                NaN,

        kgPerMJFuel:

            fuelMassFlow > 0

            &&

            pci > 0

                ?

                kgH

                /

                (
                    fuelMassFlow
                    *
                    pci
                )

                :

                NaN,

        kgPerKWhThermal:

            powerKW > 0

                ?

                kgH
                /
                powerKW

                :

                NaN,

        tonnesPerDay:

            kgH

            *

            24

            /

            1000

    };

}



/* =========================================================
   MISTURA POR ALVO
========================================================= */

function mixtureProperty(
    comp,
    property
) {


    const M =

        mixtureMolarMass(
            comp
        );


    const pcs =

        mixtureHHV(
            comp
        );


    const pci =

        mixtureLHV(
            comp
        );


    const rhoN =

        normalDensity(
            M
        );


    const w =

        wobbe(
            pcs,
            rhoN,
            M
        );



    if (
        property === "PCI"
    ) {

        return pci;

    }


    if (
        property === "PCS"
    ) {

        return pcs;

    }


    if (
        property === "WOBBE"
    ) {

        return w.volumetricMJNm3;

    }



    throw new Error(

        "Propriedade-alvo inválida."

    );

}



function blendComposition(
    baseComp,
    additiveGas,
    additiveMolarFraction
) {


    const z =

        clamp(

            additiveMolarFraction,

            0,

            1

        );



    const entries =

        baseComp.map(

            i => ({

                gas:
                    i.gas,

                y:

                    i.y

                    *

                    (
                        1 - z
                    )

            })

        );



    entries.push({

        gas:
            additiveGas,

        y:
            z

    });



    return normalizeMolarComposition(
        entries
    );

}



function solveBlendTarget({

    baseComp,

    additiveGas,

    property,

    target

}) {


    if (
        !additiveGas
    ) {

        throw new Error(

            "Selecione o componente de adição."

        );

    }



    if (
        !Number.isFinite(
            target
        )
    ) {

        throw new Error(

            "Informe um alvo válido."

        );

    }



    let best =
        null;



    const samples =
        2000;



    for (
        let i = 0;
        i <= samples;
        i++
    ) {


        const z =

            i

            /

            samples;



        const comp =

            blendComposition(

                baseComp,

                additiveGas,

                z

            );



        const value =

            mixtureProperty(

                comp,

                property

            );



        const error =

            Math.abs(

                value

                -

                target

            );



        if (
            !best

            ||

            error < best.error
        ) {

            best = {

                z,
                comp,
                value,
                error

            };

        }

    }



    let lo =

        Math.max(

            0,

            best.z

            -

            1 / samples

        );



    let hi =

        Math.min(

            1,

            best.z

            +

            1 / samples

        );



    for (
        let i = 0;
        i < 70;
        i++
    ) {


        const m1 =

            lo

            +

            (
                hi - lo
            )

            /

            3;



        const m2 =

            hi

            -

            (
                hi - lo
            )

            /

            3;



        const v1 =

            mixtureProperty(

                blendComposition(

                    baseComp,

                    additiveGas,

                    m1

                ),

                property

            );



        const v2 =

            mixtureProperty(

                blendComposition(

                    baseComp,

                    additiveGas,

                    m2

                ),

                property

            );



        if (

            Math.abs(
                v1 - target
            )

            <

            Math.abs(
                v2 - target
            )

        ) {

            hi =
                m2;

        }

        else {

            lo =
                m1;

        }

    }



    const z =

        (
            lo + hi
        )

        /

        2;



    const comp =

        blendComposition(

            baseComp,

            additiveGas,

            z

        );



    const value =

        mixtureProperty(

            comp,

            property

        );



    return {

        additiveMolarFraction:
            z,

        comp,

        achieved:
            value,

        error:

            Math.abs(

                value

                -

                target

            )

    };

}



/* =========================================================
   PERTURBAÇÃO DE COMPOSIÇÃO
========================================================= */

function perturbComponentRelative(
    baseComp,
    componentId,
    relativePct
) {


    const target =

        baseComp.find(

            i =>
                i.gas.id
                ===
                componentId

        );



    if (
        !target
    ) {

        return baseComp;

    }



    const factor =

        1

        +

        relativePct / 100;



    const newTarget =

        clamp(

            target.y

            *

            factor,

            0,

            0.999999

        );



    const othersTotal =

        1

        -

        target.y;



    const remaining =

        1

        -

        newTarget;



    const entries =

        baseComp.map(

            i => {


                if (
                    i.gas.id
                    ===
                    componentId
                ) {


                    return {

                        gas:
                            i.gas,

                        y:
                            newTarget

                    };

                }



                const y =

                    othersTotal > 0

                        ?

                        i.y

                        /

                        othersTotal

                        *

                        remaining

                        :

                        0;



                return {

                    gas:
                        i.gas,

                    y

                };

            }

        );



    return normalizeMolarComposition(
        entries
    );

}



/* =========================================================
   AVISOS
========================================================= */

function qualityWarnings({

    comp,

    fuelT,

    oxidizerT,

    stackT,

    presetName = null,

    humidityEnabled = false

}) {


    const warnings =
        [];



    if (
        presetName
    ) {

        warnings.push(

            `${presetName}: preset representativo e editável; não é composição normativa.`

        );

    }



    if (
        humidityEnabled
    ) {

        warnings.push(

            "Comburente úmido: O₂/N₂ informados são tratados em base seca e H₂O é acrescentado pela umidade relativa."

        );

    }



    const checks = [

        {
            label:
                "combustível",

            T:
                fuelT
        },

        {
            label:
                "gases de chaminé",

            T:
                stackT
        }

    ];



    for (
        const item
        of comp
    ) {


        if (
            item.gas.cpShomate?.estimado
        ) {

            warnings.push(

                `${item.gas.nome}: Cp estimado por ${item.gas.cpShomate.metodo}.`

            );

        }



        for (
            const c
            of checks
        ) {


            if (
                selectCpRange(

                    item.gas,

                    c.T

                ).extrapolated
            ) {

                warnings.push(

                    `${item.gas.nome}: Cp fora da faixa cadastrada na condição de ${c.label} (${c.T.toFixed(2)} K).`

                );

            }

        }



        const src =

            item.gas.fontePcsPci

            ||

            "";



        if (

            src
                .toLowerCase()
                .includes(
                    "estim"
                )

            ||

            src.includes(
                "Channiwala"
            )

        ) {

            warnings.push(

                `${item.gas.nome}: PCS/PCI contém estimativa/correlação.`

            );

        }

    }



    for (
        const id
        of [
            "O2",
            "N2",
            "H2O",
            "CO2",
            "SO2"
        ]
    ) {


        const g =
            getGas(id);



        if (

            g

            &&

            selectCpRange(
                g,
                oxidizerT
            ).extrapolated

            &&

            [
                "O2",
                "N2",
                "H2O"
            ]
            .includes(
                id
            )

        ) {

            warnings.push(

                `${g.nome}: Cp do comburente extrapolado em ${oxidizerT.toFixed(2)} K.`

            );

        }

    }



    return [

        ...new Set(
            warnings
        )

    ];

}



/* =========================================================
   EXPORTAÇÃO
========================================================= */

window.Combustion = {

    CONFIG,

    getGas,

    clamp,

    tempToK,

    pressureToKPa,

    powerToKW,

    convertPower,

    compositionToYW,

    normalizeMolarComposition,

    mixtureMolarMass,

    mixtureHHV,

    mixtureLHV,

    mixtureCp,

    cpMolar,

    cpMass,

    idealDensity,

    normalDensity,

    wobbe,

    convertWobbe,

    flowsFromInput,

    flowsFromPower,

    atomsOfMixture,

    elementalMassPercentages,

    stoichO2PerKmol,

    saturationPressureWaterKPa,

    humidOxidizerComposition,

    oxidizer,

    combustionProducts,

    productBasis,

    fractions,

    productsCpMass,

    productSummary,

    dryAnalysis,

    lambdaFromMeasuredO2,

    correctedConcentrationAtO2,

    massBalance,

    elementalBalance,

    integrateCpMolar,

    mixtureSensibleEnthalpy,

    oxidizerSensibleEnthalpy,

    productsSensibleEnthalpy,

    adiabaticFlameTemperature,

    thermalBalance,

    dewPointFromWaterPartialPressure,

    flueGasDewPoint,

    co2Emissions,

    mixtureProperty,

    blendComposition,

    solveBlendTarget,

    perturbComponentRelative,

    qualityWarnings

};


})();