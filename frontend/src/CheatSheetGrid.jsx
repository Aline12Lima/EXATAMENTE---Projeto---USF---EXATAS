import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const CORES = {
  blue: {
    borda: "#185FA5",
    fundo: "#E6F1FB",
    titulo: "#0C447C",
    badge: "#B5D4F4",
  },
  red: {
    borda: "#A32D2D",
    fundo: "#FCEBEB",
    titulo: "#791F1F",
    badge: "#F7C1C1",
  },
  green: {
    borda: "#3B6D11",
    fundo: "#EAF3DE",
    titulo: "#27500A",
    badge: "#C0DD97",
  },
  purple: {
    borda: "#534AB7",
    fundo: "#EEEDFE",
    titulo: "#3C3489",
    badge: "#CECBF6",
  },
  orange: {
    borda: "#854F0B",
    fundo: "#FAEEDA",
    titulo: "#633806",
    badge: "#FAC775",
  },
};

// Renderiza LaTeX puro (sem delimitadores $) usando katex diretamente no DOM
function ItemLatex({ valor }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !valor) return;
    try {
      katex.render(String(valor), ref.current, {
        throwOnError: false,
        displayMode: true,
        output: "html",
        trust: false,
      });
    } catch {
      // Se o KaTeX falhar, mostra o valor bruto como texto
      ref.current.textContent = valor;
    }
  }, [valor]);

  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        margin: "6px 0",
        overflowX: "auto",
        fontSize: "0.9em",
      }}
    />
  );
}

export default function CheatSheetGrid({ dados }) {
  if (!dados?.length) return null;

  return (
    <>
      {/* Estilos de impressão: força 3 colunas no PDF */}
      <style>{`
        @media print {
          .csq-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          .csq-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .katex { font-size: 0.8em !important; }
        }
      `}</style>

      <div
        className="csq-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "12px",
          padding: "4px 0 16px",
        }}
      >
        {dados.map((secao, idx) => {
          const cor = CORES[secao.cor] ?? CORES.blue;
          return (
            <div
              key={idx}
              className="csq-card"
              style={{
                borderLeft: `4px solid ${cor.borda}`,
                backgroundColor: cor.fundo,
                borderRadius: "0 8px 8px 0",
                padding: "12px 14px",
                boxSizing: "border-box",
              }}
            >
              {/* Badge com título */}
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: cor.badge,
                  color: cor.titulo,
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  marginBottom: "10px",
                }}
              >
                {secao.titulo}
              </div>

              {/* Itens do card */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {(secao.conteudo ?? []).map((item, i) =>
                  item.tipo === "latex" ? (
                    <ItemLatex key={i} valor={item.valor} />
                  ) : (
                    <p
                      key={i}
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: 1.55,
                        color: cor.titulo,
                      }}
                    >
                      {item.valor}
                    </p>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
