const USE_API = true;

const FORM_LABELS_D = {
  tablet: "Tablet",
  capsule: "Capsule",
  syrup: "Syrup",
  inhaler: "Inhaler",
  injection: "Injection",
  cream: "Cream",
  drops: "Drops",
  spray: "Nasal spray",
};

let reservations = [];
let currentFilter = "all";
let dashToastTimer = null;

const HIDDEN_CANCELLED_KEY = "hiddenCancelledReservations";

const demoInventory = buildDemoInventory();

(function initTheme() {
  const saved = localStorage.getItem("ethiomeds-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
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

  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = dark ? "\u2600" : "\u263E";
}

function normalizeUserName(user) {
  if (!user) return "Patient";

  return user.fullName || user.full_name || user.email || "Patient";
}

function setupUserInfo() {
  const user = typeof getUser === "function" ? getUser() : null;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const fullName = normalizeUserName(user);
  const parts = fullName.split(" ");

  document.getElementById("userName").textContent =
    parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");

  document.getElementById("userAvatar").textContent =
    parts
      .map(function (word) {
        return word[0];
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();
}

function getHiddenCancelledReservationIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(HIDDEN_CANCELLED_KEY));

    if (!Array.isArray(ids)) {
      return [];
    }

    return ids.map(function (id) {
      return String(id);
    });
  } catch (error) {
    return [];
  }
}

function saveHiddenCancelledReservationIds(ids) {
  localStorage.setItem(HIDDEN_CANCELLED_KEY, JSON.stringify(ids));
}

function hideCancelledReservation(id) {
  const normalizedId = String(id);
  const hiddenIds = getHiddenCancelledReservationIds();

  if (!hiddenIds.includes(normalizedId)) {
    hiddenIds.push(normalizedId);
    saveHiddenCancelledReservationIds(hiddenIds);
  }

  reservations = reservations.filter(function (reservation) {
    return String(reservation.id) !== normalizedId;
  });

  renderReservations();
}

function formatRelativeTime(dateString) {
  const created = new Date(dateString);

  if (Number.isNaN(created.getTime())) {
    return "just now";
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - created.getTime()) / 1000)
  );

  const formatUnit = function (value, unit) {
    return value + " " + unit + (value === 1 ? "" : "s") + " ago";
  };

  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return formatUnit(diffSeconds, "second");

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return formatUnit(diffMinutes, "minute");

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return formatUnit(diffHours, "hour");

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return formatUnit(diffDays, "day");

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return formatUnit(diffWeeks, "week");

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return formatUnit(Math.max(diffMonths, 1), "month");

  return formatUnit(Math.max(Math.floor(diffDays / 365), 1), "year");
}

function formatReservationPrice(price, quantity) {
  const total = Number(price || 0) * Number(quantity || 0);

  if (Number.isInteger(total)) {
    return total + " ETB";
  }

  return total.toFixed(2) + " ETB";
}

async function loadReservations() {
  if (USE_API) {
    try {
      const data = await apiRequest("/api/reservations/me");
      const hiddenCancelledIds = getHiddenCancelledReservationIds();

      reservations = (data.reservations || [])
        .filter(function (reservation) {
          return !(
            reservation.status === "cancelled" &&
            hiddenCancelledIds.includes(String(reservation.id))
          );
        })
        .map(function (reservation) {
          return {
            id: reservation.id,
            medicine: reservation.medicine_name,
            form: reservation.form || "tablet",
            rx: Boolean(reservation.requires_prescription),
            rxUploaded: Boolean(reservation.prescription_file_path),
            pharmacy: reservation.pharmacy_name,
            location:
              (reservation.city || "") +
              (reservation.sub_city ? " \u00B7 " + reservation.sub_city : ""),
            qty: reservation.quantity,
            price: Number(reservation.price || 0),
            createdAt: reservation.created_at,
            status: reservation.status,
          };
        });
    } catch (err) {
      showDashToast("Failed to load reservations: " + err.message);
      reservations = [];
    }
  }

  renderReservations();
}

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter-chip").forEach(function (chip) {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });

  renderReservations();
}

