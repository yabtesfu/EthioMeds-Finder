const API_BASE_URL = "http://localhost:5050/api";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const searchInput = document.getElementById("searchInput");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

const loadReservationsBtn = document.getElementById("loadReservationsBtn");
const reservationList = document.getElementById("reservationList");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      loginMessage.textContent = data.message;
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    loginMessage.textContent = `Logged in as ${data.user.fullName}`;
  } catch (error) {
    loginMessage.textContent = "Login failed. Make sure backend is running.";
  }
});

searchBtn.addEventListener("click", async () => {
  const search = searchInput.value;
  const city = cityInput.value;

  searchResults.innerHTML = "Loading...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/inventory/search?search=${search}&city=${city}`
    );

    const data = await response.json();

    if (!data.success || data.inventory.length === 0) {
      searchResults.innerHTML = "<p>No available medicines found.</p>";
      return;
    }

    searchResults.innerHTML = "";

    data.inventory.forEach((item) => {
      const div = document.createElement("div");
      div.className = "result-item";

      div.innerHTML = `
        <h3>${item.medicine_name}</h3>
        <p><strong>Generic Name:</strong> ${item.generic_name || "N/A"}</p>
        <p><strong>Pharmacy:</strong> ${item.pharmacy_name}</p>
        <p><strong>Location:</strong> ${item.city}, ${item.sub_city || ""}</p>
        <p><strong>Quantity:</strong> ${item.quantity}</p>
        <p><strong>Price:</strong> ${item.price || "N/A"} ETB</p>
        <button onclick="reserveMedicine(${item.inventory_id})">Reserve</button>
      `;

      searchResults.appendChild(div);
    });
  } catch (error) {
    searchResults.innerHTML = "<p>Search failed. Make sure backend is running.</p>";
  }
});

async function reserveMedicine(inventoryId) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first.");
    return;
  }

  const quantity = prompt("Enter quantity to reserve:", "1");

  if (!quantity || Number(quantity) <= 0) {
    alert("Invalid quantity.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pharmacyMedicineId: inventoryId,
        quantity: Number(quantity),
      }),
    });

    const data = await response.json();

    alert(data.message);
  } catch (error) {
    alert("Reservation failed.");
  }
}

loadReservationsBtn.addEventListener("click", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    reservationList.innerHTML = "<p>Please login first.</p>";
    return;
  }

  reservationList.innerHTML = "Loading...";

  try {
    const response = await fetch(`${API_BASE_URL}/reservations/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!data.success || data.reservations.length === 0) {
      reservationList.innerHTML = "<p>No reservations found.</p>";
      return;
    }

    reservationList.innerHTML = "";

    data.reservations.forEach((reservation) => {
      const div = document.createElement("div");
      div.className = "result-item";

      div.innerHTML = `
        <h3>${reservation.medicine_name}</h3>
        <p><strong>Pharmacy:</strong> ${reservation.pharmacy_name}</p>
        <p><strong>Quantity:</strong> ${reservation.quantity}</p>
        <p><strong>Status:</strong> <span class="status">${reservation.status}</span></p>
        <p><strong>Date:</strong> ${new Date(reservation.created_at).toLocaleString()}</p>
      `;

      reservationList.appendChild(div);
    });
  } catch (error) {
    reservationList.innerHTML = "<p>Failed to load reservations.</p>";
  }
});