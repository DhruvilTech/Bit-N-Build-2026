import EmergencySummaryService from '../services/emergencySummary.service.js';
import AiCommandService from '../services/aiCommand.service.js';
import { successResponse } from '../utils/response.js';

export const getIncidentEmergencySummary = async (req, res, next) => {
  try {
    const { incidentId } = req.body;
    if (!incidentId) {
      const err = new Error('incidentId is required');
      err.statusCode = 400;
      throw err;
    }

    const summary = await EmergencySummaryService.generateSummary(incidentId, req.user);
    return successResponse(res, 'AI emergency summary generated successfully', summary, 200);
  } catch (error) {
    next(error);
  }
};

export const processCommandChat = async (req, res, next) => {
  try {
    const { message, history, contextIncidentId } = req.body;
    if (!message) {
      const err = new Error('Message is required');
      err.statusCode = 400;
      throw err;
    }

    const result = await AiCommandService.processCommand({
      message,
      history,
      contextIncidentId,
      user: req.user,
    });

    return successResponse(res, 'AI operational response generated', result, 200);
  } catch (error) {
    next(error);
  }
};
