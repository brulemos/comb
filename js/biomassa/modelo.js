/**
 * MOTOR EXCLUSIVO DE COMBUSTÃO DE BIOMASSA — MODELO IDEAL.
 * Entradas: análise elementar C/H/O/N/S e cinzas em % da BIOMASSA SECA;
 * umidade em % da massa COMO RECEBIDA (base úmida).
 *
 * Hipóteses: combustão completa, C→CO2, H→H2O(v), S→SO2, N→N2,
 * minerais permanecem como cinza sólida inerte, sem carbono residual;
 * ar composto por O2/N2/H2O (sem argônio), gases ideais.
 * Cp dos PRODUTOS é obtido da mesma biblioteca Shomate comum aos gases;
 * este motor NÃO chama as rotinas de estequiometria do combustível gasoso.
 *
 * Referência PCS estimado (opcional): Channiwala & Parikh, Fuel 81
 * (2002), 1051–1063. Utilizar calorimetria medida sempre que disponível.
 */
import { getGas, CONFIG } from '../calculos/01-utilidades.js';
import { cpMolar } from '../calculos/03-propriedades.js';
import { integrateCpMolar } from '../calculos/07-energia.js';
import { humidOxidizerComposition } from '../calculos/05-comburente.js';

const MW = Object.freeze({ C:12.011, H:1.008, O:15.999, N:14.007, S:32.06 });
const MOL = Object.freeze({
  CO2: MW.C+2*MW.O, H2O: 2*MW.H+MW.O, O2:2*MW.O,
  N2:2*MW.N, SO2:MW.S+2*MW.O
});
const ATOMS = Object.freeze({
  CO2:{C:1,O:2}, H2O:{H:2,O:1}, O2:{O:2}, N2:{N:2}, SO2:{S:1,O:2}
});
const VAPORIZACAO_25 = 2.442; // MJ/kg H2O, referência aproximada a 25°C
const CP_AGUA_LIQ = 4.18; // kJ/(kg·K), aproximação no entorno de Tref
const CP_CINZAS = 0.84;   // kJ/(kg·K), CONSTANTE HIPOTÉTICA, não medição
const PERCENT_TOL = 0.03; // ponto percentual (para arredondamentos de laboratório)

function exige(condicao, mensagem) { if (!condicao) throw new Error(mensagem); }
function numero(x, nome) {
  exige(typeof x === 'number' && Number.isFinite(x), `${nome}: valor numérico inválido.`);
  return x;
}
function validoPositivo(x,nome){ numero(x,nome); exige(x>0, `${nome} deve ser positivo.`); return x; }
function validaPct(x,nome,aberto=false) {
  numero(x,nome); exige(x>=0 && (aberto ? x<100 : x<=100), `${nome} deve estar entre 0 e ${aberto?'menos de 100':'100'}%.`);
  return x;
}

/** PCS seco estimado por correlação empírica, com frações em %. */
export function estimarPCSSeco(e) {
  return 0.3491*e.C+1.1783*e.H+0.1005*e.S-0.1034*e.O-0.0151*e.N-0.0211*e.cinzas;
}

/**
 * Lê composição em base seca; oxigênio pode ser informado ou calculado por diferença.
 * Não normaliza automaticamente resultados laboratoriais inconsistentes.
 */
