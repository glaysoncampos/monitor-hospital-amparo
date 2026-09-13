// URL do CSV publicado do Google Sheets (aba "itens")
const URL_ITENS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT5FfiU8KTcOhODPVFs281zU8BEknbto_VScPM82-X7vfsJq8iHyV3dteiTGze0Y7zRnTTV9ZBc8SuN/pub?gid=1764978900&single=true&output=csv";

// Converte texto CSV em lista de objetos
function parseCSV(texto) {
  const linhas = texto.trim().split("\n");
  const cabecalho = linhas[0].split(",");
  return linhas.slice(1).map(linha => {
    // Quebra por vírgula respeitando aspas
    const valores = [];
    let atual = "";
    let dentroAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') { dentroAspas = !dentroAspas; }
      else if (c === "," && !dentroAspas) { valores.push(atual); atual = ""; }
      else { atual += c; }
    }
    valores.push(atual);

    const obj = {};
    cabecalho.forEach((col, i) => obj[col.trim()] = (valores[i] || "").trim());
    return obj;
  });
}

// Formata número como moeda brasileira
function formatarMoeda(valor) {
  if (!valor || valor === "0") return "—";
  const numero = parseFloat(valor.replace(",", "."));
  if (isNaN(numero)) return valor;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Define a classe do badge pela classificação
function classeBadge(classificacao) {
  const c = (classificacao || "").toLowerCase();
  if (c.includes("glosa")) return "badge-glosa";
  if (c.includes("estimativa")) return "badge-estimativa";
  if (c.includes("represado")) return "badge-represado";
  if (c.includes("passivo")) return "badge-passivo";
  return "badge-neutro";
}

// Preenche a tabela com os itens do CSV
function preencherTabela(itens) {
  const corpo = document.getElementById("corpo-tabela");
  corpo.innerHTML = "";

  itens.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.item}</strong></td>
      <td>${item.titulo}</td>
      <td>${formatarMoeda(item.valor)}</td>
      <td><span class="badge ${classeBadge(item.classificacao)}">${item.classificacao}</span></td>
      <td>${item.setor}</td>
    `;
    corpo.appendChild(tr);
  });
}

// Carrega o CSV e chama as funções de montagem
async function carregarDados() {
  try {
    const resposta = await fetch(URL_ITENS);
    const texto = await resposta.text();
    const itens = parseCSV(texto);
    preencherTabela(itens);
    console.log("Itens carregados:", itens);
  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
    document.getElementById("corpo-tabela").innerHTML =
      `<tr><td colspan="5">Erro ao carregar dados. Verifique o console.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", carregarDados);
// ============================================================
// GRÁFICOS — leem da aba "competencias" da planilha
// ============================================================

const URL_COMPETENCIAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT5FfiU8KTcOhODPVFs281zU8BEknbto_VScPM82-X7vfsJq8iHyV3dteiTGze0Y7zRnTTV9ZBc8SuN/pub?gid=1057235421&single=true&output=csv";

// Cores da paleta JAVA
const CORES = {
  vinho: "#7A0C0D",
  vinhoClaro: "rgba(122, 12, 13, 0.15)",
  alerta: "#D97706",
  alertaClaro: "rgba(217, 119, 6, 0.15)",
  sucesso: "#16A34A",
  sucessoClaro: "rgba(22, 163, 74, 0.15)",
  info: "#2563EB",
  infoClaro: "rgba(37, 99, 235, 0.15)",
  cinza: "#5A5A5A"
};

// Converte número (vírgula → ponto) com segurança
function numeroBR(valor) {
  if (!valor || valor === "") return 0;
  // Remove aspas, troca vírgula por ponto
  const limpo = String(valor).replace(/"/g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
}

// Pega o valor de uma linha do CSV tentando vários nomes de coluna
function pegarValor(linha, ...nomes) {
  for (const nome of nomes) {
    if (linha[nome] !== undefined && linha[nome] !== "") return linha[nome];
  }
  return "";
}

// Desenha um gráfico genérico
function criarGrafico(canvasId, tipo, labels, dados, cor, corFundo, sufixo = "") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  new Chart(ctx, {
    type: tipo,
    data: {
      labels: labels,
      datasets: [{
        data: dados,
        backgroundColor: corFundo,
        borderColor: cor,
        borderWidth: 2,
        tension: 0.3,
        fill: tipo === "line"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const v = context.parsed.y ?? context.parsed;
              return v.toLocaleString("pt-BR") + sufixo;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => v.toLocaleString("pt-BR") + sufixo
          }
        }
      }
    }
  });
}

// Carrega os dados e cria os 4 gráficos
async function carregarGraficos() {
  try {
    const resposta = await fetch(URL_COMPETENCIAS);
    const texto = await resposta.text();
    const linhas = parseCSV(texto);

    // Eixo X = meses formatados
    const labels = linhas.map(l => {
      const mesRaw = pegarValor(l, "mes", "Mês");
      if (!mesRaw) return "";
      const [ano, mes] = mesRaw.split("-");
      const nomes = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
      const idx = parseInt(mes) - 1;
      return (nomes[idx] || "?") + "/" + ano.slice(2);
    });

    // Gráfico 1 — Glosa IPASGO (%)
    criarGrafico("g1", "line", labels,
      linhas.map(l => numeroBR(pegarValor(l, "glosa_ipasgo_pct", "Glosa Ipasgo Pct"))),
      CORES.alerta, CORES.alertaClaro, "%");

    // Gráfico 2 — Glosa Total Identificada (R$)
    criarGrafico("g2", "bar", labels,
      linhas.map(l => numeroBR(pegarValor(l, "glosa_total_identificada", "Glosa Total Identificada"))),
      CORES.vinho, CORES.vinhoClaro);

    // Gráfico 3 — Contas Paradas (quantidade)
    criarGrafico("g3", "line", labels,
      linhas.map(l => numeroBR(pegarValor(l, "contas_paradas_qtd", "Contas Paradas Qtd"))),
      CORES.info, CORES.infoClaro);

    // Gráfico 4 — Valor Represado (R$)
    criarGrafico("g4", "bar", labels,
      linhas.map(l => numeroBR(pegarValor(l, "valor_represado", "Valor Represado"))),
      CORES.sucesso, CORES.sucessoClaro);

    console.log("Gráficos criados com sucesso.");
  } catch (erro) {
    console.error("Erro ao carregar gráficos:", erro);
  }
}

// Dispara a criação dos gráficos depois dos itens
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(carregarGraficos, 800);
});
