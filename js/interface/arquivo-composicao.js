/** Arquivo portátil da composição gasosa. Não contém condições de operação. */
import { normalizarNomeMistura, nomeArquivoMistura } from "./nome-mistura.js";
import { nomeMisturaAtual } from "./mistura.js";
import { $, C, els, estado, setResultStatus } from "./contexto.js";
import { addRow, rows, refreshPresetSelect, updateCompositionBar } from "./mistura.js";
import { hideError, showError } from "./entradas.js";

const FORMAT = "combustao-composicao";
const MAX_BYTES = 128 * 1024;

export function validarArquivoComposicao(data) {
  if (!data || data.formato !== FORMAT || data.versao !== 1)
    throw new Error(
      "Arquivo de composição incompatível. Use um arquivo salvo por Salvar composição."
    );
  if (!["molar", "massica"].includes(data.base))
    throw new Error("A base da composição deve ser molar ou mássica.");
  if (
    !Array.isArray(data.componentes) ||
    !data.componentes.length ||
    data.componentes.length > window.GAS_DATABASE.length
  )
    throw new Error("A lista de componentes está vazia ou é inválida.");
  if (data.nome !== undefined && (typeof data.nome !== "string" || data.nome.length > 120))
    throw new Error("O nome da mistura deve ser um texto de até 120 caracteres.");
  const ids = new Set();
  const componentes = data.componentes.map((item) => {
    if (!item || typeof item.id !== "string" || !C.getGas(item.id))
      throw new Error("O arquivo contém um componente desconhecido.");
    if (ids.has(item.id)) throw new Error("O arquivo contém componentes duplicados.");
    ids.add(item.id);
    if (
      typeof item.percentual !== "number" ||
      !Number.isFinite(item.percentual) ||
      item.percentual < 0 ||
      item.percentual > 100
    )
      throw new Error("Cada percentual deve ser um número entre 0 e 100%.");
    return { id: item.id, percentual: item.percentual };
  });
  if (!componentes.some((item) => item.percentual > 0))
    throw new Error("Informe pelo menos um percentual maior que zero.");
  // Rascunhos são preservados sem normalização automática; o cálculo mantém suas validações.
  return { nome: normalizarNomeMistura(data.nome), base: data.base, componentes };
}

export function criarArquivoComposicao() {
  const componentes = rows()
    .filter((item) => item.id || item.percentual !== 0)
    .map(({ id, percentual }) => ({ id, percentual }));
  const data = {
    formato: FORMAT,
    versao: 1,
    nome: nomeMisturaAtual(),
    base: $('input[name="baseComposicao"]:checked').value,
    componentes
  };
  validarArquivoComposicao(data);
  return data;
}

export function aplicarArquivoComposicao(data) {
  const valid = validarArquivoComposicao(data);
  const previousLoading = estado.carregando;
  estado.carregando = true;
  try {
    els.body.replaceChildren();
    $(`input[name="baseComposicao"][value="${valid.base}"]`).checked = true;
    valid.componentes.forEach((item) => addRow(item.id, item.percentual));
    $("#nomeMistura").value = valid.nome;
    refreshPresetSelect("manual");
    updateCompositionBar();
  } finally {
    estado.carregando = previousLoading;
  }
  if (["atualizado", "pendente"].includes($("#resultStatus")?.dataset.status))
    setResultStatus("pendente");
  hideError();
}

export function iniciarArquivosComposicao() {
  const input = $("#arquivoComposicao");
  const status = $("#statusArquivoComposicao");
  $("#btnSalvarComposicao").addEventListener("click", async () => {
    const button = $("#btnSalvarComposicao");
    button.disabled = true;
    status.textContent = "";
    try {
      const data = criarArquivoComposicao();
      const result = await salvarArquivoComposicao(data);
      hideError();
      if (result === "salvo") status.textContent = "Arquivo de composição salvo.";
      if (result === "download")
        status.textContent = "Arquivo de composição preparado para download com o nome escolhido.";
    } catch (error) {
      status.textContent = "";
      showError(error.message);
    } finally {
      button.disabled = false;
    }
  });
  $("#btnCarregarComposicao").addEventListener("click", () => {
    input.value = "";
    input.click();
  });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    $("#btnCarregarComposicao").disabled = true;
    try {
      if (file.size > MAX_BYTES) throw new Error("Arquivo muito grande. O limite é 128 KB.");
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("Não foi possível ler o arquivo JSON de composição.");
      }
      aplicarArquivoComposicao(data);
      status.textContent =
        "Composição carregada. Confira as condições e clique em Calcular combustão.";
    } catch (error) {
      status.textContent = "";
      showError(error.message);
    } finally {
      input.value = "";
      $("#btnCarregarComposicao").disabled = false;
    }
  });
}

export async function salvarArquivoComposicao(data) {
  const suggestedName = nomeArquivoMistura(data.nome);
  const content = JSON.stringify(data, null, 2);
  if (typeof window.showSaveFilePicker === "function") {
    let handle;
    try {
      // Deve ser chamado diretamente a partir do clique, antes de qualquer await.
      handle = await window.showSaveFilePicker({
        id: "composicao-combustao",
        suggestedName,
        types: [
          { description: "Composição gasosa (JSON)", accept: { "application/json": [".json"] } }
        ],
        excludeAcceptAllOption: true
      });
    } catch (error) {
      if (error.name === "AbortError") return "cancelado";
      // Contextos sem permissão para o seletor usam a escolha de nome abaixo.
      if (error.name !== "SecurityError" && error.name !== "NotAllowedError") throw error;
    }
    if (handle) {
      let writer;
      try {
        writer = await handle.createWritable();
        await writer.write(content);
        await writer.close();
        return "salvo";
      } catch (error) {
        if (writer) {
          try {
            await writer.abort();
          } catch {
            /* Já fechado ou abortado. */
          }
        }
        throw new Error("Não foi possível salvar o arquivo. Verifique a pasta e tente novamente.");
      }
    }
  }
  const chosen = window.prompt(
    "Nome do arquivo de composição (a extensão .json será adicionada).\nA pasta seguirá as configurações de download do navegador.",
    suggestedName
  );
  if (chosen === null) return "cancelado";
  const name = nomeArquivoMistura(chosen);
  let url;
  try {
    url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    return "download";
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
