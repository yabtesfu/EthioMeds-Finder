const express = require("express");
const medicineController = require("../controllers/medicineController");
const { protect } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", medicineController.getMedicines);
router.get("/:id", medicineController.getMedicine);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "pharmacy"),
  medicineController.addMedicine
);

module.exports = router;