export function caracterizarBiomassa({elementos, cinzasPct, umidadePct, pcsModo='medido', pcsSecoMedido}) {
  const e={};
  for (const k of ['C','H','N','S']) e[k]=validaPct(elementos[k], `Teor de ${k}`);
  e.cinzas=validaPct(cinzasPct,'Cinzas (base seca)');
  e.O=elementos.O===null || elementos.O===undefined
    ? 100-e.C-e.H-e.N-e.S-e.cinzas
    : validaPct(elementos.O,'Oxigênio (base seca)');
  validaPct(e.O,'Oxigênio (base seca)');
  const soma=e.C+e.H+e.O+e.N+e.S+e.cinzas;
  exige(Math.abs(soma-100)<=PERCENT_TOL,
    `Composição seca totaliza ${soma.toFixed(4)}%; precisa fechar 100% (C+H+O+N+S+cinzas).`);
  const umidade=validaPct(umidadePct,'Umidade (base como recebida)',true)/100;
  const pcsSeco= pcsModo==='estimado' ? estimarPCSSeco(e)
    : validoPositivo(pcsSecoMedido,'PCS seco medido');
  exige(pcsSeco>0,'PCS seco estimado não foi positivo: verifique a composição.');
  const aguaFormadaPorKgSeco=(e.H/100)*(MW.H*2+MW.O)/(MW.H*2);
  const pciSeco=pcsSeco-VAPORIZACAO_25*aguaFormadaPorKgSeco;
  const pcsRecebido=pcsSeco*(1-umidade);
  const pciRecebido=pcsRecebido-VAPORIZACAO_25*(aguaFormadaPorKgSeco*(1-umidade)+umidade);
  exige(pciRecebido>0,'PCI em base como recebida não é positivo. Verifique PCS e umidade.');
  const avisos=[];
  if (pcsModo==='estimado') {
    avisos.push('PCS calculado por Channiwala–Parikh (2002), estimativa empírica; prefira PCS medido por calorimetria.');
    // Intervalos publicados em Fuel 81 (2002), pp. 1051–1063, base seca.
    const limites = {
      C:[0,92.25], H:[0.43,25.15], O:[0,50],
      N:[0,5.60], S:[0,94.08], cinzas:[0,71.40]
    };
    const nomes = {C:'C',H:'H',O:'O',N:'N',S:'S',cinzas:'Cinzas'};
    for (const [elemento,[min,max]] of Object.entries(limites)) {
      if (e[elemento] < min || e[elemento] > max) {
        avisos.push(`PCS estimado fora do domínio Channiwala–Parikh: ${nomes[elemento]} = ${e[elemento].toFixed(3)}% (faixa publicada ${min}–${max}% em base seca).`);
      }
    }
    if (pcsSeco < 4.745 || pcsSeco > 55.345) {
      avisos.push(`PCS estimado (${pcsSeco.toFixed(3)} MJ/kg) fora do intervalo de 4,745–55,345 MJ/kg citado para a correlação.`);
    }
  }
  return {elementos:e,umidade,pcsSeco,pciSeco,pcsRecebido,pciRecebido,aguaFormadaPorKgSeco,
    pcsFonte:pcsModo,avisos};
}

/** Vazão alimentada, seca, água e cinzas em kg/h. */
export function vazoesBiomassa(caracterizacao,{entrada='vazao',vazaoKgH,potenciaDesejadaKW}) {
  const m=entrada==='potencia'
    ? validoPositivo(potenciaDesejadaKW,'Potência desejada (kW)')*3.6/caracterizacao.pciRecebido
    : validoPositivo(vazaoKgH,'Vazão alimentada (kg/h)');
  return {recebida:m, seca:m*(1-caracterizacao.umidade),
    agua:m*caracterizacao.umidade, cinzas:m*(1-caracterizacao.umidade)*caracterizacao.elementos.cinzas/100,
    potenciaPCSKW:m*caracterizacao.pcsRecebido/3.6,
    potenciaPCIKW:m*caracterizacao.pciRecebido/3.6};
}

/** Atomos em kmol-at/h e demanda teórica em kmol O2/h. */
export function demandaBiomassa(c, f) {
  const atoms={};
  for(const k of ['C','H','O','N','S']) atoms[k]=f.seca*c.elementos[k]/100/MW[k];
  const oxigenioEsteq=atoms.C+atoms.H/4+atoms.S-atoms.O/2;
  exige(oxigenioEsteq>0,'Não há demanda estequiométrica positiva de O₂ com esta composição.');
  return {atoms,oxigenioEsteq};
}

function resolverLambdaPorO2({o2Esteq,atoms,xO2seco,o2Medido}) {
  const y=validaPct(o2Medido,'O₂ seco medido')/100;
  exige(y<xO2seco,'O₂ medido deve ser menor do que o O₂ do comburente seco.');
  const B=atoms.C+atoms.S+atoms.N/2;
  const lambda=(o2Esteq+y*(B-o2Esteq))/(o2Esteq*(1-y/xO2seco));
  exige(Number.isFinite(lambda)&&lambda>=1-1e-10,
    'O₂ medido não é compatível com combustão completa e λ ≥ 1.');
  return Math.max(1,lambda);
}

/** Oxidante úmido com a MESMA condição de processo, motor estequiométrico próprio. */
export function comburenteBiomassa(demanda,f,{o2SecoPct,umidadeAr,excessoPct,modoCombustao='excesso',o2Medido}) {
  exige(o2SecoPct>0 && o2SecoPct<=100,'O₂ do comburente deve ser maior que 0 e até 100%.');
  const ar=humidOxidizerComposition({dryO2Pct:o2SecoPct, rhPct:umidadeAr.rhPct,
    tempK:umidadeAr.tempK,pressureKPa:umidadeAr.pressureKPa,humidityEnabled:umidadeAr.enabled});
  const lambda=modoCombustao==='o2medido'
    ? resolverLambdaPorO2({o2Esteq:demanda.oxigenioEsteq,atoms:demanda.atoms,
      xO2seco:ar.dryO2,o2Medido})
    : 1+numero(excessoPct,'Excesso')/100;
  exige(lambda>=1 && lambda<1000,'O modelo considera λ ≥ 1 e exige excesso finito.');
  const realO2=demanda.oxigenioEsteq*lambda;
  const realKmol=realO2/ar.xO2;
  const esteqKmol=demanda.oxigenioEsteq/ar.xO2;
  const Mox=ar.xO2*MOL.O2+ar.xN2*MOL.N2+ar.xH2O*MOL.H2O;
  return {...ar,lambda,realKmol,esteqKmol,realMassa:realKmol*Mox,
    esteqMassa:esteqKmol*Mox,afrReal:realKmol*Mox/f.recebida,
    afrEsteq:esteqKmol*Mox/f.recebida,
    molOxigenioReal:realO2, molOxigenioEsteq:demanda.oxigenioEsteq};
}

