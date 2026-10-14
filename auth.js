import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { firebaseConfig, firebaseEstaConfigurado } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("btnLogin");
const resetButton = document.getElementById("btnResetPassword");
const togglePasswordButton = document.getElementById("btnTogglePassword");
const message = document.getElementById("loginMessage");

function setMessage(texto = "", tipo = "") {
  message.textContent = texto;
  message.className = "login-message";
  if (tipo) message.classList.add(tipo);
}

function setBusy(ocupado) {
  loginButton.disabled = ocupado;
  emailInput.disabled = ocupado;
  passwordInput.disabled = ocupado;
  loginButton.textContent = ocupado ? "Entrando..." : "Entrar";
}

function mensagemErro(codigo) {
  const mensagens = {
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/invalid-email": "Informe um endereço de e-mail válido.",
    "auth/missing-password": "Informe a senha.",
    "auth/user-disabled": "Este usuário está desativado.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente."
  };

  return mensagens[codigo] || "Não foi possível entrar. Verifique os dados e tente novamente.";
}

if (!firebaseEstaConfigurado()) {
  setMessage(
    "Firebase ainda não configurado. Preencha o arquivo firebase-config.js antes de usar o login.",
    "error"
  );
  form.querySelectorAll("input, button").forEach((el) => {
    if (el.id !== "btnTogglePassword") el.disabled = true;
  });
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  setPersistence(auth, browserLocalPersistence).catch(() => {
    // O Firebase já possui persistência padrão; esta chamada apenas a torna explícita.
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.replace("calculadora.html");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage("Preencha o e-mail e a senha.", "error");
      return;
    }

    try {
      setBusy(true);
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login realizado. Abrindo a calculadora...", "success");
      window.location.replace("calculadora.html");
    } catch (error) {
      setMessage(mensagemErro(error?.code), "error");
    } finally {
      setBusy(false);
    }
  });

  resetButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();

    if (!email) {
      setMessage("Digite seu e-mail acima para receber a recuperação de senha.", "error");
      emailInput.focus();
      return;
    }

    try {
      resetButton.disabled = true;
      setMessage("Enviando e-mail de recuperação...", "info");
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "Se existir uma conta habilitada para esse e-mail, as instruções de recuperação serão enviadas.",
        "success"
      );
    } catch (error) {
      if (error?.code === "auth/invalid-email") {
        setMessage("Informe um endereço de e-mail válido.", "error");
      } else if (error?.code === "auth/too-many-requests") {
        setMessage("Muitas solicitações. Aguarde e tente novamente.", "error");
      } else {
        setMessage("Não foi possível solicitar a recuperação de senha.", "error");
      }
    } finally {
      resetButton.disabled = false;
    }
  });
}

togglePasswordButton.addEventListener("click", () => {
  const mostrando = passwordInput.type === "text";
  passwordInput.type = mostrando ? "password" : "text";
  togglePasswordButton.textContent = mostrando ? "Mostrar" : "Ocultar";
  togglePasswordButton.setAttribute("aria-pressed", String(!mostrando));
});
