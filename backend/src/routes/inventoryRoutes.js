const express = require("express");
const inventoryController = require("../controllers/inventoryController");
const { protect } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/search", inventoryController.searchInventory);

router.get(
  "/me",
  protect,
  authorizeRoles("pharmacy"),
  inventoryController.getMyInventory
);

router.post(
  "/me",
  protect,
  authorizeRoles("pharmacy"),
  inventoryController.addMyInventory
);

router.patch(
  "/:id",
  protect,
  authorizeRoles("pharmacy", "admin"),
  inventoryController.updateMyInventory
);

module.exports = router;