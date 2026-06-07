import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import markedKatex from "marked-katex-extension";
import { marked } from "marked";
import MapaFluxo from "./MapaFluxo";
import CheatSheetGrid from "./CheatSheetGrid";
import "katex/dist/katex.min.css";
import logo from "../public/logo.png";

// Configura marked com suporte a KaTeX
marked.use(
  markedKatex({
    throwOnError: false,
    nonStandard: true,
    output: "html",
  }),
);

// ─── Corrige nodes que o Gemini às vezes manda como edges ───
const normalizarReactFlow = (mapa) => {
  if (!mapa) return null;
  const todos = mapa.nodes || [];
  const nosReais = todos.filter((n) => !n.source && !n.target);
  const setasPerdidas = todos.filter((n) => n.source && n.target);
  const edges = [...(mapa.edges || []), ...setasPerdidas];
  return { nodes: nosReais, edges };
};

// ─── Extrai o bloco ```json do texto bruto da IA ───
const extrairJson = (texto) => {
  const regexBloco = /```json\s*([\s\S]*?)\s*```/;
  const matchBloco = texto.match(regexBloco);
  if (matchBloco?.[1]) {
    try {
      return {
        obj: JSON.parse(matchBloco[1].trim()),
        textoSemJson: texto.replace(regexBloco, ""),
      };
    } catch {
      // fallthrough
    }
  }

  const regexObjeto = /\{[\s\S]*"(?:mapa_cronograma|infografico)"[\s\S]*\}/;
  const matchObjeto = texto.match(regexObjeto);
  if (matchObjeto?.[0]) {
    try {
      return {
        obj: JSON.parse(matchObjeto[0].trim()),
        textoSemJson: texto.replace(matchObjeto[0], ""),
      };
    } catch {
      console.warn("⚠️ JSON inválido:", matchObjeto[0].slice(0, 200));
    }
  }

  return { obj: null, textoSemJson: texto };
};

// ─── Limpa escapes de LaTeX ───
const limparLatex = (texto) => {
  return texto
    .replace(/\\\[/g, "\n\n$$\n\n")
    .replace(/\\\]/g, "\n\n$$\n\n")
    .replace(/\\\(/g, " $")
    .replace(/\\\)/g, "$ ")
    .replace(/\\\$/g, "$");
};

// 🛡️ Detecção de bypass no frontend (camada adicional de proteção)
const PADROES_BYPASS_FRONTEND = [
  /esqueça\s+(suas\s+)?instru[çc][õo]es/i,
  /ignore\s+(suas\s+)?instru[çc][õo]es/i,
  /ignore\s+(all\s+)?previous/i,
  /forget\s+(your\s+)?instructions/i,
  /(dan|jailbreak|modo\s+deus|god\s+mode)/i,
  /you\s+are\s+now\s+(dan|jailbroken|free)/i,
  /act\s+as\s+if\s+you\s+have\s+no/i,
  /system\s*prompt/i,
  /mostre\s+(o\s+)?prompt/i,
];

const detectarBypassFrontend = (texto) =>
  PADROES_BYPASS_FRONTEND.some((p) => p.test(texto));

