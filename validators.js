/*
 * Validações do cadastro (nome, e-mail e senha).
 * Módulo puro: não depende do Firebase nem do DOM.
 * IMPORTANTE: validação no navegador melhora a experiência, mas quem manda
 * de verdade é o Firebase — ative também a "Política de senha" no console
 * (Authentication → Configurações → Política de senha). Veja o README.
 */

/* ---------- utilidades ---------- */

// remove acentos e coloca em minúsculas ("João" → "joao")
function plain(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* ---------- NOME ---------- */

export function validateName(nome) {
  const value = String(nome || "").trim().replace(/\s+/g, " ");
  const letters = (value.match(/\p{L}/gu) || []).length;

  if (letters < 2) return { ok: false, value, message: "Digite seu nome." };
  if (value.length > 60) return { ok: false, value, message: "O nome pode ter no máximo 60 caracteres." };
  if (!/^\p{L}[\p{L}\p{M}'’.\- ]*$/u.test(value)) {
    return { ok: false, value, message: "O nome deve conter apenas letras (sem números ou símbolos)." };
  }
  return { ok: true, value };
}

/* ---------- E-MAIL ---------- */

// local@dominio.tld — sem pontos duplicados, sem hífen nas pontas do domínio, TLD só com letras
const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

// e-mails descartáveis: não servem para uma conta de verdade
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "yopmail.com", "trashmail.com", "throwawaymail.com", "sharklasers.com", "getnada.com",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "mintemail.com", "mohmal.com",
  "emailondeck.com", "tempail.com", "burnermail.io"
]);

// erros de digitação comuns no domínio
const TYPOS = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com",
  "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gmail.com.br": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "icloud.con": "icloud.com"
};

export function validateEmail(email) {
  const value = String(email || "").trim().toLowerCase();

  if (!value) return { ok: false, value, message: "Digite seu e-mail." };
  if (value.length > 254 || value.includes("..") || !EMAIL_RE.test(value)) {
    return { ok: false, value, message: "Digite um e-mail válido (exemplo: nome@dominio.com)." };
  }

  const domain = value.split("@")[1];
  if (TYPOS[domain]) {
    return { ok: false, value, message: "Esse e-mail parece ter um erro de digitação. Você quis dizer @" + TYPOS[domain] + "?" };
  }
  if (DISPOSABLE.has(domain)) {
    return { ok: false, value, message: "E-mails temporários não são aceitos. Use seu e-mail pessoal." };
  }
  return { ok: true, value };
}

// Consulta DNS pelo navegador (DNS sobre HTTPS). Devolve a lista de respostas ou null se falhar.
async function dnsQuery(name, type) {
  const urls = [
    "https://dns.google/resolve?name=" + encodeURIComponent(name) + "&type=" + type,
    "https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=" + type
  ];
  for (const url of urls) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(url, { headers: { accept: "application/dns-json" }, signal: ctrl.signal });
      if (res.ok) return await res.json();
    } catch (err) {
      /* tenta o próximo servidor */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/*
 * Confere se o DOMÍNIO do e-mail existe e recebe mensagens (tem registro MX, ou ao menos A).
 * Pega e-mails como "joao@dominioquenaoexiste.com". Não dá para saber, sem enviar uma
 * mensagem, se a CAIXA específica existe (joao vs. joaoo) — isso nenhum site consegue.
 * Se o DNS estiver fora do ar, deixa passar (não bloqueia cadastros por falha de rede).
 */
export async function validateEmailDomain(email) {
  const domain = String(email || "").trim().toLowerCase().split("@")[1];
  if (!domain) return { ok: false, message: "Digite um e-mail válido (exemplo: nome@dominio.com)." };

  const bad = { ok: false, message: "Não encontramos o domínio @" + domain + ". Confira se o e-mail está correto e se existe." };

  const mx = await dnsQuery(domain, "MX");
  if (!mx) return { ok: true, checked: false }; // sem rede para checar: não bloqueia
  if (mx.Status === 3) return bad; // NXDOMAIN: o domínio não existe

  const records = (mx.Answer || []).filter((a) => a.type === 15).map((a) => String(a.data).trim());
  if (records.length) {
    // "MX nulo" ("0 .") = domínio declara que NÃO recebe e-mail
    if (records.every((r) => /^0\s+\.?$/.test(r))) return bad;
    return { ok: true, checked: true };
  }

  // sem MX: o padrão de e-mail aceita o registro A do domínio como destino
  const a = await dnsQuery(domain, "A");
  if (!a) return { ok: true, checked: false };
  if ((a.Answer || []).some((r) => r.type === 1)) return { ok: true, checked: true };
  return bad;
}

/* ---------- SENHA ---------- */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

// a senha não pode conter o nome nem a parte do e-mail antes do @
function hasPersonalInfo(senha, { nome, email } = {}) {
  const p = plain(senha);
  const bits = [];
  if (email) bits.push(plain(email).split("@")[0]);
  if (nome) bits.push(...plain(nome).split(/\s+/));
  return bits.some((b) => b.replace(/[^a-z0-9]/g, "").length >= 3 && p.includes(b.replace(/[^a-z0-9]/g, "")));
}

// Fonte única dos critérios: a validação e a lista na tela usam este array.
export const PASSWORD_RULES = [
  { id: "length", label: "De " + PASSWORD_MIN + " a " + PASSWORD_MAX + " caracteres",
    test: (s) => s.length >= PASSWORD_MIN && s.length <= PASSWORD_MAX },
  { id: "lower", label: "Uma letra minúscula (a-z)", test: (s) => /\p{Ll}/u.test(s) },
  { id: "upper", label: "Uma letra maiúscula (A-Z)", test: (s) => /\p{Lu}/u.test(s) },
  { id: "digit", label: "Um número (0-9)", test: (s) => /\d/.test(s) },
  { id: "symbol", label: "Um símbolo (! @ # $ % & * ...)", test: (s) => /[^\p{L}\p{N}\s]/u.test(s) },
  { id: "spaces", label: "Sem espaços", test: (s) => s.length > 0 && !/\s/.test(s) },
  { id: "personal", label: "Sem seu nome nem parte do seu e-mail",
    test: (s, ctx) => s.length > 0 && !hasPersonalInfo(s, ctx) }
];

// Devolve cada critério com ok true/false (usado na lista ao vivo).
export function checkPassword(senha, ctx = {}) {
  const s = String(senha || "");
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(s, ctx) }));
}

export function validatePassword(senha, ctx = {}) {
  const failed = checkPassword(senha, ctx).filter((r) => !r.ok);
  if (!failed.length) return { ok: true };
  return {
    ok: false,
    failed,
    message: "Senha fraca. Falta: " + failed.map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1)).join("; ") + "."
  };
}
