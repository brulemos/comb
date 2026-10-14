/**
 * CONTROLADOR DO MODO BIOMASSA.
 * Sem alterações nos IDs, equações ou renderizadores de Mistura gasosa.
 * Os fragmentos HTML são montados dentro das mesmas 10 seções originais.
 */
import { calcularBiomassa } from './modelo.js';
import { CONFIG, tempToK, pressureToKPa, powerToKW, convertPower } from '../calculos/01-utilidades.js';
import { estado } from '../interface/contexto.js';

const $=seletor=>document.querySelector(seletor);
const $$=seletor=>[...document.querySelectorAll(seletor)];
const N=id=>{
  const el=$(`#${id}`);
  if (!el || el.value.trim()==='') throw new Error(`Campo obrigatório não informado: ${el?.labels?.[0]?.textContent||id}.`);
  const v=Number(el.value);
  if (!Number.isFinite(v))throw new Error(`Valor inválido: ${id}`);
  return v;
};
const f=(x,d=4)=>typeof x==='number' && Number.isFinite(x)
  ? x.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—';
const text=(id,s)=>{const el=$(`#${id}`);if(el)el.textContent=s;};
const radio=name=>document.querySelector(`input[name="${name}"]:checked`)?.value;
let caso=null;
let ultimoGas=null;
let temporizador=null;

const MODULOS=[
  ['01-entradas.html','entrada'],
  ['02-validade.html',1],['03-propriedades.html',2],['04-estequiometria.html',3],
  ['05-balanco-termico.html',4],['06-balanco-massa.html',5],['07-produtos.html',6],
  ['08-emissoes.html',7],['09-graficos.html',8],['10-exportacao.html',9]
];

async function htmlModulos() {
  const paginas=await Promise.all(MODULOS.map(async ([nome])=>{
    const url=new URL(`../../html/biomassa/${nome}`,import.meta.url);
    const resposta=await fetch(url);
    if (!resposta.ok)throw new Error(`Falha ao carregar biomassa: ${url.pathname} (HTTP ${resposta.status})`);
    const template=document.createElement('template');template.innerHTML=await resposta.text();
    if (!template.content.children.length) throw new Error(`Fragmento vazio: ${nome}`);
    return template.content;
  }));
  const panels=$$('main.main-content > section.panel');
  if(panels.length!==10)throw new Error('Esperadas 10 seções de cálculo antes de iniciar biomassa.');
  // Toda a alteração dos DOMs ocorre depois de validar TODAS as requisições.
  const grid=panels[0].querySelector('.input-grid');
  const cards=grid?.querySelectorAll(':scope > article.card');
  if(!cards || cards.length!==3)throw new Error('Estrutura da configuração de gás foi alterada; integração de biomassa interrompida.');
  cards[0].classList.add('somente-gas');cards[1].classList.add('somente-gas');
  grid.insertBefore(paginas[0],cards[2]);
  panels.slice(1).forEach((panel,idx)=>{
    for(const filho of panel.children){
      // Chaminé e referência de emissões são campos compartilhados pelos dois motores.
      if(filho.matches('.section-title') || (idx===3 && filho.matches('.process-conditions')))continue;
      filho.classList.add('somente-gas');
    }
    panel.append(paginas[idx+1]);
  });
}

function dadosEntrada() {
  const pcsModo=$('#bioPCSFonte').value;
  const fluxo=radio('bioEntrada');
  const modoCombustao=radio('modoCombustao');
  const usarUmidadeAr=$('#usarUmidadeAr').checked;
  const dens=$('#bioDensidadeGranel').value.trim();
  const o2Referencia=N('o2Referencia');
  if (o2Referencia < 0 || o2Referencia >= 20.9)
    throw new Error('O₂ de referência inválido: informe um valor de 0 até menos de 20,9%.');
  return {
    nome:$('#bioNome').value.trim()||'Biomassa personalizada',
    elementos:{C:N('bioC'),H:N('bioH'),O:N('bioO'),N:N('bioN'),S:N('bioS')},
    cinzasPct:N('bioCinzas'),umidadePct:N('bioUmidade'), pcsModo,
    pcsSecoMedido:pcsModo==='medido'?N('bioPCSMedido'):undefined,
    entrada:fluxo,vazaoKgH:fluxo==='vazao'?N('bioVazao'):undefined,
    potenciaDesejadaKW:fluxo==='potencia'?powerToKW(N('bioPotenciaAlvo'),$('#bioPotenciaAlvoUnidade').value):undefined,
    fuelT:tempToK(N('bioTemperatura'),$('#bioUnidadeTemperatura').value),
    cpBiomassa:N('bioCpSolido'),
    densidadeGranel:dens===''?null:Number(dens),
    o2SecoPct:N('o2Comburente'),
    umidadeAr:{enabled:usarUmidadeAr, rhPct:usarUmidadeAr?N('umidadeRelativa'):0,
      tempK:tempToK(N('temperaturaComburente'),$('#unidadeTemperaturaComburente').value),
      pressureKPa:pressureToKPa(N('pressaoComburente'),$('#unidadePressaoComburente').value)},
    modoCombustao,excessoPct:modoCombustao==='excesso'?N('excessoAr'):0,
    o2Medido:modoCombustao==='o2medido'?N('o2Medido'):0,
    stackT:tempToK(N('temperaturaProdutos'),$('#unidadeTemperaturaProdutos').value),
    stackP:pressureToKPa(N('pressaoProdutos'),$('#unidadePressaoProdutos').value),
    o2Referencia
  };
}

