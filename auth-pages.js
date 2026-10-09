/* Formulários de login e cadastro (usa auth.js). */
import { getUser, register, login, resetPassword } from "./auth.js";

const HOME = "index.html";
const form = document.querySelector(".auth__form");
const mode = form.dataset.auth; // "login" ou "cadastro"
const message = document.getElementById("mensagem");
const button = form.querySelector("button[type=submit]");
const next = new URLSearchParams(location.search).get("next");
const destination = next === "download" ? "download.html" : HOME;

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
  if (code === "auth/email-already-in-use" || code === "auth/invalid-email") return ["email"];
  if (code === "auth/weak-password") return ["senha"];
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") return ["email", "senha"];
  if (code === "app/invalid-name") return ["nome"];
  return [];
}

form.addEventListener("input", () => {
  message.hidden = true;
  markInvalid();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  markInvalid();

  const data = new FormData(form);
  button.disabled = true;

  try {
    if (mode === "cadastro") {
      if (data.get("senha") !== data.get("confirmar-senha")) {
        markInvalid("senha", "confirmar-senha");
        throw new Error("As senhas não coincidem.");
      }
      await register({ nome: data.get("nome"), email: data.get("email"), senha: data.get("senha") });
      show("Conta criada! Redirecionando...", "success");
    } else {
      await login({ email: data.get("email"), senha: data.get("senha"), lembrar: data.get("lembrar") === "on" });
      show("Login realizado! Redirecionando...", "success");
    }
    setTimeout(() => location.assign(destination), 600);
  } catch (err) {
    markInvalid(...fieldsFor(err.code));
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
