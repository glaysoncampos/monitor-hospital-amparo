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
