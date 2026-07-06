const USE_API = true;

const FORM_LABELS = {
  tablet: "Tablet",
  capsule: "Capsule",
  syrup: "Syrup",
  inhaler: "Inhaler",
  injection: "Injection",
  cream: "Cream",
  drops: "Drops",
  spray: "Nasal spray",
};

const demoInventory = buildDemoInventory();

let toastTimer = null;
let selectedReservationRow = null;
let pendingPrescriptionReservationId = null;

const PRESCRIPTION_UPLOAD_SLOTS = [
  {
    slotId: "reserveSlotFace",
    inputId: "reserveFacePhoto",
    emptyHint: "JPG or PNG, clear face",
  },
  {
    slotId: "reserveSlotId",
    inputId: "reserveIdCard",
    emptyHint: "Kebele ID, passport...",
  },
  {
    slotId: "reserveSlotPrescription",
    inputId: "reservePrescriptionFile",
    emptyHint: "Photo or PDF from your doctor",
  },
];

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
  btn.title = dark ? "Switch to light theme" : "Switch to dark theme";
}

function populateCities() {
  const citySelect = document.getElementById("citySelect");

  if (!citySelect) return;

  Object.keys(CITIES).forEach(function (city) {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });
}

function onCityChange() {
  const city = document.getElementById("citySelect").value;
  const subcitySelect = document.getElementById("subcitySelect");

  subcitySelect.innerHTML = '<option value="">All subcities</option>';

  if (city && CITIES[city]) {
    CITIES[city].forEach(function (subcity) {
      const option = document.createElement("option");
      option.value = subcity;
      option.textContent = subcity;
      subcitySelect.appendChild(option);
    });

    subcitySelect.classList.remove("hidden");
  } else {
    subcitySelect.classList.add("hidden");
  }

  runSearch();
}

function pickChip(name) {
  document.getElementById("searchInput").value = name;
  runSearch();
}

function demoSearch(query, city, subcity) {
  return demoInventory.filter(function (row) {
    return (
      (
        row.medicine.name.toLowerCase().includes(query) ||
        row.medicine.generic.toLowerCase().includes(query)
      ) &&
      (!city || row.pharmacy.city === city) &&
      (!subcity || row.pharmacy.subcity === subcity) &&
      row.stock > 0
    );
  });
}

function formatMoney(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "N/A";
  }

  return number.toFixed(2);
}

function normalizeMedicineText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\d+(\.\d+)?\s*(mg|g|mcg|ml|iu|%)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferMedicineForm(name, generic) {
  const combined = normalizeMedicineText(name + " " + generic);

  if (combined.includes("syrup")) return "syrup";
  if (combined.includes("inhaler")) return "inhaler";
  if (combined.includes("injection")) return "injection";
  if (combined.includes("cream")) return "cream";
  if (combined.includes("drops")) return "drops";
  if (combined.includes("spray")) return "spray";
  if (combined.includes("capsule")) return "capsule";
  if (combined.includes("tablet")) return "tablet";

  if (typeof MEDICINES !== "undefined") {
    const match = MEDICINES.find(function (medicine) {
      const demoName = normalizeMedicineText(medicine.name);
      const demoGeneric = normalizeMedicineText(medicine.generic);

      return (
        (demoName && (combined.includes(demoName) || demoName.includes(combined))) ||
        (demoGeneric && combined.includes(demoGeneric))
      );
    });

    if (match && match.form) {
      return match.form;
    }
  }

  return "tablet";
}

function mapApiInventoryRow(row) {
  const medicineName = row.medicine_name || "";
  const genericName = row.generic_name || "";
  const form =
    row.form ||
    row.medicine_form ||
    row.dosage_form ||
    inferMedicineForm(medicineName, genericName);

  return {
    inventoryId: row.inventory_id,

    medicine: {
      name: medicineName,
      generic: genericName,
      form: form,
      rx: Boolean(row.requires_prescription),
    },

    pharmacy: {
      name: row.pharmacy_name,
      city: row.city || "",
      subcity: row.sub_city || row.subcity || "",
      area: row.address || "",
    },

    price: Number(row.price || 0),
    stock: Number(row.quantity || 0),
  };
}

