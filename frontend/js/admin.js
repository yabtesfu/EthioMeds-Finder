let adminPharmacies = [];
let adminRejectedIds = [];
let adminStats = {};
let adminToastTimer = null;

(function initAdminTheme() {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("ethiomeds-theme") || "light");
})();

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
  btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "\u2600" : "\u263E";
}

function normalizeUserName(user) {
  if (!user) return "Admin";
  return user.fullName || user.full_name || user.email || "Admin";
}

function initialsFromName(name) {
  return String(name || "AD")
    .split(" ")
    .filter(Boolean)
    .map(function (word) {
      return word[0];
    })
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatRelativeTime(dateString) {
  const created = new Date(dateString);
  if (Number.isNaN(created.getTime())) return "recently";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - created.getTime()) / 1000));
  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return diffSeconds + " seconds ago";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return diffMinutes + (diffMinutes === 1 ? " minute ago" : " minutes ago");
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return diffHours + (diffHours === 1 ? " hour ago" : " hours ago");
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return diffDays + (diffDays === 1 ? " day ago" : " days ago");
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return diffWeeks + (diffWeeks === 1 ? " week ago" : " weeks ago");
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return diffMonths + (diffMonths === 1 ? " month ago" : " months ago");
  const diffYears = Math.floor(diffDays / 365);
  return diffYears + (diffYears === 1 ? " year ago" : " years ago");
}

function setupAdminUser() {
  const user = typeof getUser === "function" ? getUser() : null;
  if (!user) {
    window.location.href = "login.html";
    return false;
  }
  if (user.role !== "admin") {
    window.location.href = "dashboard.html";
    return false;
  }
  const name = normalizeUserName(user);
  document.getElementById("adminName").textContent = name;
  document.getElementById("adminAvatar").textContent = initialsFromName(name);
  return true;
}

function mapAdminPharmacy(row) {
  const locallyRejected = adminRejectedIds.includes(String(row.id));
  const approved = row.is_approved === true || row.is_approved === "true";
  return {
    id: row.id,
    name: row.name || "Pharmacy",
    owner: row.owner_name || "",
    email: row.owner_email || "",
    phone: row.phone || "",
    city: row.city || "",
    subcity: row.sub_city || row.subcity || "",
    address: row.address || "",
    date: row.created_at || "",
    status: locallyRejected ? "rejected" : approved ? "approved" : "pending",
  };
}

function renderStats(stats) {
  const currentStats = stats || adminStats || {};
  const pending = adminPharmacies.filter(function (pharmacy) {
    return pharmacy.status === "pending";
  }).length;
  const approved = adminPharmacies.filter(function (pharmacy) {
    return pharmacy.status === "approved";
  }).length;
  document.getElementById("statUsers").textContent = formatNumber(currentStats.total_users);
  document.getElementById("statApproved").textContent = formatNumber(approved);
  document.getElementById("statPending").textContent = formatNumber(pending);
  document.getElementById("statReservations").textContent = formatNumber(currentStats.total_reservations);
  document.getElementById("waitingCount").textContent = formatNumber(pending);
}

function renderAdmin(stats) {
  renderStats(stats || adminStats);
  const list = document.getElementById("appsList");
  const empty = document.getElementById("appsEmpty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", adminPharmacies.length > 0);
  adminPharmacies.forEach(function (pharmacy, index) {
    const card = document.createElement("div");
    card.className = "order-card";
    card.style.animationDelay = Math.min(index * 40, 300) + "ms";
    card.innerHTML =
      '<div class="app-badge"></div>' +
      '<div class="order-info">' +
        '<div class="app-name"></div>' +
        '<div class="app-location"></div>' +
        '<div class="app-meta"></div>' +
      '</div>' +
      '<div class="order-actions"></div>';
    card.querySelector(".app-badge").textContent = initialsFromName(pharmacy.name);
    card.querySelector(".app-name").textContent = pharmacy.name;
    card.querySelector(".app-location").textContent = buildLocation(pharmacy);
    card.querySelector(".app-meta").textContent = buildMeta(pharmacy);
    const actions = card.querySelector(".order-actions");
    if (pharmacy.status === "pending") {
      const approve = document.createElement("button");
      approve.className = "approve-btn";
      approve.type = "button";
      approve.textContent = "Approve";
      approve.addEventListener("click", function () {
        decidePharmacy(pharmacy.id, "approve", approve);
      });
      const reject = document.createElement("button");
      reject.className = "reject-btn";
      reject.type = "button";
      reject.textContent = "Reject";
      reject.addEventListener("click", function () {
        decidePharmacy(pharmacy.id, "reject", reject);
      });
      actions.appendChild(approve);
      actions.appendChild(reject);
    } else {
      const pill = document.createElement("span");
      pill.className = "status-pill status-" + pharmacy.status;
      pill.innerHTML = '<span class="dot"></span>' + pharmacy.status.charAt(0).toUpperCase() + pharmacy.status.slice(1);
      actions.appendChild(pill);
    }
    list.appendChild(card);
  });
}

function buildLocation(pharmacy) {
  const locationParts = [];
  if (pharmacy.subcity) locationParts.push(pharmacy.subcity);
  if (pharmacy.city) locationParts.push(pharmacy.city);
  if (pharmacy.address) locationParts.push(pharmacy.address);
  return locationParts.length ? locationParts.join(", ") : "Location not provided";
}

function buildMeta(pharmacy) {
  const meta = [];
  if (pharmacy.owner) meta.push("Owner " + pharmacy.owner);
  if (pharmacy.phone) meta.push(pharmacy.phone);
  if (pharmacy.email) meta.push(pharmacy.email);
  meta.push("applied " + formatRelativeTime(pharmacy.date));
  return meta.join(" \u00B7 ");
}

async function loadAdminData() {
  let stats = {};
  try {
    const statsData = await apiRequest("/api/admin/stats");
    stats = statsData.stats || statsData;
    adminStats = stats;
    const data = await apiRequest("/api/admin/pharmacies");
    adminPharmacies = (data.pharmacies || []).map(mapAdminPharmacy);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "login.html";
      return;
    }
    if (error.status === 403) {
      showAdminToast("Admin access is required");
      return;
    }
    showAdminToast(error.message || "Could not load admin dashboard");
  }
  renderAdmin(stats);
}

async function decidePharmacy(id, action, button) {
  try {
    if (button) button.disabled = true;
    await apiRequest("/api/admin/pharmacies/" + id + "/" + action, { method: "PATCH" });
    const pharmacy = adminPharmacies.find(function (item) {
      return String(item.id) === String(id);
    });
    if (pharmacy) {
      pharmacy.status = action === "approve" ? "approved" : "rejected";
      if (action === "reject" && !adminRejectedIds.includes(String(id))) {
        adminRejectedIds.push(String(id));
      }
      if (action === "approve") {
        adminRejectedIds = adminRejectedIds.filter(function (rejectedId) {
          return rejectedId !== String(id);
        });
      }
      showAdminToast(pharmacy.name + " " + pharmacy.status);
    }
    renderAdmin();
  } catch (error) {
    showAdminToast(error.message || "Action failed");
    if (button) button.disabled = false;
  }
}

function showAdminToast(message) {
  const toast = document.getElementById("adminToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(adminToastTimer);
  adminToastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, 3200);
}

document.addEventListener("DOMContentLoaded", function () {
  updateThemeIcon();
  if (!setupAdminUser()) return;
  loadAdminData();
});
