import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# ─── Modelos em ordem de preferência ───
# flash-lite é rápido mas fraco em JSON complexo
# flash é o melhor custo-benefício para este caso
MODELOS_DISPONIVEIS = [
    "gemini-2.5-flash",  # Principal — melhor para seguir JSON estruturado
    "gemini-2.5-flash-lite",  # Fallback 1
    "gemini-1.5-pro",  # Fallback 2
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError(
        "ERRO: A variável GEMINI_API_KEY não foi encontrada no arquivo .env"
    )

cliente = genai.Client(api_key=GOOGLE_API_KEY)


def gerar_conteudo_com_fallback(prompt: str) -> str:
    ultimo_erro = None
    for nome_modelo in MODELOS_DISPONIVEIS:
        try:
            print(f"Tentando gerar com: {nome_modelo}...")
            resposta = cliente.models.generate_content(
                model=nome_modelo,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.4,  # Mais determinístico — segue melhor o formato
                    max_output_tokens=8192,
                ),
            )
            return resposta.text
        except Exception as e:
            ultimo_erro = str(e)
            print(f"Falha no {nome_modelo}: {ultimo_erro}. Passando para o próximo...")
            continue

    raise HTTPException(
        status_code=503,
        detail="Todos os modelos atingiram o limite. Tente novamente em alguns instantes.",
    )


class InputTema(BaseModel):
    tema: str
    ano: str
    objetivo: str
    tempo: str
    mapa: bool
    resumo: bool
    exercicios: bool
    explicacao: bool
    cotidiano: bool
    tecnologia: bool


