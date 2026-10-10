/*
 * Página de download: só mostra o conteúdo para usuários logados.
 * - Sem login (ou sem Firebase funcionando): vai para o login.
 * - Se a pessoa sair da conta (inclusive em outra aba): é expulsa da página.
 * - O link do instalador vem do Firestore (config/download), que só quem
 *   está logado consegue ler. DOWNLOAD_URL abaixo é só um plano B.
 */
import { onUser, logout, userName, getDownloadUrl } from "./auth.js";

const HOME = "index.html";
const LOGIN = "login.html?next=download";
// Nomes aceitos para o arquivo do jogo, na pasta do site. O primeiro que existir é usado.
const PREFIX = "";
const ARQUIVOS = ["ManMade-v1.0.zip.rar", "ManMade-v1.0.rar", "ManMade-v1.0.zip"];

const content = document.getElementById("conteudo");
let shown = false;

// Voltar/avançar do navegador pode mostrar uma cópia antiga da página: recarrega.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

// Se a verificação não responder, não deixa a pessoa travada.
setTimeout(() => {
  if (shown) return;
  const status = document.getElementById("status");
  if (status) {
    status.textContent = "Não foi possível verificar seu acesso. ";
    const a = document.createElement("a");
    a.href = LOGIN;
    a.textContent = "Ir para o login";
    status.appendChild(a);
  }
}, 10000);

// Procura qual dos nomes existe no site. Ignora respostas que são páginas HTML (erro 404 disfarçado).
async function acharArquivo() {
  for (const nome of ARQUIVOS) {
    const url = PREFIX + nome;
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      const tipo = res.headers.get("content-type") || "";
      if (res.ok && !tipo.includes("text/html")) return url;
    } catch (err) {
      /* tenta o próximo nome */
    }
  }
  console.warn("Arquivo do jogo não encontrado. Nomes procurados:", ARQUIVOS.map((n) => PREFIX + n));
  return null;
}

function render(user) {
  const node = document.getElementById("tpl-download").content.cloneNode(true);
  node.querySelector("[data-nome]").textContent = userName(user).split(" ")[0];

  const info = node.querySelector("[data-mensagem]");

  node.querySelector("[data-baixar]").addEventListener("click", async (e) => {
    e.preventDefault();
    info.hidden = true;

    // 1º link do Firestore (config/download); 2º arquivo hospedado no próprio site
    const url = (await getDownloadUrl()) || (await acharArquivo());
    if (!url) {
      info.textContent = "O arquivo do jogo não foi encontrado no site. Volte em breve!";
      info.hidden = false;
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  node.querySelector("[data-sair]").addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
    location.assign(HOME);
  });

  content.replaceChildren(node);
}

// Ouve o login o tempo todo: sem usuário → login.
onUser((user) => {
  if (!user) {
    location.replace(LOGIN);
    return;
  }
  if (shown) return;
  shown = true;
  render(user);
});
