import { lerPercentual } from "./percentuais.js";
/** Interface 1.0: navegação e apresentação. Motores e catálogo não são alterados.
 * Os controles originais são movidos (não clonados), mantendo IDs, valores e listeners.
 */
import { nomeMisturaAtual } from './mistura.js';
import { normalizarNomeMistura } from './nome-mistura.js';
import { estado, setResultStatus } from './contexto.js';
import { renderCharts } from './graficos.js';
import { openComponentTrace } from './componentes.js';
import { obterCasoBiomassa } from '../biomassa/interface.js';

const $ = (id) => document.getElementById(id);
const smallScreen = matchMedia('(max-width: 900px)');
// A faixa acompanha a altura real do cabeçalho, inclusive com zoom e quebra de linha.
const summaryStrip = document.querySelector('.summary-strip');
const topbar = document.querySelector('.ui-topbar');
const summaryLayoutObserver = new ResizeObserver(() => {
 document.body.style.setProperty('--ui-summary-top', `${topbar.getBoundingClientRect().height}px`);
 document.body.style.setProperty('--ui-summary-height', `${summaryStrip.getBoundingClientRect().height}px`);
});
summaryLayoutObserver.observe(topbar);
summaryLayoutObserver.observe(summaryStrip);
// Reserva espaço para os créditos e ações fixos, inclusive com zoom e em telas pequenas.
const actionbar = $('uiActionbar');
const actionbarObserver = new ResizeObserver(() => {
 document.body.style.setProperty('--ui-actionbar-height', `${actionbar.getBoundingClientRect().height}px`);
});
actionbarObserver.observe(actionbar);
const sections = [
  ['entradas', 'Entradas', 'Configuração do caso', 0, 'sliders'],
  ['propriedades', 'Propriedades da mistura', 'Propriedades da mistura', 2, 'molecule'],
  ['estequiometria', 'Estequiometria', 'Estequiometria e combustão', 3, 'flame'],
  ['massa', 'Balanço de massa', 'Balanços de massa e elementos', 4, 'balance'],
  ['chamine', 'Balanço térmico e produtos', 'Balanço térmico, produtos e chaminé', 5, 'thermo'],
  ['graficos', 'Gráficos', 'Gráficos do caso', 6, 'chart'],
  ['documentacao', 'Documentação técnica', 'Documentação, validade e avisos', 1, 'book']
];
const paths = {
  sliders: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  molecule: '<path d="m7 7 10 10M7 17 17 7"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>',
  flame: '<path d="M13 2c2 6-4 7-3 11 1-1 3-2 4-5 5 4 7 10 2 13-5 3-11-1-11-6 0-4 4-7 8-13Z"/>',
  balance: '<path d="M12 3v18M5 21h14M3 7h18M6 7l-4 9h8L6 7Zm12 0-4 9h8l-4-9Z"/>',
  thermo: '<path d="M10 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M13 9v9"/>',
  chart: '<path d="M4 3v18h17M8 17v-5M13 17V8M18 17V4"/>',
  book: '<path d="M12 5C8 2 5 3 2 4v16c4-2 7-2 10 0 3-2 6-2 10 0V4c-3-1-6-2-10 1Zm0 0v15"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const panels = [...document.querySelectorAll('main.main-content > section.panel')];
if (panels.length !== 7) throw new Error('A interface requer as sete seções originais.');
let current = 'entradas', lastResult = 'propriedades', currentStack = 'produtos';

for (const [key, label, title, index, glyph] of sections) {
  const panel = panels[index];
  panel.dataset.uiSection = key;
  panel.id ||= 'uiPanel-' + key;
  panel.setAttribute('aria-label', title);
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.uiNav = key;
  button.innerHTML = icon(glyph) + `<span>${label}</span>`;
  button.setAttribute('aria-controls', panel.id);
  button.addEventListener('click', () => showSection(key, true));
  $('uiNav').append(button);
  const option = document.createElement('option');option.value = key;option.textContent = label;
  $('uiSectionSelect').append(option);
}

function setMenu(open) {
  const wasOpen=$('uiSidebar').dataset.open==='true';
  $('uiSidebar').dataset.open = String(open);
  $('uiMenu').setAttribute('aria-expanded', String(open));
  $('uiBottomMenu').setAttribute('aria-expanded', String(open));
  $('uiBackdrop').hidden = !open;
  $('uiSidebar').inert = smallScreen.matches && !open;
  document.body.classList.toggle('ui-menu-open', open && smallScreen.matches);
  if (open && smallScreen.matches) $('uiNav').querySelector('[aria-current="page"]')?.focus();
  if (!open && wasOpen && smallScreen.matches) $('uiMenu').focus({preventScroll:true});
}
function showSection(key, focus = false) {
  const found = sections.find((s) => s[0] === key);if (!found) return;
  current = key;if (key !== 'entradas') lastResult = key;
  panels.forEach((p) => { const active = p.dataset.uiSection === key;p.dataset.uiActive = String(active);p.inert = !active; });
  for (const b of $('uiNav').children) b.setAttribute('aria-current', b.dataset.uiNav === key ? 'page' : 'false');
  $('uiSectionSelect').value = key;$('uiSectionLabel').textContent = found[1];$('uiMainTitle').textContent = found[2];
  document.querySelectorAll('[data-ui-area]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.uiArea === 'entradas') === (key === 'entradas'))));
  const next = sections[(sections.indexOf(found) + 1) % sections.length];
  $('uiNext').textContent = next[0] === 'entradas' ? 'Voltar ao início ↻' : 'Próxima seção →';
  $('uiNext').title = `Ir para: ${next[1]}`;
  $('uiNext').setAttribute('aria-label', `${next[0] === 'entradas' ? 'Voltar ao início' : 'Próxima seção'}: ${next[1]}`);
  $('uiNext').setAttribute('aria-controls', panels[next[3]].id);
  $('uiTools').open = false;setMenu(false);
  history.replaceState(null, '', location.pathname+location.search+'#'+key);
  if (focus) { $('uiMainTitle').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  if (key === 'graficos') requestAnimationFrame(() => renderCharts());
}
$('uiMenu').addEventListener('click', () => setMenu($('uiMenu').getAttribute('aria-expanded') !== 'true'));
$('uiBottomMenu').addEventListener('click', () => setMenu(true));
$('uiBackdrop').addEventListener('click', () => setMenu(false));
$('uiSectionSelect').addEventListener('change', (e) => showSection(e.target.value, true));
$('uiNext').addEventListener('click', () => {
  const index = sections.findIndex((section) => section[0] === current);
  showSection(sections[(index + 1) % sections.length][0], true);
});
document.querySelectorAll('[data-ui-area]').forEach((b) => b.addEventListener('click', () => showSection(b.dataset.uiArea === 'entradas' ? 'entradas' : lastResult, true)));
window.addEventListener('hashchange', () => showSection(location.hash.slice(1)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { setMenu(false);$('uiTools').open = false; }
  if (e.key === 'Tab' && smallScreen.matches && $('uiSidebar').dataset.open === 'true') {
    const targets = [...$('uiSidebar').querySelectorAll('a, button')];const first=targets[0],last=targets.at(-1);
    if (e.shiftKey && document.activeElement===first) {e.preventDefault();last.focus();}
    else if (!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
  }
});
smallScreen.addEventListener('change', () => setMenu(false));

// Os elementos de ação originais conservam seus listeners.
$('uiOriginalTools').append($('btnComparar'));
$('uiOriginalActions').append($('btnCalcular'));
// O botão original fica apenas em Ferramentas, preservando a limpeza dos dois motores.
const clearButton = $('btnLimpar');
clearButton.className = '';
clearButton.textContent = 'Limpar caso atual';
document.querySelector('[data-ui-proxy="btnLimpar"]').replaceWith(clearButton);
$('btnCalcular').textContent = 'Calcular combustão';
// Mover os controles originais mantém os listeners de arquivo e do misturador.
for (const [id, label] of [
  ['btnSalvarComposicao', 'Salvar composição'],
  ['btnCarregarComposicao', 'Carregar composição'],
  ['btnMixCombustiveis', 'Misturador de combustíveis']
]) {
  const button = $(id);
  button.className = '';
  button.textContent = label;
  button.dataset.uiGasTool = '';
  document.querySelector(`[data-ui-proxy="${id}"]`).replaceWith(button);
  button.addEventListener('click', () => { $('uiTools').open = false; });
}
document.querySelector('.composition-file-actions')?.remove();
$('btnCalcular').addEventListener('click', () => {
  // Mensagens de validação permanecem sempre visíveis, mesmo após calcular em outra seção.
  if ($('resultStatus').dataset.status === 'invalido') showSection('entradas', true);
});

// A condição de combustão ganha um cartão próprio. Nenhum valor é duplicado.
const inputGrid = panels[0].querySelector('.input-grid');
const airCard = $('o2Comburente').closest('article.card');airCard.classList.add('ui-air-card');
$('corpoMistura').closest('article.card').classList.add('ui-mixture-card');
$('vazaoEntrada').closest('article.card').classList.add('ui-fuel-card');
const combustionCard=document.createElement('article');combustionCard.className='card ui-combustion-card';
const heading=document.createElement('h3');heading.textContent='Condição de combustão';combustionCard.append(heading);
const modeField = airCard.querySelector('input[name="modoCombustao"]').closest('fieldset');
for (const node of [modeField,$('fieldExcesso'),$('fieldO2Medido'),$('lambdaPreview').parentElement]) combustionCard.append(node);
inputGrid.append(combustionCard);
for (const c of inputGrid.querySelectorAll(':scope > article.card')) {
  const wrapper = document.createElement('details');wrapper.className = 'ui-input-card';
  for (const k of ['somente-gas','somente-biomassa']) if(c.classList.contains(k))wrapper.classList.add(k);
  for (const k of ['ui-mixture-card','ui-fuel-card','ui-air-card','ui-combustion-card'])if(c.classList.contains(k))wrapper.classList.add(k+'-wrap');
  const summary=document.createElement('summary');summary.textContent=c.querySelector('h3')?.textContent.trim() || 'Entradas';
  c.before(wrapper);wrapper.append(summary,c);wrapper.open = !smallScreen.matches || c.classList.contains('ui-mixture-card') || c.id==='bioCaracterizacao';
  // Primeiro cartão de biomassa também fica aberto em telas pequenas.
  if (c.classList.contains('somente-biomassa') && !wrapper.previousElementSibling?.classList.contains('somente-biomassa')) wrapper.open=true;
}
smallScreen.addEventListener('change', () => {
  if (!smallScreen.matches) document.querySelectorAll('.ui-input-card').forEach((d) => d.open=true);
});

// Agrupamento da chaminé em abas, sem recriar inputs ou resultados.
const stackPanel=panels[5];
const stackTabs=document.createElement('div');stackTabs.className='ui-stack-tabs';stackTabs.setAttribute('role','tablist');stackTabs.setAttribute('aria-label','Resultados de chaminé');
const groups={};
for(const [key,label] of [['produtos','Produtos'],['energia','Energia e propriedades'],['emissoes','CO₂ e SO₂'],['sensibilidade','Sensibilidade']]) {
  const tab=document.createElement('button');tab.type='button';tab.id='uiStackTab-'+key;tab.textContent=label;tab.dataset.uiStackTab=key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','uiStack-'+key);stackTabs.append(tab);
  const group=document.createElement('div');group.id='uiStack-'+key;group.dataset.uiStackGroup=key;group.setAttribute('role','tabpanel');group.setAttribute('aria-labelledby',tab.id);groups[key]=group;
  tab.addEventListener('click',()=>showStack(key));
  tab.addEventListener('keydown',(e)=>{const tabs=[...stackTabs.children],i=tabs.indexOf(tab);let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].click();tabs[next].focus();}});
}
const originalStackNodes=[...stackPanel.children];
const metricGroups={};
for(const mode of ['gas','biomassa'])for(const key of ['produtos','energia','emissoes']) {
  const grid=document.createElement('div');grid.className='result-grid somente-'+mode;groups[key].append(grid);metricGroups[mode+'-'+key]=grid;
}
for(const metric of [...stackPanel.querySelectorAll('.metric')]) {
  const strong=metric.querySelector('strong[id]');if(!strong)continue;
  const id=strong.id,mode=id.startsWith('bio')?'biomassa':'gas';
  const key=/SO2|CO2/.test(id)?'emissoes':/Flue|DewPoint|CinzasKgH|AguaKgH/.test(id)?'energia':'produtos';
  metricGroups[mode+'-'+key].append(metric);
}
for(const bodyId of ['corpoProdutos','bioCorpoProdutos']) {
  const wrapper=$(bodyId).closest('.table-wrap');wrapper.classList.add(bodyId.startsWith('bio')?'somente-biomassa':'somente-gas');groups.produtos.append(wrapper);
}
const correction=$('avisoCorrecaoO2Gas');correction.classList.add('somente-gas');groups.emissoes.append(correction);
groups.sensibilidade.append(stackPanel.querySelector('.sensitivity-panel'));
const note=document.createElement('p');note.className='ui-note';note.textContent='Perda sensível da chaminé não representa a eficiência total do equipamento. Consulte as premissas e os avisos do caso.';groups.energia.append(note);
// Conservar as notas textuais da biomassa antes de retirar invólucros vazios.
const bioOld=originalStackNodes.find((n)=>n.classList.contains('somente-biomassa'));
if(bioOld)for(const note of [...bioOld.querySelectorAll(':scope > small, :scope > p')]){note.classList.add('somente-biomassa');groups.emissoes.append(note);}
for(const node of originalStackNodes)if(!node.matches('.section-title,.process-conditions') && node.parentElement===stackPanel) node.remove();
stackPanel.append(stackTabs,...Object.values(groups));
function showStack(key) {
  currentStack=key;
  for(const tab of stackTabs.children){const on=tab.dataset.uiStackTab===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;}
  for(const [k,group]of Object.entries(groups)){group.dataset.uiActive=String(k===key);group.inert=k!==key;}
}
showStack(currentStack);

// Documentação existente incorporada à mesma navegação; ficha técnica reutiliza o diálogo original.
const docsPanel=panels[1];docsPanel.querySelectorAll('details').forEach((d)=>d.open=true);
const docs=document.createElement('div');docs.className='ui-docs';docs.innerHTML=`<div class="ui-docs-grid"><article class="card"><h3>Consultar componentes</h3><label class="field">Nome ou fórmula<input type="search" id="uiComponentSearch" placeholder="Ex.: propano, CH4, CO₂" /></label><div id="uiComponentList" class="ui-component-list"></div></article><article class="card"><h3>Condições de referência</h3><dl><dt>PCS e PCI</dt><dd>Combustão a 25 °C</dd><dt>Volume normal</dt><dd>0 °C e 101,325 kPa absolutos</dd><dt>Modelo</dt><dd>Combustão completa e gases ideais</dd><dt>Temperatura adiabática</dt><dd>Sem dissociação química</dd></dl></article></div><details class="ui-premises"><summary>Premissas e limitações completas</summary><div id="uiPremisesContent"></div></details>`;
docsPanel.append(docs);
function componentList() {
 const term=$('uiComponentSearch').value.trim().toLocaleLowerCase('pt-BR');const list=$('uiComponentList');list.replaceChildren();
 for(const gas of window.GAS_DATABASE.filter((g)=>`${g.nome} ${g.formula} ${g.id}`.toLocaleLowerCase('pt-BR').includes(term))) {
  const b=document.createElement('button');b.type='button';b.className='ui-component-item';
  const name=document.createElement('span');name.textContent=gas.nome+' · '+gas.formula;
  const action=document.createElement('small');action.textContent='Ver ficha ⓘ';b.append(name,action);b.addEventListener('click',()=>openComponentTrace(gas.id));list.append(b);
 }
 if(!list.children.length)list.textContent='Nenhum componente encontrado.';
}
$('uiComponentSearch').addEventListener('input',componentList);componentList();
const premisesTemplate = $('uiPremisesTemplate');
$('uiPremisesContent').replaceChildren(premisesTemplate.content);
premisesTemplate.remove();

// Rótulos por célula permitem leitura em cartões no celular, inclusive após recálculo.
let labelsQueued=false;
function labelTables() {
 labelsQueued=false;
 for(const table of document.querySelectorAll('main .data-table')) {
  table.classList.add(table.querySelector('#corpoMistura')?'ui-composition-table':'ui-card-table');
  const headings=[...table.querySelectorAll('thead th')].map((th)=>th.textContent.replace(/\s+/g,' ').trim());
  for(const row of table.querySelectorAll('tbody tr'))for(const [i,cell]of [...row.children].entries()) {
    const label=headings[i]||'Ações';if(cell.dataset.label!==label)cell.dataset.label=label;
  }
 }
}
const tableObserver=new MutationObserver(()=>{if(!labelsQueued){labelsQueued=true;queueMicrotask(labelTables);}});
tableObserver.observe($('uiMain'),{childList:true,subtree:true});labelTables();

// Estado do caso e avisos refletem os resultados reais; não há números de demonstração.
function refreshShell() {
 const bio=document.body.dataset.tipoCombustivel==='biomassa';const status=$('resultStatus').dataset.status||'vazio';
 const r=bio?obterCasoBiomassa():estado.ultimoCaso;
 const preset=nomeMisturaAtual();
 $('uiCaseLabel').textContent=bio?`${$('bioNome').value||'Biomassa personalizada'} · Biomassa`:`${preset} · Mistura gasosa`;
 const labels={atualizado:'Resultados atualizados',pendente:'Entradas alteradas',invalido:'Revisar entradas',vazio:'Aguardando cálculo'};
 $('uiStatus').textContent=labels[status]||labels.vazio;$('uiStatus').dataset.state=status;
 $('btnCalcular').textContent=status==='pendente'?'Recalcular combustão':'Calcular combustão';
 const warnings=(bio?r?.avisos:r?.warnings)||[];$('uiWarningCount').textContent=String(warnings.length);
 for(const b of document.querySelectorAll('[data-ui-gas-tool]'))b.disabled=bio;
 $('uiWarningsButton').setAttribute('aria-label',`Documentação e avisos: ${warnings.length}`);
}
document.addEventListener('combustion:result-status',()=>{refreshShell();if($('resultStatus').dataset.status==='invalido')queueMicrotask(()=>showSection('entradas',true));});
$('tipoCombustivel').addEventListener('change',()=>{refreshShell();if(current==='graficos')requestAnimationFrame(renderCharts);});
$('uiMain').addEventListener('change',refreshShell);
$('nomeMistura').addEventListener('input',refreshShell);
// Limpar no modo biomassa usa captura no controlador original; observar no documento.
document.addEventListener('click',(event)=>{if(event.target.closest('#btnLimpar'))queueMicrotask(()=>{$('uiTools').open=false;$('uiFileStatus').textContent='';showSection('entradas',true);refreshShell();});},true);
$('uiWarningsButton').addEventListener('click',()=>showSection('documentacao',true));
new MutationObserver(refreshShell).observe(document.body,{attributes:true,attributeFilter:['data-tipo-combustivel']});

// Arquivo completo do caso: camada de interface, sem alterar a API de composição existente.
// Whitelist dos controles originais; HTML, URLs e código nunca são aceitos do arquivo.
const sourceControls=[...document.querySelectorAll('main input[id],main select[id]')].filter((el)=>!el.id.startsWith('ui')&&!el.id.startsWith('sens')&&el.type!=='file'&&el.type!=='search'&&!el.readOnly);
const sourceRadios=[...document.querySelectorAll('main input[type=radio][name]')];
const persisted=new Map(sourceControls.map((el)=>[el.id,el]));
const radioNames=[...new Set(sourceRadios.map((el)=>el.name))];
function caseSnapshot() {
 const fields=Object.fromEntries(sourceControls.map((el)=>[el.id,el.type==='checkbox'?el.checked:el.value]));
 const radios=Object.fromEntries(radioNames.map((name)=>[name,sourceRadios.find((el)=>el.name===name&&el.checked)?.value]));
 const mixture=[...$('corpoMistura').querySelectorAll('tr')].map((row)=>({id:row.querySelector('.component-select').value,percentual:row.querySelector('.component-percent').value===''?'':lerPercentual(row.querySelector('.component-percent'))}));
 return {formato:'lbe-caso-v1',versao:1,data:new Date().toISOString(),fields,radios,mixture};
}
function validateCase(data) {
 if(!data||data.formato!=='lbe-caso-v1'||data.versao!==1||!data.fields||!data.radios||!Array.isArray(data.mixture))throw new Error('Arquivo de caso incompatível. Use um arquivo salvo por Salvar caso completo.');
 if(data.mixture.length>500)throw new Error('O arquivo excede o limite de componentes.');
 for(const id of persisted.keys())if(id!=='nomeMistura'&&!Object.hasOwn(data.fields,id))throw new Error(`Campo ausente no caso: ${id}.`);
 for(const [id,value]of Object.entries(data.fields)) {
  const el=persisted.get(id);if(!el)throw new Error(`Campo não reconhecido no caso: ${id}.`);
  if(el.type==='checkbox'){if(typeof value!=='boolean')throw new Error(`Valor inválido: ${id}.`);}
  else if(typeof value!=='string'||value.length>(id==='nomeMistura'?120:1000))throw new Error(`Valor inválido: ${id}.`);
  else if(el.tagName==='SELECT'&&![...el.options].some((o)=>o.value===value))throw new Error(`Opção inválida: ${id}.`);
  else if(el.type==='number'&&value!==''&&!Number.isFinite(Number(value)))throw new Error(`Número inválido: ${id}.`);
 }
 for(const name of radioNames)if(!sourceRadios.some((el)=>el.name===name&&el.value===data.radios[name]))throw new Error(`Modo inválido: ${name}.`);
 if(Object.keys(data.radios).some((name)=>!radioNames.includes(name)))throw new Error('Modo de entrada não reconhecido.');
 for(const row of data.mixture)if(!row||typeof row.id!=='string'||(row.id!==''&&!window.Combustion.getGas(row.id))||!['string','number'].includes(typeof row.percentual)||(row.percentual!==''&&(!Number.isFinite(Number(row.percentual))||Number(row.percentual)<0||Number(row.percentual)>100)))throw new Error('Composição inválida no arquivo de caso.');
 return data;
}
async function saveCase() {
 const data=caseSnapshot();validateCase(data);
 const text=JSON.stringify(data,null,2),suggested='caso-combustao.json';
 if(typeof window.showSaveFilePicker==='function') {
  const handle=await window.showSaveFilePicker({suggestedName:suggested,types:[{description:'Caso da calculadora',accept:{'application/json':['.json']}}]});const writable=await handle.createWritable();await writable.write(text);await writable.close();
 } else {
  const answer=window.prompt('Nome do arquivo do caso (extensão .json):',suggested);if(answer===null)return;
  let name=answer.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');if(!name)throw new Error('Informe um nome para o arquivo.');if(!name.toLowerCase().endsWith('.json'))name+='.json';
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 $('uiFileStatus').textContent='Caso completo salvo. Inclui composição, condições e seleções de visualização.';
}
async function restoreCase(raw) {
 const data=validateCase(raw);
 // A composição utiliza a API original: valida o banco e preserva seus eventos.
 const { addRow, refreshPresetSelect, updateCompositionBar }=await import('./mistura.js');
 const {refreshComponentSelects}=await import('./componentes.js');
 const input=await import('./entradas.js');
 const oldKind=$('tipoCombustivel').value;
 // Remonta somente as linhas dinâmicas originais, com os listeners delegados existentes.
 estado.carregando=true;
 try {
  $('nomeMistura').value=normalizarNomeMistura(data.fields.nomeMistura);
  $('corpoMistura').replaceChildren();for(const row of data.mixture)addRow(row.id,row.percentual);if(!data.mixture.length)addRow();
  for(const [id,value]of Object.entries(data.fields)){const el=persisted.get(id);if(el.type==='checkbox')el.checked=value;else el.value=value;}
  for(const [name,value]of Object.entries(data.radios))sourceRadios.find((el)=>el.name===name&&el.value===value).checked=true;
 } finally {estado.carregando=false;}
 refreshPresetSelect(data.fields.presetCombustivel);refreshComponentSelects();updateCompositionBar();
 for(const id of ['tipoCombustivel','bioPCSFonte','bioModoComburente','bioModoAFR','bioUnidadePotenciaPCS','bioUnidadePotenciaPCI','bioBaseProdutos','bioModoTabelaProdutos','bioTipoVazaoProdutos']) {
  // A troca de modo só deve ocorrer quando há efetiva mudança, para não substituir o caso gasoso guardado.
  if(id!=='tipoCombustivel'||oldKind!==data.fields.tipoCombustivel)$(id).dispatchEvent(new Event('change',{bubbles:true}));
 }
 for(const name of ['modoEntrada','bioEntrada','modoCombustao','baseComposicao'])sourceRadios.find((el)=>el.name===name&&el.checked)?.dispatchEvent(new Event('change',{bubbles:true}));
 input.updateInputModeUI();input.updateFlowUI();input.updateN2();input.updateHumidityUI();input.updateCombustionModeUI();
 for(const id of ['bioC','bioH','bioO','bioN','bioS','bioCinzas'])$(id).dispatchEvent(new Event('input',{bubbles:true}));
 for(const id of ['baseProdutos','modoTabelaProdutos','tipoVazaoProdutos'])$(id).dispatchEvent(new Event('change',{bubbles:true}));
 $('btnCalcular').click();showSection('entradas',true);refreshShell();
 $('uiFileStatus').textContent=$('resultStatus').dataset.status==='invalido'?'Caso carregado. Revise os campos indicados pelo motor.':'Caso completo carregado e recalculado.';
}
$('uiSaveCase').addEventListener('click',async()=>{try{await saveCase();}catch(e){if(e.name!=='AbortError')$('uiFileStatus').textContent=e.message;}finally{$('uiTools').open=false;}});
$('uiLoadCase').addEventListener('click',()=>{$('uiCaseFile').click();$('uiTools').open=false;});
$('uiCaseFile').addEventListener('change',async()=>{try{const file=$('uiCaseFile').files[0];if(!file)return;if(file.size>2*1024*1024)throw new Error('Arquivo de caso maior que 2 MB.');await restoreCase(JSON.parse(await file.text()));}catch(e){$('uiFileStatus').textContent=e.message||'Não foi possível carregar o caso.';}finally{$('uiCaseFile').value='';}});

// Status de salvar/carregar continua visível mesmo fora da seção de entradas.
new MutationObserver(()=>{const message=$('statusArquivoComposicao').textContent.trim();if(message)$('uiFileStatus').textContent=message;}).observe($('statusArquivoComposicao'),{childList:true,subtree:true,characterData:true});

// Impressão inclui todas as seções/abas, não apenas o painel aberto na tela.
let printDetails=[],printInert=[];
window.addEventListener('beforeprint',()=>{
 printDetails=[...document.querySelectorAll('main details')].map((el)=>[el,el.open]);printDetails.forEach(([el])=>el.open=true);
 printInert=[...document.querySelectorAll('main [inert]')];printInert.forEach((el)=>el.inert=false);
 renderCharts();
});
window.addEventListener('afterprint',()=>{printDetails.forEach(([el,open])=>el.open=open);printInert.forEach((el)=>el.inert=true);});
setMenu(false);showSection(sections.some((s)=>s[0]===location.hash.slice(1))?location.hash.slice(1):'entradas');refreshShell();

// API de persistência do caso completo, reutilizável e testada separadamente.
export { caseSnapshot, validateCase, restoreCase, saveCase };
