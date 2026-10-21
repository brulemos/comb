/**
 * Botões compactos de visualização da chaminé.
 * Os selects originais continuam sendo a fonte de verdade para os motores.
 * O evento "change" é disparado para manter exatamente os listeners existentes.
 */
export function iniciarControlesChamine() {
  for (const grupo of document.querySelectorAll('.chimney-segments[data-select-id]')) {
    const seletor = document.getElementById(grupo.dataset.selectId);
    if (!seletor) throw new Error(`Seleção de chaminé ausente: ${grupo.dataset.selectId}`);
    const botoes = [...grupo.querySelectorAll('button[data-value]')];
    if (!botoes.length || botoes.some(botao => ![...seletor.options].some(opcao => opcao.value === botao.dataset.value))) {
      throw new Error(`Valores inválidos em ${grupo.dataset.selectId}`);
    }
    const sincronizar = () => {
      for (const botao of botoes) {
        const ativo = botao.dataset.value === seletor.value;
        botao.classList.toggle('is-active', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
      }
    };
    grupo.addEventListener('click', evento => {
      const botao = evento.target.closest('button[data-value]');
      if (!botao || !grupo.contains(botao)) return;
      if (botao.dataset.value !== seletor.value) {
        seletor.value = botao.dataset.value;
        seletor.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sincronizar();
    });
    seletor.addEventListener('change', sincronizar);
    sincronizar();
  }
}
