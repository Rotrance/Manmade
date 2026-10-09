/*
 * CONFIGURAÇÃO DO FIREBASE
 * Console Firebase → Configurações do projeto (engrenagem) → Seus apps → app Web (</>)
 * → copie o objeto "firebaseConfig" e cole os valores abaixo.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCgDDhY_HmBZGZDT8ajX0lQ4xlAVbrt23w",
  authDomain: "manmade-946e2.firebaseapp.com",
  projectId: "manmade-946e2",
  storageBucket: "manmade-946e2.firebasestorage.app",
  messagingSenderId: "361841812006",
  appId: "1:361841812006:web:cb6e20d058319c270afce7",
  measurementId: "G-QT8V57QM5B"
};

// false enquanto os valores acima não forem preenchidos
export const isConfigured = !String(firebaseConfig.apiKey).startsWith("COLE");
