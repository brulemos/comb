import { buscarFragmento, prepararModelosInterface } from "./fragmentos.js";
/**
 * Carregamento das seções HTML da calculadora.
 *
 * Um arquivo por seção, na mesma ordem do documento original.
 * Os arquivos contêm apenas <section class="panel">, sem wrappers extras.
 *
 * IMPORTANTE: esta função precisa terminar antes de carregar interface/eventos.js,
 * porque contexto.js captura os elementos do DOM durante a importação.
 */

import { iniciarControlesChamine } from "../interface/controles-chamine.js";
import { iniciarSensibilidade } from "../interface/sensibilidade.js";

const SECOES = Object.freeze([
  "../../html/secoes/01-configuracao.html",
  "../../html/secoes/02-validade-dados.html",
  "../../html/secoes/03-propriedades.html",
  "../../html/secoes/04-estequiometria.html",
  "../../html/secoes/05-balanco-massa.html",
  "../../html/secoes/06-produtos-chamine.html",
  "../../html/secoes/07-graficos.html"
]);

/** Monta as sete seções na ordem certa, antes da inicialização dos eventos. */
export async function carregarSecoesCalculadora() {
  const principal = document.querySelector("main.main-content");
  if (!principal) throw new Error("Elemento main.main-content não encontrado.");

  // Todas as requisições podem ocorrer em paralelo. A ordem da matriz é mantida.
  // O DOM só é substituído quando todos os arquivos passam na validação.
  const [fragmentos] = await Promise.all([
    Promise.all(
      SECOES.map((file) => buscarFragmento(new URL(file, import.meta.url), "section.panel"))
    ),
    prepararModelosInterface()
  ]);
  const conteudo = document.createDocumentFragment();
  for (const fragmento of fragmentos) conteudo.append(fragmento);
  principal.replaceChildren(conteudo);
  iniciarControlesChamine();
  iniciarSensibilidade();
}
