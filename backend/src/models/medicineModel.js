const pool = require("../config/db");

const getAllMedicines = async ({ search }) => {
  let query = `
    SELECT id, name, generic_name, description, created_at
    FROM medicines
  `;

  const values = [];

  if (search) {
    query += `
      WHERE LOWER(name) LIKE LOWER($1)
      OR LOWER(generic_name) LIKE LOWER($1)
    `;
    values.push(`%${search}%`);
  }

  query += ` ORDER BY name ASC`;

  const result = await pool.query(query, values);
  return result.rows;
};

const getMedicineById = async (id) => {
  const query = `
    SELECT id, name, generic_name, description, created_at
    FROM medicines
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const createMedicine = async ({ name, genericName, description }) => {
  const query = `
    INSERT INTO medicines (name, generic_name, description)
    VALUES ($1, $2, $3)
    RETURNING id, name, generic_name, description, created_at;
  `;

  const values = [name, genericName, description];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
};