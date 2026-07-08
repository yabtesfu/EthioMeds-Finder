const express = require("express");
const adminController = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/stats", protect, authorizeRoles("admin"), adminController.getStats);

router.get(
  "/pharmacies",
  protect,
  authorizeRoles("admin"),
  adminController.getPharmaciesForAdmin
);

router.patch(
  "/pharmacies/:id/approve",
  protect,
  authorizeRoles("admin"),
  adminController.approvePharmacy
);

router.patch(
  "/pharmacies/:id/reject",
  protect,
  authorizeRoles("admin"),
  adminController.rejectPharmacy
);

module.exports = router;