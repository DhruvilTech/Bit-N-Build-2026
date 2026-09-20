import {
  getStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
} from '../services/station.service.js';

export const getAllStations = async (req, res, next) => {
  try {
    const stations = await getStations(req.query);
    res.status(200).json({
      success: true,
      data: { stations, total: stations.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleStation = async (req, res, next) => {
  try {
    const station = await getStationById(req.params.id);
    res.status(200).json({
      success: true,
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

export const createNewStation = async (req, res, next) => {
  try {
    const station = await createStation(req.body, req.user);
    res.status(201).json({
      success: true,
      message: `Station #${station.stationId} created successfully`,
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

export const updateExistingStation = async (req, res, next) => {
  try {
    const station = await updateStation(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: `Station #${station.stationId} updated successfully`,
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

export const removeStation = async (req, res, next) => {
  try {
    const result = await deleteStation(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: `Station #${result.stationId} deleted successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
