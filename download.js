/* Página de download: só abre para usuários logados. */
import { getUser, logout, userName } from "./auth.js";

// Coloque aqui o link do instalador quando existir (ex.: "downloads/ManMade.zip")
const DOWNLOAD_URL = "";

const user = await getUser();

if (!user) {
  // sem login → vai para o login e volta para cá depois
  location.replace("login.html?next=download");
} else {
  document.getElementById("nome-usuario").textContent = userName(user).split(" ")[0];
  document.body.classList.remove("is-checking");

  const info = document.getElementById("mensagem");
  const baixar = document.getElementById("btn-baixar");

  baixar.addEventListener("click", (e) => {
    e.preventDefault();
    if (!DOWNLOAD_URL) {
      info.textContent = "O arquivo do jogo ainda não foi publicado. Volte em breve!";
      info.hidden = false;
      return;
    }
    const a = document.createElement("a");
    a.href = DOWNLOAD_URL;
    a.download = "";
    a.click();
  });

  document.getElementById("btn-sair").addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
    location.assign("index.html");
  });
}