function isInCurrentFilter(reservation) {
  if (currentFilter === "all") return true;
  if (currentFilter === "pending") return reservation.status === "pending";
  if (currentFilter === "approved") return reservation.status === "approved";
  if (currentFilter === "rejected") return reservation.status === "rejected";

  return false;
}

function updateCounts() {
  const count = function (callback) {
    return reservations.filter(callback).length;
  };

  document.getElementById("countAll").textContent = reservations.length;

  document.getElementById("countPending").textContent = count(function (item) {
    return item.status === "pending";
  });

  document.getElementById("countApproved").textContent = count(function (item) {
    return item.status === "approved";
  });

  document.getElementById("countRejected").textContent = count(function (item) {
    return item.status === "rejected";
  });
}

function renderReservations() {
  updateCounts();

  const list = document.getElementById("resList");
  const empty = document.getElementById("resEmpty");

  list.innerHTML = "";

  const rows = reservations.filter(isInCurrentFilter);

  empty.classList.toggle("hidden", rows.length > 0);

  rows.forEach(function (reservation, index) {
    const card = document.createElement("div");

    card.className = "res-card";
    card.style.animationDelay = Math.min(index * 40, 300) + "ms";

    const statusClass = "status-" + reservation.status;
    const statusLabel =
      reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1);

    card.innerHTML =
      '<div class="res-icon"><img alt=""></div>' +
      '<div class="res-info">' +
        '<div class="res-name-row"><span class="res-name"></span></div>' +
        '<div class="res-pharmacy"></div>' +
        '<div class="res-meta"></div>' +
      '</div>' +
      '<div class="res-actions">' +
        '<div class="res-price"></div>' +
        '<span class="status-pill ' + statusClass + '">' +
          '<span class="dot"></span>' + statusLabel +
        '</span>' +
      '</div>';

    card.querySelector(".res-icon img").src =
      "assets/meds/" + reservation.form + ".png";

    card.querySelector(".res-name").textContent = reservation.medicine;

    card.querySelector(".res-pharmacy").textContent =
      reservation.pharmacy + " \u00B7 " + reservation.location;

    card.querySelector(".res-meta").textContent =
      "Qty " +
      reservation.qty +
      " \u00B7 reserved " +
      formatRelativeTime(reservation.createdAt);

    card.querySelector(".res-price").textContent =
      formatReservationPrice(reservation.price, reservation.qty);

    if (reservation.rx) {
      const badge = document.createElement("span");
      badge.className = "rx-badge";
      badge.textContent = "PRESCRIPTION REQUIRED";
      card.querySelector(".res-name-row").appendChild(badge);
    }

    if (reservation.status === "pending") {
      const cancelButton = document.createElement("button");

      cancelButton.className = "cancel-btn";
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";

      cancelButton.addEventListener("click", function () {
        cancelReservation(reservation.id);
      });

      card.querySelector(".res-actions").appendChild(cancelButton);
    }

    if (reservation.status === "cancelled") {
      const removeButton = document.createElement("button");

      removeButton.className = "remove-cancelled-btn";
      removeButton.type = "button";
      removeButton.title = "Remove from view";
      removeButton.setAttribute("aria-label", "Remove from view");
      removeButton.textContent = "\u00D7";

      removeButton.addEventListener("click", function () {
        hideCancelledReservation(reservation.id);
      });

      card.querySelector(".res-actions").appendChild(removeButton);
    }

    list.appendChild(card);
  });
}

async function cancelReservation(id) {
  if (USE_API) {
    try {
      await apiRequest("/api/reservations/" + id + "/cancel", {
        method: "PATCH",
      });

      showDashToast("Reservation cancelled.");
      await loadReservations();
      setFilter("all");
      return;
    } catch (err) {
      showDashToast("Cancel failed: " + err.message);
      return;
    }
  }
}

