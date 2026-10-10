/*
 * Página inicial: só abre para usuários logados.
 * Quem entra sem login é levado direto para a tela de login.
 */
import { onUser, logout, userName, initials } from "./auth.js";

const LOGIN = "login.html";
let verified = false;

// Voltar/avançar do navegador pode mostrar uma cópia antiga da página: recarrega.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

// Se a verificação não responder, não deixa a página travada em branco.
setTimeout(() => {
  if (!verified) location.replace(LOGIN);
}, 10000);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderNav(user) {
  const nav = document.getElementById("site-nav");
  nav.replaceChildren();

  const nome = userName(user);
  const chip = el("span", "user-chip");
  chip.append(
    el("span", "user-chip__avatar", initials(nome)),
    el("span", "user-chip__name", nome.split(" ")[0])
  );

  const exit = el("button", "btn btn--outline btn--small", "Sair");
  exit.type = "button";
  // ao sair, o onUser abaixo recebe "sem usuário" e leva para o login
  exit.addEventListener("click", () => logout());

  nav.append(chip, exit);
}

onUser((user) => {
  if (!user) {
    location.replace(LOGIN);
    return;
  }
  verified = true;
  document.documentElement.classList.remove("checking");
  renderNav(user);
});
