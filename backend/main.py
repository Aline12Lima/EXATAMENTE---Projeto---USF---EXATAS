import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

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
        model = genai.GenerativeModel("gemini-2.5-flash-lite")

        prompt_instrucoes = f"""
        Você é um tutor de física e matemática especialista no Ensino Médio brasileiro (diretrizes BNCC).
        Gere um plano e material de estudo didático focado no tema "{dados.tema}" para um aluno do {dados.ano} ano do Ensino Médio.
        
        O FOCO DO ALUNO É: {dados.objetivo}.
        O TEMPO DISPONÍVEL DO ALUNO É: {dados.tempo}. Adapte a profundidade, o cronograma e as dicas com base estritamente neste período.
        
        Você DEVE construir a resposta em formato Markdown incluindo APENAS as seções que foram solicitadas abaixo:
        """

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
            # Se o usuário marcou apenas mapa e nenhuma outra caixa teórica
            if not (
                dados.resumo
                or dados.explicacao
                or dados.cotidiano
                or dados.tecnologia
                or dados.exercicios
            ):
                prompt_instrucoes += f"""
                # 🗺️ Cronograma de Estudos por Mapas Mentais Visual ({dados.tempo})
                O usuário optou por estudar exclusivamente através de mapas mentais visuais focados em {dados.objetivo}.
                
                Gere um plano de estudo prático dividido exatamente para o período de **{dados.tempo}**.
                Para cada etapa/dia desse período, você deve apresentar um breve título descritivo e, logo em seguida, o respectivo gráfico dinâmico em formato Mermaid JS.
                
                Exemplo de estrutura esperada para o retorno:
                
                ### 🗓️ Etapa 1: Introdução ao Conteúdo
                ```mermaid
                mindmap
                  root(("Tema Central"))
                    "Subtopico 1"
                    "Subtopico 2"
                ```
                
                ### 🗓️ Etapa 2: Aprofundamento e Detalhes
                ```mermaid
                mindmap
                  root(("Conceitos Avancados"))
                    "Subtopico A"
                    "Subtopico B"
                ```
                
                (REGRAS CRUCIAIS DO MERMAID: Crie diagramas curtos e objetivos para cada dia. Cada nó com mais de uma palavra DEVE obrigatoriamente estar envolvido por aspas duplas. NUNCA utilize acentos, pontos, cedilhas ou caracteres especiais dentro dos parênteses ou aspas do Mermaid, pois isso corrompe o interpretador gráfico do frontend. Use termos como "Operacoes", "Direcao", "Sentido", "Soma vetores").
                """
            else:
                # Se ele marcou mapa mental junto com resumos teóricos ou exercícios, mantém o comportamento padrão de um mapa resumo
                prompt_instrucoes += f"""
                # 🗺️ Mapa Mental Resumo Visual
                ```mermaid
                mindmap
                  root(({dados.tema}))
                    "Conceito"
                      "Definicao"
                    "Aplicacao"
                      "Tecnologia"
                    "Pratica"
                      "Exercicios"
                ```
            
            (ATENÇÃO REGRAS ESTREITAS DO MERMAID: Substitua os termos Concept, Aplicacao e Pratica do modelo acima pelas ramificações reais do assunto pesquisado. Cada nó com mais de uma palavra DEVE obrigatoriamente estar envolvido por aspas duplas, por exemplo: "Operacoes basicas" ou "Regra de tres". Nunca utilize acentos, pontos, cedilhas ou caracteres especiais dentro dos nós, pois isso impede a geração do gráfico).
            """

        if dados.exercicios:
            prompt_instrucoes += """
            # ✏️ Exercícios de Fixação
            [Apresente exercícios práticos compatíveis com o objetivo do aluno, incluindo a resolução passo a passo comentada]
            """

        response = model.generate_content(prompt_instrucoes)
        return {"conteudo": response.text}

    except Exception as e:
        print(f"❌ ERRO INTERNO NO BACKEND: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
