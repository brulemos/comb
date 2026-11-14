/** Identificação da mistura; não participa dos cálculos termodinâmicos. */
export function normalizarNomeMistura(value) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) : "";
}

export function nomeArquivoMistura(value) {
  let name = normalizarNomeMistura(value).normalize("NFC")
    .replace(/[<>:"/\\|?*]/g, "_").replace(/[. ]+$/g, "");
  name = name.replace(/\.json$/i, "").replace(/[. ]+$/g, "");
  if (!name || /^\.+$/.test(name)) name = "mistura-personalizada";
  if (/^(con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(\.|$)/i.test(name)) name = "_" + name;
  const encoder = new TextEncoder();
  while (encoder.encode(name).length > 240) name = Array.from(name).slice(0, -1).join("");
  return name + ".json";
}