async function runSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const city = document.getElementById("citySelect").value;
  const subcity = document.getElementById("subcitySelect").value;
  const section = document.getElementById("resultsSection");

  if (!query) {
    section.classList.add("hidden");
    return;
  }

  let rows = null;

  if (USE_API) {
    try {
      const params = new URLSearchParams();

      params.set("search", query);

      if (city) {
        params.set("city", city);
      }

      const data = await apiRequest("/api/inventory/search?" + params.toString());

      rows = (data.inventory || []).map(mapApiInventoryRow);

      if (subcity) {
        rows = rows.filter(function (row) {
          return row.pharmacy.subcity === subcity;
        });
      }
    } catch (err) {
      console.warn("API search failed, using demo data:", err.message);
    }
  }

  if (!rows) {
    rows = demoSearch(query, city, subcity);
  }

  renderResults(rows.slice(0, 24), query, city, subcity);
}

function renderResults(rows, query, city, subcity) {
  const section = document.getElementById("resultsSection");
  const grid = document.getElementById("resultsGrid");
  const count = document.getElementById("resultsCount");
  const empty = document.getElementById("noResults");

  section.classList.remove("hidden");
  count.textContent = rows.length + (rows.length === 1 ? " result" : " results");
  grid.innerHTML = "";

  if (rows.length === 0) {
    const cityNote = city ? " in " + (subcity ? subcity + ", " : "") + city : "";

    empty.innerHTML =
      'No available stock found for "<strong></strong>"' +
      cityNote +
      ". Try another spelling or a different city.";

    empty.querySelector("strong").textContent = query;
    empty.classList.remove("hidden");
    grid.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.classList.remove("hidden");

  rows.forEach(function (row, index) {
    const card = document.createElement("div");

    card.className = "med-card";
    card.style.animationDelay = Math.min(index * 40, 300) + "ms";

    card.innerHTML =
      '<div class="med-top">' +
        '<div class="med-id">' +
          '<div class="med-icon"><img alt=""></div>' +
          '<div class="med-copy"><div class="med-name"></div><div class="med-generic"></div></div>' +
        '</div>' +
      '</div>' +
      '<div><div class="med-pharmacy"></div><div class="med-location"></div></div>' +
      '<div class="med-bottom">' +
        '<div><span class="med-price"></span><span class="med-stock"></span></div>' +
        '<button class="reserve-btn" type="button">Reserve</button>' +
      '</div>';

    card.querySelector(".med-icon img").src =
      "assets/meds/" + row.medicine.form + ".png";

    card.querySelector(".med-name").textContent = row.medicine.name;

    card.querySelector(".med-generic").textContent =
      row.medicine.generic +
      " \u00B7 " +
      (FORM_LABELS[row.medicine.form] || row.medicine.form);

    card.querySelector(".med-pharmacy").textContent = row.pharmacy.name;

    card.querySelector(".med-location").textContent =
      row.pharmacy.city +
      " \u00B7 " +
      row.pharmacy.subcity +
      (row.pharmacy.area ? ", " + row.pharmacy.area : "");

    card.querySelector(".med-price").textContent =
      formatMoney(row.price) + " ETB";

    card.querySelector(".med-stock").textContent =
      row.stock + " in stock";

    if (row.medicine.rx) {
      const badge = document.createElement("span");
      badge.className = "rx-badge";
      badge.textContent = "PRESCRIPTION REQUIRED";
      card.querySelector(".med-copy").appendChild(badge);
    }

    card.querySelector(".reserve-btn").addEventListener("click", function () {
      reserveMedicine(row);
    });

    grid.appendChild(card);
  });
}

function reserveMedicine(row) {
  const token = localStorage.getItem("token");

  if (!token) {
    showToast(row.medicine.name);
    return;
  }

  openReserveModal(row);
}

function showToast(medicineName) {
  const toast = document.getElementById("toast");
  const toastMed = document.getElementById("toastMed");

  if (!toast || !toastMed) return;

  toastMed.textContent = medicineName;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, 3500);
}

