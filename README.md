# Relatório de Arquitetura e Desenvolvimento: Plataforma ExataMente

## 1. Fase 1: Prototipagem e MVP (HTML Estático)

**Objetivo:**
Validar rapidamente a interface de usuário (UI), a comunicação HTTP com o backend (FastAPI) e o retorno da API do Gemini, testando a viabilidade do produto sem a sobrecarga inicial de um framework reativo.

**Ferramentas Utilizadas:**

- **Frontend:** HTML5, CSS3.
- **Lógica:** JavaScript Vanilla (manipulação direta do DOM via `document.getElementById`).
- **Estilização:** Tailwind CSS (importado via script/CDN).
- **Parser:** Marked.js (via CDN) para conversão de Markdown em HTML.

**O Que Foi Implementado:**

- Estruturação visual do formulário (Ano, Objetivo, Tempo, Conteúdo e Checkboxes de recursos).
- Captura de eventos básicos (`onSubmit` do formulário e pulo de linha com `Enter`).
- Comunicação assíncrona com o backend via `fetch()`.
- Injeção dinâmica do texto teórico gerado pela IA diretamente no container de resultados.
- **Limitação identificada:** Dificuldade arquitetural para injetar e controlar bibliotecas complexas de visualização de dados (como mapas mentais interativos) manipulando o DOM manualmente.

---

## 2. Fase 2: Refatoração Reativa (React + Tailwind v4 + React Flow)

**Objetivo:**
Elevar o nível da engenharia do frontend, implementando uma arquitetura baseada em componentes e gerenciamento de estado. O foco principal foi habilitar a renderização de mapas mentais interativos e preparar o código para futura escalabilidade e manutenção.

**Ferramentas Utilizadas:**

- **Core:** React.js (uso extensivo de hooks como `useState` e `useEffect`).
- **Build/Bundler:** Vite (para inicialização e HMR - Hot Module Replacement rápidos).
- **Estilização:** Tailwind CSS v4 (configuração moderna via `@import "tailwindcss"` no `index.css`).
- **Motor Gráfico:** React Flow (renderização e manipulação física dos grafos bidimensionais).
- **Parser:** Marked.js (instalado localmente via NPM).

**O Que Foi Implementado:**

- **Migração de Interface:** Transcrição completa do HTML/Tailwind para JSX dentro do componente principal (`App.jsx`), mantendo fidelidade visual ao layout original (UI/UX intacta).
- **Gerenciamento de Estado:** Substituição da leitura manual do DOM pelo controle de estado reativo para inputs, tempo de loading e dados recebidos.
- **Integração de Grafos (`MapaFluxo.jsx`):** Criação de um componente modular envelopado pelo `ReactFlowProvider` e com CSS inline rigoroso (`height: 500px`) para evitar o colapso nativo de renderização da biblioteca.
- **Engenharia de Dados (Filtro e Regex):** \* Implementação de expressões regulares (`regexJson`) para localizar e extrair apenas o bloco de código JSON dentro da resposta híbrida (Markdown + JSON) do LLM.
  - Desenvolvimento da função `normalizarDadosReactFlow` para sanitizar os dados na recepção, corrigindo proativamente "alucinações" do LLM (ex: conexões `edges` inseridas erroneamente dentro do array de `nodes`).
- **Renderização Condicional Dinâmica:** Lógica de exibição protegida `{(resultadoHtml || dadosCronograma || dadosConteudo)}` para garantir que o container de resultados apareça mesmo quando o LLM envia requisições assíncronas isoladas (ex: gerar apenas mapas, sem texto teórico).
- **Rastreamento e Telemetria:** Instalação de logs numerados (`[DEBUG]`) ao longo de todo o ciclo de vida da requisição para isolar e monitorar falhas silenciosas na comunicação client-server.