function escreverAvisos() {
  $('#bioAvisos').innerHTML=caso.avisos.map(w=>{
    const div=document.createElement('div');div.className='alert warning';div.textContent=w;return div.outerHTML;
  }).join('');
}

function escreverPropriedades(){
  const {c,f:fluxo,entrada}=caso;
  const pares={bioResPCSSeco:c.pcsSeco,bioResPCISeco:c.pciSeco,
    bioResPCSRecebido:c.pcsRecebido,bioResPCIRecebido:c.pciRecebido,
    bioResUmidade:c.umidade*100,bioResCinzas:c.elementos.cinzas,
    bioResVazaoSeca:fluxo.seca,bioResDensidadeGranel:entrada.densidadeGranel,
    bioResCp:entrada.cpBiomassa};
  for(const [id,v] of Object.entries(pares))text(id,f(v));
  text('bioResPotenciaPCS',f(convertPower(fluxo.potenciaPCSKW,$('#bioUnidadePotenciaPCS').value)));
  text('bioResPotenciaPCI',f(convertPower(fluxo.potenciaPCIKW,$('#bioUnidadePotenciaPCI').value)));
  const tbody=$('#bioComposicaoResultado');tbody.replaceChildren();
  for(const k of ['C','H','O','N','S','cinzas','umidade']){
    const v=k==='umidade'?0:c.elementos[k];
    const tr=document.createElement('tr');
    const valores=k==='umidade'?["Umidade (H₂O)",'—',f(c.umidade*100)]
      :[k==='cinzas'?'Cinzas':k,f(v),f(v*(1-c.umidade))];
    for(const x of valores){const td=document.createElement('td');td.textContent=x;tr.append(td);}
    tbody.append(tr);
  }
}
function escreverEstequiometria(){
  const {d,oxid,tad}=caso;
  const s=$('#bioModoComburente').value==='esteq';
  const a=$('#bioModoAFR').value==='esteq';
  text('bioResComburente',f(s?oxid.esteqMassa:oxid.realMassa));
  text('bioResAFR',f(a?oxid.afrEsteq:oxid.afrReal));
  text('bioResO2Esteq',f(d.oxigenioEsteq*31.998));
  text('bioResLambda',f(oxid.lambda));
  text('bioResExcesso',f(100*(oxid.lambda-1)));
  text('bioResTad',f(tad.K-273.15,2));
}
function escreverBalancos(){
  const {f:fluxo,oxid,bal,produtos}=caso;
  const vals={bioBalFuel:fluxo.recebida,bioBalOxid:oxid.realMassa,bioBalInput:bal.totalEntrada,
    bioBalGases:produtos.reduce((s,p)=>s+p.kgH,0),bioBalCinzas:fluxo.cinzas,
    bioBalOutput:bal.totalSaida};
  for(const [id,v] of Object.entries(vals))text(id,`${f(v)} kg/h`);
  text('bioBalErro',`${f(bal.erroPct,6)}%`);
  const tbody=$('#bioBalElementos');tbody.replaceChildren();
  for(const x of bal.elementos){const tr=document.createElement('tr');
    for(const val of [x.elemento,f(x.entrada,6),f(x.saida,6),f(x.erroPct,6)]){
      const td=document.createElement('td');td.textContent=val;tr.append(td);
    } tbody.append(tr);
  }
}
function escreverTermico(){
  const {f:fluxo,stack,produtos,dew}=caso;
  for(const [id,v] of Object.entries({bioResQChemical:fluxo.potenciaPCIKW,
    bioResFlueMoles:stack.mol,bioResFlueCp:stack.cpMassa,
    bioResFlueDensity:stack.densidade,bioResFlueEnthalpy:stack.entalpiaEspecifica,
    bioResDewPoint:dew,bioResCinzasKgH:fluxo.cinzas,bioResAguaKgH:fluxo.agua}))text(id,f(v));
}
const moles=ps=>ps.reduce((s,p)=>s+p.kmolH,0);
const massas=ps=>ps.reduce((s,p)=>s+p.kgH,0);
function escreverProdutos(){
  const {produtos,stack,dry,entrada,oxid,o2Dry,co2}=caso;
  const base=$('#bioBaseProdutos').value;
  const lista=base==='seca'?produtos.filter(p=>p.id!=='H2O'):produtos;
  const mol=moles(lista),mass=massas(lista);
  const modo=$('#bioModoTabelaProdutos').value;
  const massa=$('#bioTipoVazaoProdutos').value==='massica';
  const volume=mol*CONFIG.R*entrada.stackT/entrada.stackP;
  const nVol=mol*CONFIG.R*CONFIG.Tn/CONFIG.Pn;
  const so2=lista.find(p=>p.id==='SO2');
  const ppm=so2.kmolH/mol*1e6;
  const mg=so2.kgH*1e6/nVol;
  const dryNormVolume=dry.mol*CONFIG.R*CONFIG.Tn/CONFIG.Pn;
  const corrigivel=Math.abs(entrada.o2SecoPct-20.95)<=0.2 && o2Dry<20.9
    && entrada.o2Referencia>=0 && entrada.o2Referencia<20.9;
  const fator=corrigivel ? (20.9-entrada.o2Referencia)/(20.9-o2Dry):null;
  text('bioResVazaoProdutos',f(massa?mass:volume));
  text('bioResDensidadeProdutos',f(mass/volume));
  text('bioResMassaMolarProdutos',f(mass/mol));
  text('bioUnidadeVazaoProdutos',massa?'kg/h':'m³/h');
  text('bioResDensidadeProdutos',f(mass/volume));
  text('bioResMassaMolarProdutos',f(mass/mol));
  text('bioResO2Seco',f(o2Dry));
  text('bioResSO2Produtos',f(ppm));
  text('bioSO2ppmBase',`ppmv (${base})`);
  text('bioResSO2mgProdutos',f(mg,2));
  text('bioSO2mgBase',`mg/Nm³ (${base})`);
  text('bioResSO2Corrigido',f(fator===null?null:so2.kgH*1e6/dryNormVolume*fator,2));
  const label={mol:'% molar',massa:'% mássica',ppmv:'ppmv',mgnm3:'mg/Nm³'}[modo];
  text('bioCabecalhoComposicao',`${label} (${base})`);
  const tbody=$('#bioCorpoProdutos');tbody.replaceChildren();
  for(const p of lista.filter(x=>x.kmolH>1e-12)){
    const value=modo==='mol'?p.kmolH/mol*100:modo==='massa'?p.kgH/mass*100:
      modo==='ppmv'?p.kmolH/mol*1e6:p.kgH*1e6/nVol;
    const corrigido=fator===null||p.id==='H2O'||p.id==='O2'?'—'
      :f(p.kgH*1e6/dryNormVolume*fator,2);
    const tr=document.createElement('tr');
    for(const v of [p.id,f(p.kmolH),f(p.kgH),f(value,modo==='mgnm3'?2:4),corrigido]){
      const td=document.createElement('td');td.textContent=v;tr.append(td);
    } tbody.append(tr);
  }
  for(const [id,v] of Object.entries({bioResCO2kgH:co2.kgH,bioResCO2kgKg:co2.kgKg,
    bioResCO2kgMJ:co2.kgMJ,bioResCO2kgKWh:co2.kgKWh,bioResCO2tDay:co2.toneladasDia}))text(id,f(v));
}
function escreverGrafico(){
  const box=$('#bioGraficoGases');box.replaceChildren();
  const total=moles(caso.produtos);
  for(const p of caso.produtos.filter(p=>p.kmolH>1e-9)){
    const pct=p.kmolH/total*100;
    const linha=document.createElement('div');linha.className='bio-grafico-linha';
    const nome=document.createElement('span');nome.textContent=p.id;
    const trilha=document.createElement('div');trilha.className='bio-grafico-trilha';
    const barra=document.createElement('div');barra.className='bio-grafico-barra';barra.style.width=`${Math.max(0,Math.min(100,pct))}%`;trilha.append(barra);
    const valor=document.createElement('strong');valor.textContent=`${f(pct,2)}%`;
    linha.append(nome,trilha,valor);box.append(linha);
  }
}
function escreverResumo(){
  text('sumFuel',caso.entrada.nome);
  text('sumFlow',`${f(caso.f.recebida,2)} kg/h`);
  text('sumPower',`${f(caso.f.potenciaPCIKW/1000,3)} MW`);
  text('sumLambda',f(caso.oxid.lambda,3));
  text('sumO2',`${f(caso.o2Dry,2)} %`);
}
function mostrarErro(e){
  const box=$('#mensagemErro');box.textContent=e.message||String(e);box.classList.remove('hidden');
  $('#bioAvisos').innerHTML='';
  const aviso=document.createElement('div');aviso.className='alert error';aviso.textContent=e.message||String(e);
  $('#bioAvisos').append(aviso);
}
function calcular(){
  if(!ativo())return;
  try{
    const entrada=dadosEntrada();
    if(entrada.cpBiomassa<=0 || (entrada.densidadeGranel!==null && !(entrada.densidadeGranel>0)))
      throw new Error('Cp e densidade a granel (quando informada) devem ser positivos.');
    if(entrada.fuelT<=0||entrada.stackT<=0||entrada.stackP<=0)throw new Error('Temperaturas Kelvin e pressão absoluta devem ser positivas.');
    caso=calcularBiomassa(entrada);
    $('#mensagemErro').classList.add('hidden');
    escreverAvisos();escreverPropriedades();escreverEstequiometria();escreverTermico();
    escreverBalancos();escreverProdutos();escreverGrafico();escreverResumo();
  }catch(e){caso=null;mostrarErro(e);}
}
function atualizarFechamento(){
  const ids=['bioC','bioH','bioO','bioN','bioS','bioCinzas'];
  const valores=ids.map(id=>Number($(`#${id}`).value));
  const soma=valores.reduce((a,b)=>a+b,0),valido=Math.abs(soma-100)<=0.03;
  text('bioSoma',`${f(soma)}%`);
  text('bioSomaStatus',valido?'(correto)':'(fora de 100%)');
  $('#bioSomaStatus').className=valido?'bio-ok':'bio-erro';
}
function limpar(){
  for(const [id,val] of Object.entries({bioNome:'Biomassa personalizada',bioUmidade:'30',bioC:'50',
    bioH:'6',bioO:'42',bioN:'0.3',bioS:'0.1',bioCinzas:'1.6',bioPCSMedido:'18.5',
    bioVazao:'100',bioTemperatura:'25',bioCpSolido:'1.5'}))$(`#${id}`).value=val;
  $('#bioDensidadeGranel').value='';$('#bioPCSFonte').value='estimado';$('#bioPCSMedidoField').classList.add('hidden');
  document.querySelector('input[name="bioEntrada"][value="vazao"]').checked=true;
  $('#bioCampoVazao').classList.remove('hidden');$('#bioCampoPotencia').classList.add('hidden');
  caso=null;$('#mensagemErro').classList.add('hidden');atualizarFechamento();
  for(const el of document.querySelectorAll('[id^="bioRes"], [id^="bioBal"]'))el.textContent='—';
  $('#bioComposicaoResultado').replaceChildren();$('#bioCorpoProdutos').replaceChildren();
  $('#bioBalElementos').replaceChildren();$('#bioGraficoGases').replaceChildren();
  $('#bioAvisos').innerHTML='<div class="alert info">Execute o cálculo da biomassa.</div>';
  for(const id of ['sumFuel','sumFlow','sumPower','sumLambda','sumO2'])text(id,'—');
}
function ativo(){return $('#tipoCombustivel')?.value==='biomassa';}
function trocarModo(){
  const biomassa=ativo();
  if(biomassa){ultimoGas=estado.ultimoCaso;estado.ultimoCaso=null;}
  else{estado.ultimoCaso=ultimoGas;}
  document.body.dataset.tipoCombustivel=biomassa?'biomassa':'gasosa';
  $('#mensagemErro').classList.add('hidden');
  if(biomassa){if(caso)calcular();else for(const id of ['sumFuel','sumFlow','sumPower','sumLambda','sumO2'])text(id,'—');}
  else if(ultimoGas){
    // Mesmo controlador gasoso, para refletir eventuais mudanças nos campos compartilhados.
    import('../interface/calculo.js').then(m=>m.calculate()).catch(console.error);
  } else {
    for(const id of ['sumFuel','sumFlow','sumPower','sumLambda','sumO2'])text(id,'—');
  }
}
function atualizarVisibilidadeEntrada(){
  const porPotencia=radio('bioEntrada')==='potencia';
  $('#bioCampoVazao').classList.toggle('hidden',porPotencia);
  $('#bioCampoPotencia').classList.toggle('hidden',!porPotencia);
}
function downloadCSV(){
  if(!caso)throw new Error('Calcule um caso de biomassa antes de exportar.');
  const linhas=[['Campo','Valor','Unidade'],
    ['Tipo de combustível',caso.entrada.nome,'biomassa'],
    ...Object.entries(caso.c.elementos).map(([k,v])=>[k,v,'% massa seca']),
    ['Umidade',caso.c.umidade*100,'% massa recebida'],
    ['PCS seco',caso.c.pcsSeco,'MJ/kg seco'],['PCI seco',caso.c.pciSeco,'MJ/kg seco'],
    ['PCS recebido',caso.c.pcsRecebido,'MJ/kg recebido'],['PCI recebido',caso.c.pciRecebido,'MJ/kg recebido'],
    ['Vazão recebida',caso.f.recebida,'kg/h'],['Vazão seca',caso.f.seca,'kg/h'],
    ['Potência PCS',caso.f.potenciaPCSKW,'kW'],['Potência PCI',caso.f.potenciaPCIKW,'kW'],
    ['Comburente real',caso.oxid.realMassa,'kg/h'],['AFR real',caso.oxid.afrReal,'kg/kg recebido'],
    ['Lambda',caso.oxid.lambda,'—'],['Temperatura adiabática',caso.tad.K-273.15,'°C'],
    ['O2 seco',caso.o2Dry,'%'],['Vazão de cinzas',caso.f.cinzas,'kg/h'],
    ['CO2 teórico',caso.co2.kgH,'kg/h'],
    ...caso.produtos.map(p=>[`${p.id} (produtos)`,p.kmolH,'kmol/h']),
    ...caso.avisos.map(w=>['Hipótese / aviso',w,''])];
  const txt='\uFEFF'+linhas.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='combustao_biomassa.csv';
  document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
}

