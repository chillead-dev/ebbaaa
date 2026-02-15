const themeBtn = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("ex_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeBtn.textContent = savedTheme === "dark" ? "Тема: Тёмная" : "Тема: Светлая";

themeBtn.onclick = () => {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ex_theme", next);
  themeBtn.textContent = next === "dark" ? "Тема: Тёмная" : "Тема: Светлая";
};

import API from "./api.js";

const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("ex_token") || "";
let signupStep = 1;

function setHint(text) {
  $("authHint").textContent = text || "";
}

function switchAuthTab(mode) {
  const isLogin = mode === "login";
  $("tab-login").classList.toggle("isOn", isLogin);
  $("tab-signup").classList.toggle("isOn", !isLogin);
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupStep1").classList.toggle("hidden", isLogin);
  $("signupStep2").classList.add("hidden");
  signupStep = 1;
}

function bindUI() {
  $("tab-login").onclick = () => switchAuthTab("login");
  $("tab-signup").onclick = () => switchAuthTab("signup");

  $("btnSendCode").onclick = async () => {
    try {
      setHint("Отправляем код...");
      await API.requestCode($("suEmail").value);
      setHint("Код отправлен на почту.");
      $("signupStep1").classList.add("hidden");
      $("signupStep2").classList.remove("hidden");
      signupStep = 2;
    } catch (e) {
      setHint(e.error || "Ошибка");
    }
  };

  $("btnBackToStep1").onclick = () => {
    $("signupStep2").classList.add("hidden");
    $("signupStep1").classList.remove("hidden");
    signupStep = 1;
  };

  $("btnSignup").onclick = async () => {
    try {
      setHint("Создаем аккаунт...");
      const r = await API.signup(
        $("suEmail").value,
        $("suPass").value,
        $("suCode").value,
        ""
      );
      localStorage.setItem("ex_token", r.token);
      setHint("Готово! Аккаунт создан.");
    } catch (e) {
      setHint(e.error || "Ошибка регистрации");
    }
  };

  $("btnLogin").onclick = async () => {
    try {
      const r = await API.login(
        $("loginEmail").value,
        $("loginPass").value
      );
      localStorage.setItem("ex_token", r.token);
      setHint("Успешный вход");
    } catch (e) {
      setHint(e.error || "Ошибка входа");
    }
  };
}

bindUI();
