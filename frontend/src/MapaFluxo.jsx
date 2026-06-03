import { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

// Componente que desenha o motor na tela
function Flow({ dados }) {
  // 🌟 Injetamos os dados diretamente no estado inicial para não haver atraso!
  const [nodes, setNodes, onNodesChange] = useNodesState(dados?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(dados?.edges || []);

  // Garantia: se o usuário gerar outro tema, ele atualiza as caixas
  useEffect(() => {
    if (dados?.nodes && dados?.edges) {
      setNodes(dados.nodes);
      setEdges(dados.edges);
    }
  }, [dados, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      style={{ width: "100%", height: "100%" }} // 🌟 FORÇA O COMPONENTE A OCUPAR O ESPAÇO
    >
      <Background color="#aaa" gap={16} />
      <Controls />
    </ReactFlow>
  );
}

export default function MapaFluxo({ dados }) {
  // Trava de segurança: se a IA não mandar os nós direito, exibe um aviso em vez de tela branca
  if (!dados || !dados.nodes || !dados.edges) {
    return (
      <p className="p-4 text-red-500 font-medium">
        Os dados do mapa não foram gerados corretamente.
      </p>
    );
  }

  return (
    // 🌟 CSS INLINE: Força bruta com 500px de altura. O React Flow não tem como escapar agora!
    <div
      style={{
        width: "100%",
        height: "500px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        backgroundColor: "#f9fafb",
        position: "relative",
      }}
    >
      <ReactFlowProvider>
        <Flow dados={dados} />
      </ReactFlowProvider>
    </div>
  );
}
