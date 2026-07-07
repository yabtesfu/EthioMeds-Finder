const pool = require("../config/db");

const createUser = async ({ fullName, email, passwordHash, role }) => {
  const query = `
    INSERT INTO users (full_name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, full_name, email, role, created_at;
  `;

  const values = [fullName, email, passwordHash, role];

  const result = await pool.query(query, values);

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, full_name, email, password_hash, role, created_at
    FROM users
    WHERE email = $1;
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
};