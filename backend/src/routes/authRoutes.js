const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

router.get("/me", protect, authController.getMe);

router.get("/admin-only", protect, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome admin. You are allowed to access this route.",
  });
});

router.get("/pharmacy-only", protect, authorizeRoles("pharmacy"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome pharmacy staff. You are allowed to access this route.",
  });
});

module.exports = router;