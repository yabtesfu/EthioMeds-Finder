const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

const createAdmin = async () => {
  try {
    const email = process.argv[2] || "admin@ethiomeds.com";
    const password = process.argv[3] || "123456";

    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email)
      DO UPDATE SET password_hash = $3, role = 'admin'
      RETURNING id, full_name, email, role;
    `;

    const values = ["System Admin", email.toLowerCase(), passwordHash];

    const result = await pool.query(query, values);

    console.log("Admin account ready:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Failed to create admin:", error.message);
  } finally {
    await pool.end();
  }
};

createAdmin();