export default function App() {
  const [tema, setTema] = useState("");
  const [ano, setAno] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [tempoQtd, setTempoQtd] = useState("");
  const [tempoTipo, setTempoTipo] = useState("Dias");
  const [avisoBypass, setAvisoBypass] = useState(false);

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
  const [errorMsg, setErrorMsg] = useState("");
  const [resultadoHtml, setResultadoHtml] = useState("");
  const [dadosCronograma, setDadosCronograma] = useState(null);
  const [dadosInfografico, setDadosInfografico] = useState(null);

  const textareaRef = useRef(null);
  const mapaRef = useRef(null);

  const handleCheckboxChange = (key) =>
    setRecursos((prev) => ({ ...prev, [key]: !prev[key] }));

  const marcarTodos = () => {
    const todos = Object.values(recursos).every(Boolean);
    const novo = {};
    Object.keys(recursos).forEach((k) => {
      novo[k] = !todos;
    });
    setRecursos(novo);
  };

  const autoExpand = (e) => {
    e.target.style.height = "inherit";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleTemaChange = (e) => {
    const valor = e.target.value;
    if (detectarBypassFrontend(valor)) {
      setAvisoBypass(true);
      return; // não atualiza o campo
    }
    setAvisoBypass(false);
    setTema(valor);
    autoExpand(e);
  };

  const enviarFormulario = async (e) => {
    if (e) e.preventDefault();

    if (detectarBypassFrontend(tema)) {
      setAvisoBypass(true);
      return;
    }

    if (!Object.values(recursos).some(Boolean)) {
      alert("Selecione pelo menos um recurso!");
      return;
    }

    setLoading(true);
    setResultadoHtml("");
    setDadosCronograma(null);
    setDadosInfografico(null);
    setAvisoBypass(false);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/gerar-conteudo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: tema.trim(),
          ano,
          objetivo,
          tempo_qtd: tempoQtd,
          tempo_tipo: tempoTipo,
          ...recursos,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Erro HTTP: ${response.status}`);
      }

      const dados = await response.json();
      let textoBruto = dados.conteudo;

      const { obj, textoSemJson } = extrairJson(textoBruto);

      if (obj) {
        if (obj.mapa_cronograma) {
          const normalizado = normalizarReactFlow(obj.mapa_cronograma);
          console.log(
            "✅ Cronograma nodes:",
            normalizado.nodes.length,
            "edges:",
            normalizado.edges.length,
          );
          setDadosCronograma(normalizado);
        }
        if (obj.infografico?.length) {
          console.log("✅ Infográfico cards:", obj.infografico.length);
          setDadosInfografico(obj.infografico);
        }
      }

      const textoLimpo = limparLatex(textoSemJson);
      setResultadoHtml(marked.parse(textoLimpo));
    } catch (err) {
      console.error("❌ Erro geral:", err);
      setErrorMsg(err.message || "Erro desconhecido.");
      setErrorModal(true);
    } finally {
      setLoading(false);
    }
  };
  const imprimirPDF = async () => {
    const original = document.title;
    document.title = `ExataMente_${tema.trim().replace(/\s+/g, "_")}`;

    let imgContainer = null;

    if (mapaRef.current) {
      try {
        const canvas = await html2canvas(mapaRef.current, {
          backgroundColor: "#f9fafb",
          scale: 1.5,
          useCORS: true,
          logging: false,
        });
        const dataUrl = canvas.toDataURL("image/png");

        // Cria a imagem temporária
        const imgEl = document.createElement("img");
        imgEl.src = dataUrl;
        imgEl.style.cssText =
          "width:100%;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:16px;display:block;";
        imgEl.className = "mapa-print-img";

        imgContainer = document.createElement("div");
        imgContainer.appendChild(imgEl);
        imgContainer.style.cssText =
          "page-break-inside:avoid;margin-bottom:16px;";

        const container = document.getElementById("resultado-container");
        if (container) {
          container.insertBefore(imgContainer, container.firstChild);
        }

        // CORREÇÃO CRUCIAL: Só imprime QUANDO a imagem terminou de carregar 100% no DOM
        imgEl.onload = () => {
          window.print();
          document.title = original;
          if (imgContainer) imgContainer.remove();
        };

        return; // Interrompe para não rodar o fallback abaixo
      } catch (err) {
        console.warn("⚠️ html2canvas falhou:", err);
      }
    }

    // Fallback caso o mapa não exista ou o html2canvas dê erro catastrófico
    setTimeout(() => {
      window.print();
      document.title = original;
    }, 800);
  };

  const temResultado = resultadoHtml || dadosCronograma || dadosInfografico;

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen">
      <style>{`
        @media print {
          header, footer, form, .no-print { display: none !important; }
          #resultado-container { box-shadow: none !important; border: none !important; }
          .prose { font-size: 11px; }
          /* Esconde o ReactFlow interativo — a imagem capturada aparece no lugar */
          .react-flow__renderer,
          .react-flow__controls,
          .react-flow__background,
          .react-flow__minimap { display: none !important; }
          /* Mostra a URL dos links no PDF */
          .prose a::after { content: " (" attr(href) ")"; font-size: 9px; color: #555; }
        }
        .prose a { color: #2563eb; text-decoration: underline; }
        .prose a:hover { color: #1d4ed8; }
      `}</style>

      {/* Modal de Erro */}
      {errorModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
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
            <p className="text-gray-600 leading-relaxed mb-2">
              O servidor encontrou um problema. Tente novamente.
            </p>
            {errorMsg && (
              <p className="text-lg text-red-600 bg-red-50 rounded p-2 mb-4">
                {errorMsg}
              </p>
            )}
            <button
              onClick={() => setErrorModal(false)}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Bypass */}
      {avisoBypass && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-blue-100">
            <div className="flex items-center space-x-3 text-blue-500 mb-4">
              <span className="text-3xl">🛡️</span>
              <h3 className="text-xl font-bold text-gray-800">
                Ei, vamos aprender juntos!
              </h3>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Estou aqui para te ajudar a <strong>entender</strong> Física e
              Matemática passo a passo. Não consigo ignorar minhas regras
              pedagógicas — elas existem para que você aprenda de verdade! 📐
            </p>
            <p className="text-gray-500 text-lg  mb-6">
              Me conta qual conteúdo você quer estudar e vou te guiar com calma!
            </p>
            <button
              onClick={() => {
                setAvisoBypass(false);
                setTema("");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition"
            >
              Tudo bem, vou estudar! 🚀
            </button>
          </div>
        </div>
      )}

      <header
        className="bg-blue-600 text-white px-6 py-2 shadow-md no-print overflow-hidden"
        style={{ height: "72px" }}
      >
        <div className="container mx-auto flex items-center gap-4 h-full">
          <img
            src={logo}
            alt="Logo ExataMente"
            className="mt-12  h-58 w-auto"
          />
          <p className="text-lg mt-12 opacity-90">
            Aprenda exatas sem medo e com entusiasmo 🚀
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl mt-8">
        {/* Como funciona */}
        <section className="mb-8 bg-blue-100 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 no-print">
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            🚀 Como funciona?
          </h2>
          <p className="text-gray-600 text-lg  leading-relaxed">
            O <strong>ExataMente</strong> usa IA para gerar materiais
            personalizados com{" "}
            <strong>mapas mentais e exercícios práticos</strong>.
          </p>
        </section>

        {/* Formulário */}
        <form
          onSubmit={enviarFormulario}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 no-print"
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            O que você deseja estudar hoje?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-lg font-medium text-gray-600 mb-1">
                Seu Ano:
              </label>
              <select
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
              <label className="block text-lg font-medium text-gray-600 mb-1">
                Objetivo do Estudo:
              </label>
              <select
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
              <label className="block text-lg font-medium text-gray-600 mb-1">
                Tempo Disponível:
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 5"
                  value={tempoQtd}
                  onChange={(e) => setTempoQtd(e.target.value)}
                  required
                  className="w-1/3 p-2 border rounded-md text-center outline-none"
                />
                <select
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
            <label className="block text-lg font-medium text-gray-600 mb-1">
              Conteúdo (Ex: Lei de Ohm, Função de 2º Grau):
            </label>
            <textarea
              ref={textareaRef}
              rows={2}
              value={tema}
              onChange={handleTemaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarFormulario(e);
                }
              }}
              required
              minLength={3}
              placeholder="Digite o conteúdo aqui..."
              className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none outline-none text-base transition-all bg-gray-50 focus:bg-white"
            />
            {avisoBypass && (
              <p className="text-lg text-red-600 mt-1">
                🛡️ Entrada não permitida. Por favor, descreva um conteúdo de
                Física ou Matemática.
              </p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-semibold text-gray-700">
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
              {[
                { key: "mapa", label: "🗺️ Mapa de Cronograma" },
                { key: "resumo", label: "📝 Resumos" },
                { key: "exercicios", label: "✏️ Exercícios" },
                { key: "explicacao", label: "💡 Explicações Simplificadas" },
                { key: "cotidiano", label: "🏠 Exemplos do Cotidiano" },
                { key: "tecnologia", label: "🚀 Onde é Usado?" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center space-x-2 bg-white p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 select-none"
                >
                  <input
                    type="checkbox"
                    checked={recursos[key]}
                    onChange={() => handleCheckboxChange(key)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-lg text-gray-700 font-medium">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || avisoBypass}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "🤖 Gerando Material Personalizado..."
              : "✨ Gerar Material Personalizado"}
          </button>
        </form>

        {/* Loading */}
        {loading && (
          <div className="text-center my-8 no-print">
            <p className="text-blue-600 font-medium animate-pulse">
              🤖 A ExataMente está gerando seu material... Aguarde.
            </p>
          </div>
        )}

        {/* Resultado */}
        {temResultado && (
          <div
            id="resultado-container"
            className="mt-8 bg-white p-4 sm:p-8 rounded-lg shadow-sm border border-gray-200"
          >
            {/* Barra superior */}
            <div className="flex justify-between items-center mb-6 border-b pb-4 no-print">
              <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded">
                ✅ Material Gerado com Sucesso
              </span>
              <button
                onClick={imprimirPDF}
                className="text-lg font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition"
              >
                📥 Salvar em PDF
              </button>
            </div>

            {/* ── MAPA DE CRONOGRAMA (ReactFlow) ── */}
            {recursos.mapa &&
              dadosCronograma &&
              dadosCronograma.nodes?.length > 0 && (
                <div className="my-6">
                  <h3 className="text-lg font-bold text-gray-700 mb-3 no-print">
                    🗓️ Cronograma de Estudos Interativo
                  </h3>
                  {/* ref captura o ReactFlow para screenshot no PDF */}
                  <div ref={mapaRef}>
                    <MapaFluxo dados={dadosCronograma} />
                  </div>
                </div>
              )}

            {recursos.mapa && !dadosCronograma && !loading && (
              <div className="my-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-lg no-print">
                ⚠️ O mapa de cronograma não foi gerado nesta resposta. Tente
                novamente.
              </div>
            )}

            {/* ── CHEAT SHEET / INFOGRÁFICO ── */}
            {dadosInfografico?.length > 0 && (
              <div className="my-6">
                <h3 className="text-lg font-bold text-gray-700 mb-3">
                  📋 Resumo Visual — Cheat Sheet
                </h3>
                <CheatSheetGrid dados={dadosInfografico} />
              </div>
            )}

            {/* ── CONTEÚDO MARKDOWN COM KATEX ── */}
            {resultadoHtml && (
              <div
                id="resultado"
                className="prose max-w-none mt-6"
                dangerouslySetInnerHTML={{ __html: resultadoHtml }}
                ref={(el) => {
                  // Garante que todos os links do markdown abrem em nova aba
                  if (el) {
                    el.querySelectorAll("a").forEach((a) => {
                      a.target = "_blank";
                      a.rel = "noopener noreferrer";
                    });
                  }
                }}
              />
            )}
          </div>
        )}
      </main>

      <footer className="bg-blue-600 text-gray-400 py-8 mt-12 border-t border-gray-800 no-print">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-medium text-gray-300 mb-1">
            📐 Ferramenta desenvolvida para auxiliar alunos do Ensino Médio de
            escolas públicas a estudar exatas sem medo e com entusiasmo.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Projeto Universitário — ODS 4 (Educação de Qualidade) · BNCC
            Ciências da Natureza e Matemática · Análise e Desenvolvimento de
            Sistemas — USF
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 mt-4 text-sm">
            <a
              href="mailto:aline.lima.souza@mail.usf.edu.br"
              className="hover:text-blue-400 transition-colors"
            >
              ✉️ Aline: aline.lima.souza@mail.usf.edu.br
            </a>
            <span className="hidden md:inline text-gray-600">|</span>
            <a
              href="mailto:Miryan.moreira@mail.usf.edu.br"
              className="hover:text-blue-400 transition-colors"
            >
              ✉️ Miryan: Miryan.moreira@mail.usf.edu.br
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
