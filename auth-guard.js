import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { firebaseConfig, firebaseEstaConfigurado } from "./firebase-config.js";

const scriptsDaCalculadora = [
  "database.js",
  "presets.js",
  "formulas.js",
  "emissions.js",
  "script.js",
  "misturador.js"
];

function voltarParaLogin() {
  window.location.replace("index.html");
}

function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
}

async function carregarAplicacao() {
  for (const src of scriptsDaCalculadora) {
    await carregarScript(src);
  }
}

if (!firebaseEstaConfigurado()) {
  voltarParaLogin();
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      voltarParaLogin();
      return;
    }

    const emailEl = document.getElementById("authUserEmail");
    const logoutButton = document.getElementById("btnLogout");

    if (emailEl) {
      emailEl.textContent = user.email || "Usuário autenticado";
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "Saindo...";

        try {
          await signOut(auth);
        } finally {
          voltarParaLogin();
        }
      }, { once: true });
    }

    try {
      await carregarAplicacao();
      document.documentElement.classList.remove("auth-pending");
      document.documentElement.classList.add("auth-ok");
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar a calculadora. Atualize a página e tente novamente.");
      voltarParaLogin();
    }
  });
}
