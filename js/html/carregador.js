/**
 * Etapa 5 — carregamento das seções HTML da calculadora.
 *
 * Um arquivo por seção, na mesma ordem do documento original.
 * Os arquivos contêm apenas <section class="panel">, sem wrappers extras.
 *
 * IMPORTANTE: esta função precisa terminar ANTES de carregar script.js,
 * porque contexto.js captura os elementos do DOM durante a importação.
 */

const SECOES = Object.freeze([
  "../../html/secoes/01-configuracao.html",
  "../../html/secoes/02-validade-dados.html",
  "../../html/secoes/03-propriedades.html",
  "../../html/secoes/04-estequiometria.html",
  "../../html/secoes/05-balanco-termico.html",
  "../../html/secoes/06-balanco-massa.html",
  "../../html/secoes/07-produtos.html",
  "../../html/secoes/08-emissoes-reais.html",
  "../../html/secoes/09-graficos.html",
  "../../html/secoes/10-exportacao.html"
]);

/** Busca e valida um fragmento HTML, fornecendo erros de diagnóstico. */
async function buscarSecao(caminho) {
  const url = new URL(caminho, import.meta.url);
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${url.pathname} (HTTP ${resposta.status}).`);
  }

  const html = await resposta.text();
  const template = document.createElement("template");
  template.innerHTML = html;

  // Não introduzir wrappers altera o grid e os seletores > do CSS.
  const elementos = [...template.content.children];
  if (elementos.length !== 1 || !elementos[0].matches("section.panel")) {
    throw new Error(`Estrutura inválida em ${url.pathname}: esperado um único section.panel.`);
  }

  return template.content;
}

/** Monta as dez seções na ordem certa, antes da inicialização dos eventos. */
export async function carregarSecoesCalculadora() {
  const principal = document.querySelector("main.main-content");
  if (!principal) throw new Error("Elemento main.main-content não encontrado.");

  // Todas as requisições podem ocorrer em paralelo. A ordem da matriz é mantida.
  // O DOM só é substituído quando todos os arquivos passam na validação.
  const fragmentos = await Promise.all(SECOES.map(buscarSecao));
  const conteudo = document.createDocumentFragment();
  for (const fragmento of fragmentos) conteudo.append(fragmento);
  principal.replaceChildren(conteudo);
}
