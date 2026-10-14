/** API pública de emissões.
 * Importada pelo carregador após o módulo de fórmulas.
 * Compatibilidade: window.EmissionEstimator mantém a interface original.
 */
import { SOURCES, MW, lbMmbtuToKgGJ, lbMmscfToKgGJ } from './js/emissoes/referencias.js';
import { LIBRARY, equipmentList, categoriesFor, factorFor } from './js/emissoes/fatores.js';
import { estimate } from './js/emissoes/estimador.js';
window.EmissionEstimator = {
    SOURCES, LIBRARY, MW, equipmentList, categoriesFor, factorFor,
    estimate, lbMmbtuToKgGJ, lbMmscfToKgGJ
};
