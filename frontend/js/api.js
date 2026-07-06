const API_BASE = "http://localhost:5050";

function normalizeApiPath(path) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  if (path.startsWith("/api/")) {
    return path;
  }

  return "/api" + path;
}

async function apiRequest(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = localStorage.getItem("token");

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const finalUrl = API_BASE + normalizeApiPath(path);

  const res = await fetch(finalUrl, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await res.json();
  } catch (error) {
    data = null;
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      "Request failed with status " + res.status;

    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function saveSession(data) {
  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  if (data.user) {
    const user = { ...data.user };

    if (!user.fullName && user.full_name) {
      user.fullName = user.full_name;
    }

    localStorage.setItem("user", JSON.stringify(user));
  }
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (error) {
    return null;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

function redirectByRole(role) {
  if (role === "pharmacy") {
    window.location.href = "pharmacy-dashboard.html";
  } else if (role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "dashboard.html";
  }
}