@app.post("/gerar-conteudo")
async def gerar_conteudo(dados: InputTema):
    try:
        # ══════════════════════════════════════════════
        # PARTE 1 — REGRAS GLOBAIS
        # ══════════════════════════════════════════════
        prompt = f"""Você é um tutor especialista em Física e Matemática para o Ensino Médio brasileiro (BNCC).
Gere material de estudo sobre "{dados.tema}" para um aluno do {dados.ano} ano.
OBJETIVO: {dados.objetivo} | TEMPO: {dados.tempo}

REGRAS DE LATEX — OBRIGATÓRIAS EM TODO O TEXTO MARKDOWN:
- Inline: escreva $ expressão $ com espaço antes e depois do cifrão. Exemplo: "O módulo $ |\\vec{{v}}| $ é..."
- Bloco: escreva $$ expressão $$ em linha própria com linha vazia acima e abaixo.
- NUNCA use \\( \\) nem \\[ \\] — SOMENTE $ e $$.
- NUNCA escreva \\$ para escapar cifrão.
- NUNCA use caracteres Unicode matemáticos: use \\Delta, \\pi, \\Sigma, \\alpha, \\beta, \\approx, \\times.
- Frações: \\frac{{a}}{{b}}
- Unidades: $ 9{{,}}8\\,\\text{{m/s}}^2 $
- Vetores: \\vec{{v}}

"""

        # ══════════════════════════════════════════════
        # PARTE 2 — BLOCO JSON (sempre gerado primeiro)
        # ══════════════════════════════════════════════
        if dados.mapa:
            prompt += f"""## ⚠️ GERE ESTE BLOCO JSON ANTES DE QUALQUER TEXTO

Retorne um bloco ```json com EXATAMENTE esta estrutura (substitua pelos dados reais de "{dados.tema}"):

```json
{{
  "mapa_cronograma": {{
    "nodes": [
      {{"id": "n0", "type": "default", "data": {{"label": "🎯 Início\\n{dados.tema}"}}, "position": {{"x": 300, "y": 0}}}},
      {{"id": "n1", "type": "default", "data": {{"label": "📖 Dia 1\\nDescreva o tópico do dia 1"}}, "position": {{"x": 80, "y": 160}}}},
      {{"id": "n2", "type": "default", "data": {{"label": "📝 Dia 2\\nDescreva o tópico do dia 2"}}, "position": {{"x": 300, "y": 160}}}},
      {{"id": "n3", "type": "default", "data": {{"label": "🧪 Dia 3\\nDescreva o tópico do dia 3"}}, "position": {{"x": 520, "y": 160}}}},
      {{"id": "nf", "type": "default", "data": {{"label": "✅ Revisão Final\\n+ {dados.objetivo}"}}, "position": {{"x": 300, "y": 320}}}}
    ],
    "edges": [
      {{"id": "e1", "source": "n0", "target": "n1", "animated": true}},
      {{"id": "e2", "source": "n0", "target": "n2", "animated": true}},
      {{"id": "e3", "source": "n0", "target": "n3", "animated": true}},
      {{"id": "e4", "source": "n1", "target": "nf", "animated": true}},
      {{"id": "e5", "source": "n2", "target": "nf", "animated": true}},
      {{"id": "e6", "source": "n3", "target": "nf", "animated": true}}
    ]
  }},
  "infografico": [
    {{
      "titulo": "1. Definição",
      "cor": "blue",
      "conteudo": [
        {{"tipo": "texto", "valor": "Escreva aqui a definição principal de {dados.tema}"}},
        {{"tipo": "latex", "valor": "fórmula_principal_sem_cifrão"}}
      ]
    }},
    {{
      "titulo": "2. Fórmulas",
      "cor": "red",
      "conteudo": [
        {{"tipo": "latex", "valor": "primeira_fórmula_sem_cifrão"}},
        {{"tipo": "texto", "valor": "Explique o que significa cada letra"}},
        {{"tipo": "latex", "valor": "segunda_fórmula_sem_cifrão"}}
      ]
    }},
    {{
      "titulo": "3. Tipos / Classificação",
      "cor": "green",
      "conteudo": [
        {{"tipo": "texto", "valor": "Tipo ou caso 1"}},
        {{"tipo": "texto", "valor": "Tipo ou caso 2"}},
        {{"tipo": "texto", "valor": "Tipo ou caso 3"}}
      ]
    }},
    {{
      "titulo": "4. Propriedades",
      "cor": "purple",
      "conteudo": [
        {{"tipo": "texto", "valor": "Propriedade importante 1"}},
        {{"tipo": "latex", "valor": "expressão_relacionada_sem_cifrão"}},
        {{"tipo": "texto", "valor": "Propriedade importante 2"}}
      ]
    }},
    {{
      "titulo": "5. Dicas para a Prova",
      "cor": "orange",
      "conteudo": [
        {{"tipo": "texto", "valor": "Dica 1 — o que mais cai na prova"}},
        {{"tipo": "texto", "valor": "Dica 2 — erro comum a evitar"}},
        {{"tipo": "texto", "valor": "Dica 3 — como verificar a resposta"}}
      ]
    }}
  ]
}}
```

REGRAS DO JSON:
- Substitua TODOS os textos de exemplo pelos dados reais de "{dados.tema}"
- Campo "latex": LaTeX PURO sem $ delimitadores. Correto: "F = G \\frac{{m_1 m_2}}{{d^2}}"
- Use \\\\ (4 barras no Python = 2 barras no JSON) para quebrar linha em matrizes
- Adapte o número de nodes ao tempo de {dados.tempo} (um node por dia/semana)
- JSON deve ser válido: sem vírgulas extras, sem comentários

"""
        else:
            # Mesmo sem mapa, gera o infográfico
            prompt += f"""## ⚠️ GERE ESTE BLOCO JSON ANTES DE QUALQUER TEXTO

```json
{{
  "infografico": [
    {{"titulo": "1. Definição", "cor": "blue", "conteudo": [{{"tipo": "texto", "valor": "def de {dados.tema}"}}, {{"tipo": "latex", "valor": "fórmula_sem_cifrão"}}]}},
    {{"titulo": "2. Fórmulas", "cor": "red", "conteudo": [{{"tipo": "latex", "valor": "fórmula1"}}, {{"tipo": "latex", "valor": "fórmula2"}}]}},
    {{"titulo": "3. Tipos", "cor": "green", "conteudo": [{{"tipo": "texto", "valor": "tipo 1"}}, {{"tipo": "texto", "valor": "tipo 2"}}]}},
    {{"titulo": "4. Propriedades", "cor": "purple", "conteudo": [{{"tipo": "texto", "valor": "propriedade 1"}}, {{"tipo": "latex", "valor": "expressão"}}]}},
    {{"titulo": "5. Dicas Prova", "cor": "orange", "conteudo": [{{"tipo": "texto", "valor": "dica 1"}}, {{"tipo": "texto", "valor": "dica 2"}}]}}
  ]
}}
```
Substitua todos os valores de exemplo pelos dados reais de "{dados.tema}". Campo "latex" = LaTeX puro sem $.

"""

        # ══════════════════════════════════════════════
        # PARTE 3 — SEÇÕES MARKDOWN
        # ══════════════════════════════════════════════
        if dados.resumo:
            prompt += f"""## 📘 Resumo Didático: {dados.tema}

Estruture em ### Dia 1, ### Dia 2, etc. conforme {dados.tempo}.
Use $ fórmula $ para inline e $$ fórmula $$ para blocos.
Adapte para {dados.objetivo}.

"""

        if dados.explicacao:
            prompt += f"""## 💡 Explicação Simplificada

Explique "{dados.tema}" com analogias do dia a dia. Linguagem simples e motivadora.

"""

        if dados.cotidiano:
            prompt += f"""## 🏠 Exemplos do Cotidiano

Liste 4 exemplos reais de "{dados.tema}" no dia a dia dos alunos.

"""

        if dados.tecnologia:
            prompt += f"""## 🚀 Conexão com a Tecnologia (BNCC)

Como "{dados.tema}" é aplicado em IA, games, smartphones, robótica ou engenharia?

"""

        if dados.exercicios:
            prompt += f"""## ✏️ Exercícios de Fixação

Crie 4 exercícios sobre "{dados.tema}" com resolução passo a passo.
Use $$ fórmula $$ para cada equação da resolução.
Adapte ao nível do {dados.ano} ano e ao objetivo: {dados.objetivo}.

"""

        # ══════════════════════════════════════════════
        # PARTE 4 — VÍDEO (sempre incluído)
        # ══════════════════════════════════════════════
        prompt += f"""## 📺 Vídeo Recomendado

Indique UM vídeo do YouTube em português sobre "{dados.tema}" para Ensino Médio.
Canais preferidos: Ferretto Matemática, Me Salva!, Descomplica, Física e Afins, Professor Noslen, Equaciona Com Paulo Pereira.

Formato obrigatório:
**Canal:** [Nome do Canal](https://www.youtube.com/URL_REAL)
**Por que assistir:** Uma frase sobre o diferencial do vídeo.
"""

        texto_gerado = gerar_conteudo_com_fallback(prompt)
        return {"conteudo": texto_gerado}

    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