function setReserveQtyHint(isWarning) {
  const hint = document.getElementById("reserveQtyHint");

  if (!hint) return;

  if (isWarning) {
    hint.textContent = "Maximum available stock reached.";
    hint.classList.add("is-warning");
  } else {
    hint.textContent = "Enter a quantity between 1 and available stock.";
    hint.classList.remove("is-warning");
  }
}

function isPrescriptionRequired(row) {
  return Boolean(row && row.medicine && row.medicine.rx);
}

function getTodayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;

  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function renderReserveUploadSlot(slotId, fileName, emptyHint) {
  const slot = document.getElementById(slotId);

  if (!slot) return;

  const plus = slot.querySelector(".rx-slot-plus");
  const check = slot.querySelector(".rx-slot-check");
  const hint = slot.querySelector(".rx-slot-hint");

  slot.classList.toggle("done", Boolean(fileName));

  if (plus) {
    plus.classList.toggle("hidden", Boolean(fileName));
  }

  if (check) {
    check.classList.toggle("hidden", !fileName);
  }

  if (hint) {
    hint.textContent = fileName ? fileName + " (tap to remove)" : emptyHint;
  }
}

function wireReserveUploadSlot(slotId, inputId, emptyHint) {
  const slot = document.getElementById(slotId);
  const input = document.getElementById(inputId);

  if (!slot || !input) return;

  slot.addEventListener("click", function () {
    if (input.files && input.files[0]) {
      input.value = "";
      renderReserveUploadSlot(slotId, null, emptyHint);
      return;
    }

    input.click();
  });

  input.addEventListener("change", function () {
    const error = document.getElementById("reserveModalError");

    if (input.files && input.files[0]) {
      renderReserveUploadSlot(slotId, input.files[0].name, emptyHint);
    } else {
      renderReserveUploadSlot(slotId, null, emptyHint);
    }

    if (error) {
      error.textContent = "";
      error.classList.add("hidden");
    }
  });
}

function resetPrescriptionFields() {
  PRESCRIPTION_UPLOAD_SLOTS.forEach(function (slot) {
    const input = document.getElementById(slot.inputId);

    if (input) {
      input.value = "";
    }

    renderReserveUploadSlot(slot.slotId, null, slot.emptyHint);
  });

  const expiryInput = document.getElementById("reservePrescriptionExpiry");

  if (expiryInput) {
    expiryInput.value = "";
  }
}

function getPrescriptionUploadData() {
  const facePhoto = document.getElementById("reserveFacePhoto");
  const idCard = document.getElementById("reserveIdCard");
  const prescriptionFile = document.getElementById("reservePrescriptionFile");
  const expiryDate = document.getElementById("reservePrescriptionExpiry");

  if (!facePhoto || !idCard || !prescriptionFile || !expiryDate) {
    return { error: "Prescription upload fields are missing." };
  }

  if (!facePhoto.files || !facePhoto.files[0]) {
    return { error: "Face photo is required." };
  }

  if (!idCard.files || !idCard.files[0]) {
    return { error: "Government ID card is required." };
  }

  if (!prescriptionFile.files || !prescriptionFile.files[0]) {
    return { error: "Prescription file is required." };
  }

  if (!expiryDate.value) {
    return { error: "Prescription expiry date is required." };
  }

  const today = new Date(getTodayInputValue() + "T00:00:00");
  const expiry = new Date(expiryDate.value + "T00:00:00");

  if (expiry < today) {
    return { error: "Prescription expiry date cannot be in the past." };
  }

  return {
    facePhoto: facePhoto.files[0],
    idCard: idCard.files[0],
    prescriptionFile: prescriptionFile.files[0],
    prescriptionExpiryDate: expiryDate.value,
  };
}

function buildPrescriptionFormData(uploadData) {
  const formData = new FormData();

  formData.append("facePhoto", uploadData.facePhoto);
  formData.append("idCard", uploadData.idCard);
  formData.append("prescriptionFile", uploadData.prescriptionFile);
  formData.append("prescriptionExpiryDate", uploadData.prescriptionExpiryDate);

  return formData;
}