function showDashToast(message) {
  const toast = document.getElementById("dashToast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(dashToastTimer);

  dashToastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, 3200);
}

function toggleNavSearch() {
  const input = document.getElementById("navSearchInput");
  const drop = document.getElementById("searchDrop");

  const wasHidden = input.classList.contains("hidden");

  input.classList.toggle("hidden");

  if (wasHidden) {
    input.value = "";
    input.focus();
  }

  drop.classList.add("hidden");
}

function mapInventoryRow(row) {
  return {
    inventoryId: row.inventory_id,
    medicine: {
      name: row.medicine_name,
      generic: row.generic_name || "",
      form: row.form || "tablet",
      rx: Boolean(row.requires_prescription),
    },
    pharmacy: {
      name: row.pharmacy_name,
      city: row.city || "",
      subcity: row.sub_city || "",
    },
    price: Number(row.price || 0),
    stock: row.quantity,
  };
}

async function runNavSearch() {
  const query = document.getElementById("navSearchInput").value.trim().toLowerCase();
  const drop = document.getElementById("searchDrop");

  if (query.length < 2) {
    drop.classList.add("hidden");
    return;
  }

  let matches = [];

  if (USE_API) {
    try {
      const data = await apiRequest(
        "/api/inventory/search?search=" + encodeURIComponent(query)
      );

      matches = (data.inventory || []).map(mapInventoryRow).slice(0, 8);
    } catch (err) {
      console.warn("API nav search failed, using demo data:", err.message);
    }
  }

  if (matches.length === 0) {
    matches = demoInventory
      .filter(function (row) {
        return (
          (
            row.medicine.name.toLowerCase().includes(query) ||
            row.medicine.generic.toLowerCase().includes(query)
          ) &&
          row.stock > 0
        );
      })
      .slice(0, 8);
  }

  drop.innerHTML = "";
  drop.classList.remove("hidden");

  if (matches.length === 0) {
    const none = document.createElement("div");
    none.className = "search-none";
    none.textContent = 'No stock found for "' + query + '"';
    drop.appendChild(none);
    return;
  }

  matches.forEach(function (row) {
    const item = document.createElement("div");

    item.className = "search-row";

    item.innerHTML =
      '<img alt="">' +
      '<div class="search-row-info">' +
        '<div class="search-row-name"></div>' +
        '<div class="search-row-sub"></div>' +
      '</div>' +
      '<button class="reserve-mini" type="button">Reserve</button>';

    item.querySelector("img").src =
      "assets/meds/" + row.medicine.form + ".png";

    item.querySelector(".search-row-name").textContent = row.medicine.name;

    item.querySelector(".search-row-sub").textContent =
      row.pharmacy.name + " \u00B7 " + row.price + " ETB";

    item.querySelector(".reserve-mini").addEventListener("click", function () {
      reserveFromSearch(row);
    });

    drop.appendChild(item);
  });
}

async function reserveFromSearch(row) {
  if (!row.inventoryId) {
    showDashToast("This is demo data. Search from the landing page using backend data.");
    return;
  }

  try {
    await apiRequest("/api/reservations", {
      method: "POST",
      body: JSON.stringify({
        pharmacyMedicineId: row.inventoryId,
        quantity: 1,
      }),
    });

    document.getElementById("navSearchInput").classList.add("hidden");
    document.getElementById("searchDrop").classList.add("hidden");

    showDashToast(row.medicine.name + " reserved. Waiting for pharmacy approval.");

    await loadReservations();
    setFilter("all");
  } catch (err) {
    showDashToast("Reserve failed: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateThemeIcon();
  setupUserInfo();

  document.querySelectorAll(".filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      setFilter(chip.dataset.filter);
    });
  });

  document.getElementById("searchIconBtn").addEventListener("click", toggleNavSearch);
  document.getElementById("navSearchInput").addEventListener("input", runNavSearch);

  loadReservations();
});
