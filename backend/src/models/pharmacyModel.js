const pool = require("../config/db");

const createPharmacy = async ({
  userId,
  name,
  phone,
  city,
  subCity,
  address,
}) => {
  const query = `
    INSERT INTO pharmacies (user_id, name, phone, city, sub_city, address)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, name, phone, city, sub_city, address, is_approved, created_at;
  `;

  const values = [userId, name, phone, city, subCity, address];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getPharmacyByUserId = async (userId) => {
  const query = `
    SELECT id, user_id, name, phone, city, sub_city, address, is_approved, created_at
    FROM pharmacies
    WHERE user_id = $1;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

const getApprovedPharmacies = async () => {
  const query = `
    SELECT id, name, phone, city, sub_city, address, created_at
    FROM pharmacies
    WHERE is_approved = TRUE
    ORDER BY name ASC;
  `;

  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  createPharmacy,
  getPharmacyByUserId,
  getApprovedPharmacies,
};