(function initTheme() {
  const saved = localStorage.getItem("ethiomeds-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

let selectedRole = "patient";

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", next);
  localStorage.setItem("ethiomeds-theme", next);

  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById("themeToggle");

  if (!btn) return;

  const dark = document.documentElement.getAttribute("data-theme") === "dark";

  btn.textContent = dark ? "\u2600" : "\u263E";
  btn.title = dark ? "Switch to light theme" : "Switch to dark theme";
}

function showError(msg) {
  const box = document.getElementById("formError");

  if (!box) return;

  box.textContent = msg;
  box.classList.remove("hidden");
}

function clearError() {
  const box = document.getElementById("formError");

  if (!box) return;

  box.textContent = "";
  box.classList.add("hidden");
}

function setLoading(loading, labelIdle, labelBusy) {
  const btn = document.getElementById("submitBtn");
  const spinner = document.getElementById("spinner");
  const label = document.getElementById("submitLabel");

  if (!btn || !spinner || !label) return;

  btn.disabled = loading;
  spinner.classList.toggle("hidden", !loading);
  label.textContent = loading ? labelBusy : labelIdle;
}

function togglePassword() {
  const input = document.getElementById("password");
  const btn = document.getElementById("pwToggle");

  if (!input || !btn) return;

  const show = input.type === "password";

  input.type = show ? "text" : "password";
  btn.textContent = show ? "Hide" : "Show";
}

function passwordStrength(password) {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;

  return Math.min(score, 3);
}

function updateStrength() {
  const wrap = document.getElementById("strength");
  const passwordInput = document.getElementById("password");

  if (!wrap || !passwordInput) return;

  const password = passwordInput.value;

  wrap.classList.toggle("hidden", password.length === 0);

  if (!password) return;

  const score = passwordStrength(password);

  const color =
    score >= 3 ? "var(--teal)" :
    score === 2 ? "#D9A429" :
    "#C84A2C";

  const bars = wrap.querySelectorAll(".strength-bars div");

  bars.forEach(function (bar, index) {
    bar.style.background = score >= index + 1 ? color : "var(--seg-off)";
  });

  const text = wrap.querySelector(".strength-text");

  if (!text) return;

  text.style.color = color;
  text.textContent =
    score >= 3 ? "Strong password" :
    score === 2 ? "Okay, add a number and capital letter" :
    "Too weak, use at least 6 characters";
}

function pickRole(role) {
  selectedRole = role;

  document.querySelectorAll(".role-card").forEach(function (card) {
    card.classList.toggle("selected", card.dataset.role === role);
  });
}

async function handleLogin(event) {
  event.preventDefault();
  clearError();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !/@/.test(email)) {
    return showError("Please enter a valid email address.");
  }

  if (!password || password.length < 6) {
    return showError("Password must be at least 6 characters.");
  }

  setLoading(true, "Sign in", "Signing in\u2026");

  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    saveSession(data);
    redirectByRole(data.user && data.user.role);
  } catch (err) {
    showError(err.message);
    setLoading(false, "Sign in", "Signing in\u2026");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  clearError();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!fullName) {
    return showError("Please enter your full name.");
  }

  if (!email || !/@/.test(email)) {
    return showError("Please enter a valid email address.");
  }

  if (!password || password.length < 6) {
    return showError("Password must be at least 6 characters.");
  }

  setLoading(true, "Create account", "Creating account\u2026");

  try {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName,
        email,
        password,
        role: selectedRole,
      }),
    });

    saveSession(data);
    redirectByRole(data.user && data.user.role);
  } catch (err) {
    showError(err.message);
    setLoading(false, "Create account", "Creating account\u2026");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateThemeIcon();

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);

    const passwordInput = document.getElementById("password");

    if (passwordInput) {
      passwordInput.addEventListener("input", updateStrength);
    }

    document.querySelectorAll(".role-card").forEach(function (card) {
      card.addEventListener("click", function () {
        pickRole(card.dataset.role);
      });
    });
  }
});