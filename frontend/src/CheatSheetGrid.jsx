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
        fleqn: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = valor;
    }
  }, [valor]);

  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        margin: "4px 0",
        overflowX: "auto",
        overflowY: "hidden",
        fontSize: "0.82em",
        padding: "2px 4px",
        maxWidth: "100%",
        wordBreak: "keep-all",
      }}
    />
  );
}

function CheatCard({ card }) {
  const cor = CORES[card.cor] ?? CORES.blue;
  const largo = card.tamanho === "largo";

  return (
    <div
      className={`csq-card${largo ? " csq-card-largo" : ""}`}
      style={{
        border: `2px solid ${cor.borda}`,
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        display: "flex",
        flexDirection: "column",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          backgroundColor: cor.header,
          padding: "7px 12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            color: cor.headerText,
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            lineHeight: 1.3,
          }}
        >
          {card.titulo}
        </span>
      </div>

      <div
        style={{
          backgroundColor: cor.fundo,
          padding: "10px 12px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {(card.itens ?? []).map((item, i) =>
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
                wordBreak: "break-word",
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

function CardGrid({ cards }) {
  if (!cards?.length) return null;
  return (
    <div className="csq-grid">
      {cards.map((card, idx) => (
        <CheatCard key={idx} card={card} />
      ))}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div
      style={{
        fontSize: "13px",
        fontWeight: 700,
        color: "#1e293b",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderBottom: "2px solid #cbd5e1",
        paddingBottom: "6px",
        marginBottom: "10px",
        marginTop: "4px",
      }}
    >
      {text}
    </div>
  );
}

function MainBanner({ titulo }) {
  return (
    <div
      className="csq-titulo-banner"
      style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: "10px 10px 0 0",
        padding: "14px 20px",
      }}
    >
      <h2
        style={{
          color: "#f1f5f9",
          fontSize: "16px",
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
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Fórmulas · Conceitos · Exemplos · Exercícios
      </p>
    </div>
  );
}

export default function CheatSheetGrid({ dados, titulo }) {
  const isNovoFormato =
    dados &&
    typeof dados === "object" &&
    !Array.isArray(dados) &&
    (dados.resumo_visual || dados.topicos || dados.exercicios_visuais);

  const isLegado = Array.isArray(dados);

  if (!isNovoFormato && !isLegado) return null;

  const css = `
    .csq-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      align-items: start;
    }
    .csq-card-largo {
      grid-column: span 2;
    }
    @media (max-width: 900px) {
      .csq-grid { grid-template-columns: repeat(2, 1fr); }
      .csq-card-largo { grid-column: span 2; }
    }
    @media (max-width: 500px) {
      .csq-grid { grid-template-columns: 1fr; }
      .csq-card-largo { grid-column: span 1; }
    }
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
        align-items: start !important;
      }
      .csq-card-largo { grid-column: span 2 !important; }
      .csq-card { break-inside: avoid !important; page-break-inside: avoid !important; }
      .csq-card > div:first-child {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .csq-card p { font-size: 10px !important; }
    }
  `;

  if (isLegado) {
    const cardsLegado = dados.map((s) => ({
      titulo: s.titulo,
      cor: s.cor,
      tamanho: "normal",
      itens: (s.conteudo ?? []).map((c) => ({ tipo: c.tipo, valor: c.valor })),
    }));

    return (
      <div className="csq-wrapper">
        <style>{css}</style>
        <MainBanner titulo={titulo} />
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f8fafc",
            border: "2px solid #1e293b",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
          }}
        >
          <CardGrid cards={cardsLegado} />
        </div>
      </div>
    );
  }

  const { resumo_visual, topicos, exercicios_visuais } = dados;

  return (
    <div className="csq-wrapper">
      <style>{css}</style>
      <MainBanner titulo={titulo} />
      <div
        style={{
          padding: "16px",
          backgroundColor: "#f8fafc",
          border: "2px solid #1e293b",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
        }}
      >
        {resumo_visual?.cards?.length > 0 && (
          <>
            <SectionLabel text="📋 Resumo Visual" />
            <CardGrid cards={resumo_visual.cards} />
          </>
        )}

        {topicos?.map((topico, ti) => (
          <div key={ti} style={{ marginTop: "20px" }}>
            <SectionLabel text={`📂 ${topico.titulo}`} />
            <CardGrid cards={topico.cards} />
          </div>
        ))}

        {exercicios_visuais?.cards?.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <SectionLabel text="✏️ Exercícios" />
            <CardGrid cards={exercicios_visuais.cards} />
          </div>
        )}
      </div>
    </div>
  );
}
