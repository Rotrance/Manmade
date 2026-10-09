/*
 * CONFIGURAÇÃO DO FIREBASE
 * Console Firebase → Configurações do projeto (engrenagem) → Seus apps → app Web (</>)
 * → copie o objeto "firebaseConfig" e cole os valores abaixo.
 */
export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

// false enquanto os valores acima não forem preenchidos
export const isConfigured = !String(firebaseConfig.apiKey).startsWith("COLE");
