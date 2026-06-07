import { useState, useRef, useEffect } from "react";

import markedKatex from "marked-katex-extension";
import { marked } from "marked";
import MapaFluxo from "./MapaFluxo";
import CheatSheetGrid from "./CheatSheetGrid";
import "katex/dist/katex.min.css";
import logo from "../public/logo.png";

marked.use({ gfm: true, breaks: true });
marked.use(
  markedKatex({
    throwOnError: false,
    nonStandard: true,
    output: "html",
  }),
);

const STORAGE_KEY = "exatamente_ultimo_resultado";

const normalizarReactFlow = (mapa) => {
  if (!mapa) return null;
  const todos = mapa.nodes || [];
  const nosReais = todos.filter((n) => !n.source && !n.target);
  const setasPerdidas = todos.filter((n) => n.source && n.target);
  const edges = [...(mapa.edges || []), ...setasPerdidas];
  return { nodes: nosReais, edges };
};

const extrairJson = (texto) => {
  // Sanitiza: dentro de strings JSON, escapa quebras de linha literais
  const sanitizarJson = (raw) => {
    let resultado = "";
    let dentroDeString = false;
    let escapando = false;

    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];

      if (escapando) {
        resultado += c;
        escapando = false;
        continue;
      }

      if (c === "\\" && dentroDeString) {
        resultado += c;
        escapando = true;
        continue;
      }

      if (c === '"') {
        dentroDeString = !dentroDeString;
        resultado += c;
        continue;
      }

      // Dentro de string: escapa quebras de linha e tabs literais
      if (dentroDeString) {
        if (c === "\n") {
          resultado += "\\n";
          continue;
        }
        if (c === "\r") {
          resultado += "\\r";
          continue;
        }
        if (c === "\t") {
          resultado += "\\t";
          continue;
        }
      }

      resultado += c;
    }

    // Remove vírgulas extras antes de } ou ]
    return resultado.replace(/,(\s*[}\]])/g, "$1");
  };

  const tentarParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      try {
        return JSON.parse(sanitizarJson(str));
      } catch (e) {
        console.warn("⚠️ Parse falhou:", e.message);
        return null;
      }
    }
  };

  // Tentativa 1: bloco ```json...```
  const regexBloco = /```json\s*([\s\S]*?)\s*```/;
  const matchBloco = texto.match(regexBloco);
  if (matchBloco?.[1]) {
    const obj = tentarParse(matchBloco[1].trim());
    if (obj) {
      return { obj, textoSemJson: texto.replace(regexBloco, "") };
    }
  }

  // Tentativa 2: bloco ``` genérico
  const regexBlocoGenerico = /```\s*(\{[\s\S]*?\})\s*```/;
  const matchGenerico = texto.match(regexBlocoGenerico);
  if (matchGenerico?.[1]) {
    const obj = tentarParse(matchGenerico[1].trim());
    if (obj) {
      return { obj, textoSemJson: texto.replace(regexBlocoGenerico, "") };
    }
  }

  // Tentativa 3: JSON nu — varre balanceando chaves, ignorando o que está dentro de strings
  const inicioJson = texto.search(/\{\s*"(?:mapa_cronograma|infografico)"/);
  if (inicioJson !== -1) {
    let nivel = 0;
    let fim = -1;
    let dentroDeString = false;
    let escapando = false;

    for (let i = inicioJson; i < texto.length; i++) {
      const c = texto[i];

      if (escapando) {
        escapando = false;
        continue;
      }
      if (c === "\\" && dentroDeString) {
        escapando = true;
        continue;
      }
      if (c === '"') {
        dentroDeString = !dentroDeString;
        continue;
      }
      if (dentroDeString) continue;

      if (c === "{") nivel++;
      else if (c === "}") {
        nivel--;
        if (nivel === 0) {
          fim = i + 1;
          break;
        }
      }
    }

    if (fim > inicioJson) {
      const jsonCru = texto.slice(inicioJson, fim);
      const obj = tentarParse(jsonCru);
      if (obj) {
        return {
          obj,
          textoSemJson: texto.slice(0, inicioJson) + texto.slice(fim),
        };
      }
    }
  }

  console.warn("⚠️ Nenhum JSON válido encontrado no retorno da IA");
  return { obj: null, textoSemJson: texto };
};
const limparLatex = (texto) =>
  texto
    .replace(/\\\[/g, "\n\n$$\n\n")
    .replace(/\\\]/g, "\n\n$$\n\n")
    .replace(/\\\(/g, " $")
    .replace(/\\\)/g, "$ ")
    .replace(/\\\$/g, "$");

