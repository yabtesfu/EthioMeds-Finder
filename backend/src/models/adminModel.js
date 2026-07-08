const pool = require("../config/db");

const getAllPharmacies = async () => {
  const query = `
    SELECT 
      p.id,
      p.user_id,
      u.full_name AS owner_name,
      u.email AS owner_email,
      p.name,
      p.phone,
      p.city,
      p.sub_city,
      p.address,
      p.is_approved,
      p.created_at
    FROM pharmacies p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC;
  `;

  const result = await pool.query(query);
  return result.rows;
};

const approvePharmacy = async (id) => {
  const query = `
    UPDATE pharmacies
    SET is_approved = TRUE
    WHERE id = $1
    RETURNING id, name, city, is_approved;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const rejectPharmacy = async (id) => {
  const query = `
    UPDATE pharmacies
    SET is_approved = FALSE
    WHERE id = $1
    RETURNING id, name, city, is_approved;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getDashboardStats = async () => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM pharmacies) AS total_pharmacies,
      (SELECT COUNT(*) FROM pharmacies WHERE is_approved = TRUE) AS approved_pharmacies,
      (SELECT COUNT(*) FROM medicines) AS total_medicines,
      (SELECT COUNT(*) FROM reservations) AS total_reservations;
  `;

  const result = await pool.query(query);
  return result.rows[0];
};

module.exports = {
  getAllPharmacies,
  approvePharmacy,
  rejectPharmacy,
  getDashboardStats,
};