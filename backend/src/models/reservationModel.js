const pool = require("../config/db");

const createReservation = async ({ userId, pharmacyMedicineId, quantity }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inventoryQuery = `
      SELECT 
        pm.id,
        pm.quantity,
        pm.is_available,
        p.is_approved
      FROM pharmacy_medicines pm
      JOIN pharmacies p ON pm.pharmacy_id = p.id
      WHERE pm.id = $1
      FOR UPDATE OF pm;
    `;

    const inventoryResult = await client.query(inventoryQuery, [
      pharmacyMedicineId,
    ]);
    const inventory = inventoryResult.rows[0];

    if (!inventory) {
      throw new Error("Inventory item not found");
    }

    if (!inventory.is_approved) {
      throw new Error("Pharmacy is not approved");
    }

    if (!inventory.is_available || inventory.quantity < quantity) {
      throw new Error("Requested quantity is not available");
    }

    await client.query(
      `
      UPDATE pharmacy_medicines
      SET quantity = quantity - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [quantity, pharmacyMedicineId]
    );

    const query = `
      INSERT INTO reservations (user_id, pharmacy_medicine_id, quantity, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, user_id, pharmacy_medicine_id, quantity, status, created_at;
    `;

    const values = [userId, pharmacyMedicineId, quantity];

    const result = await client.query(query, values);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getReservationsByUserId = async (userId) => {
  const query = `
    SELECT
      r.id,
      r.quantity,
      r.status,
      r.created_at,
      m.name AS medicine_name,
      m.generic_name,
      m.requires_prescription,
      p.name AS pharmacy_name,
      p.phone,
      p.city,
      p.sub_city,
      pm.price,
      r.prescription_file_path
    FROM reservations r
    JOIN pharmacy_medicines pm ON r.pharmacy_medicine_id = pm.id
    JOIN medicines m ON pm.medicine_id = m.id
    JOIN pharmacies p ON pm.pharmacy_id = p.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

const getReservationsByPharmacyId = async (pharmacyId) => {
  const query = `
    SELECT
      r.id,
      r.quantity,
      r.status,
      r.created_at,
      u.full_name AS patient_name,
      u.email AS patient_email,
      m.name AS medicine_name,
      m.generic_name,
      m.requires_prescription,
      pm.price,
      r.face_photo_path,
      r.id_card_path,
      r.prescription_file_path,
      r.prescription_expiry_date,
      r.prescription_status
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN pharmacy_medicines pm ON r.pharmacy_medicine_id = pm.id
    JOIN medicines m ON pm.medicine_id = m.id
    WHERE pm.pharmacy_id = $1
    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [pharmacyId]);
  return result.rows;
};

const cancelReservation = async ({ reservationId, userId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reservationResult = await client.query(
      `
      SELECT
        r.id,
        r.quantity,
        r.status,
        r.pharmacy_medicine_id
      FROM reservations r
      JOIN pharmacy_medicines pm ON r.pharmacy_medicine_id = pm.id
      WHERE r.id = $1
      AND r.user_id = $2
      FOR UPDATE OF r, pm;
      `,
      [reservationId, userId]
    );

    const reservation = reservationResult.rows[0];

    if (!reservation || reservation.status !== "pending") {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
      UPDATE pharmacy_medicines
      SET quantity = quantity + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [reservation.quantity, reservation.pharmacy_medicine_id]
    );

    const result = await client.query(
      `
      UPDATE reservations
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING id, quantity, status, created_at;
      `,
      [reservationId]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const rejectReservation = async ({ reservationId, pharmacyId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reservationResult = await client.query(
      `
      SELECT
        r.id,
        r.quantity,
        r.status,
        r.pharmacy_medicine_id
      FROM reservations r
      JOIN pharmacy_medicines pm ON r.pharmacy_medicine_id = pm.id
      WHERE r.id = $1
      AND pm.pharmacy_id = $2
      FOR UPDATE OF r, pm;
      `,
      [reservationId, pharmacyId]
    );

    const reservation = reservationResult.rows[0];

    if (!reservation || reservation.status !== "pending") {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
      UPDATE pharmacy_medicines
      SET quantity = quantity + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [reservation.quantity, reservation.pharmacy_medicine_id]
    );

    const result = await client.query(
      `
      UPDATE reservations
      SET status = 'rejected'
      WHERE id = $1
      RETURNING id, quantity, status, created_at;
      `,
      [reservationId]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const approveReservation = async ({ reservationId, pharmacyId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reservationQuery = `
      SELECT
        r.id,
        r.status,
        pm.pharmacy_id
      FROM reservations r
      JOIN pharmacy_medicines pm ON r.pharmacy_medicine_id = pm.id
      WHERE r.id = $1
      AND pm.pharmacy_id = $2
      FOR UPDATE OF r;
    `;

    const reservationResult = await client.query(reservationQuery, [
      reservationId,
      pharmacyId,
    ]);

    const reservation = reservationResult.rows[0];

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "pending") {
      throw new Error("Only pending reservations can be approved");
    }

    const updateResult = await client.query(
      `
      UPDATE reservations
      SET status = 'approved'
      WHERE id = $1
      RETURNING id, quantity, status, created_at;
      `,
      [reservationId]
    );

    await client.query("COMMIT");

    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const uploadPrescriptionDocuments = async ({
  reservationId,
  userId,
  facePhotoPath,
  idCardPath,
  prescriptionFilePath,
  prescriptionExpiryDate,
}) => {
  const query = `
    UPDATE reservations
    SET
      face_photo_path = $3,
      id_card_path = $4,
      prescription_file_path = $5,
      prescription_expiry_date = $6,
      prescription_status = 'submitted'
    WHERE id = $1
    AND user_id = $2
    RETURNING 
      id,
      user_id,
      quantity,
      status,
      face_photo_path,
      id_card_path,
      prescription_file_path,
      prescription_expiry_date,
      prescription_status,
      created_at;
  `;

  const values = [
    reservationId,
    userId,
    facePhotoPath,
    idCardPath,
    prescriptionFilePath,
    prescriptionExpiryDate,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  createReservation,
  getReservationsByUserId,
  getReservationsByPharmacyId,
  cancelReservation,
  approveReservation,
  rejectReservation,
  uploadPrescriptionDocuments,
};