const processarLinksYoutube = (html) => {
  // 1. Converte URLs do YouTube soltas em links clicáveis
  let resultado = html.replace(
    /(?<!['"=>])(https?:\/\/(?:www\.)?youtube\.com\/[^\s<"']+)/g,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">${url}</a>`,
  );

  // 2. Garante target="_blank" em TODOS os <a> que o marked gerou a partir de [texto](url)
  //    (regex casa tags <a> que ainda não tenham target)
  resultado = resultado.replace(
    /<a\s+(?![^>]*\btarget=)([^>]*?)>/gi,
    '<a $1 target="_blank" rel="noopener noreferrer">',
  );

  return resultado;
};
const PADROES_BYPASS = [
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

const detectarBypass = (texto) => PADROES_BYPASS.some((p) => p.test(texto));

// ── Salva no localStorage ──
const salvarNoStorage = (dados) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch {
    // localStorage cheio ou bloqueado — ignora silenciosamente
  }
};

// ── Lê do localStorage ──
const lerDoStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Limpa localStorage ──
const limparStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
};

export default function App() {
  const salvoInicial = lerDoStorage();

  const [tema, setTema] = useState(salvoInicial?.tema || "");
  const [ano, setAno] = useState(salvoInicial?.ano || "");
  const [objetivo, setObjetivo] = useState(salvoInicial?.objetivo || "");
  const [tempoQtd, setTempoQtd] = useState(salvoInicial?.tempoQtd || "");
  const [tempoTipo, setTempoTipo] = useState(salvoInicial?.tempoTipo || "Dias");
  const [avisoBypass, setAvisoBypass] = useState(false);
  const [recursos, setRecursos] = useState(
    salvoInicial?.recursos || {
      mapa: false,
      resumo: false,
      exercicios: false,
      explicacao: false,
      cotidiano: false,
      tecnologia: false,
    },
  );
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultadoHtml, setResultadoHtml] = useState(
    salvoInicial?.resultadoHtml || "",
  );
  const [dadosCronograma, setDadosCronograma] = useState(
    salvoInicial?.dadosCronograma || null,
  );
  const [dadosInfografico, setDadosInfografico] = useState(
    salvoInicial?.dadosInfografico || null,
  );
  const [temSalvo, setTemSalvo] = useState(!!salvoInicial);

  const textareaRef = useRef(null);
  const mapaRef = useRef(null);
  const abortRef = useRef(null);

  // ── Abre links em nova aba quando conteúdo muda ──
  useEffect(() => {
    const el = document.getElementById("resultado");
    if (!el) return;
    el.querySelectorAll("a").forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
  }, [resultadoHtml]);

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

  const handleTemaChange = (e) => {
    const valor = e.target.value;
    if (detectarBypass(valor)) {
      setAvisoBypass(true);
      return;
    }
    setAvisoBypass(false);
    setTema(valor);
    e.target.style.height = "inherit";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // ── CANCELAR geração ──
  const cancelarGeracao = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  };

  const enviarFormulario = async (e) => {
    if (e) e.preventDefault();
    if (detectarBypass(tema)) {
      setAvisoBypass(true);
      return;
    }
    if (!Object.values(recursos).some(Boolean)) {
      alert("Selecione pelo menos um recurso!");
      return;
    }

    // Cria novo AbortController para esta requisição
    abortRef.current = new AbortController();

    setLoading(true);
    setResultadoHtml("");
    setDadosCronograma(null);
    setDadosInfografico(null);
    setAvisoBypass(false);
    setTemSalvo(false);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/gerar-conteudo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal, // vincula o cancelamento
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
      const { obj, textoSemJson } = extrairJson(dados.conteudo);

      let cronograma = null;
      let infografico = null;

      if (obj) {
        if (obj.mapa_cronograma)
          cronograma = normalizarReactFlow(obj.mapa_cronograma);
        if (obj.infografico?.length) infografico = obj.infografico;
      }

      const htmlGerado = processarLinksYoutube(
        marked.parse(limparLatex(textoSemJson)),
      );

      setDadosCronograma(cronograma);
      setDadosInfografico(infografico);
      setResultadoHtml(htmlGerado);

      // ── Salva tudo no localStorage ──
      salvarNoStorage({
        tema: tema.trim(),
        ano,
        objetivo,
        tempoQtd,
        tempoTipo,
        recursos,
        resultadoHtml: htmlGerado,
        dadosCronograma: cronograma,
        dadosInfografico: infografico,
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.name === "AbortError") {
        // Cancelado pelo usuário — não mostra erro
        console.log("🛑 Geração cancelada pelo usuário.");
        return;
      }
      console.error("❌", err);
      setErrorMsg(err.message || "Erro desconhecido.");
      setErrorModal(true);
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  // ── Limpar resultado salvo ──
  const limparResultado = () => {
    limparStorage();
    setResultadoHtml("");
    setDadosCronograma(null);
    setDadosInfografico(null);
    setTema("");
    setAno("");
    setObjetivo("");
    setTempoQtd("");
    setTemSalvo(false);
    setRecursos({
      mapa: false,
      resumo: false,
      exercicios: false,
      explicacao: false,
      cotidiano: false,
      tecnologia: false,
    });
  };

  const imprimirPDF = () => {
    const original = document.title;
    document.title = `ExataMente_${tema.trim().replace(/\s+/g, "_")}`;
    setTimeout(() => {
      window.print();
      document.title = original;
    }, 300);
  };
  const temResultado = resultadoHtml || dadosCronograma || dadosInfografico;

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen">
      <style>{`
        /* ── ESTILOS DO GRID DE CRONOGRAMA NO PDF ── */
        .cronograma-print-grid {
          display: none;
        }
        .cronograma-print-card {
          border: 2px solid #1e40af;
          border-radius: 8px;
          padding: 12px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .cronograma-print-titulo {
          font-size: 13px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .cronograma-print-desc {
          font-size: 11px;
          color: #1e40af;
          line-height: 1.4;
        }

        @media print {
          header, footer, form, .no-print { display: none !important; }
          #resultado-container { box-shadow: none !important; border: none !important; }
          .prose { font-size: 11px; }

          /* Mostra o grid de cronograma e esconde o ReactFlow */
          .cronograma-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 12px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cronograma-print-card {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Cheat Sheet — 4 colunas */
          .csq-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
          }
          .csq-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .csq-card > div:first-child,
          .csq-titulo-banner {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .katex { font-size: 0.7em !important; }
          .csq-card p { font-size: 10px !important; }

          /* Esconde completamente o ReactFlow */
          .react-flow__renderer,
          .react-flow__controls,
          .react-flow__background,
          .react-flow__minimap { display: none !important; }
        }
         .prose a { color: #2563eb; text-decoration: underline; }
        .prose a:hover { color: #1d4ed8; }
      `}</style>

      {/* Modal de Erro */}
      {errorModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
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
            <p className="text-gray-600 mb-2">
              O servidor encontrou um problema. Tente novamente.
            </p>
            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">
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
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">🛡️</span>
              <h3 className="text-xl font-bold text-gray-800">
                Ei, vamos aprender juntos!
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Estou aqui para te ajudar a <strong>entender</strong> Física e
              Matemática passo a passo. Minhas regras pedagógicas existem para
              que você aprenda de verdade! 📐
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
          <img src={logo} alt="Logo ExataMente" className="mt-12 h-48 w-auto" />
          <p className="text-sm mt-12 opacity-90">
            Aprenda exatas sem medo e com entusiasmo 🚀
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl mt-8">
        <section className="mb-8 bg-blue-100 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 no-print">
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            🚀 Como funciona?
          </h2>
          <p className="text-gray-600 leading-relaxed">
            O <strong>ExataMente</strong> usa IA para gerar materiais
            personalizados com{" "}
            <strong>mapas visuais, cheat sheets e exercícios práticos</strong>.
          </p>
        </section>

        {/* Banner de resultado salvo */}
        {temSalvo && !loading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between no-print">
            <span className="text-sm text-blue-700 font-medium">
              💾 Seu último material foi restaurado automaticamente.
            </span>
            <button
              onClick={limparResultado}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg transition"
            >
              🗑️ Limpar
            </button>
          </div>
        )}

        <form
          onSubmit={enviarFormulario}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 no-print"
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
                Objetivo:
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
              <label className="block text-sm font-medium text-gray-600 mb-1">
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
            <label className="block text-sm font-medium text-gray-600 mb-1">
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
              <p className="text-sm text-red-600 mt-1">
                🛡️ Entrada não permitida. Descreva um conteúdo de Física ou
                Matemática.
              </p>
            )}
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Escolha o que incluir no material:
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
                { key: "resumo", label: "📝 Resumo Didático" },
                { key: "exercicios", label: "✏️ Exercícios (2)" },
                { key: "explicacao", label: "💡 Explicação Simplificada" },
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
                  <span className="text-sm text-gray-700 font-medium">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Botão gerar ou cancelar */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || avisoBypass}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "🤖 Gerando seu material em até 60s..."
                : "✨ Gerar Material Personalizado"}
            </button>

            {loading && (
              <button
                type="button"
                onClick={cancelarGeracao}
                className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition shadow"
              >
                🛑 Cancelar
              </button>
            )}
          </div>
        </form>

        {loading && (
          <div className="text-center my-8 no-print">
            <p className="text-blue-600 font-medium animate-pulse">
              🤖 A ExataMente está gerando seu material... Aguarde.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Isso pode levar alguns segundos. Você pode cancelar a qualquer
              momento.
            </p>
          </div>
        )}

        {temResultado && (
          <div
            id="resultado-container"
            className="mt-8 bg-white p-4 sm:p-8 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4 no-print">
              <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded">
                ✅ Material Gerado com Sucesso
              </span>
              <div className="flex gap-2">
                <button
                  onClick={limparResultado}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                >
                  🗑️ Limpar
                </button>
                <button
                  onClick={imprimirPDF}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition"
                >
                  📥 Salvar em PDF
                </button>
              </div>
            </div>

            {/* ── MAPA DE CRONOGRAMA ── */}
            {/* ── MAPA DE CRONOGRAMA ── */}
            {recursos.mapa &&
              dadosCronograma &&
              dadosCronograma.nodes?.length > 0 && (
                <div className="my-6">
                  <h3 className="text-lg font-bold text-gray-700 mb-3">
                    🗓️ Cronograma de Estudos
                  </h3>

                  {/* ReactFlow interativo — só na tela */}
                  <div ref={mapaRef} className="no-print">
                    <MapaFluxo dados={dadosCronograma} />
                  </div>

                  {/* Grid de cards do cronograma — só no PDF */}
                  <div className="cronograma-print-grid">
                    {dadosCronograma.nodes.map((node, idx) => {
                      const label = node.data?.label || "";
                      const [titulo, ...desc] = label.split("\n");
                      return (
                        <div
                          key={node.id || idx}
                          className="cronograma-print-card"
                        >
                          <div className="cronograma-print-titulo">
                            {titulo}
                          </div>
                          {desc.length > 0 && (
                            <div className="cronograma-print-desc">
                              {desc.join(" • ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* ── CHEAT SHEET ── */}
            {dadosInfografico?.length > 0 && (
              <div className="my-6">
                <CheatSheetGrid
                  dados={dadosInfografico}
                  titulo={`${tema} — Resumo Visual`}
                />
              </div>
            )}

            {!dadosInfografico && !loading && temResultado && (
              <div className="my-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm no-print">
                ⚠️ O resumo visual não foi gerado. Tente novamente com menos
                seções marcadas.
              </div>
            )}

            {/* ── CONTEÚDO MARKDOWN ── */}
            {resultadoHtml && (
              <div
                id="resultado"
                className="prose max-w-none mt-6"
                dangerouslySetInnerHTML={{ __html: resultadoHtml }}
              />
            )}
          </div>
        )}
      </main>

      <footer className="bg-blue-600 text-gray-400 py-8 mt-12 border-t border-gray-800 no-print">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-medium text-gray-300 mb-1">
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
