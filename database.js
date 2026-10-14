/** Ponto de entrada do banco de gases (compatível com a API global original). */
import { GASES_INORGANICOS } from './js/dados/01-inorganicos.js';
import { GASES_LEVES } from './js/dados/02-hidrocarbonetos-leves.js';
import { GASES_ORGANICOS } from './js/dados/03-hidrocarbonetos-pesados.js';
import { GASES_AUXILIARES } from './js/dados/04-produtos-auxiliares.js';
import { JMOL_SMILES_BY_ID } from './js/dados/smiles.js';
// Ordem histórica preservada: não altera presets nem listas na interface.
window.GAS_DATABASE = [
    ...GASES_INORGANICOS,
    ...GASES_LEVES,
    ...GASES_ORGANICOS,
    ...GASES_AUXILIARES
];
for (const gas of window.GAS_DATABASE) {
    if (!gas.smiles && JMOL_SMILES_BY_ID[gas.id]) {
        gas.smiles = JMOL_SMILES_BY_ID[gas.id];
    }
}
