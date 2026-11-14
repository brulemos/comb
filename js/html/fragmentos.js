/** Leitura validada de fragmentos HTML locais, usada pelos dois modos. */
export async function buscarFragmento(url, selector = null) {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${url.pathname} (HTTP ${resposta.status}).`);
  }
  const template = document.createElement("template");
  template.innerHTML = await resposta.text();
  const elements = [...template.content.children];
  if (!elements.length || (selector && (elements.length !== 1 || !elements[0].matches(selector)))) {
    throw new Error(
      `Estrutura inválida em ${url.pathname}${selector ? `: esperado um único ${selector}` : ": fragmento vazio"}.`
    );
  }
  return template.content;
}

const MODELOS = [
  ["misturador", "../../html/dialogos/misturador.html", "dialog#mixDialog"],
  ["comparador", "../../html/dialogos/comparador.html", "dialog#compareDialog"],
  ["fonteMisturador", "../../html/componentes/fonte-misturador.html", ".mix-source"],
  ["linhaComposicao", "../../html/componentes/linha-composicao.html", "tr"]
];
const modelos = new Map();

/** Só publica o cache depois que todos os modelos foram lidos e validados. */
export async function prepararModelosInterface() {
  if (modelos.size === MODELOS.length) return;
  const loaded = await Promise.all(
    MODELOS.map(async ([key, file, selector]) => [
      key,
      await buscarFragmento(new URL(file, import.meta.url), selector)
    ])
  );
  for (const [key, content] of loaded) modelos.set(key, content);
}

/** Cada chamada devolve um elemento independente, sem IDs globais adicionais. */
export function clonarModelo(key) {
  const content = modelos.get(key);
  if (!content) throw new Error(`Modelo de interface não preparado: ${key}.`);
  return content.firstElementChild.cloneNode(true);
}
