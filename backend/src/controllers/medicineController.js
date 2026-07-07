const medicineModel = require("../models/medicineModel");

const getMedicines = async (req, res) => {
  try {
    const { search } = req.query;

    const medicines = await medicineModel.getAllMedicines({ search });

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch medicines",
      error: error.message,
    });
  }
};

const getMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    const medicine = await medicineModel.getMedicineById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.status(200).json({
      success: true,
      medicine,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch medicine",
      error: error.message,
    });
  }
};

const addMedicine = async (req, res) => {
  try {
    const { name, genericName, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Medicine name is required",
      });
    }

    const medicine = await medicineModel.createMedicine({
      name,
      genericName,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Medicine created successfully",
      medicine,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create medicine",
      error: error.message,
    });
  }
};

module.exports = {
  getMedicines,
  getMedicine,
  addMedicine,
};