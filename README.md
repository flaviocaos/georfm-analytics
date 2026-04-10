# 🌍 GeoRFM Analytics

<div align="center">

![GeoRFM Analytics](https://img.shields.io/badge/GeoRFM-Analytics-06b6d4?style=for-the-badge&logo=leaflet&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.15-ff6f00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet.js-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Plataforma de Segmentação Geoespacial com Deep Learning — 100% no Navegador**

[🚀 Demo ao Vivo](https://georfm-analytics.vercel.app) · [📖 Documentação](#documentação) · [🐛 Issues](https://github.com/flaviocaos/georfm-analytics/issues)

</div>

---

## 📋 Sobre o Projeto

O **GeoRFM Analytics** é uma plataforma profissional de análise geoespacial que aplica a metodologia **RFM (Recência, Frequência e Monetário)** — amplamente utilizada em marketing e CRM — ao contexto geoespacial e territorial brasileiro.

A plataforma permite segmentar **áreas geográficas** (municípios, talhões, bacias hidrográficas, setores urbanos) em grupos com comportamentos similares, utilizando algoritmos de **Machine Learning e Deep Learning** executados 100% no navegador do usuário — sem necessidade de servidor, backend ou instalação.

### 🎯 Por que GeoRFM?

A análise RFM tradicional responde três perguntas sobre clientes:
- **R**ecência: Quando foi a última interação?
- **F**requência: Com que frequência ocorre?
- **M**onetário: Qual o valor gerado?

O GeoRFM adapta essas três dimensões para **qualquer domínio geoespacial**:

| Área | Recência | Frequência | Valor |
|------|----------|------------|-------|
| 🏥 Saúde Pública | Última notificação | Nº de casos | Taxa de incidência |
| 🌿 Meio Ambiente | Última análise | Nº de monitoramentos | Índice ambiental |
| 🚜 Agricultura | Última colheita | Nº de ciclos | Produtividade (ton/ha) |
| 🏙️ Urbana | Última ocorrência | Nº de ocorrências | Intensidade do impacto |
| 🌊 Hídrico | Última medição | Nº de coletas | Vazão/Qualidade |
| ⚡ Infraestrutura | Última manutenção | Nº de ocorrências | Custo médio |

---

## ✨ Funcionalidades

### 📁 Formatos de Entrada
- **CSV** — arquivos delimitados por vírgula
- **Excel (.xlsx/.xls)** — planilhas Microsoft Excel
- **Shapefile (.shp + .dbf)** — formato vetorial padrão GIS

### 🤖 Análise e Machine Learning
- **KMeans clustering** implementado em JavaScript puro
- **TensorFlow.js** — treinamento de rede neural MLP no navegador com dados reais do usuário
- **Método do Cotovelo** — validação automática do número ideal de clusters
- **5 segmentos adaptativos** — nomenclatura muda conforme a área de análise

### 🗺️ Visualização Geográfica
- **Mapa interativo** com Leaflet.js e tiles dark CartoDB
- **Mapa coroplético automático** — detecta códigos IBGE e colore municípios por segmento
- **Suporte a polígonos** via Shapefile
- **Popups informativos** com detalhes de cada área

### 📊 Análise Gráfica
- **3 histogramas** de distribuição RFM
- **Método do Cotovelo** para validação de clusters
- **Espaço Latente 2D** para visualização dos grupos
- **Dispersão RFM interativa** com hover
- **Estatísticas descritivas** completas (N, mín, máx, média, mediana, desvio padrão)

### 🏛️ Integração API IBGE
- Busca de municípios por estado (27 UFs)
- Download de malha territorial em GeoJSON
- Detecção automática de códigos IBGE nos dados

### 📤 Exportação
- **CSV** com segmentos e scores RFM
- **Excel (.xlsx)** formatado
- **GeoJSON** com geometria e segmentos (compatível com QGIS e ArcGIS)

---

## 🏗️ Arquitetura

```
GeoRFM Analytics
│
├── 100% Frontend (React + Vite)
│   ├── Processamento RFM (JavaScript puro)
│   ├── KMeans Clustering (JavaScript puro)
│   ├── TensorFlow.js (Deep Learning no browser)
│   ├── Leaflet.js (Mapas interativos)
│   ├── SheetJS (Leitura de Excel)
│   └── Shapefile.js (Leitura de Shapefile)
│
├── APIs Externas (sem autenticação)
│   └── IBGE Serviço de Dados (servicodados.ibge.gov.br)
│
└── Deploy
    ├── GitHub (código fonte)
    └── Vercel (hospedagem gratuita)
```

---

## 🚀 Como Usar

### 1. Acesse a plataforma
```
https://georfm-analytics.vercel.app
```

### 2. Selecione a área de análise
Escolha entre as 8 áreas disponíveis conforme seu domínio de aplicação.

### 3. Prepare seu arquivo
O arquivo deve conter pelo menos 3 colunas:

```csv
# Exemplo para Saúde Pública
municipio_id,data_notificacao,casos
3550308,2024-12-20,312
3304557,2024-12-15,289

# Com coordenadas (opcional — habilita o mapa)
municipio_id,data_notificacao,casos,latitude,longitude
3550308,2024-12-20,312,-23.5505,-46.6333

# Com código IBGE de 7 dígitos (habilita mapa coroplético automático)
3550308,2024-12-20,312,-23.5505,-46.6333
```

### 4. Faça o upload
Arraste ou clique para fazer upload do CSV, Excel ou Shapefile.

### 5. Explore os resultados
- **Visão Geral** — KPIs e distribuição por segmento
- **Mapa** — visualização geográfica dos segmentos
- **Análise Gráfica** — histogramas, cotovelo, espaço latente
- **Dispersão** — scatter RFM interativo
- **Dados** — tabela completa com exportação
- **Preditor IA** — treine o modelo e preveja novos registros
- **API IBGE** — busque municípios e malhas territoriais

---

## 💻 Instalação Local

```bash
# Clone o repositório
git clone https://github.com/flaviocaos/georfm-analytics.git
cd georfm-analytics/dashboard

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Acesse em http://localhost:5173
```

### Dependências principais

```json
{
  "react": "^18.0.0",
  "react-leaflet": "^4.0.0",
  "leaflet": "^1.9.0",
  "xlsx": "^0.18.0",
  "shapefile": "^0.6.6",
  "@tensorflow/tfjs": "^4.15.0"
}
```

---

## 📊 Interpretação dos Gráficos

### 📈 Histogramas RFM
Mostram a distribuição dos dados em cada dimensão. Barras à esquerda na **Recência** indicam eventos recentes (situação ativa). Barras à direita na **Frequência** e **Valor** indicam alta intensidade.

### 🔵 Método do Cotovelo
Valida matematicamente o número ideal de clusters (k). O "cotovelo" — ponto onde a curva de inércia muda de inclinação — indica o k ótimo. O marcador amarelo ⬆ sinaliza automaticamente esse ponto.

### 🌐 Espaço Latente 2D
Projeção bidimensional dos clusters no espaço RFM normalizado. Clusters bem separados indicam segmentação de alta qualidade. Os centróides (C1-C5) representam o perfil médio de cada grupo.

### ⬡ Dispersão RFM Interativa
Relaciona Recência (eixo X), Valor (eixo Y) e Frequência (tamanho do ponto). Áreas no quadrante superior esquerdo (recentes + alto valor) são as mais críticas/prioritárias.

### 📋 Estatísticas Descritivas
Se **média >> mediana**, há outliers (valores extremos) puxando a média. **Desvio padrão alto** indica heterogeneidade — situações muito diferentes entre as áreas analisadas.

### 🗺️ Mapa Coroplético
Municípios coloridos por segmento RFM. Detecta automaticamente códigos IBGE de 7 dígitos e carrega a malha territorial oficial. Padrões geográficos de concentração podem indicar influência regional.

---

## 🏛️ Áreas de Análise

| Ícone | Área | Segmentos |
|-------|------|-----------|
| 🏙️ | Análise Urbana | Crítica · Alta Demanda · Moderada · Estável · Baixa Demanda |
| 🌿 | Monitoramento Ambiental | Preservada · Monitorada · Em Alerta · Degradada · Crítica |
| 🚜 | Agricultura de Precisão | Alta Performance · Boa Produção · Média · Abaixo do Esperado · Crítica |
| 🏥 | Saúde Pública Espacial | Surto Ativo · Alto Risco · Risco Moderado · Controlado · Sem Casos |
| 🛰️ | Sensoriamento Remoto | Cobertura Total · Alta Frequência · Frequência Média · Baixa Cobertura · Sem Dados |
| 🌊 | Recursos Hídricos | Excelente · Boa · Aceitável · Ruim · Péssima |
| ⚡ | Infraestrutura | Crítica · Alta Prioridade · Média Prioridade · Baixa Prioridade · Estável |
| 🏘️ | Habitação Social | Alta Vulnerabilidade · Vulnerável · Risco Moderado · Baixo Risco · Adequada |

---

## 🧠 Como Funciona o Deep Learning

O **Preditor IA** utiliza uma rede neural MLP (Multi-Layer Perceptron) treinada diretamente no navegador com os dados reais do usuário:

```
Entrada (3 neurônios)
  rec_norm, freq_norm, mon_norm
        ↓
Camada Oculta 1 (32 neurônios, ReLU)
        ↓
Dropout (20%)
        ↓
Camada Oculta 2 (16 neurônios, ReLU)
        ↓
Saída (5 neurônios, Softmax)
  Probabilidade por segmento
```

- **60 épocas** de treinamento com Adam optimizer
- **Zero envio de dados** para servidores externos
- **Predição em tempo real** usando WebGL via TensorFlow.js

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Flávio Antonio Oliveira da Silva**
Engenheiro Cartógrafo · FS Geotecnologias

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077b5?style=flat-square&logo=linkedin)](https://linkedin.com/in/flaviocaos)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github)](https://github.com/flaviocaos)

---

## 🙏 Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| [React 18](https://react.dev/) | Interface do usuário |
| [Vite](https://vitejs.dev/) | Build e desenvolvimento |
| [Leaflet.js](https://leafletjs.com/) | Mapas interativos |
| [React Leaflet](https://react-leaflet.js.org/) | Integração React + Leaflet |
| [TensorFlow.js](https://www.tensorflow.org/js) | Deep Learning no navegador |
| [SheetJS](https://sheetjs.com/) | Leitura de arquivos Excel |
| [Shapefile.js](https://github.com/mbostock/shapefile) | Leitura de Shapefiles |
| [API IBGE](https://servicodados.ibge.gov.br/api/docs/) | Dados geoespaciais oficiais |
| [CartoDB](https://carto.com/) | Tiles de mapa dark |
| [Vercel](https://vercel.com/) | Deploy e hospedagem |

---

<div align="center">
  <strong>GeoRFM Analytics</strong> · Feito com ❤️ no Brasil 🇧🇷
  <br/>
  <a href="https://georfm-analytics.vercel.app">georfm-analytics.vercel.app</a>
</div>
