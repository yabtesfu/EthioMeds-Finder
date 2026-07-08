const pool = require("../config/db");

const createReservation = async ({ userId, pharmacyMedicineId, quantity }) => {
  const inventoryQuery = `
    SELECT 
      pm.id,
      pm.quantity,
      pm.is_available,
      p.is_approved
    FROM pharmacy_medicines pm
    JOIN pharmacies p ON pm.pharmacy_id = p.id
    WHERE pm.id = $1;
  `;

  const inventoryResult = await pool.query(inventoryQuery, [pharmacyMedicineId]);
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

  const query = `
    INSERT INTO reservations (user_id, pharmacy_medicine_id, quantity)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, pharmacy_medicine_id, quantity, status, created_at;
  `;

  const values = [userId, pharmacyMedicineId, quantity];

  const result = await pool.query(query, values);
  return result.rows[0];
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
      p.name AS pharmacy_name,
      p.phone,
      p.city,
      p.sub_city,
      pm.price
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
      pm.price
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
  const query = `
    UPDATE reservations
    SET status = 'cancelled'
    WHERE id = $1
    AND user_id = $2
    AND status = 'pending'
    RETURNING id, quantity, status, created_at;
  `;

  const result = await pool.query(query, [reservationId, userId]);
  return result.rows[0];
};

const rejectReservation = async ({ reservationId, pharmacyId }) => {
  const query = `
    UPDATE reservations r
    SET status = 'rejected'
    FROM pharmacy_medicines pm
    WHERE r.pharmacy_medicine_id = pm.id
    AND r.id = $1
    AND pm.pharmacy_id = $2
    AND r.status = 'pending'
    RETURNING r.id, r.quantity, r.status, r.created_at;
  `;

  const result = await pool.query(query, [reservationId, pharmacyId]);
  return result.rows[0];
};

const approveReservation = async ({ reservationId, pharmacyId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reservationQuery = `
      SELECT
        r.id,
        r.quantity AS reserved_quantity,
        r.status,
        pm.id AS inventory_id,
        pm.quantity AS available_quantity,
        pm.pharmacy_id
      FROM reservations r
      JOIN pharmacy_medicines pm ON r.pharmacy_medicine_id = pm.id
      WHERE r.id = $1
      AND pm.pharmacy_id = $2
      FOR UPDATE;
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

    if (reservation.available_quantity < reservation.reserved_quantity) {
      throw new Error("Not enough stock to approve reservation");
    }

    await client.query(
      `
      UPDATE pharmacy_medicines
      SET quantity = quantity - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [reservation.reserved_quantity, reservation.inventory_id]
    );

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