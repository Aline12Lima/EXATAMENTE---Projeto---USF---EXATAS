import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
MODELOS_DISPONIVEIS = [
    "gemini-2.5-flash-lite",  # Principal
    "gemini-2.5-flash",  # Secundário (Fallback 1)
    "gemini-1.5-pro",  # Terciário (Fallback 2)
]


def gerar_conteudo_com_fallback(prompt: str):
    ultimo_erro = None

    # O loop percorre a lista até um modelo dar certo
    for nome_modelo in MODELOS_DISPONIVEIS:
        try:
            print(f"Tentando gerar com: {nome_modelo}...")
            modelo = genai.GenerativeModel(nome_modelo)

            resposta = modelo.generate_content(prompt)

            # Se deu certo, retorna a resposta e interrompe o loop
            return resposta.text

        except Exception as e:
            # Captura o erro (ex: cota excedida) e salva para log
            ultimo_erro = str(e)
            print(f"Falha no {nome_modelo}: {ultimo_erro}. Passando para o próximo...")
            continue  # Pula para a próxima iteração do loop

    # Se o loop terminar e todos falharem, retorna um erro amigável para o frontend
    raise HTTPException(
        status_code=503,
        detail="Todos os modelos atingiram o limite de requisições. Tente novamente em alguns instantes.",
    )


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

genai.configure(api_key=GOOGLE_API_KEY)


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
        # 1. BASE DO PROMPT: Aqui entram as regras absolutas para a IA
        prompt_instrucoes = f"""
        Você é um tutor de física e matemática especialista no Ensino Médio brasileiro (diretrizes BNCC).
        Gere um plano e material de estudo didático focado no tema "{dados.tema}" para um aluno do {dados.ano} ano do Ensino Médio.
        
        O FOCO DO ALUNO É: {dados.objetivo}.
        O TEMPO DISPONÍVEL DO ALUNO É: {dados.tempo}. Adapte a profundidade, o cronograma e as dicas com base estritamente neste período.
        REGRAS ABSOLUTAS PARA MATEMÁTICA (LATEX):
        1. Escreva TODAS as fórmulas e equações estritamente em formato LaTeX.
        2. Fórmulas no meio do texto: use um único cifrão puro ($). Ex: A força $F$ e a massa $m$.
        3. Equações em destaque: use duplo cifrão puro ($$). OBRIGATÓRIO: Pule uma linha antes e uma linha depois dos duplos cifrões! Eles devem ficar isolados!
        Exemplo correto:
        O texto acaba aqui.
        
        $$F = m \cdot a$$
        
        E o texto continua aqui.
        4. NUNCA escape os cifrões com barras invertidas.
        5. NUNCA escape as barras do LaTeX (use \frac em vez de \\frac).
        
        Você DEVE construir a resposta em formato Markdown incluindo APENAS as seções que foram solicitadas abaixo:
        """

        # 2. SEÇÕES OPCIONAIS: Adicionadas conforme os checkboxes
        if dados.resumo:
            prompt_instrucoes += f"""
            # 📘 Resumo Didático: {dados.tema}
            [Crie um resumo teórico bem estruturado sobre o assunto, adaptado para quem vai fazer um(a) {dados.objetivo} com cronograma de estudo para {dados.tempo}]
            """

        if dados.explicacao:
            prompt_instrucoes += """
            # 💡 Explicação Simplificada
            [Explique o conceito de forma extremamente fácil e amigável, usando analogias simples]
            """

        if dados.cotidiano:
            prompt_instrucoes += """
            # 🏠 Exemplos do Cotidiano
            [Mostre onde e como esse conceito físico ou matemático aparece do dia a dia dos alunos fora da escola]
            """

        if dados.tecnologia:
            prompt_instrucoes += f"""
            # 🚀 Conexão com a Tecnologia (BNCC)
            [Explique detalhadamente como o conceito de {dados.tema} é aplicado no desenvolvimento de novas tecnologias do mundo real, como inteligência artificial, smartphones, games ou engenharia]
            """

        if dados.mapa:
            prompt_instrucoes += f"""
            # 🗺️ Mapas Mentais para React Flow (JSON)
            Gere obrigatoriamente a estrutura de dados estruturada para alimentar a biblioteca React Flow. 
            O conteúdo deve conter chaves estruturadas em formato JSON válido, contidas estritamente dentro de um único bloco de código marcado com ```json.
            
            O formato deve conter duas chaves principais: "mapa_cronograma" e "mapa_conteudo".
            
            Exemplo de estrutura JSON exata esperada:
            ```json
            {{
              "mapa_cronograma": {{
                "nodes": [
                  {{ "id": "c1", "data": {{ "label": "Cronograma {dados.tempo}" }}, "position": {{ "x": 250, "y": 0 }}, "type": "input" }},
                  {{ "id": "c2", "data": {{ "label": "Fase Inicial" }}, "position": {{ "x": 250, "y": 100 }} }}
                ],
                "edges": [
                  {{ "id": "ec1-2", "source": "c1", "target": "c2", "animated": true }}
                ]
              }},
              "mapa_conteudo": {{
                "nodes": [
                  {{ "id": "n1", "data": {{ "label": "{dados.tema}" }}, "position": {{ "x": 400, "y": 0 }}, "type": "input" }},
                  {{ "id": "n2", "data": {{ "label": "Conceitos Fundamentais" }}, "position": {{ "x": 200, "y": 120 }} }},
                  {{ "id": "n3", "data": {{ "label": "Aplicacoes Tecnologicas" }}, "position": {{ "x": 600, "y": 120 }} }}
                ],
                "edges": [
                  {{ "id": "en1-2", "source": "n1", "target": "n2" }},
                  {{ "id": "en1-3", "source": "n1", "target": "n3" }}
                ]
              }}
            }}
            ```

            Especificações Cruciais:
            1. No "mapa_cronograma", organize os nós sequencialmente simulando as fases de estudo ao longo de {dados.tempo} para o objetivo {dados.objetivo}.
            2. No "mapa_conteudo", crie uma árvore SINTÉTICA (MÁXIMO ABSOLUTO DE 15 NÓS). Agrupe conceitos para garantir que o JSON NUNCA seja cortado por limite de tamanho. Detalhe os conceitos matemáticos em LaTeX e usabilidade em tecnologia.
            3. Distribua os valores de 'x' e 'y' de maneira lógica para que os nós não fiquem sobrepostos (aumente o 'y' a cada nível que descer na árvore).
            4. NUNCA adicione textos ou comentários fora do bloco de código ```json. Não utilize aspas duplas dentro das strings das labels.
            """

        if dados.exercicios:
            prompt_instrucoes += """
            # ✏️ Exercícios de Fixação
            [Apresente exercícios práticos compatíveis com o objetivo do aluno, incluindo a resolução passo a passo comentada]
            """

        # 3. ENVIO: Chama a função que testa os modelos em fila
        texto_gerado = gerar_conteudo_com_fallback(prompt_instrucoes)

        return {"conteudo": texto_gerado}

    except Exception as e:
        print(f"❌ ERRO INTERNO NO BACKEND: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
