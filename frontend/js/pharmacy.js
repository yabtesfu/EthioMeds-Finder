const FORM_LABELS_P = {
  tablet: "Tablet",
  capsule: "Capsule",
  syrup: "Syrup",
  inhaler: "Inhaler",
  injection: "Injection",
  cream: "Cream",
  drops: "Drops",
  spray: "Nasal spray",
};

let pharmacyProfile = null;
let pharmacyOrders = [];
let pharmacyInventory = [];
let pharmacyMedicines = [];
let pharmacyToastTimer = null;
let hasPharmacyProfile = false;

(function initPharmacyTheme() {
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUserName(user) {
  if (!user) return "Pharmacy";
  return user.fullName || user.full_name || user.email || "Pharmacy";
}

function initialsFromName(name) {
  return String(name || "PH")
    .split(" ")
    .filter(Boolean)
    .map(function (word) {
      return word[0];
    })
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PH";
}

function formatMoney(value) {
  const number = Number(value) || 0;
  if (Number.isInteger(number)) return String(number);
  return number.toFixed(2);
}

function formatRelativeTime(dateString) {
  const created = new Date(dateString);
  if (Number.isNaN(created.getTime())) return "just now";
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

function findDemoMedicine(name, generic) {
  if (typeof MEDICINES === "undefined") return null;
  const medicineName = normalizeText(name);
  const genericName = normalizeText(generic);
  return MEDICINES.find(function (medicine) {
    return normalizeText(medicine.name) === medicineName ||
      normalizeText(medicine.generic) === genericName ||
      normalizeText(medicine.name).indexOf(medicineName) !== -1 ||
      medicineName.indexOf(normalizeText(medicine.name)) !== -1;
  }) || null;
}

function inferMedicineForm(name, generic) {
  const demo = findDemoMedicine(name, generic);
  if (demo && demo.form) return demo.form;
  const text = normalizeText(name + " " + generic);
  if (text.indexOf("inhaler") !== -1) return "inhaler";
  if (text.indexOf("syrup") !== -1 || text.indexOf("ors") !== -1) return "syrup";
  if (text.indexOf("injection") !== -1 || text.indexOf("insulin") !== -1) return "injection";
  if (text.indexOf("cream") !== -1) return "cream";
  if (text.indexOf("drops") !== -1) return "drops";
  if (text.indexOf("spray") !== -1) return "spray";
  if (text.indexOf("amoxicillin") !== -1 || text.indexOf("omeprazole") !== -1 || text.indexOf("doxycycline") !== -1 || text.indexOf("tramadol") !== -1) return "capsule";
  return "tablet";
}

function inferMedicineRx(name, generic, explicitValue) {
  if (explicitValue === true || explicitValue === "true") return true;
  if (explicitValue === false || explicitValue === "false") return false;
  const demo = findDemoMedicine(name, generic);
  return demo ? Boolean(demo.rx) : false;
}

function setTab(tab) {
  document.getElementById("ordersPanel").classList.toggle("hidden", tab !== "reservations");
  document.getElementById("inventoryPanel").classList.toggle("hidden", tab !== "inventory");
  document.querySelectorAll(".filter-chip[data-tab]").forEach(function (chip) {
    chip.classList.toggle("active", chip.dataset.tab === tab);
  });
}

function updateTabCounts() {
  document.getElementById("pendingCount").textContent = pharmacyOrders.filter(function (order) {
    return order.status === "pending";
  }).length;
  document.getElementById("invCount").textContent = pharmacyInventory.length;
}

function setupUserInfo() {
  const user = typeof getUser === "function" ? getUser() : null;
  if (!user) {
    window.location.href = "login.html";
    return false;
  }
  if (user.role && user.role !== "pharmacy") {
    window.location.href = "dashboard.html";
    return false;
  }
  const fullName = normalizeUserName(user);
  document.getElementById("pharmName").textContent = fullName;
  document.getElementById("pharmAvatar").textContent = initialsFromName(fullName);
  return true;
}

function renderPharmacyProfile() {
  const name = pharmacyProfile ? pharmacyProfile.name : document.getElementById("pharmName").textContent;
  const approved = pharmacyProfile ? Boolean(pharmacyProfile.is_approved) : false;
  const locationParts = [];
  if (pharmacyProfile && pharmacyProfile.sub_city) locationParts.push(pharmacyProfile.sub_city);
  if (pharmacyProfile && pharmacyProfile.address) locationParts.push(pharmacyProfile.address);
  if (pharmacyProfile && pharmacyProfile.city) locationParts.push(pharmacyProfile.city);
  document.getElementById("pharmName").textContent = name || "Pharmacy";
  document.getElementById("pharmAvatar").textContent = initialsFromName(name);
  document.getElementById("pharmLocation").textContent = locationParts.length ? locationParts.join(" \u00B7 ") : "Pharmacy profile details";
  const status = document.getElementById("pharmStatus");
  status.classList.toggle("pending", !approved);
  status.innerHTML = '<span class="dot"></span>' + (approved ? "Approved" : "Pending approval");
  updateInventoryFormState();
}

function showProfileSetup() {
  hasPharmacyProfile = false;
  document.getElementById("profileSetup").classList.remove("hidden");
  document.getElementById("ordersPanel").classList.add("hidden");
  document.getElementById("inventoryPanel").classList.add("hidden");
  updateInventoryFormState();
}

function hideProfileSetup() {
  hasPharmacyProfile = true;
  document.getElementById("profileSetup").classList.add("hidden");
}

function updateInventoryFormState() {
  const button = document.getElementById("invAddBtn");
  if (!button) return;
  const approved = pharmacyProfile && pharmacyProfile.is_approved;
  button.disabled = !approved;
  button.textContent = approved ? "+ Add" : "Needs approval";
}

function mapReservationRow(row) {
  const medicineName = row.medicine_name || row.name || "Medicine";
  const genericName = row.generic_name || "";
  return {
    id: row.id,
    patient: row.patient_name || row.patient_email || "Patient",
    medicine: medicineName,
    generic: genericName,
    rx: inferMedicineRx(medicineName, genericName, row.requires_prescription),
    qty: Number(row.quantity) || 0,
    price: Number(row.price) || 0,
    date: row.created_at,
    status: row.status || "pending",
    prescriptionStatus: row.prescription_status || "",
    facePhotoPath: row.face_photo_path || "",
    idCardPath: row.id_card_path || "",
    prescriptionFilePath: row.prescription_file_path || "",
    prescriptionExpiryDate: row.prescription_expiry_date || "",
  };
}

function renderOrders() {
  updateTabCounts();
  const list = document.getElementById("ordersList");
  const empty = document.getElementById("ordersEmpty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", pharmacyOrders.length > 0);
  pharmacyOrders.forEach(function (order, index) {
    const card = document.createElement("div");
    card.className = "order-card";
    card.style.animationDelay = Math.min(index * 40, 300) + "ms";
    card.innerHTML =
      '<div class="order-avatar"></div>' +
      '<div class="order-info">' +
        '<div class="order-line">' +
          '<span class="order-patient"></span>' +
          '<span class="order-wants">wants</span>' +
          '<span class="order-med"></span>' +
        '</div>' +
        '<div class="order-meta"></div>' +
      '</div>' +
      '<div class="order-actions"></div>';
    card.querySelector(".order-avatar").textContent = initialsFromName(order.patient);
    card.querySelector(".order-patient").textContent = order.patient;
    card.querySelector(".order-med").textContent = order.medicine;
    card.querySelector(".order-meta").textContent =
      "Qty " + order.qty + " \u00B7 " + formatMoney(order.price * order.qty) + " ETB \u00B7 requested " + formatRelativeTime(order.date);
    if (order.rx) {
      const badge = document.createElement("span");
      badge.className = "rx-badge";
      badge.textContent = "PRESCRIPTION REQUIRED";
      card.querySelector(".order-line").appendChild(badge);
      const docs = document.createElement("button");
      docs.className = "order-docs";
      docs.type = "button";
      docs.textContent = order.prescriptionFilePath ? "View submitted documents" : "Prescription documents pending";
      docs.addEventListener("click", function () {
        showPrescriptionInfo(order);
      });
      card.querySelector(".order-info").appendChild(docs);
    }
    const actions = card.querySelector(".order-actions");
    if (order.status === "pending") {
      const approve = document.createElement("button");
      approve.className = "approve-btn";
      approve.type = "button";
      approve.textContent = "Approve";
      approve.addEventListener("click", function () {
        decideOrder(order.id, "approve", approve);
      });
      const reject = document.createElement("button");
      reject.className = "reject-btn";
      reject.type = "button";
      reject.textContent = "Reject";
      reject.addEventListener("click", function () {
        decideOrder(order.id, "reject", reject);
      });
      actions.appendChild(approve);
      actions.appendChild(reject);
    } else {
      const pill = document.createElement("span");
      const safeStatus = String(order.status || "pending").toLowerCase();
      pill.className = "status-pill status-" + safeStatus;
      pill.innerHTML = '<span class="dot"></span>' + safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
      actions.appendChild(pill);
    }
    list.appendChild(card);
  });
}

function showPrescriptionInfo(order) {
  if (!order.prescriptionFilePath) {
    showPharmToast("Prescription documents have not been uploaded yet");
    return;
  }
  const expiry = order.prescriptionExpiryDate ? " Expiry: " + order.prescriptionExpiryDate + "." : "";
  showPharmToast("Prescription documents submitted." + expiry);
}

async function decideOrder(id, action, button) {
  try {
    if (button) button.disabled = true;
    await apiRequest("/api/reservations/" + id + "/" + action, { method: "PATCH" });
    showPharmToast(action === "approve" ? "Reservation approved" : "Reservation rejected");
    await loadOrders();
  } catch (error) {
    showPharmToast(error.message || "Could not update reservation");
    if (button) button.disabled = false;
  }
}

function mapInventoryRow(row) {
  const medicineName = row.medicine_name || row.name || "Medicine";
  const genericName = row.generic_name || "";
  const form = row.form || row.medicine_form || row.dosage_form || inferMedicineForm(medicineName, genericName);
  const quantity = Number(row.quantity ?? row.stock ?? 0) || 0;
  return {
    id: row.id || row.inventory_id,
    medicineId: row.medicine_id,
    name: medicineName,
    generic: genericName,
    form: FORM_LABELS_P[form] ? form : "tablet",
    rx: inferMedicineRx(medicineName, genericName, row.requires_prescription),
    price: Number(row.price) || 0,
    stock: quantity,
    isAvailable: row.is_available !== false && row.is_available !== "false",
  };
}

function renderInventory() {
  updateTabCounts();
  const list = document.getElementById("invList");
  const empty = document.getElementById("invEmpty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", pharmacyInventory.length > 0);
  pharmacyInventory.forEach(function (item, index) {
    const card = document.createElement("div");
    const badgeClass = item.stock === 0 || !item.isAvailable ? "stock-out" : item.stock < 10 ? "stock-low" : "stock-in";
    const badgeLabel = item.stock === 0 || !item.isAvailable ? "Out of stock" : item.stock < 10 ? "Low stock" : "In stock";
    card.className = "inv-card";
    card.style.animationDelay = Math.min(index * 40, 300) + "ms";
    card.innerHTML =
      '<div class="inv-icon"><div class="icon-bg"></div></div>' +
      '<div class="inv-info">' +
        '<div class="inv-name-row"><span class="inv-name"></span></div>' +
        '<div class="inv-price"></div>' +
      '</div>' +
      '<div class="inv-controls">' +
        '<span class="stock-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
        '<button class="step-btn dec" type="button">\u2212</button>' +
        '<span class="stock-num"></span>' +
        '<button class="step-btn inc" type="button">+</button>' +
      '</div>';
    card.querySelector(".icon-bg").style.backgroundImage = 'url("assets/meds/' + item.form + '.png")';
    card.querySelector(".inv-name").textContent = item.name;
    card.querySelector(".inv-price").textContent = formatMoney(item.price) + " ETB";
    card.querySelector(".stock-num").textContent = item.stock;
    if (item.rx) {
      const rx = document.createElement("span");
      rx.className = "rx-mini";
      rx.textContent = "RX";
      card.querySelector(".inv-name-row").appendChild(rx);
    }
    card.querySelector(".inc").addEventListener("click", function () {
      changeStock(item.id, 1);
    });
    card.querySelector(".dec").addEventListener("click", function () {
      changeStock(item.id, -1);
    });
    list.appendChild(card);
  });
}

async function changeStock(id, delta) {
  const item = pharmacyInventory.find(function (inventoryItem) {
    return String(inventoryItem.id) === String(id);
  });
  if (!item) return;
  const next = Math.max(0, item.stock + delta);
  try {
    await apiRequest("/api/inventory/" + id, {
      method: "PATCH",
      body: JSON.stringify({ quantity: next, isAvailable: next > 0 }),
    });
    item.stock = next;
    item.isAvailable = next > 0;
    renderInventory();
  } catch (error) {
    showPharmToast(error.message || "Stock update failed");
  }
}

function renderMedicineOptions() {
  const datalist = document.getElementById("medicineOptions");
  if (!datalist) return;
  datalist.innerHTML = "";
  pharmacyMedicines.forEach(function (medicine) {
    const option = document.createElement("option");
    option.value = medicine.name;
    datalist.appendChild(option);
  });
}

async function resolveMedicineForAdd(name) {
  const exact = pharmacyMedicines.find(function (medicine) {
    return normalizeText(medicine.name) === normalizeText(name);
  });
  if (exact) return exact;
  const data = await apiRequest("/api/medicines", {
    method: "POST",
    body: JSON.stringify({
      name: name,
      genericName: "",
      description: "",
      requiresPrescription: false,
    }),
  });
  const medicine = data.medicine;
  pharmacyMedicines.push(medicine);
  renderMedicineOptions();
  return medicine;
}

async function addInventoryItem() {
  if (!pharmacyProfile || !pharmacyProfile.is_approved) {
    showPharmToast("Admin approval is required before adding inventory");
    return;
  }
  const nameInput = document.getElementById("newName");
  const priceInput = document.getElementById("newPrice");
  const stockInput = document.getElementById("newStock");
  const button = document.getElementById("invAddBtn");
  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const stock = Number(stockInput.value);
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    showPharmToast("Fill medicine name, price and stock first");
    return;
  }
  try {
    button.disabled = true;
    const medicine = await resolveMedicineForAdd(name);
    await apiRequest("/api/inventory/me", {
      method: "POST",
      body: JSON.stringify({
        medicineId: medicine.id,
        quantity: stock,
        price: price,
        isAvailable: stock > 0,
      }),
    });
    nameInput.value = "";
    priceInput.value = "";
    stockInput.value = "";
    showPharmToast(name + " added to inventory");
    await loadInventory();
  } catch (error) {
    showPharmToast(error.message || "Add failed");
  } finally {
    button.disabled = false;
  }
}

async function createPharmacyProfile(event) {
  event.preventDefault();
  const button = document.getElementById("profileSetupBtn");
  const name = document.getElementById("setupPharmacyName").value.trim();
  const phone = document.getElementById("setupPhone").value.trim();
  const city = document.getElementById("setupCity").value.trim();
  const subCity = document.getElementById("setupSubCity").value.trim();
  const address = document.getElementById("setupAddress").value.trim();
  if (!name || !phone || !city) {
    showPharmToast("Pharmacy name, phone and city are required");
    return;
  }
  try {
    button.disabled = true;
    await apiRequest("/api/pharmacies/me", {
      method: "POST",
      body: JSON.stringify({
        name: name,
        phone: phone,
        city: city,
        subCity: subCity,
        address: address,
      }),
    });
    showPharmToast("Profile created. Waiting for admin approval.");
    const loaded = await loadProfile();
    if (loaded) {
      await Promise.all([loadOrders(), loadInventory()]);
      setTab("reservations");
    }
  } catch (error) {
    showPharmToast(error.message || "Could not create profile");
  } finally {
    button.disabled = false;
  }
}

async function loadProfile() {
  try {
    const data = await apiRequest("/api/pharmacies/me");
    pharmacyProfile = data.pharmacy;
    hideProfileSetup();
    renderPharmacyProfile();
    return true;
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "login.html";
      return false;
    }
    document.getElementById("pharmLocation").textContent = error.message || "Pharmacy profile not found";
    const status = document.getElementById("pharmStatus");
    status.classList.add("pending");
    status.innerHTML = '<span class="dot"></span>Profile needed';
    showProfileSetup();
    return false;
  }
}

async function loadOrders() {
  try {
    const data = await apiRequest("/api/reservations/pharmacy/me");
    pharmacyOrders = (data.reservations || []).map(mapReservationRow);
  } catch (error) {
    pharmacyOrders = [];
    showPharmToast(error.message || "Could not load reservations");
  }
  renderOrders();
}

async function loadInventory() {
  try {
    const data = await apiRequest("/api/inventory/me");
    pharmacyInventory = (data.inventory || []).map(mapInventoryRow);
  } catch (error) {
    pharmacyInventory = [];
    showPharmToast(error.message || "Could not load inventory");
  }
  renderInventory();
}

async function loadMedicines() {
  try {
    const data = await apiRequest("/api/medicines");
    pharmacyMedicines = data.medicines || [];
  } catch (error) {
    pharmacyMedicines = [];
  }
  renderMedicineOptions();
}

function showPharmToast(message) {
  const toast = document.getElementById("pharmToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(pharmacyToastTimer);
  pharmacyToastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, 3200);
}

document.addEventListener("DOMContentLoaded", function () {
  updateThemeIcon();
  if (!setupUserInfo()) return;
  document.querySelectorAll(".filter-chip[data-tab]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      if (!hasPharmacyProfile) return;
      setTab(chip.dataset.tab);
    });
  });
  document.getElementById("invAddBtn").addEventListener("click", addInventoryItem);
  document.getElementById("profileSetupForm").addEventListener("submit", createPharmacyProfile);
  loadMedicines().then(function () {
    loadProfile().then(function (loaded) {
      if (!loaded) {
        pharmacyOrders = [];
        pharmacyInventory = [];
        updateTabCounts();
        return;
      }
      Promise.all([loadOrders(), loadInventory()]).then(function () {
        setTab("reservations");
      });
    });
  });
});
