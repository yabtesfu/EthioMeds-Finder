const inventoryModel = require("../models/inventoryModel");
const pharmacyModel = require("../models/pharmacyModel");

const searchInventory = async (req, res) => {
  try {
    const { search, city } = req.query;

    const inventory = await inventoryModel.searchAvailableInventory({
      search,
      city,
    });

    return res.status(200).json({
      success: true,
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search inventory",
      error: error.message,
    });
  }
};

const getMyInventory = async (req, res) => {
  try {
    const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy profile not found",
      });
    }

    const inventory = await inventoryModel.getInventoryByPharmacyId(pharmacy.id);

    return res.status(200).json({
      success: true,
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: error.message,
    });
  }
};

const addMyInventory = async (req, res) => {
  try {
    const { medicineId, quantity, price, isAvailable } = req.body;

    if (!medicineId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Medicine ID and quantity are required",
      });
    }

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy profile not found",
      });
    }

    if (!pharmacy.is_approved) {
      return res.status(403).json({
        success: false,
        message: "Your pharmacy must be approved before adding inventory",
      });
    }

    const inventoryItem = await inventoryModel.addInventoryItem({
      pharmacyId: pharmacy.id,
      medicineId,
      quantity,
      price,
      isAvailable: isAvailable ?? true,
    });

    return res.status(201).json({
      success: true,
      message: "Inventory item saved successfully",
      inventoryItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save inventory item",
      error: error.message,
    });
  }
};

const updateMyInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, price, isAvailable } = req.body;

    const inventoryItem = await inventoryModel.getInventoryById(id);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    if (req.user.role === "pharmacy") {
      const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

      if (!pharmacy || pharmacy.id !== inventoryItem.pharmacy_id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own pharmacy inventory",
        });
      }
    }

    const updatedItem = await inventoryModel.updateInventoryItem({
      inventoryId: id,
      quantity,
      price,
      isAvailable,
    });

    return res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      inventoryItem: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update inventory item",
      error: error.message,
    });
  }
};

module.exports = {
  searchInventory,
  getMyInventory,
  addMyInventory,
  updateMyInventory,
};