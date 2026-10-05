// ============================================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================================
// 1) Abra o Firebase Console.
// 2) Projeto > Configurações do projeto > Seus apps > Web.
// 3) Copie APENAS os valores do objeto firebaseConfig para baixo.
//
// É normal esta configuração ficar no JavaScript do navegador.
// Ela identifica o projeto; NÃO coloque senhas de usuários aqui.

export const firebaseConfig = {
  apiKey: "AIzaSyA7jtlM1x6u8fKktXOKOgaDAYuFBe6quoc",
  authDomain: "lbe-comb.firebaseapp.com",
  projectId: "lbe-comb",
  storageBucket: "lbe-comb.firebasestorage.app",
  messagingSenderId: "638918201929",
  appId: "1:638918201929:web:bab5154ce0cb912518e598"
};

export function firebaseEstaConfigurado() {
  return Object.values(firebaseConfig).every(
    (valor) => typeof valor === "string" && valor.trim() !== "" && !valor.includes("COLE_AQUI")
  );
}
