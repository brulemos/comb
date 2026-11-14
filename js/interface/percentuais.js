/** Percentuais exatos separados da apresentação arredondada dos campos. */
const valores = new WeakMap();

export function normalizarPercentuais(values) {
  if (!values.length || values.some((n) => !Number.isFinite(n) || n < 0))
    throw new Error("Informe proporções finitas e não negativas.");
  const max = Math.max(...values);
  if (!(max > 0)) throw new Error("A soma das proporções deve ser positiva.");
  const total = values.reduce((sum, v) => sum + v, 0);
  const factor = 100 / total;
  let result;
  if (Number.isFinite(total) && Number.isFinite(factor)) {
    // Multiplicar pelo fator evita apagar traços pela divisão intermediária.
    result = values.map((v) => v * factor);
  } else {
    // Somatórios enormes ou subnormais exigem escalonamento para evitar overflow.
    const scaled = values.map((v) => v / max);
    const scaledTotal = scaled.reduce((sum, v) => sum + v, 0);
    result = scaled.map((v) => (v / scaledTotal) * 100);
  }
  const largest = values.indexOf(max);
  result[largest] += 100 - result.reduce((sum, v) => sum + v, 0);
  return result;
}

function exibirNumero(value) {
  if (value !== 0 && Math.abs(value) < 0.0001) {
    const [mantissa, exponent] = value.toExponential(4).split("e");
    return Number(mantissa) + "e" + exponent;
  }
  return String(Number(value.toFixed(4)));
}

export function lerPercentual(input) {
  if (!input || input.value.trim() === "") return NaN;
  const state = valores.get(input);
  if (state && state.exibido === input.value) return state.exato;
  return Number(input.value) / (state?.escala || 1);
}

export function escreverPercentual(input, value, base = "molar") {
  const numeric = value === "" || value === null || value === undefined ? NaN : Number(value);
  const escala = Number.isFinite(numeric) && numeric > 0 && numeric < 0.0001 ? 10000 : 1;
  input.value = Number.isFinite(numeric) ? exibirNumero(numeric * escala) : "";
  valores.set(input, { exato: numeric, exibido: input.value, escala });
  const unidade = escala === 1 ? "%" : base === "massica" ? "ppm em massa" : "ppm molar";
  const label = input.parentElement?.querySelector(".fraction-unit");
  if (label) label.textContent = unidade;
  input.max = String(100 * escala);
  input.step = "any";
  input.setAttribute("aria-label", `Proporção em ${unidade}`);
  input.title = Number.isFinite(numeric) ? `Percentual: ${numeric}%` : "";
}

export function vincularPercentual(input, obterBase = () => "molar") {
  input.addEventListener("input", (event) => {
    // Escritas da aplicação já carregam o valor exato; não reler a exibição arredondada.
    if (event.percentualPreservado) return;
    const escala = valores.get(input)?.escala || 1;
    valores.set(input, {
      exato: input.value.trim() === "" ? NaN : Number(input.value) / escala,
      exibido: input.value,
      escala
    });
  });
  input.addEventListener("change", () => escreverPercentual(input, lerPercentual(input), obterBase()));
}

export function notificarPercentual(input) {
  const event = new Event("input", { bubbles: true });
  event.percentualPreservado = true;
  input.dispatchEvent(event);
}
