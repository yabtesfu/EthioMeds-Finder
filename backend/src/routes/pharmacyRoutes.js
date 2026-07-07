const express = require("express");
const pharmacyController = require("../controllers/pharmacyController");
const { protect } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", pharmacyController.getPharmacies);

router.post(
  "/me",
  protect,
  authorizeRoles("pharmacy"),
  pharmacyController.createMyPharmacy
);

router.get(
  "/me",
  protect,
  authorizeRoles("pharmacy"),
  pharmacyController.getMyPharmacy
);

module.exports = router;