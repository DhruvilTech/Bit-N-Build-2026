import { getRoute } from '../services/routing.service.js';
import { BadRequestError } from '../utils/errors.js';

export const computeRoute = async (req, res, next) => {
  try {
    let origin = req.body?.origin;
    let destination = req.body?.destination;

    // Also support GET query parameters
    if (!origin && req.query.originLat && req.query.originLng) {
      origin = {
        latitude: parseFloat(req.query.originLat),
        longitude: parseFloat(req.query.originLng),
      };
    }
    if (!destination && req.query.destLat && req.query.destLng) {
      destination = {
        latitude: parseFloat(req.query.destLat),
        longitude: parseFloat(req.query.destLng),
      };
    }

    if (!origin || !destination) {
      throw new BadRequestError('Origin and destination coordinates are required.');
    }

    const route = await getRoute(origin, destination);

    res.status(200).json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
};
