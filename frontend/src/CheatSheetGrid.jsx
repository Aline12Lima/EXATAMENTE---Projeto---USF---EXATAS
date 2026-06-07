import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const CORES = {
  blue: {
    header: "#1a56a0",
    headerText: "#ffffff",
    fundo: "#e8f1fb",
    texto: "#0c3060",
    borda: "#1a56a0",
  },
  red: {
    header: "#b91c1c",
    headerText: "#ffffff",
    fundo: "#fef2f2",
    texto: "#7f1d1d",
    borda: "#b91c1c",
  },
  green: {
    header: "#166534",
    headerText: "#ffffff",
    fundo: "#f0fdf4",
    texto: "#14532d",
    borda: "#166534",
  },
  purple: {
    header: "#5b21b6",
    headerText: "#ffffff",
    fundo: "#f5f3ff",
    texto: "#3730a3",
    borda: "#5b21b6",
  },
  orange: {
    header: "#92400e",
    headerText: "#ffffff",
    fundo: "#fffbeb",
    texto: "#78350f",
    borda: "#92400e",
  },
};

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
        fontSize: "0.85em",
        padding: "2px 0",
      }}
    />
  );
}

function CheatCard({ secao, index }) {
  const cor = CORES[secao.cor] ?? CORES.blue;

  return (
    <div
      className="csq-card"
      style={{
        border: `2px solid ${cor.borda}`,
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 6px rgba(0,0,0,0.10)",
        display: "flex",
        flexDirection: "column",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      {/* Cabeçalho colorido */}
      <div
        style={{
          backgroundColor: cor.header,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            color: cor.headerText,
            fontSize: "11px",
            fontWeight: 800,
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <span
          style={{
            color: cor.headerText,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            lineHeight: 1.3,
          }}
        >
          {secao.titulo.replace(/^\d+\.\s*/, "")}
        </span>
      </div>

      {/* Conteúdo */}
      <div
        style={{
          backgroundColor: cor.fundo,
          padding: "10px 12px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
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
                color: cor.texto,
              }}
            >
              {item.valor}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

export default function CheatSheetGrid({ dados, titulo }) {
  if (!dados?.length) return null;

  return (
    <div className="csq-wrapper">
      <style>{`
        @media print {
          .csq-wrapper { page-break-inside: avoid; }
          .csq-titulo-banner {
            background: #1e293b !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .csq-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
          }
          .csq-card { break-inside: avoid !important; page-break-inside: avoid !important; }
          .csq-card > div:first-child {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .csq-card p { font-size: 10px !important; }
        }
        .csq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        @media (max-width: 640px) {
          .csq-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        @media (min-width: 900px) {
          .csq-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      {/* Banner de título */}
      <div
        className="csq-titulo-banner"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "10px 10px 0 0",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <h2
            style={{
              color: "#f1f5f9",
              fontSize: "18px",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {titulo || "📋 Resumo Visual — Cheat Sheet"}
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              margin: "3px 0 0",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Fórmulas essenciais · Conceitos · Exemplos
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {dados.slice(0, 4).map((s, i) => (
            <span
              key={i}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "#cbd5e1",
                fontSize: "10px",
                padding: "3px 8px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {s.titulo.replace(/^\d+\.\s*/, "")}
            </span>
          ))}
        </div>
      </div>

      {/* Grid de cards */}
      <div
        className="csq-grid"
        style={{
          padding: "12px",
          backgroundColor: "#f8fafc",
          border: "2px solid #1e293b",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
        }}
      >
        {dados.map((secao, idx) => (
          <CheatCard key={idx} secao={secao} index={idx} />
        ))}
      </div>
    </div>
  );
}