function showReservationSuccess(hasPrescription) {
  const form = document.getElementById("reserveModalForm");
  const successPanel = document.getElementById("reserveSuccessPanel");
  const successTitle = document.getElementById("reserveSuccessTitle");
  const successMessage = document.getElementById("reserveSuccessMessage");

  if (successTitle) {
    successTitle.textContent = hasPrescription
      ? "Reservation submitted"
      : "Reservation created";
  }

  if (successMessage) {
    successMessage.textContent = hasPrescription
      ? "Your prescription documents will be reviewed by the pharmacy."
      : "Your reservation is now pending pharmacy approval.";
  }

  if (form) {
    form.classList.add("hidden");
  }

  if (successPanel) {
    successPanel.classList.remove("hidden");
  }
}

function updateLandingNavbar() {
  const token = localStorage.getItem("token");
  const user = typeof getUser === "function" ? getUser() : null;

  const guestActions = document.getElementById("guestActions");
  const userActions = document.getElementById("userActions");
  const dashboardLink = document.getElementById("dashboardLink");

  if (!guestActions || !userActions || !dashboardLink) return;

  if (token && user) {
    guestActions.classList.add("hidden");
    userActions.classList.remove("hidden");

    if (user.role === "pharmacy") {
      dashboardLink.href = "pharmacy-dashboard.html";
      dashboardLink.textContent = "Pharmacy Dashboard";
    } else if (user.role === "admin") {
      dashboardLink.href = "admin-dashboard.html";
      dashboardLink.textContent = "Admin Dashboard";
    } else {
      dashboardLink.href = "dashboard.html";
      dashboardLink.textContent = "My Reservations";
    }
  } else {
    guestActions.classList.remove("hidden");
    userActions.classList.add("hidden");
  }
}

