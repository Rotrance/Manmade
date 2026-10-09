/*
 * ManMade — autenticação com Firebase Authentication + perfil no Firestore.
 * Todas as páginas importam as funções daqui.
 */
import { firebaseConfig, isConfigured } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let auth = null;
let db = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    // Chave inválida etc.: o site continua abrindo, só o login fica indisponível.
    console.error("Falha ao iniciar o Firebase. Confira os valores em firebase-config.js:", err);
    auth = null;
    db = null;
  }
}

/* ---------- erros em português ---------- */

const MESSAGES = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-email": "Digite seu e-mail.",
  "auth/missing-password": "Digite sua senha.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/operation-not-allowed": "O login por e-mail/senha não está ativado no Firebase (Authentication → Método de login).",
  "auth/configuration-not-found": "O Authentication não foi iniciado no projeto Firebase (clique em \"Vamos começar\").",
  "auth/invalid-api-key": "Chave do Firebase inválida. Confira firebase-config.js.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Chave do Firebase inválida. Confira firebase-config.js.",
  "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase (Authentication → Configurações → Domínios autorizados).",
  "auth/user-disabled": "Esta conta foi desativada."
};

function friendly(err) {
  const e = new Error(MESSAGES[err.code] || "Erro inesperado (" + (err.code || err.message) + "). Veja o console do navegador (F12).");
  e.code = err.code;
  if (!MESSAGES[err.code]) console.error(err);
  return e;
}

function requireConfigured() {
  if (!auth) {
    const e = new Error(
      isConfigured
        ? "Não foi possível iniciar o Firebase. Confira os valores em firebase-config.js (veja o console, F12)."
        : "Firebase ainda não configurado. Preencha firebase-config.js."
    );
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
  return onAuthStateChanged(auth, callback);
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

/* ---------- cadastro / login / logout ---------- */

export async function register({ nome, email, senha }) {
  requireConfigured();
  nome = String(nome || "").trim();
  if (nome.length < 2) {
    const e = new Error("Digite seu nome.");
    e.code = "app/invalid-name";
    throw e;
  }

  let user;
  try {
    const cred = await createUserWithEmailAndPassword(auth, String(email).trim(), senha);
    user = cred.user;
    await updateProfile(user, { displayName: nome });
  } catch (err) {
    throw friendly(err);
  }

  // Perfil no banco de dados (coleção "users"). Não bloqueia o cadastro se falhar.
  // Sem 'await': se o Firestore não estiver criado/acessível, a promessa nunca
  // termina e travaria a tela. O perfil é gravado em segundo plano.
  setDoc(doc(db, "users", user.uid), {
    nome,
    email: user.email,
    criadoEm: serverTimestamp(),
    ultimoLogin: serverTimestamp()
  }).catch((err) =>
    console.warn("Conta criada, mas o perfil não foi salvo no Firestore. Confira se o banco foi criado e as regras publicadas.", err)
  );
  return user;
}

export async function login({ email, senha, lembrar }) {
  requireConfigured();
  try {
    await setPersistence(auth, lembrar ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, String(email).trim(), senha);

    setDoc(
      doc(db, "users", cred.user.uid),
      { nome: userName(cred.user), email: cred.user.email, ultimoLogin: serverTimestamp() },
      { merge: true }
    ).catch((err) => console.warn("Não foi possível atualizar o perfil no Firestore.", err));
    return cred.user;
  } catch (err) {
    throw friendly(err);
  }
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function resetPassword(email) {
  requireConfigured();
  try {
    await sendPasswordResetEmail(auth, String(email).trim());
  } catch (err) {
    throw friendly(err);
  }
}
