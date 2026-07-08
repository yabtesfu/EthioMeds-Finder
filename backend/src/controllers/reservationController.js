const reservationModel = require("../models/reservationModel");
const pharmacyModel = require("../models/pharmacyModel");

const createReservation = async (req, res) => {
  try {
    const { pharmacyMedicineId, quantity } = req.body;

    if (!pharmacyMedicineId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Pharmacy medicine ID and quantity are required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    const reservation = await reservationModel.createReservation({
      userId: req.user.id,
      pharmacyMedicineId,
      quantity,
    });

    return res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      reservation,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyReservations = async (req, res) => {
  try {
    const reservations = await reservationModel.getReservationsByUserId(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      count: reservations.length,
      reservations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reservations",
      error: error.message,
    });
  }
};

const cancelMyReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await reservationModel.cancelReservation({
      reservationId: id,
      userId: req.user.id,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Pending reservation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully",
      reservation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel reservation",
      error: error.message,
    });
  }
};

const getPharmacyReservations = async (req, res) => {
  try {
    const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy profile not found",
      });
    }

    const reservations = await reservationModel.getReservationsByPharmacyId(
      pharmacy.id
    );

    return res.status(200).json({
      success: true,
      count: reservations.length,
      reservations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pharmacy reservations",
      error: error.message,
    });
  }
};

const approveReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy profile not found",
      });
    }

    const reservation = await reservationModel.approveReservation({
      reservationId: id,
      pharmacyId: pharmacy.id,
    });

    return res.status(200).json({
      success: true,
      message: "Reservation approved successfully",
      reservation,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const rejectReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy profile not found",
      });
    }

    const reservation = await reservationModel.rejectReservation({
      reservationId: id,
      pharmacyId: pharmacy.id,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Pending reservation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reservation rejected successfully",
      reservation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject reservation",
      error: error.message,
    });
  }
};

const uploadPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { prescriptionExpiryDate } = req.body;

    if (!prescriptionExpiryDate) {
      return res.status(400).json({
        success: false,
        message: "Prescription expiry date is required",
      });
    }

    const today = new Date();
    const expiryDate = new Date(prescriptionExpiryDate);

    if (expiryDate < today) {
      return res.status(400).json({
        success: false,
        message: "Prescription expiry date must be valid and not expired",
      });
    }

    if (
      !req.files ||
      !req.files.facePhoto ||
      !req.files.idCard ||
      !req.files.prescriptionFile
    ) {
      return res.status(400).json({
        success: false,
        message: "Face photo, ID card, and prescription file are required",
      });
    }

    const reservation = await reservationModel.uploadPrescriptionDocuments({
      reservationId: id,
      userId: req.user.id,
      facePhotoPath: req.files.facePhoto[0].path,
      idCardPath: req.files.idCard[0].path,
      prescriptionFilePath: req.files.prescriptionFile[0].path,
      prescriptionExpiryDate,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Prescription documents uploaded successfully",
      reservation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload prescription documents",
      error: error.message,
    });
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  cancelMyReservation,
  getPharmacyReservations,
  approveReservation,
  rejectReservation,
  uploadPrescription,
};