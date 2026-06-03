import { useState, useRef } from "react";
import markedKatex from "marked-katex-extension";
import { marked } from "marked";
import MapaFluxo from "./MapaFluxo";
import "katex/dist/katex.min.css";

marked.use(markedKatex({ throwOnError: false }));

const normalizarDadosReactFlow = (mapa) => {
  if (!mapa) return null;
  let nodes = mapa.nodes || [];
  let edges = mapa.edges || [];

  // Separa o que é caixa de verdade e o que é seta perdida no array errado
  const nosReais = nodes.filter((n) => !n.source && !n.target);
  const setasPerdidas = nodes.filter((n) => n.source && n.target);

  return {
    nodes: nosReais,
    edges: [...edges, ...setasPerdidas],
  };
};

export default function App() {
  const [tema, setTema] = useState("");
  const [ano, setAno] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [tempoQtd, setTempoQtd] = useState("");
  const [tempoTipo, setTempoTipo] = useState("Dias");

  // Estados dos Checkboxes exatamente como as IDs do HTML original
  const [recursos, setRecursos] = useState({
    mapa: false,
    resumo: false,
    exercicios: false,
    explicacao: false,
    cotidiano: false,
    tecnologia: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [resultadoHtml, setResultadoHtml] = useState("");
  const [dadosCronograma, setDadosCronograma] = useState(null);
  const [dadosConteudo, setDadosConteudo] = useState(null);

  const textareaRef = useRef(null);

  const handleCheckboxChange = (key) => {
    setRecursos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const marcarTodos = () => {
    const checkboxes = Object.values(recursos);
    const todosMarcados = checkboxes.every((val) => val);
    const novoEstado = {};
    Object.keys(recursos).forEach((key) => {
      novoEstado[key] = !todosMarcados;
    });
    setRecursos(novoEstado);
  };

  const autoExpand = (e) => {
    const campo = e.target;
    campo.style.height = "inherit";
    campo.style.height = `${campo.scrollHeight}px`;
  };

  const enviarFormulario = async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!Object.values(recursos).some((val) => val)) {
      console.warn();
      alert(
        "Por favor, selecione pelo menos um recurso para incluir no seu material de estudo!",
      );
      return;
    }

    setLoading(true);
    setResultadoHtml("");
    setDadosCronograma(null);
    setDadosConteudo(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/gerar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: tema.trim(),
          ano,
          objetivo,
          tempo: `${tempoQtd} ${tempoTipo}`,
          ...recursos,
        }),
      });

      if (!response.ok) {
        console.error(
          "❌ [DEBUG ERRO] O backend retornou erro:",
          response.status,
        );
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const dados = await response.json();

      let textoBruto = dados.conteudo;

      const regexJson = /```json\s*([\s\S]*?)\s*```/;
      const match = textoBruto.match(regexJson);

      if (match && match[1]) {
        try {
          const jsonLimpo = match[1].trim();

          const objetoMapas = JSON.parse(jsonLimpo);
          if (objetoMapas.mapa_cronograma) {
            setDadosCronograma(
              normalizarDadosReactFlow(objetoMapas.mapa_cronograma),
            );
          }
          if (objetoMapas.mapa_conteudo) {
            setDadosConteudo(
              normalizarDadosReactFlow(objetoMapas.mapa_conteudo),
            );
          }

          textoBruto = textoBruto.replace(regexJson, "");
        } catch (err) {
          console.error("❌ [DEBUG ERRO] Falha ao fazer o JSON.parse:", err);
        }
      }

      console.log(
        "📍 [DEBUG 12] Limpando escapes da IA e renderizando Matemática...",
      );

      // 🌟 ESTEIRA DE LIMPEZA: Força o texto a ficar no padrão exato do KaTeX
      let textoLimpo = textoBruto
        .replace(/\\\$/g, "$") // Transforma \$ em $ puro
        .replace(/\\\\/g, "\\") // Remove barras duplas inúteis
        .replace(/\\\[/g, "$$") // Transforma bloco \[ no padrão $$
        .replace(/\\\]/g, "$$") // Transforma bloco \] no padrão $$
        .replace(/\\\(/g, "$") // Transforma linha \( no padrão $
        .replace(/\\\)/g, "$"); // Transforma linha \) no padrão $

      setResultadoHtml(marked.parse(textoLimpo));
    } catch (erroGeral) {
      console.error(
        "❌ [DEBUG ERRO] Exceção capturada no fluxo geral:",
        erroGeral,
      );
      setErrorModal(true);
    } finally {
      setLoading(false);
    }
  };
  const imprimirPDF = () => {
    const tituloOriginal = document.title;
    const nomeArquivo = `ExataMente_${tema.trim().replace(/\s+/g, "_")}`;

    document.title = nomeArquivo;

    // 🌟 Dá 800ms para o KaTeX processar todas as frações antes do PDF
    setTimeout(() => {
      window.print();
      document.title = tituloOriginal;
    }, 800);
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen">
      {/* Modal de Erro igual ao HTML */}
      {errorModal && (
        <div
          id="error-modal"
          className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all border border-gray-100">
            <div className="flex items-center space-x-3 text-amber-500 mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-xl font-bold text-gray-800">
                Aviso do Sistema
              </h3>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6">
              O servidor está processando muitas requisições no momento ou
              encontrou uma oscilação temporária. Por favor, **aguarde um
              instante** e tente gerar seu material novamente.
            </p>
            <button
              onClick={() => setErrorModal(false)}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 rounded-xl transition shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Header idêntico */}
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">🧠 ExataMente</h1>
          <p className="text-sm opacity-90 mt-1">
            IA de Apoio em Matemática e Física (BNCC - ODS 4)
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto p-4 max-w-4xl mt-8">
        <form
          onSubmit={enviarFormulario}
          id="formulario-estudos"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            O que você deseja estudar hoje?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Seu Ano:
              </label>
              <select
                id="ano"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                required
                className="w-full p-2.5 border rounded-md bg-white outline-none"
              >
                <option value="" disabled>
                  Selecione o ano...
                </option>
                <option value="1º">1º Ano - Ensino Médio</option>
                <option value="2º">2º Ano - Ensino Médio</option>
                <option value="3º">3º Ano - Ensino Médio</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Objetivo do Estudo:
              </label>
              <select
                id="objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                required
                className="w-full p-2.5 border rounded-md bg-white outline-none"
              >
                <option value="" disabled>
                  Qual o objetivo?
                </option>
                <option value="Prova">Preparação para Prova</option>
                <option value="Teste">Teste de Classe</option>
                <option value="Trabalho">Trabalho Escolar</option>
                <option value="Revisão">Revisão Geral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Tempo Disponível:
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  id="tempo-qtd"
                  min="1"
                  placeholder="Ex: 5"
                  value={tempoQtd}
                  onChange={(e) => setTempoQtd(e.target.value)}
                  required
                  className="w-1/3 p-2 border rounded-md text-center outline-none"
                />
                <select
                  id="tempo-tipo"
                  value={tempoTipo}
                  onChange={(e) => setTempoTipo(e.target.value)}
                  required
                  className="w-2/3 p-2 border rounded-md bg-white outline-none"
                >
                  <option value="Dias">Dias</option>
                  <option value="Semanas">Semanas</option>
                  <option value="Meses">Meses</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Conteúdo (Ex: Lei de Ohm, Função de 2º Grau):
            </label>
            <textarea
              id="tema"
              ref={textareaRef}
              rows={2}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              onInput={autoExpand}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarFormulario(e); // 🌟 Agora passamos o 'e' para o form!
                }
              }}
              required
              minLength={3}
              placeholder="Digite o conteúdo aqui..."
              className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none outline-none text-base transition-all bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Grid de recursos idêntico ao HTML clássico */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <span className="block text-sm font-semibold text-gray-700">
                Escolha o que incluir no seu material:
              </span>
              <button
                type="button"
                onClick={marcarTodos}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition"
              >
                ✨ Selecionar Tudo
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none">
                <input
                  type="checkbox"
                  id="chk-mapa"
                  checked={recursos.mapa}
                  onChange={() => handleCheckboxChange("mapa")}
                  className="chk-recurso w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  🗺️ Mapas Mentais
                </span>
              </label>
              <label className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none">
                <input
                  type="checkbox"
                  id="chk-resumo"
                  checked={recursos.resumo}
                  onChange={() => handleCheckboxChange("resumo")}
                  className="chk-recurso w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  📝 Resumos
                </span>
              </label>
              <label className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none">
                <input
                  type="checkbox"
                  id="chk-exercicios"
                  checked={recursos.exercicios}
                  onChange={() => handleCheckboxChange("exercicios")}
                  className="chk-recurso w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  ✏️ Exercícios
                </span>
              </label>
              <label className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none">
                <input
                  type="checkbox"
                  id="chk-explicacao"
                  checked={recursos.explicacao}
                  onChange={() => handleCheckboxChange("explicacao")}
                  className="chk-recurso w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  💡 Explicações Simplificadas
                </span>
              </label>
              <label className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none">
                <input
                  type="checkbox"
                  id="chk-cotidiano"
                  checked={recursos.cotidiano}
                  onChange={() => handleCheckboxChange("cotidiano")}
                  className="chk-recurso w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  🏠 Examples do Cotidiano
                </span>
              </label>
              <label className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none">
                <input
                  type="checkbox"
                  id="chk-tecnologia"
                  checked={recursos.tecnologia}
                  onChange={() => handleCheckboxChange("tecnologia")}
                  className="chk-recurso w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  🚀 Ex. Onde é usado ?
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            id="btn-gerar"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "🤖 Gerando Material Personalizado..."
              : "✨ Gerar Material Personalizado"}
          </button>
        </form>

        {/* Loading idêntico */}
        {loading && (
          <div id="loading" className="text-center my-8">
            <p className="text-blue-600 font-medium animate-pulse">
              🤖 A Exatamente está gerando seu material de estudos... Aguarde.
            </p>
          </div>
        )}

        {/* Container de Resultados idêntico */}
        {(resultadoHtml || dadosCronograma || dadosConteudo) && (
          <div
            id="resultado-container"
            className="mt-8 bg-white p-8 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded">
                Material Gerado com Sucesso
              </span>
              <button
                onClick={imprimirPDF}
                className="bg-gray-800 hover:bg-gray-900 text-white text-sm py-2 px-4 rounded transition"
              >
                📥 Salvar em PDF
              </button>
            </div>

            {/* Injeção dos Mapas do React Flow preservando a hierarquia */}
            {recursos.mapa && dadosCronograma && (
              <div className="my-6">
                <h3 className="text-lg font-bold text-gray-700 mb-2">
                  🗓️ 1. Cronograma de Estudos Interativo
                </h3>
                <MapaFluxo dados={dadosCronograma} />
              </div>
            )}

            {recursos.mapa && dadosConteudo && (
              <div className="my-6">
                <h3 className="text-lg font-bold text-gray-700 mb-2">
                  🧠 2. Árvore de Conhecimento Dinâmica
                </h3>
                <MapaFluxo dados={dadosConteudo} />
              </div>
            )}

            <div
              id="resultado"
              className="prose max-w-none space-y-4"
              dangerouslySetInnerHTML={{ __html: resultadoHtml }}
            />
          </div>
        )}
      </main>
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm md:text-base font-medium text-gray-300 mb-2">
            🌱 Ferramenta desenvolvida para o projeto de sustentabilidade (ODS
            4) por alunas de Engenharia de Software da USF.
          </p>

          <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 mt-4 text-sm">
            <a
              href="mailto:aline.seu.sobrenome@usf.edu.br"
              className="hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              ✉️ Aline: aline.seu.sobrenome@usf.edu.br
            </a>
            <span className="hidden md:inline text-gray-600">|</span>
            <a
              href="mailto:email.da.sua.colega@usf.edu.br"
              className="hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              ✉️ Nome da Colega: email.da.colega@usf.edu.br
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
