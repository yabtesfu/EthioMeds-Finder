const pharmacyModel = require("../models/pharmacyModel");

const createMyPharmacy = async (req, res) => {
  try {
    const { name, phone, city, subCity, address } = req.body;

    if (!name || !phone || !city) {
      return res.status(400).json({
        success: false,
        message: "Pharmacy name, phone, and city are required",
      });
    }

    const existingPharmacy = await pharmacyModel.getPharmacyByUserId(
      req.user.id
    );

    if (existingPharmacy) {
      return res.status(409).json({
        success: false,
        message: "This user already has a pharmacy profile",
      });
    }

    const pharmacy = await pharmacyModel.createPharmacy({
      userId: req.user.id,
      name,
      phone,
      city,
      subCity,
      address,
    });

    return res.status(201).json({
      success: true,
      message: "Pharmacy profile created successfully and is waiting for admin approval",
      pharmacy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create pharmacy profile",
      error: error.message,
    });
  }
};

const getMyPharmacy = async (req, res) => {
  try {
    const pharmacy = await pharmacyModel.getPharmacyByUserId(req.user.id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      pharmacy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pharmacy profile",
      error: error.message,
    });
  }
};

const getPharmacies = async (req, res) => {
  try {
    const pharmacies = await pharmacyModel.getApprovedPharmacies();

    return res.status(200).json({
      success: true,
      count: pharmacies.length,
      pharmacies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pharmacies",
      error: error.message,
    });
  }
};

module.exports = {
  createMyPharmacy,
  getMyPharmacy,
  getPharmacies,
};