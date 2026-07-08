const pool = require("../config/db");

const searchAvailableInventory = async ({ search, city }) => {
  let query = `
    SELECT
      pm.id AS inventory_id,
      pm.quantity,
      pm.price,
      pm.is_available,
      m.id AS medicine_id,
      m.name AS medicine_name,
      m.generic_name,
      m.requires_prescription,
      p.id AS pharmacy_id,
      p.name AS pharmacy_name,
      p.phone,
      p.city,
      p.sub_city,
      p.address
    FROM pharmacy_medicines pm
    JOIN medicines m ON pm.medicine_id = m.id
    JOIN pharmacies p ON pm.pharmacy_id = p.id
    WHERE p.is_approved = TRUE
    AND pm.is_available = TRUE
    AND pm.quantity > 0
  `;

  const values = [];

  if (search) {
    values.push(`%${search}%`);
    query += `
      AND (
        LOWER(m.name) LIKE LOWER($${values.length})
        OR LOWER(m.generic_name) LIKE LOWER($${values.length})
      )
    `;
  }

  if (city) {
    values.push(`%${city}%`);
    query += `
      AND LOWER(p.city) LIKE LOWER($${values.length})
    `;
  }

  query += `
    ORDER BY m.name ASC, p.name ASC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

const getInventoryByPharmacyId = async (pharmacyId) => {
  const query = `
    SELECT
      pm.id,
      pm.pharmacy_id,
      pm.medicine_id,
      m.name AS medicine_name,
      m.generic_name,
      m.requires_prescription,
      pm.quantity,
      pm.price,
      pm.is_available,
      pm.updated_at
    FROM pharmacy_medicines pm
    JOIN medicines m ON pm.medicine_id = m.id
    WHERE pm.pharmacy_id = $1
    ORDER BY m.name ASC;
  `;

  const result = await pool.query(query, [pharmacyId]);
  return result.rows;
};

const getInventoryById = async (id) => {
  const query = `
    SELECT id, pharmacy_id, medicine_id, quantity, price, is_available
    FROM pharmacy_medicines
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const addInventoryItem = async ({
  pharmacyId,
  medicineId,
  quantity,
  price,
  isAvailable,
}) => {
  const query = `
    INSERT INTO pharmacy_medicines 
      (pharmacy_id, medicine_id, quantity, price, is_available)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (pharmacy_id, medicine_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      price = EXCLUDED.price,
      is_available = EXCLUDED.is_available,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, pharmacy_id, medicine_id, quantity, price, is_available, updated_at;
  `;

  const values = [pharmacyId, medicineId, quantity, price, isAvailable];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateInventoryItem = async ({
  inventoryId,
  quantity,
  price,
  isAvailable,
}) => {
  const query = `
    UPDATE pharmacy_medicines
    SET 
      quantity = COALESCE($2, quantity),
      price = COALESCE($3, price),
      is_available = COALESCE($4, is_available),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, pharmacy_id, medicine_id, quantity, price, is_available, updated_at;
  `;

  const values = [
    inventoryId,
    quantity ?? null,
    price ?? null,
    isAvailable ?? null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  searchAvailableInventory,
  getInventoryByPharmacyId,
  getInventoryById,
  addInventoryItem,
  updateInventoryItem,
};