/** Produtos gasosos e cinzas como duas saídas físicas distintas. */
export function produtosBiomassa(d,f,oxid) {
  const a=d.atoms, especies=[
    {id:'CO2',kmolH:a.C},
    {id:'H2O',kmolH:a.H/2+f.agua/MOL.H2O+oxid.realKmol*oxid.xH2O},
    {id:'N2',kmolH:a.N/2+oxid.realKmol*oxid.xN2},
    {id:'O2',kmolH:oxid.molOxigenioReal-d.oxigenioEsteq},
    {id:'SO2',kmolH:a.S}
  ];
  return especies.map(p=>({...p,kgH:p.kmolH*MOL[p.id],massaMolar:MOL[p.id]}));
}

/** Inventário por elemento, incluindo umidade, comburente e cinzas inertes. */
export function balançosBiomassa(d,f,oxid,produtos) {
  const entrada={...d.atoms};
  entrada.O+=f.agua/MOL.H2O+oxid.realKmol*(2*oxid.xO2+oxid.xH2O);
  entrada.H+=2*(f.agua/MOL.H2O+oxid.realKmol*oxid.xH2O);
  entrada.N+=2*oxid.realKmol*oxid.xN2;
  const saida={C:0,H:0,O:0,N:0,S:0};
  for(const p of produtos) for(const [e,qtd] of Object.entries(ATOMS[p.id])) saida[e]+=qtd*p.kmolH;
  const elementos=Object.keys(saida).map(elemento=>({elemento,entrada:entrada[elemento],saida:saida[elemento],
    erroPct:entrada[elemento]?100*(saida[elemento]-entrada[elemento])/entrada[elemento]:0}));
  const totalEntrada=f.recebida+oxid.realMassa;
  const totalSaida=produtos.reduce((s,p)=>s+p.kgH,0)+f.cinzas;
  return {totalEntrada,totalSaida,erroPct:100*(totalSaida-totalEntrada)/totalEntrada,elementos};
}

const somaMoles=p=>p.reduce((a,b)=>a+b.kmolH,0);
const somaMassas=p=>p.reduce((a,b)=>a+b.kgH,0);
export function propriedadesChamine(produtos,stackT,stackP,base='umida') {
  validoPositivo(stackT,'Temperatura dos gases (K)');
  validoPositivo(stackP,'Pressão dos gases (kPa)');
  const p=base==='seca'?produtos.filter(x=>x.id!=='H2O'):produtos;
  const mol=somaMoles(p),mass=somaMassas(p),MM=mass/mol;
  const volume=mol*CONFIG.R*stackT/stackP;
  const cpPorEspecie=p.map(i=>({id:i.id,mol:i.kmolH,cp:cpMolar(getGas(i.id),stackT)}));
  const cpMassa=cpPorEspecie.reduce((s,i)=>s+i.mol*i.cp.value,0)/mass;
  const extrapolado=cpPorEspecie.some(i=>i.cp.extrapolated);
  const h=produtos.reduce((s,i)=>s+i.kmolH*integrateCpMolar(getGas(i.id),CONFIG.Tref,stackT).value,0);
  return {produtos:p,mol,mass,MM,volume,densidade:mass/volume,cpMassa,
    entalpiaEspecifica:h/somaMassas(produtos),extrapolado};
}

function entalpiaProdutos(produtos,T,cinzasKgH){
  return produtos.reduce((s,p)=>s+p.kmolH*integrateCpMolar(getGas(p.id),CONFIG.Tref,T).value,0)
   +cinzasKgH*CP_CINZAS*(T-CONFIG.Tref);
}

