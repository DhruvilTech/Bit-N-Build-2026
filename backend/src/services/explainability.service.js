/**
 * Service to generate structured, operator-safe explainability packages
 * from incident records and existing AI analysis data.
 *
 * Excludes any chain-of-thought or internal model weights, exposing only
 * actionable, auditable triage facts: WHAT, WHY, HOW CONFIDENT, FACTORS, and OVERRIDES.
 */

export const buildIncidentExplainability = (incidentDoc) => {
  if (!incidentDoc) {
    return null;
  }

  const ai = incidentDoc.aiAnalysis || {};
  const isFallback = Boolean(ai.fallbackUsed || ai.status === 'FALLBACK');

  // 1. Raw AI Prediction vs Final System Decision
  const rawClassification =
    ai.original?.classification || ai.classification?.type || (isFallback ? 'UNCLASSIFIED' : incidentDoc.type) || 'OTHER';
  const rawClassConfidence =
    typeof ai.classification?.confidence === 'number'
      ? ai.classification.confidence
      : typeof ai.confidence === 'number'
      ? ai.confidence
      : isFallback
      ? 0.0
      : 0.85;

  const rawSeverity =
    ai.original?.severity || ai.severityRating?.level || (isFallback ? incidentDoc.severity : incidentDoc.severity) || 'MEDIUM';
  const rawSevConfidence =
    typeof ai.severityRating?.confidence === 'number'
      ? ai.severityRating.confidence
      : isFallback
      ? 0.0
      : 0.8;

  const rawPriority =
    ai.original?.priority || ai.priorityRating?.level || incidentDoc.priority || 'P2';
  const priorityJustification =
    ai.priorityRating?.reason ||
    ai.reasoning?.priority ||
    (isFallback
      ? 'Default emergency intake priority preserved due to AI fallback'
      : `Calculated from ${rawSeverity} severity and urgency signals`);

  // Final System Result
  const finalClassification = ai.final?.classification || incidentDoc.type;
  const finalSeverity = ai.final?.severity || incidentDoc.severity;
  const finalPriority = ai.final?.priority || incidentDoc.priority;

  // Overall Confidence
  const overallConfidence = isFallback
    ? 0.0
    : Math.round(((rawClassConfidence + rawSevConfidence) / 2) * 100) / 100;

  // 2. Key Factors & Evidence Extraction
  let keyFactors = [];
  if (Array.isArray(ai.signals) && ai.signals.length > 0) {
    keyFactors = ai.signals.map((s) => String(s).trim()).filter(Boolean);
  } else {
    // Extract key contextual keywords from incident description if no AI signals exist
    const desc = `${incidentDoc.title || ''} ${incidentDoc.description || ''}`.toLowerCase();
    const emergencyKeywords = [
      'fire', 'smoke', 'explosion', 'trapped', 'collapse', 'injured', 'casualty',
      'gas leak', 'flood', 'cardiac', 'unconscious', 'weapon', 'chemical', 'hazmat',
    ];
    keyFactors = emergencyKeywords.filter((kw) => desc.includes(kw));
  }

  // Evidence snippets
  const evidence = [];
  if (incidentDoc.description) {
    evidence.push({
      type: 'NARRATIVE',
      source: incidentDoc.source || 'REPORT',
      content: incidentDoc.description.slice(0, 200),
    });
  }
  if (incidentDoc.location?.address) {
    evidence.push({
      type: 'GEO_LOCATION',
      source: 'GEOCODER',
      content: incidentDoc.location.address,
    });
  }
  if (ai.duplicate?.isDuplicate) {
    evidence.push({
      type: 'CORROBORATION',
      source: 'DUPLICATE_ENGINE',
      content: `Corroborated by related incident #${ai.duplicate.relatedIncidentId} (${Math.round(ai.duplicate.similarity * 100)}% match)`,
    });
  }

  // 3. Safety Overrides & Decision Discrepancies
  const overridesHistory = Array.isArray(ai.overrides) ? ai.overrides : [];
  const hasManualOverride = overridesHistory.length > 0;
  const hasDiscrepancy =
    rawClassification !== finalClassification ||
    rawSeverity !== finalSeverity ||
    rawPriority !== finalPriority;

  const overrideApplied = hasManualOverride || isFallback || hasDiscrepancy;
  let overrideReason = null;
  if (hasManualOverride && overridesHistory.length > 0) {
    overrideReason = overridesHistory[overridesHistory.length - 1].reason || 'Manual operator adjustment';
  } else if (isFallback) {
    overrideReason = ai.failureReason || 'Deterministic safety fallback activated to preserve emergency dispatch';
  } else if (hasDiscrepancy) {
    overrideReason = 'System safety rule adjusted initial AI prediction';
  }

  const safetyOverrides = {
    overrideApplied,
    overrideReason,
    originalAIValue: {
      classification: rawClassification,
      severity: rawSeverity,
      priority: rawPriority,
    },
    finalValue: {
      classification: finalClassification,
      severity: finalSeverity,
      priority: finalPriority,
    },
    history: overridesHistory,
  };

  // 4. Rules Triggered
  const rulesTriggered = [];
  if (['CRITICAL', 'HIGH'].includes(finalSeverity)) {
    rulesTriggered.push('High-Severity Rapid Response Escalation Rule');
  }
  if (finalPriority === 'P1') {
    rulesTriggered.push('P1 Life-Safety Priority Invariant');
  }
  if (incidentDoc.source === 'EMERGENCY_CALL') {
    rulesTriggered.push('Direct Emergency Hotline Ingestion Rule');
  }
  if (ai.duplicate?.isDuplicate) {
    rulesTriggered.push('Multi-Source Duplicate Incident Fusion Rule');
  }
  if (isFallback) {
    rulesTriggered.push('Fail-Safe Deterministic Emergency Rule (Non-blocking Fallback)');
  }
  if (ai.requiresHumanReview) {
    rulesTriggered.push('Low-Confidence / Discrepancy Operator Review Rule');
  }

  // 5. Operator-Safe Structured Narrative (WHAT, WHY, HOW CONFIDENT, FACTORS, REVIEW)
  const explanation = {
    what: `Classified as ${finalClassification} with ${finalSeverity} severity and ${finalPriority} response priority.`,
    why:
      ai.reasoning?.incidentType ||
      ai.reasoning?.severity ||
      priorityJustification ||
      `Determined from emergency triage indicators and report narrative.`,
    howConfident: isFallback
      ? '0% (AI offline - deterministic fallback active)'
      : `${Math.round(overallConfidence * 100)}% overall system confidence (Classification: ${Math.round(rawClassConfidence * 100)}%, Severity: ${Math.round(rawSevConfidence * 100)}%).`,
    keyFactorsInfluenced: keyFactors,
    humanReviewRequired: Boolean(ai.requiresHumanReview),
    humanReviewNotice: ai.requiresHumanReview
      ? (ai.reviewReason || 'Flagged for human operator review prior to final closure.')
      : 'Automated triage criteria fully satisfied.',
  };

  return {
    incidentId: incidentDoc.incidentId,
    status: ai.status || 'COMPLETED',
    classification: {
      predicted: rawClassification,
      final: finalClassification,
      confidence: rawClassConfidence,
    },
    severity: {
      predicted: rawSeverity,
      final: finalSeverity,
      confidence: rawSevConfidence,
    },
    priority: {
      predicted: rawPriority,
      final: finalPriority,
      justification: priorityJustification,
    },
    overallConfidence,
    keyFactors,
    evidence,
    rulesTriggered,
    explanation,
    safetyOverrides,
    humanReviewStatus: {
      required: Boolean(ai.requiresHumanReview),
      status: ai.humanReview?.status || (ai.requiresHumanReview ? 'PENDING' : 'NOT_REQUIRED'),
      reason: ai.reviewReason || null,
      reviewedBy: ai.humanReview?.reviewedBy || null,
      reviewedAt: ai.humanReview?.reviewedAt || null,
    },
    executionMetadata: {
      attempt: ai.attempt || 1,
      latencyMs: ai.latencyMs || 0,
      fallbackUsed: isFallback,
      errorCode: ai.errorCode || null,
      failureReason: ai.failureReason || null,
    },
    generatedAt: new Date(),
  };
};
