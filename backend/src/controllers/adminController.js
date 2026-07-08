const adminModel = require("../models/adminModel");

const getPharmaciesForAdmin = async (req, res) => {
  try {
    const pharmacies = await adminModel.getAllPharmacies();

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

const approvePharmacy = async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await adminModel.approvePharmacy(id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pharmacy approved successfully",
      pharmacy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve pharmacy",
      error: error.message,
    });
  }
};

const rejectPharmacy = async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await adminModel.rejectPharmacy(id);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pharmacy rejected successfully",
      pharmacy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject pharmacy",
      error: error.message,
    });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await adminModel.getDashboardStats();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

module.exports = {
  getPharmaciesForAdmin,
  approvePharmacy,
  rejectPharmacy,
  getStats,
};