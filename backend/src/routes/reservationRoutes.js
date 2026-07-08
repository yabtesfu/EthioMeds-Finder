const express = require("express");
const reservationController = require("../controllers/reservationController");
const { protect } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const uploadPrescriptionFiles = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/:id/prescription",
  protect,
  authorizeRoles("patient"),
  uploadPrescriptionFiles,
  reservationController.uploadPrescription
);

router.get(
  "/me",
  protect,
  authorizeRoles("patient"),
  reservationController.getMyReservations
);

router.patch(
  "/:id/cancel",
  protect,
  authorizeRoles("patient"),
  reservationController.cancelMyReservation
);

router.get(
  "/pharmacy/me",
  protect,
  authorizeRoles("pharmacy"),
  reservationController.getPharmacyReservations
);

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("pharmacy"),
  reservationController.approveReservation
);

router.patch(
  "/:id/reject",
  protect,
  authorizeRoles("pharmacy"),
  reservationController.rejectReservation
);

module.exports = router;