/** Montagem invocada só após a calculadora gasosa estar pronta. */
export async function iniciarBiomassa(){
  await htmlModulos();
  document.body.dataset.tipoCombustivel='gasosa';
  $('#tipoCombustivel').addEventListener('change',trocarModo);
  // Interceptação no modo biomassa: os listeners originais de gás continuam intactos.
  $('#btnCalcular').addEventListener('click',e=>{if(ativo()){e.stopImmediatePropagation();calcular();}},true);
  $('#btnLimpar').addEventListener('click',e=>{if(ativo()){e.stopImmediatePropagation();limpar();}},true);
  $('#btnCsv').addEventListener('click',e=>{if(ativo()){e.stopImmediatePropagation();try{downloadCSV();}catch(err){mostrarErro(err);}}},true);
  $('#bioBtnCsv').addEventListener('click',()=>{try{downloadCSV();}catch(err){mostrarErro(err);}});
  $('#bioBtnPrint').addEventListener('click',()=>window.print());
  $('#bioPCSFonte').addEventListener('change',()=>{$('#bioPCSMedidoField').classList.toggle('hidden',$('#bioPCSFonte').value!=='medido');});
  $$('input[name="bioEntrada"]').forEach(el=>el.addEventListener('change',atualizarVisibilidadeEntrada));
  for(const id of ['bioC','bioH','bioO','bioN','bioS','bioCinzas'])$(`#${id}`).addEventListener('input',atualizarFechamento);
  const sóExibir=['bioModoComburente','bioModoAFR','bioUnidadePotenciaPCS','bioUnidadePotenciaPCI','bioBaseProdutos','bioModoTabelaProdutos','bioTipoVazaoProdutos'];
  for(const id of sóExibir)$(`#${id}`).addEventListener('change',()=>{
    if(!ativo()||!caso)return;
    if(id==='bioModoComburente'||id==='bioModoAFR')escreverEstequiometria();
    else if(id==='bioUnidadePotenciaPCS'||id==='bioUnidadePotenciaPCI')escreverPropriedades();
    else escreverProdutos();
  });
  const comuns=['temperaturaProdutos','pressaoProdutos','unidadeTemperaturaProdutos','unidadePressaoProdutos',
    'o2Referencia','o2Comburente','excessoAr','o2Medido','usarUmidadeAr',
    'temperaturaComburente','umidadeRelativa','pressaoComburente','unidadeTemperaturaComburente','unidadePressaoComburente'];
  for(const id of comuns)$(`#${id}`).addEventListener('change',()=>{
    if(ativo()&&caso){clearTimeout(temporizador);temporizador=setTimeout(calcular,80);}
  });
  for(const name of ['modoCombustao'])$$(`input[name="${name}"]`).forEach(el=>el.addEventListener('change',()=>{
    if(ativo()&&caso)calcular();
  }));
  atualizarFechamento();
}
