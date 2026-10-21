/**
 * Seção 6 — controles de sensibilidade; NÃO implementa equações.
 * O formulário da seção 1 é a única fonte dos valores usados pelos dois motores.
 * Este módulo somente sincroniza os controles e solicita a execução normal dos motores.
 */
export function iniciarSensibilidade() {
  const byId = id => document.getElementById(id);
  const fonte = {
    excesso: byId('excessoAr'),
    umidade: byId('umidadeRelativa'),
    ativar: byId('usarUmidadeAr')
  };
  const ui = {
    excesso: {
      slider: byId('sensExcessoSlider'), numero: byId('sensExcessoNumero'),
      valor: byId('sensExcessoValor'), menos: byId('sensExcessoMenos'),
      mais: byId('sensExcessoMais'), estado: byId('sensExcessoEstado')
    },
    umidade: {
      slider: byId('sensUmidadeSlider'), numero: byId('sensUmidadeNumero'),
      valor: byId('sensUmidadeValor'), menos: byId('sensUmidadeMenos'),
      mais: byId('sensUmidadeMais'), estado: byId('sensUmidadeEstado')
    },
    ativar: byId('sensUmidadeAtiva'), restaurar: byId('sensRestaurar')
  };
  const obrigatorios = [
    ...Object.values(fonte), ui.ativar, ui.restaurar,
    ...Object.values(ui.excesso), ...Object.values(ui.umidade)
  ];
  if (obrigatorios.some(el => !el)) throw new Error('Controles da análise de sensibilidade ausentes.');

  let base = null;
  let alterandoFonte = false;
  let timer = null;
  let geracao = 0;
  const format = v => Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 1, maximumFractionDigits: 1
  });
  const numero = val => val.trim() === '' ? NaN : Number(val);
  const limite = (v, campo) => {
    if (!Number.isFinite(v)) return NaN;
    return Math.round(Math.min(campo === 'umidade' ? 100 : Infinity, Math.max(0, v)) * 10000) / 10000;
  };
  const modoInverso = () => document.querySelector('input[name="modoCombustao"]:checked')?.value === 'o2medido';
  const registrarBase = () => {
    if (!base) {
      base = { excesso: fonte.excesso.value, umidade: fonte.umidade.value, ativar: fonte.ativar.checked };
      ui.restaurar.disabled = false;
    }
  };

  function sincronizar() {
    const inverso = modoInverso();
    const conectado = fonte.ativar.checked;
    ui.ativar.checked = conectado;
    const mostrar = (chave, valor, inativo) => {
      const c = ui[chave];
      const valorNumerico = numero(valor);
      const valido = Number.isFinite(valorNumerico);
      // Excesso acima de 200% permanece válido no formulário original:
      // aumentar o alcance do slider em vez de alterar silenciosamente o valor.
      if (chave === 'excesso') {
        c.slider.max = String(Math.max(200, Math.ceil(Math.max(0, valorNumerico) / 50) * 50));
      }
      c.slider.value = valido ? String(Math.max(0, valorNumerico)) : '0';
      if (document.activeElement !== c.numero || alterandoFonte) c.numero.value = valor;
      c.valor.textContent = valido ? `${format(valorNumerico)}%` : '—';
      for (const el of [c.slider, c.numero, c.menos, c.mais]) el.disabled = inativo;
    };
    mostrar('excesso', fonte.excesso.value, inverso);
    mostrar('umidade', fonte.umidade.value, !conectado);
    ui.excesso.estado.textContent = inverso
      ? 'Desativado: o excesso é determinado a partir do O₂ seco medido (seção 1).'
      : 'Ajuste de 1 ponto percentual nos botões.';
    ui.umidade.estado.textContent = conectado
      ? 'Umidade aplicada ao cálculo; temperatura e pressão são as da seção 1.'
      : 'Ative a opção acima para aplicar a umidade nos cálculos.';
  }

  function recalcular(agora = false) {
    clearTimeout(timer);
    geracao++;
    const ticket = geracao;
    const executar = () => {
      if (ticket !== geracao) return;
      if (byId('tipoCombustivel').value === 'biomassa') {
        // O controlador de biomassa responde somente se já há caso calculado.
        document.dispatchEvent(new Event('combustion:sensitivity-recalculate'));
      } else {
        // Import dinâmico: o carregador monta o DOM ANTES do módulo do motor.
        import('./calculo.js').then(modulo => {
          if (ticket === geracao && byId('tipoCombustivel').value === 'gasosa') {
            import('./contexto.js').then(({ estado }) => {
              if (ticket === geracao && estado.ultimoCaso) modulo.calculate();
            });
          }
        }).catch(console.error);
      }
    };
    if (agora) executar();
    else timer = setTimeout(executar, 140);
  }

  function atualizarCampo(chave, valor, agora = false) {
    if (chave === 'excesso' && modoInverso()) return;
    if (chave === 'umidade' && !fonte.ativar.checked) return;
    const corrigido = limite(valor, chave);
    if (!Number.isFinite(corrigido)) return;
    if (numero(fonte[chave].value) !== corrigido) {
      registrarBase();
      alterandoFonte = true;
      fonte[chave].value = String(corrigido);
      fonte[chave].dispatchEvent(new Event('input', { bubbles: true }));
      alterandoFonte = false;
      recalcular(agora);
    } else if (agora && base) {
      // Pointerup/change conclui o movimento e recalcula o valor exato.
      recalcular(true);
    }
    sincronizar();
  }

  for (const chave of ['excesso', 'umidade']) {
    const c = ui[chave];
    c.slider.addEventListener('input', () => atualizarCampo(chave, Number(c.slider.value)));
    c.slider.addEventListener('change', () => atualizarCampo(chave, Number(c.slider.value), true));
    c.numero.addEventListener('input', () => {
      const v = numero(c.numero.value);
      // Durante a digitação, não introduzir NaN nem números fora da faixa no motor.
      if (Number.isFinite(v) && v >= 0 && (chave !== 'umidade' || v <= 100)) {
        atualizarCampo(chave, v);
      }
    });
    c.numero.addEventListener('change', () => {
      const v = numero(c.numero.value);
      if (Number.isFinite(v)) atualizarCampo(chave, v, true);
      // Após confirmar, exibir o valor efetivamente aceito pelo motor
      // (inclusive se houve limitação para 0–100% de umidade).
      c.numero.value = fonte[chave].value;
      sincronizar();
    });
    c.menos.addEventListener('click', () => atualizarCampo(chave, numero(fonte[chave].value) - 1, true));
    c.mais.addEventListener('click', () => atualizarCampo(chave, numero(fonte[chave].value) + 1, true));
  }

  ui.ativar.addEventListener('change', () => {
    if (ui.ativar.checked === fonte.ativar.checked) return;
    registrarBase();
    alterandoFonte = true;
    fonte.ativar.checked = ui.ativar.checked;
    fonte.ativar.dispatchEvent(new Event('change', { bubbles: true }));
    alterandoFonte = false;
    sincronizar();
    recalcular(true);
  });

  ui.restaurar.addEventListener('click', () => {
    if (!base) return;
    const anterior = base;
    base = null;
    clearTimeout(timer);
    alterandoFonte = true;
    fonte.excesso.value = anterior.excesso;
    fonte.umidade.value = anterior.umidade;
    fonte.excesso.dispatchEvent(new Event('input', { bubbles: true }));
    fonte.umidade.dispatchEvent(new Event('input', { bubbles: true }));
    const mudouAtivacao = fonte.ativar.checked !== anterior.ativar;
    fonte.ativar.checked = anterior.ativar;
    if (mudouAtivacao) fonte.ativar.dispatchEvent(new Event('change', { bubbles: true }));
    alterandoFonte = false;
    ui.restaurar.disabled = true;
    sincronizar();
    recalcular(true);
  });

  for (const el of [fonte.excesso, fonte.umidade, fonte.ativar,
    ...document.querySelectorAll('input[name="modoCombustao"]')]) {
    for (const nome of ['input', 'change']) {
      el.addEventListener(nome, () => {
        if (!alterandoFonte) {
          base = null; ui.restaurar.disabled = true;
        }
        sincronizar();
      });
    }
  }
  byId('tipoCombustivel').addEventListener('change', () => {
    clearTimeout(timer); geracao++;
    base = null; ui.restaurar.disabled = true;
    sincronizar();
  });
  document.addEventListener('combustion:reset', () => {
    clearTimeout(timer); geracao++;
    base = null; ui.restaurar.disabled = true;
    sincronizar();
  });
  sincronizar();
}