/** Bisseção de energia: PCI em base recebida e H2O(g) como produto. */
export function temperaturaAdiabatica({c,f,oxid,produtos,fuelT,arT,cpBiomassa}) {
  const cinza=f.cinzas;
  const reactFuel=(f.seca-cinza)*cpBiomassa*(fuelT-CONFIG.Tref)
    +cinza*CP_CINZAS*(fuelT-CONFIG.Tref)
    +f.agua*CP_AGUA_LIQ*(fuelT-CONFIG.Tref);
  const reactAr=[['O2',oxid.xO2],['N2',oxid.xN2],['H2O',oxid.xH2O]]
    .reduce((s,[id,x])=>s+oxid.realKmol*x*integrateCpMolar(getGas(id),CONFIG.Tref,arT).value,0);
  const energia=f.recebida*c.pciRecebido*1000+reactFuel+reactAr;
  const fn=T=>entalpiaProdutos(produtos,T,cinza)-energia;
  let low=CONFIG.Tref,high=3200;
  exige(fn(low)<=0 && fn(high)>=0,'Temperatura adiabática fora do intervalo 25–2927 °C deste modelo.');
  for(let i=0;i<52;i++){const mid=(low+high)/2; if(fn(mid)>0)high=mid;else low=mid;}
  return {K:(low+high)/2,energiaDisponivelKJH:energia,
    saldoKJH:fn((low+high)/2)};
}

/** Saturação aproximada de H2O, válida para pressão parcial abaixo de ~1 bar. */
export function pontoOrvalho(produtos,stackP) {
  const agua=produtos.find(p=>p.id==='H2O').kmolH;
  const parcial=stackP*agua/somaMoles(produtos);
  if(parcial<=0)return null;
  const f=t=>0.61121*Math.exp((18.678-t/234.5)*(t/(257.14+t)));
  if(parcial<f(-40)||parcial>f(99.5))return null; // fora da faixa de aproximação adotada
  let lo=-40,hi=99.5;
  for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(f(mid)>parcial)hi=mid;else lo=mid;}
  return (lo+hi)/2;
}

/** Resultado independente da interface: os demais arquivos NÃO alteram o motor gasoso. */
export function calcularBiomassa(entrada) {
  const c=caracterizarBiomassa(entrada);
  const f=vazoesBiomassa(c,entrada);
  const d=demandaBiomassa(c,f);
  const oxid=comburenteBiomassa(d,f,entrada);
  const produtos=produtosBiomassa(d,f,oxid);
  const bal=balançosBiomassa(d,f,oxid,produtos);
  const stack=propriedadesChamine(produtos,entrada.stackT,entrada.stackP);
  const tad=temperaturaAdiabatica({c,f,oxid,produtos,fuelT:entrada.fuelT,arT:entrada.umidadeAr.tempK,cpBiomassa:entrada.cpBiomassa});
  const dew=pontoOrvalho(produtos,entrada.stackP);
  const dry=propriedadesChamine(produtos,entrada.stackT,entrada.stackP,'seca');
  const o2Dry=100*produtos.find(p=>p.id==='O2').kmolH/dry.mol;
  const co2KgH=produtos.find(p=>p.id==='CO2').kgH;
  const aviso=[...c.avisos,
    'Modelo ideal: combustão completa; não calcula CO, NOx, particulados, carbono não queimado nem retenção de enxofre nas cinzas.',
    'Cp da biomassa é constante informada/assumida; Cp das cinzas é assumido 0,84 kJ/(kg·K). Temperatura adiabática é estimativa.',
    'PCS/PCI em base como recebida usam calor latente de 2,442 MJ/kg H₂O a 25°C.',
    'O₂/N₂ representam o comburente seco; outros gases inertes do ar não são considerados.'
  ];
  if(entrada.fuelT>373.15)aviso.push('A água da biomassa é tratada como líquida na entrada; acima de 100°C essa hipótese requer revisão.');
  if(stack.extrapolado)aviso.push('Cp dos gases na chaminé extrapolado em pelo menos uma espécie.');
  if(dew===null)aviso.push('Ponto de orvalho fora da faixa da aproximação adotada (-40 a 99,5 °C), ou pressão parcial de água nula.');
  if(oxid.dryO2>0.212)aviso.push('Ar enriquecido: correção convencional de concentrações a O₂ de referência fica desabilitada.');
  if(Math.abs(bal.erroPct)>0.01)aviso.push('Fechamento de massa acima de 0,01% — revise os dados e constantes.');
  return {entrada,c,f,d,oxid,produtos,bal,stack,dry,tad,dew,o2Dry,avisos:aviso,
    co2:{kgH:co2KgH,kgKg:co2KgH/f.recebida,kgMJ:co2KgH/(f.recebida*c.pciRecebido),
      kgKWh:co2KgH/f.potenciaPCIKW,toneladasDia:co2KgH*24/1000}};
}

export const DADOS_MOTOR_BIOMASSA=Object.freeze({MW,MOL,VAPORIZACAO_25,CP_CINZAS,PERCENT_TOL});
