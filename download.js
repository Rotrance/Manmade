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
const DOWNLOAD_URL = ""; // plano B (ex.: "https://.../ManMade.zip")

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

function render(user) {
  const node = document.getElementById("tpl-download").content.cloneNode(true);
  node.querySelector("[data-nome]").textContent = userName(user).split(" ")[0];

  const info = node.querySelector("[data-mensagem]");

  node.querySelector("[data-baixar]").addEventListener("click", async (e) => {
    e.preventDefault();
    const url = (await getDownloadUrl()) || DOWNLOAD_URL;
    if (!url) {
      info.textContent = "O arquivo do jogo ainda não foi publicado. Volte em breve!";
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
