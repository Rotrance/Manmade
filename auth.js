/*
 * ManMade — autenticação com Firebase Authentication + perfil no Firestore.
 * O Firebase é carregado de forma "segura": se algo falhar (config errada,
 * biblioteca bloqueada...), a página continua funcionando e mostra o motivo.
 */
import { validateName, validateEmail, validateEmailDomain, validatePassword } from "./validators.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";

let fb = {};
let auth = null;
let db = null;
let isConfigured = false;
let initError = null;

try {
  const cfg = await import("./firebase-config.js");
  const firebaseConfig = cfg.firebaseConfig;
  if (!firebaseConfig || typeof firebaseConfig !== "object") {
    throw new Error('o arquivo firebase-config.js precisa conter: export const firebaseConfig = { ... }');
  }
  isConfigured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("COLE");

  if (isConfigured) {
    const [appM, authM, fsM] = await Promise.all([
      import(FB + "firebase-app.js"),
      import(FB + "firebase-auth.js"),
      import(FB + "firebase-firestore.js")
    ]);
    fb = { ...authM, ...fsM };
    const app = appM.initializeApp(firebaseConfig);
    auth = authM.getAuth(app);
    db = fsM.getFirestore(app);
  }
} catch (err) {
  initError = err;
  auth = null;
  db = null;
  console.error("Falha ao iniciar o Firebase:", err);
}

/* ---------- estado / erros ---------- */

// Texto explicando por que o login não está disponível (ou null se está tudo certo).
export function authStatus() {
  if (auth) return null;
  if (initError) {
    return "Não foi possível iniciar o Firebase: " + (initError.message || initError) +
      ". Confira o arquivo firebase-config.js (veja o console, F12).";
  }
  return "Firebase ainda não configurado. Preencha o arquivo firebase-config.js.";
}

const MESSAGES = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-email": "Digite seu e-mail.",
  "auth/missing-password": "Digite sua senha.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
  "auth/weak-password": "Senha fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, número e símbolo.",
  "auth/password-does-not-meet-requirements": "A senha não atende aos requisitos de segurança.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/operation-not-allowed": "O login por e-mail/senha não está ativado no Firebase (Authentication → Método de login).",
  "auth/configuration-not-found": "O Authentication não foi iniciado no projeto Firebase (clique em \"Vamos começar\").",
  "auth/invalid-api-key": "Chave do Firebase inválida. Confira firebase-config.js.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Chave do Firebase inválida. Confira firebase-config.js.",
  "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase (Authentication → Configurações → Domínios autorizados).",
  "auth/user-disabled": "Esta conta foi desativada."
};

function appError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function friendly(err) {
  if (err && String(err.code || "").startsWith("app/")) return err;
  const e = new Error(MESSAGES[err.code] || "Erro inesperado (" + (err.code || err.message) + "). Veja o console do navegador (F12).");
  e.code = err.code;
  if (!MESSAGES[err.code]) console.error(err);
  return e;
}

function requireConfigured() {
  const problem = authStatus();
  if (problem) {
    const e = new Error(problem);
    e.code = "app/not-configured";
    throw e;
  }
}

/* ---------- sessão ---------- */

// Chama callback(user|null) agora e a cada login/logout. Retorna função para parar de ouvir.
export function onUser(callback) {
  if (!auth) {
    queueMicrotask(() => callback(null));
    return () => {};
  }
  return fb.onAuthStateChanged(auth, callback);
}

// Espera o Firebase restaurar a sessão e devolve o usuário (ou null).
export function getUser() {
  return new Promise((resolve) => {
    let stop = null;
    let done = false;
    stop = onUser((user) => {
      if (done) return;
      done = true;
      if (stop) stop();
      resolve(user);
    });
    if (done && stop) stop();
  });
}

export function userName(user) {
  return user.displayName || (user.email || "jogador").split("@")[0];
}

export function initials(nome) {
  const parts = String(nome || "?").trim().split(/\s+/);
  const first = parts[0][0] || "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || "";
  return (first + last).toUpperCase();
}

/* ---------- link do instalador (só para logados) ---------- */

// Lê config/download no Firestore. As regras só deixam usuários logados lerem.
export async function getDownloadUrl() {
  if (!auth || !db) return null;
  try {
    const snap = await fb.getDoc(fb.doc(db, "config", "download"));
    const url = snap.exists() ? snap.data().url : null;
    return typeof url === "string" && url.startsWith("https://") ? url : null;
  } catch (err) {
    console.warn("Não foi possível ler config/download no Firestore.", err);
    return null;
  }
}

/* ---------- cadastro / login / logout ---------- */

export async function register({ nome, email, senha }) {
  requireConfigured();

  // Só cria a conta se nome, e-mail (formato + domínio existente) e senha forem válidos.
  const n = validateName(nome);
  if (!n.ok) throw appError("app/invalid-name", n.message);
  const e = validateEmail(email);
  if (!e.ok) throw appError("app/invalid-email", e.message);
  const p = validatePassword(senha, { nome: n.value, email: e.value });
  if (!p.ok) throw appError("app/weak-password", p.message);
  const d = await validateEmailDomain(e.value);
  if (!d.ok) throw appError("app/invalid-email", d.message);

  let user;
  try {
    const cred = await fb.createUserWithEmailAndPassword(auth, e.value, senha);
    user = cred.user;
    await fb.updateProfile(user, { displayName: n.value });
  } catch (err) {
    throw friendly(err);
  }

  // Perfil no Firestore, em segundo plano (não trava o cadastro se o banco não existir).
  fb.setDoc(fb.doc(db, "users", user.uid), {
    nome: n.value,
    email: user.email,
    criadoEm: fb.serverTimestamp(),
    ultimoLogin: fb.serverTimestamp()
  }).catch((err) =>
    console.warn("Conta criada, mas o perfil não foi salvo no Firestore. Confira se o banco foi criado e as regras publicadas.", err)
  );
  return user;
}

export async function login({ email, senha, lembrar }) {
  requireConfigured();
  try {
    await fb.setPersistence(auth, lembrar ? fb.browserLocalPersistence : fb.browserSessionPersistence);
    const cred = await fb.signInWithEmailAndPassword(auth, String(email).trim(), senha);

    fb.setDoc(
      fb.doc(db, "users", cred.user.uid),
      { nome: userName(cred.user), email: cred.user.email, ultimoLogin: fb.serverTimestamp() },
      { merge: true }
    ).catch((err) => console.warn("Não foi possível atualizar o perfil no Firestore.", err));
    return cred.user;
  } catch (err) {
    throw friendly(err);
  }
}

export async function logout() {
  if (auth) await fb.signOut(auth);
}

export async function resetPassword(email) {
  requireConfigured();
  try {
    await fb.sendPasswordResetEmail(auth, String(email).trim());
  } catch (err) {
    throw friendly(err);
  }
}
