# Calculadora de Combustão

**Ferramenta web para análise de combustíveis gasosos e biomassa, com foco em propriedades físico-químicas, estequiometria e balanços de massa e energia.**

**[Acessar a calculadora](https://brulemos.github.io/Comb/)**

## Sobre o projeto

A **Calculadora de Combustão** é uma aplicação desenvolvida em **HTML, CSS e JavaScript** para apoiar estudos, avaliações e análises técnicas de processos de combustão.

A ferramenta reúne, em uma única interface, cálculos de propriedades dos combustíveis, demanda de comburente, composição dos produtos da combustão e parâmetros térmicos. O projeto contempla dois modos de análise: **misturas gasosas** e **biomassa**.

Seu objetivo é facilitar a elaboração de cenários, a comparação de condições operacionais e a interpretação de resultados de engenharia.

## Funcionalidades

### Combustíveis e condições de entrada

- Seleção de combustíveis e composições predefinidas, quando disponíveis no modo escolhido.
- Definição de composições personalizadas e mistura de combustíveis gasosos.
- Normalização das frações de composição.
- Configuração de vazão, temperatura e pressão do combustível.
- Configuração das condições do comburente, incluindo temperatura, pressão e umidade relativa.
- Definição do excesso de ar e de parâmetros para análise dos gases de combustão.

### Propriedades dos combustíveis

- Massa molar e densidade.
- Poder calorífico superior (**PCS**) e inferior (**PCI**).
- Calor específico em função da temperatura, conforme o modelo empregado.
- Índices de Wobbe superior e inferior, para misturas gasosas.
- Potência térmica associada ao PCS e ao PCI.

### Estequiometria e combustão

- Demanda estequiométrica de oxigênio e de comburente.
- Relação ar/combustível (**AFR**) estequiométrica e real.
- Fator de ar (**λ**) e excesso de ar.
- Quantidades calculadas de produtos da combustão.
- Estimativa da **temperatura adiabática de chama**, conforme as hipóteses do modelo.

### Balanços de massa e energia

- Balanço de massa e de elementos químicos.
- Balanço térmico e propriedades dos gases de combustão.
- Vazões mássicas e volumétricas calculadas.
- Composição dos produtos em **base úmida e base seca**.
- Propriedades e parâmetros de saída dos gases de combustão.

### Produtos da combustão e emissões estimadas

- Frações e concentrações calculadas de **CO₂, H₂O, O₂, N₂** e demais espécies contempladas no modelo.
- Indicadores de geração de **CO₂**.
- Estimativas de **SO₂** quando há enxofre na composição considerada.
- Apresentação de resultados em diferentes bases e unidades, incluindo correções para teor de O₂ de referência quando aplicáveis.

### Interface e visualização

- Indicadores resumidos dos principais resultados.
- Gráficos e visualizações para apoiar a interpretação dos cálculos.
- Interface adaptada para computadores e dispositivos móveis.
- Documentação técnica integrada para consulta às premissas e aos métodos utilizados.

## Modos de cálculo

| Modo | Aplicação |
| --- | --- |
| **Misturas gasosas** | Avaliação de combustíveis gasosos puros ou misturados, incluindo composição, propriedades, estequiometria e produtos da combustão. |
| **Biomassa** | Avaliação de combustíveis sólidos a partir de parâmetros de composição e condições de operação, considerando aspectos como umidade e cinzas. |

## Como utilizar

1. Acesse a **[calculadora online](https://brulemos.github.io/Comb/)**.
2. Selecione o modo de cálculo: mistura gasosa ou biomassa.
3. Configure a composição do combustível e suas condições de entrada.
4. Informe as condições do comburente e os parâmetros de combustão.
5. Consulte os resultados de propriedades, estequiometria, balanços e produtos da combustão.
6. Utilize os gráficos e a documentação técnica para interpretar os resultados.

### Executar localmente

Clone o repositório:

```bash
git clone https://github.com/brulemos/Comb.git
cd Comb
```

Para servir os arquivos em um servidor HTTP local, caso tenha Python instalado:

```bash
python -m http.server 8000
```

Em seguida, abra `http://localhost:8000` no navegador.

## Tecnologias

- **HTML5:** estrutura da aplicação.
- **CSS3:** layout e adaptação a diferentes tamanhos de tela.
- **JavaScript:** cálculos, atualização de resultados e interatividade.
- **GitHub Pages:** publicação da aplicação web.

## Metodologia e considerações técnicas

Os resultados são obtidos a partir das composições informadas, relações estequiométricas, modelos de propriedades e balanços de massa e energia implementados na aplicação. As hipóteses e os métodos de cada cálculo devem ser consultados na documentação técnica do próprio site.

**Atenção:** a calculadora é uma ferramenta de apoio à análise de engenharia. Os resultados dependem da qualidade dos dados de entrada e das hipóteses adotadas. Estimativas teóricas de produtos e emissões não substituem medições instrumentais, ensaios ou avaliações exigidas por normas aplicáveis. A estimativa de temperatura adiabática não contempla dissociação química no modelo indicado.

## Autor

**Bruno Alexandre de Lemos**  
Engenharia da Computação · Instrumentação e processos térmicos

**Repositório:** [github.com/brulemos/Comb](https://github.com/brulemos/Comb)  
**Aplicação:** [brulemos.github.io/Comb](https://brulemos.github.io/Comb/)
