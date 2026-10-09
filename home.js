/* Página inicial: header conforme o login. */
import { onUser, logout, userName, initials } from "./auth.js";

const ASSETS = "";
const PAGES = "";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function toast(text) {
  let t = document.getElementById("toast");
  if (!t) {
    t = el("div", "toast");
    t.id = "toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("is-visible"), 3500);
}

function linkButton(href, variant, icon, label) {
  const a = el("a", "btn btn--small btn--" + variant);
  a.href = href;
  const span = el("span", "icon");
  span.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.src = ASSETS + icon;
  img.alt = "";
  span.appendChild(img);
  a.append(span, label);
  return a;
}

function renderNav(user) {
  const nav = document.getElementById("site-nav");
  nav.replaceChildren();

  if (!user) {
    nav.append(
      linkButton(PAGES + "cadastro.html", "filled", "cadastro.png", "Cadastrar"),
      linkButton(PAGES + "login.html", "outline", "login.png", "Entrar")
    );
    return;
  }

  const nome = userName(user);
  const chip = el("span", "user-chip");
  chip.append(el("span", "user-chip__avatar", initials(nome)), el("span", "user-chip__name", nome.split(" ")[0]));

  const exit = el("button", "btn btn--outline btn--small", "Sair");
  exit.type = "button";
  exit.addEventListener("click", async () => {
    await logout();
    toast("Você saiu da conta.");
  });

  nav.append(chip, exit);
}

// atualiza sozinho a cada login/logout
onUser(renderNav);
