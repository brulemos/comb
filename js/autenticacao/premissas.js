// Mantém a mesma exigência de autenticação da calculadora, sem carregar seu motor de cálculo.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig, firebaseEstaConfigurado } from "./firebase-config.js";

function voltarParaLogin() {
  window.location.replace("index.html");
}

if (!firebaseEstaConfigurado()) {
  voltarParaLogin();
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      voltarParaLogin();
      return;
    }
    document.getElementById("authUserEmail").textContent = user.email || "Usuário autenticado";
    const logoutButton = document.getElementById("btnLogout");
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Saindo...";
      try {
        await signOut(auth);
      } finally {
        voltarParaLogin();
      }
    }, { once: true });
    document.documentElement.classList.remove("auth-pending");
    document.documentElement.classList.add("auth-ok");
  });
}
