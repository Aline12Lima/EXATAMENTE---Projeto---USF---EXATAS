# 📐 ExataMente — IA de Apoio em Matemática e Física

Projeto universitário - USF

> **Aprenda exatas sem medo e com entusiasmo.**  
> Plataforma digital de estudo personalizado para alunos do Ensino Médio de escolas públicas, com geração de material via Inteligência Artificial.

---

## 🎯 O Problema

Dados do INEP apontam que Matemática e Ciências da Natureza são as áreas com maior índice de reprovação e abandono no Ensino Médio público brasileiro. Muitos alunos chegam ao 2º e 3º ano sem dominar conceitos básicos de Física e Matemática — não por falta de capacidade, mas por falta de acesso a materiais didáticos personalizados, claros e conectados com a realidade deles.

O modelo tradicional de ensino trata todos os alunos igualmente: o mesmo resumo, o mesmo exercício, o mesmo ritmo — independentemente do tempo disponível, do objetivo (prova, teste, trabalho) ou das dificuldades individuais.

**O ExataMente resolve isso.**

---

## 💡 A Solução

O ExataMente é uma plataforma web que usa **Inteligência Artificial (Google Gemini)** para gerar, em segundos, um material de estudo 100% personalizado. O aluno informa:

- O **conteúdo** que precisa estudar (ex: Matrizes, Vetores, Lei de Ohm)
- O **ano** do Ensino Médio
- O **objetivo** (prova, teste, trabalho ou revisão)
- O **tempo disponível** (dias, semanas ou meses)
- O que quer incluir no material (resumo, exercícios, explicação simplificada, exemplos do cotidiano, conexão com tecnologia, mapa de cronograma)

A IA gera automaticamente:

| Recurso                         | Descrição                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| 🗓️ **Mapa de Cronograma**       | Fluxograma interativo (React Flow) com os tópicos distribuídos por dia/semana              |
| 📋 **Cheat Sheet Visual**       | Grid de cards com definições, fórmulas, tipos e dicas para a prova — com LaTeX renderizado |
| 📘 **Resumo Didático**          | Texto estruturado com fórmulas matemáticas legíveis (KaTeX)                                |
| 💡 **Explicação Simplificada**  | Analogias do cotidiano para fixar o conceito                                               |
| 🏠 **Exemplos do Cotidiano**    | Onde o aluno encontra aquele conceito no dia a dia                                         |
| 🚀 **Conexão com Tecnologia**   | Como o conteúdo é usado em IA, games, robótica, smartphones                                |
| ✏️ **Exercícios com Resolução** | Exercícios práticos com passo a passo comentado                                            |
| 📺 **Vídeo Recomendado**        | Link para canal brasileiro de referência (Ferretto, Me Salva!, Descomplica)                |

---

## 🎓 Contexto Acadêmico

Projeto desenvolvido como trabalho de **Sustentabilidade Social** do curso de **Engenharia de Software** da **Universidade São Francisco (USF)**, alinhado ao:

- **ODS 4 — Educação de Qualidade** (Agenda 2030 - ONU)
- **BNCC — Base Nacional Comum Curricular** (Ciências da Natureza e Matemática no Ensino Médio)

**Foco:** mitigar as lacunas em Matemática e Física de alunos de escolas públicas da região de Bragança Paulista / Extrema, conectando o uso dessas matérias com o desenvolvimento de novas tecnologias.

**Alunas:** Aline Lima & Miryan — Engenharia de Software, USF.

---

## 🏗️ Arquitetura

```
projeto-exatamente/
├── backend/          # API Python (FastAPI + Google Gemini)
│   ├── main.py       # Endpoints, geração de prompt e chamada à IA
│   └── requirements.txt
└── frontend/         # Interface React
    └── src/
        ├── App.jsx           # Componente principal, lógica de estado e requisição
        ├── MapaFluxo.jsx     # Mapa interativo de cronograma (React Flow)
        └── CheatSheetGrid.jsx # Grid de resumo visual com KaTeX
```

### Fluxo de dados

```
Aluno preenche formulário
        ↓
    App.jsx (React)
        ↓  POST /gerar-conteudo
    FastAPI (main.py)
        ↓  Prompt estruturado
    Google Gemini API
        ↓  Texto Markdown + JSON
    FastAPI → App.jsx
        ↓
  Extração do JSON ──→ MapaFluxo (React Flow)
                  └──→ CheatSheetGrid (KaTeX)
  Renderização Markdown → marked + marked-katex
```

---

## 🛠️ Stack de Tecnologias

### Backend

| Tecnologia                             | Uso                                                |
| -------------------------------------- | -------------------------------------------------- |
| **Python 3.11+**                       | Linguagem principal                                |
| **FastAPI**                            | Framework de API REST                              |
| **Google Gemini API** (`google-genai`) | Modelo de linguagem (LLM) para geração de conteúdo |
| **Uvicorn**                            | Servidor ASGI                                      |
| **python-dotenv**                      | Gerenciamento de variáveis de ambiente             |

### Frontend

| Tecnologia                          | Uso                                                     |
| ----------------------------------- | ------------------------------------------------------- |
| **React 19**                        | Framework de interface (componentes + hooks)            |
| **Vite 8**                          | Build tool e servidor de desenvolvimento                |
| **Tailwind CSS v4**                 | Estilização utilitária                                  |
| **React Flow**                      | Renderização de grafos interativos (mapa de cronograma) |
| **KaTeX**                           | Renderização de fórmulas matemáticas (LaTeX)            |
| **marked + marked-katex-extension** | Parser de Markdown com suporte a LaTeX inline           |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- Chave de API do Google Gemini ([obter aqui](https://aistudio.google.com/app/apikey))

### 1. Clone o repositório

```bash
git clone https://github.com/Aline12Lima/EXATAMENTE---Projeto---USF---EXATAS.git
cd EXATAMENTE---Projeto---USF---EXATAS
```

### 2. Configure o Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

Crie o arquivo `.env` dentro da pasta `backend/`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

Inicie o servidor:

```bash
uvicorn main:app --reload
```

O backend estará disponível em `http://127.0.0.1:8000`.

### 3. Configure o Frontend

```bash
cd ../frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## 📸 Funcionalidades em Uso

- **Mapa de Cronograma interativo** — nodes arrastáveis, animados, organizados por dia de estudo
- **Cheat Sheet** — grid de cards coloridos com fórmulas LaTeX renderizadas em tempo real
- **Exportação em PDF** — botão "Salvar em PDF" com layout otimizado para impressão
- **Fallback de modelos** — se o Gemini Flash estiver sobrecarregado, cai automaticamente para modelos alternativos

---

## 📋 Fases de Desenvolvimento

### Fase 1 — MVP (HTML Estático)

Prototipagem rápida com HTML5, CSS3, JavaScript Vanilla e Tailwind via CDN para validar a comunicação com o backend e o retorno da API Gemini.

### Fase 2 — Refatoração Reativa (React + Vite)

Migração completa para React com gerenciamento de estado, componentes modulares, React Flow para grafos e KaTeX para fórmulas matemáticas legíveis.

---

## 📄 Licença

Projeto acadêmico — Universidade São Francisco (USF), 2026.  
Desenvolvido para fins educacionais e de sustentabilidade social (ODS 4).