function openReserveModal(row) {
  selectedReservationRow = row;
  pendingPrescriptionReservationId = null;

  const modal = document.getElementById("reserveModal");
  const form = document.getElementById("reserveModalForm");
  const successPanel = document.getElementById("reserveSuccessPanel");
  const prescriptionFields = document.getElementById("reservePrescriptionFields");
  const prescriptionExpiry = document.getElementById("reservePrescriptionExpiry");
  const image = document.getElementById("reserveModalImage");
  const medicine = document.getElementById("reserveModalMedicine");
  const generic = document.getElementById("reserveModalGeneric");
  const pharmacy = document.getElementById("reserveModalPharmacy");
  const price = document.getElementById("reserveModalPrice");
  const stock = document.getElementById("reserveModalStock");
  const qtyInput = document.getElementById("reserveQtyInput");
  const total = document.getElementById("reserveModalTotal");
  const error = document.getElementById("reserveModalError");
  const rxNote = document.getElementById("reserveRxNote");

  if (form) {
    form.classList.remove("hidden");
  }

  if (successPanel) {
    successPanel.classList.add("hidden");
  }

  image.src = "assets/meds/" + row.medicine.form + ".png";

  medicine.textContent = row.medicine.name;

  generic.textContent =
    row.medicine.generic +
    " · " +
    (FORM_LABELS[row.medicine.form] || row.medicine.form);

  pharmacy.textContent =
    row.pharmacy.name + " · " + row.pharmacy.city;

  price.textContent = formatMoney(row.price) + " ETB";
  stock.textContent = row.stock;

  qtyInput.value = 1;
  qtyInput.max = row.stock;

  total.textContent = formatMoney(row.price) + " ETB";

  error.textContent = "";
  error.classList.add("hidden");
  setReserveQtyHint(false);
  resetPrescriptionFields();

  if (prescriptionExpiry) {
    prescriptionExpiry.min = getTodayInputValue();
  }

  if (isPrescriptionRequired(row)) {
    rxNote.classList.remove("hidden");
    if (prescriptionFields) {
      prescriptionFields.classList.remove("hidden");
    }
  } else {
    rxNote.classList.add("hidden");
    if (prescriptionFields) {
      prescriptionFields.classList.add("hidden");
    }
  }

  updateQtyButtons();

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReserveModal() {
  const modal = document.getElementById("reserveModal");
  const form = document.getElementById("reserveModalForm");
  const successPanel = document.getElementById("reserveSuccessPanel");
  const prescriptionFields = document.getElementById("reservePrescriptionFields");
  const error = document.getElementById("reserveModalError");

  selectedReservationRow = null;
  pendingPrescriptionReservationId = null;

  if (error) {
    error.textContent = "";
    error.classList.add("hidden");
  }

  if (form) {
    form.classList.remove("hidden");
  }

  if (successPanel) {
    successPanel.classList.add("hidden");
  }

  if (prescriptionFields) {
    prescriptionFields.classList.add("hidden");
  }

  setReserveQtyHint(false);
  resetPrescriptionFields();

  if (modal) {
    modal.classList.add("hidden");
  }

  document.body.style.overflow = "";
}

function updateQtyButtons() {
  if (!selectedReservationRow) return;

  const qtyInput = document.getElementById("reserveQtyInput");
  const minusBtn = document.getElementById("reserveQtyMinus");
  const plusBtn = document.getElementById("reserveQtyPlus");

  if (!qtyInput || !minusBtn || !plusBtn) return;

  const quantity = Number(qtyInput.value || 1);
  const stock = Number(selectedReservationRow.stock || 1);

  minusBtn.disabled = quantity <= 1;
  plusBtn.disabled = quantity >= stock;
}

function changeReserveQty(amount) {
  if (!selectedReservationRow) return;

  const qtyInput = document.getElementById("reserveQtyInput");

  if (!qtyInput) return;

  const current = Number(qtyInput.value || 1);
  const stock = Number(selectedReservationRow.stock || 1);

  let next = current + amount;

  if (next < 1) next = 1;
  if (next > stock) next = stock;

  qtyInput.value = next;

  updateReserveTotal();
  updateQtyButtons();
}

function updateReserveTotal() {
  if (!selectedReservationRow) return;

  const qtyInput = document.getElementById("reserveQtyInput");
  const total = document.getElementById("reserveModalTotal");

  if (!qtyInput || !total) return;

  let quantity = Number(qtyInput.value || 1);
  const stock = Number(selectedReservationRow.stock || 1);
  const price = Number(selectedReservationRow.price || 0);
  let reachedMaxStock = false;

  if (quantity < 1) quantity = 1;
  if (quantity > stock) {
    quantity = stock;
    reachedMaxStock = true;
  } else if (quantity === stock && stock > 0) {
    reachedMaxStock = true;
  }

  qtyInput.value = quantity;

  total.textContent = formatMoney(quantity * price) + " ETB";

  setReserveQtyHint(reachedMaxStock);
  updateQtyButtons();
}

async function confirmReservation() {
  if (!selectedReservationRow) return;

  const error = document.getElementById("reserveModalError");
  const qtyInput = document.getElementById("reserveQtyInput");
  const confirmBtn = document.getElementById("reserveConfirmBtn");
  const cancelBtn = document.getElementById("reserveCancelBtn");
  const label = document.getElementById("reserveConfirmLabel");

  error.textContent = "";
  error.classList.add("hidden");

  updateReserveTotal();

  const quantity = Number(qtyInput.value);
  const stock = Number(selectedReservationRow.stock || 0);
  const requiresPrescription = isPrescriptionRequired(selectedReservationRow);

  if (!quantity || quantity <= 0) {
    error.textContent = "Please enter a valid quantity.";
    error.classList.remove("hidden");
    return;
  }

  if (quantity > stock) {
    error.textContent = "Quantity cannot be greater than available stock.";
    error.classList.remove("hidden");
    return;
  }

  if (!selectedReservationRow.inventoryId) {
    error.textContent =
      "This is demo data. Please search using real backend inventory.";
    error.classList.remove("hidden");
    return;
  }

  let prescriptionUploadData = null;

  if (requiresPrescription) {
    prescriptionUploadData = getPrescriptionUploadData();

    if (prescriptionUploadData.error) {
      error.textContent = prescriptionUploadData.error;
      error.classList.remove("hidden");
      return;
    }
  }

  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
  label.textContent = "Reserving...";

  try {
    let reservationId = pendingPrescriptionReservationId;

    if (!reservationId) {
      const data = await apiRequest("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          pharmacyMedicineId: selectedReservationRow.inventoryId,
          quantity: quantity,
        }),
      });

      reservationId = data && data.reservation && data.reservation.id;

      if (requiresPrescription) {
        if (!reservationId) {
          throw new Error("Reservation was created, but its ID was not returned.");
        }

        pendingPrescriptionReservationId = reservationId;
      }
    }

    if (requiresPrescription) {
      label.textContent = "Uploading...";

      try {
        await apiRequest("/api/reservations/" + reservationId + "/prescription", {
          method: "POST",
          body: buildPrescriptionFormData(prescriptionUploadData),
        });
      } catch (uploadError) {
        throw new Error(
          "Reservation was created, but prescription upload failed: " +
            uploadError.message
        );
      }
    }

    pendingPrescriptionReservationId = null;
    showReservationSuccess(requiresPrescription);
  } catch (err) {
    error.textContent = err.message;
    error.classList.remove("hidden");
  } finally {
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
    label.textContent = "Confirm reservation";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateThemeIcon();
  updateLandingNavbar();
  populateCities();

  const citySelect = document.getElementById("citySelect");
  const subcitySelect = document.getElementById("subcitySelect");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  if (citySelect) {
    citySelect.addEventListener("change", onCityChange);
  }

  if (subcitySelect) {
    subcitySelect.addEventListener("change", runSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("input", runSearch);

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        runSearch();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", runSearch);
  }

  const reserveModalClose = document.getElementById("reserveModalClose");
  const reserveCancelBtn = document.getElementById("reserveCancelBtn");
  const reserveConfirmBtn = document.getElementById("reserveConfirmBtn");
  const reserveQtyInput = document.getElementById("reserveQtyInput");
  const reserveQtyMinus = document.getElementById("reserveQtyMinus");
  const reserveQtyPlus = document.getElementById("reserveQtyPlus");
  const reserveModal = document.getElementById("reserveModal");
  const reserveContinueBtn = document.getElementById("reserveContinueBtn");
  const reservePrescriptionExpiry = document.getElementById("reservePrescriptionExpiry");

  if (reserveModalClose) {
    reserveModalClose.addEventListener("click", closeReserveModal);
  }

  if (reserveCancelBtn) {
    reserveCancelBtn.addEventListener("click", closeReserveModal);
  }

  if (reserveConfirmBtn) {
    reserveConfirmBtn.addEventListener("click", confirmReservation);
  }

  if (reserveQtyInput) {
    reserveQtyInput.addEventListener("input", updateReserveTotal);
  }

  if (reserveQtyMinus) {
    reserveQtyMinus.addEventListener("click", function () {
      changeReserveQty(-1);
    });
  }

  if (reserveQtyPlus) {
    reserveQtyPlus.addEventListener("click", function () {
      changeReserveQty(1);
    });
  }

  if (reserveContinueBtn) {
    reserveContinueBtn.addEventListener("click", closeReserveModal);
  }

  PRESCRIPTION_UPLOAD_SLOTS.forEach(function (slot) {
    wireReserveUploadSlot(slot.slotId, slot.inputId, slot.emptyHint);
  });

  if (reservePrescriptionExpiry) {
    reservePrescriptionExpiry.addEventListener("input", function () {
      const error = document.getElementById("reserveModalError");

      if (error) {
        error.textContent = "";
        error.classList.add("hidden");
      }
    });
  }

  if (reserveModal) {
    reserveModal.addEventListener("click", function (event) {
      if (event.target.id === "reserveModal") {
        closeReserveModal();
      }
    });
  }

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      pickChip(chip.dataset.med);
    });
  });
});
