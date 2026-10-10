/* Formulários de login e cadastro (usa auth.js). */
import { getUser, register, login, resetPassword } from "./auth.js";
import { validateName, validateEmail, validateEmailDomain, validatePassword, checkPassword } from "./validators.js";

const HOME = "index.html";
const form = document.querySelector(".auth__form");
const mode = form.dataset.auth; // "login" ou "cadastro"
const message = document.getElementById("mensagem");
const button = form.querySelector("button[type=submit]");
const next = new URLSearchParams(location.search).get("next");
const destination = next === "download" ? "download.html" : HOME;

function fail(code, text) {
  const e = new Error(text);
  e.code = code;
  return e;
}

// quem já está logado não precisa ver estas páginas
getUser().then((user) => {
  if (user) location.replace(destination);
});

function show(text, type) {
  message.textContent = text;
  message.className = "auth__message auth__message--" + type;
  message.hidden = false;
}

function markInvalid(...ids) {
  form.querySelectorAll("input").forEach((i) => i.classList.remove("is-invalid"));
  ids.forEach((id) => document.getElementById(id)?.classList.add("is-invalid"));
}

function fieldsFor(code) {
  if (code === "auth/email-already-in-use" || code === "auth/invalid-email" || code === "app/invalid-email") return ["email"];
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements" || code === "app/weak-password") return ["senha", "confirmar-senha"];
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") return ["email", "senha"];
  if (code === "app/invalid-name") return ["nome"];
  return [];
}

form.addEventListener("input", () => {
  message.hidden = true;
  markInvalid();
});

/* ---------- cadastro: lista de critérios da senha ao vivo ---------- */

const rulesList = document.getElementById("pw-rules");
const bar = document.getElementById("pw-bar");
const label = document.getElementById("pw-label");

function updateRules() {
  if (!rulesList) return;
  const ctx = { nome: form.nome?.value, email: form.email?.value };
  const results = checkPassword(form.senha.value, ctx);

  rulesList.replaceChildren(
    ...results.map((r) => {
      const li = document.createElement("li");
      li.textContent = r.label;
      li.className = r.ok ? "is-ok" : "";
      return li;
    })
  );

  const done = results.filter((r) => r.ok).length;
  const typed = form.senha.value.length > 0;
  const level = !typed ? "" : done === results.length ? "forte" : done >= results.length - 3 ? "media" : "fraca";
  bar.style.width = typed ? Math.round((done / results.length) * 100) + "%" : "0";
  bar.dataset.level = level;
  label.textContent = { forte: "Senha forte", media: "Senha média: quase lá", fraca: "Senha fraca" }[level] || "";
  label.dataset.level = level;
}

if (rulesList) {
  ["input", "focus"].forEach((ev) => form.senha.addEventListener(ev, updateRules));
  // nome e e-mail também entram nos critérios ("sem seu nome")
  ["nome", "email"].forEach((id) => form[id].addEventListener("input", updateRules));
  updateRules();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  markInvalid();

  const data = new FormData(form);
  button.disabled = true;

  try {
    if (mode === "cadastro") {
      // Só cria a conta se tudo for válido (o auth.js valida de novo por segurança).
      const n = validateName(data.get("nome"));
      if (!n.ok) throw fail("app/invalid-name", n.message);
      const e = validateEmail(data.get("email"));
      if (!e.ok) throw fail("app/invalid-email", e.message);
      const p = validatePassword(data.get("senha"), { nome: n.value, email: e.value });
      if (!p.ok) throw fail("app/weak-password", p.message);
      if (data.get("senha") !== data.get("confirmar-senha")) {
        throw fail("app/password-mismatch", "As senhas não coincidem.");
      }
      show("Verificando o e-mail...", "info");
      const d = await validateEmailDomain(e.value);
      if (!d.ok) throw fail("app/invalid-email", d.message);

      await register({ nome: n.value, email: e.value, senha: data.get("senha") });
      show("Conta criada! Redirecionando...", "success");
    } else {
      await login({ email: data.get("email"), senha: data.get("senha"), lembrar: data.get("lembrar") === "on" });
      show("Login realizado! Redirecionando...", "success");
    }
    setTimeout(() => location.assign(destination), 600);
  } catch (err) {
    markInvalid(...(err.code === "app/password-mismatch" ? ["senha", "confirmar-senha"] : fieldsFor(err.code)));
    show(err.message, "error");
    button.disabled = false;
  }
});

// "Esqueceu a senha?" → e-mail de redefinição do Firebase
document.querySelector("[data-forgot]")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) {
    markInvalid("email");
    show("Digite seu e-mail no campo acima para receber o link de redefinição.", "error");
    return;
  }
  try {
    await resetPassword(email);
    show("Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.", "success");
  } catch (err) {
    show(err.message, "error");
  }
});

// mantém o ?next= ao alternar entre login e cadastro
if (next) {
  document.querySelectorAll(".auth__footer a").forEach((a) => {
    a.href += "?next=" + encodeURIComponent(next);
  });
}

// avisa a "rede de segurança" do HTML que o script carregou normalmente
window.__manmadeReady = true;
