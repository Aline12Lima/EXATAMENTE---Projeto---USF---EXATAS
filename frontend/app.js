// Captura o evento de envio do formulário (Botão Gerar ou tecla Enter)
function gerenciarEnvio(event) {
  event.preventDefault(); // Impede a página de recarregar
  solicitarConteudo();
}

// Escuta a tecla Enter no Textarea
document.getElementById("tema").addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // Impede o pulo de linha
    document.getElementById("formulario-estudos").requestSubmit(); // Envia o form
  }
});

// Controla o botão Selecionar Tudo
function marcarTodosCheckboxes() {
  const checkboxes = document.querySelectorAll(".chk-recurso");
  const todosMarcados = Array.from(checkboxes).every((chk) => chk.checked);
  checkboxes.forEach((chk) => (chk.checked = !todosMarcados));
}

async function solicitarConteudo() {
  const temaInput = document.getElementById("tema").value;
  const anoSelect = document.getElementById("ano").value;
  const objetivoSelect = document.getElementById("objetivo").value;

  // Captura e monta o tempo dinamicamente
  const tempoQtd = document.getElementById("tempo-qtd").value;
  const tempoTipo = document.getElementById("tempo-tipo").value;
  const tempoTextoFinal = `${tempoQtd} ${tempoTipo}`;

  // Captura quais recursos foram selecionados
  const incluirMapa = document.getElementById("chk-mapa").checked;
  const incluirResumo = document.getElementById("chk-resumo").checked;
  const incluirExercicios = document.getElementById("chk-exercicios").checked;
  const incluirExplicacao = document.getElementById("chk-explicacao").checked;
  const incluirCotidiano = document.getElementById("chk-cotidiano").checked;
  const incluirTecnologia = document.getElementById("chk-tecnologia").checked;

  // Validação dos Checkboxes
  if (
    !incluirMapa &&
    !incluirResumo &&
    !incluirExercicios &&
    !incluirExplicacao &&
    !incluirCotidiano &&
    !incluirTecnologia
  ) {
    alert(
      "Por favor, selecione pelo menos um recurso para incluir no seu material de estudo!",
    );
    return;
  }

  const loading = document.getElementById("loading");
  const resultadoContainer = document.getElementById("resultado-container");
  const resultadoDiv = document.getElementById("resultado");
  const btnGerar = document.getElementById("btn-gerar");

  // Bloqueia a tela durante o carregamento
  btnGerar.disabled = true;
  loading.classList.remove("hidden");
  resultadoContainer.classList.add("hidden");

  try {
    const response = await fetch("http://127.0.0.1:8000/gerar-conteudo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tema: temaInput.trim(),
        ano: anoSelect,
        objetivo: objetivoSelect,
        tempo: tempoTextoFinal,
        mapa: incluirMapa,
        resumo: incluirResumo,
        exercicios: incluirExercicios,
        explicacao: incluirExplicacao,
        cotidiano: incluirCotidiano,
        tecnologia: incluirTecnologia,
      }),
    });

    if (!response.ok) {
      throw new Error("Erro na resposta do servidor.");
    }

    const dados = await response.json();

    // 1. Converte o Markdown em HTML básico
    let htmlConvertido = marked.parse(dados.conteudo);

    // ✨ CORREÇÃO CRUCIAL: Transforma os blocos de código do Mermaid em divs interpretáveis
    if (incluirMapa) {
      htmlConvertido = htmlConvertido
        .replace(
          /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
          '<div class="mermaid">$1</div>',
        )
        .replace(
          /<pre><code class="mermaid">([\s\S]*?)<\/code><\/pre>/g,
          '<div class="mermaid">$1</div>',
        );
    }

    // Injeta o HTML corrigido na tela
    resultadoDiv.innerHTML = htmlConvertido;
    resultadoContainer.classList.remove("hidden");

    // 2. Executa o desenho do gráfico
    if (incluirMapa) {
      try {
        resultadoDiv.querySelectorAll(".mermaid").forEach((el) => {
          el.removeAttribute("data-processed");
        });

        mermaid.initialize({ startOnLoad: false, theme: "default" });
        await mermaid.run();
      } catch (errMermaid) {
        console.error("Erro ao desenhar o mapa visual:", errMermaid);
      }
    }

    // Reseta a altura da caixa de texto do input
    document.getElementById("tema").style.height = "inherit";
  } catch (erro) {
    console.error("Erro na requisição:", erro.message);
    document.getElementById("error-modal").classList.remove("hidden");
  } finally {
    // Esconde o loading e libera o botão
    loading.classList.add("hidden");
    btnGerar.disabled = false;
  }
}

function fecharModalErro() {
  document.getElementById("error-modal").classList.add("hidden");
}

function autoExpand(campo) {
  campo.style.height = "inherit";
  const altura = campo.scrollHeight;
  campo.style.height = altura + "px";
}
