const API_BASE = "http://localhost:5050";

async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, { ...options, headers });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no JSON body */ }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || "Request failed (" + res.status + ")";
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}


function saveSession(data) {
  if (data.token) localStorage.setItem("token", data.token);
  if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
}


function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch (e) { return null; }
}


function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}


function redirectByRole(role) {
  if (role === "pharmacy") window.location.href = "pharmacy-dashboard.html";
  else if (role === "admin") window.location.href = "admin-dashboard.html";
  else window.location.href = "dashboard.html";
}
