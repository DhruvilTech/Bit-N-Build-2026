# PS-9 AI Incident Classification & Decision Support Service

High-performance, explainable **Python / FastAPI AI Service** for **PS-9 — Intelligent Emergency Response & Resource Coordination Platform**.

---

## 1. Architectural Role & Principles

1. **Dedicated AI Service**: Encapsulated microservice running on port `8000`.
2. **Node.js Remains Authoritative**: The Node.js / Express backend is the authoritative source of truth for all users, auth/RBAC, MongoDB persistence, resource tracking, and field dispatch.
3. **Fail-Safe & Non-Blocking**: The Node.js backend invokes the AI service asynchronously upon incident creation or manual trigger. If the AI service is offline, down, or encounters an internal timeout, incident creation **always succeeds without blocking**.
4. **Deterministic Life-Safety Overrides**: Pure machine learning is augmented with safety escalation rules to guarantee that critical life-safety signals (trapped occupants, hazardous material explosions, multiple fatalities) immediately escalate to `CRITICAL` severity and `P1` dispatch urgency.
5. **Explainability by Design**: Every classification response provides machine-readable reasoning for assigned category, severity, and priority, along with extracted tactical signal chips and calibrated confidence score.

---

## 2. Dataset Decision & Justification (NDEM)

The `AI/datasets/` folder contains two datasets:
- `NDEM-Daily-Situation-Statistics-Report-2026-09-19.csv` (4,888 records)
- `NDEM-Daily-Situation-Statistics-Report-HISTORIC.csv` (792 records)

### Findings from Exploratory Analysis (`AI/scripts/analyze_ndem.py`):
1. **Aggregated Administrative Statistics**: The data contains daily counts at the state/district level (e.g. `No. of Districts Affected`, `Villages Affected`, `Houses Damaged`, `Crop Affected (Ha)`).
2. **Absence of Narrative Text**: Zero (0) rows contain incident descriptions, emergency call transcripts, or caller notes.
3. **Absence of Ground Truth Triage Labels**: Neither dataset provides operational triage severity (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`) or dispatch priorities (`P1`/`P2`/`P3`/`P4`).
4. **Architectural Decision**: As instructed, this macro-statistical dataset is **not** force-fitted into text NLP classification. It is preserved for macro disaster situational analytics, while real-time incident classification uses a high-precision hybrid lexical, semantic, and deterministic safety inference engine.

---

## 3. Incident Categories (PS-9 Alignment)

- `FIRE`: Structure fires, wildfires, electrical fires, industrial burns.
- `FLOOD`: River overflows, urban flash floods, submerged roadways, drowning hazards.
- `ROAD_ACCIDENT`: Multi-vehicle collisions, highway pileups, overturned buses/trucks, pedestrian strikes.
- `INDUSTRIAL_ACCIDENT`: Chemical leaks, factory/refinery boiler explosions, hazmat spills, toxic gas plumes.
- `MEDICAL_EMERGENCY`: Cardiac arrests, strokes, severe trauma, respiratory failure, unconscious patients.
- `EARTHQUAKE`: Seismic tremors, building collapses induced by earthquakes, aftershocks.
- `OTHER`: Unclassified disturbances, utility failures, or non-specific emergency calls.

---

## 4. Severity & Operational Priority Engines

### Severity Scale:
- `CRITICAL`: Life entrapment, confirmed deaths, toxic gas/explosions, building collapse with victims.
- `HIGH`: Severe injuries, mass casualties, active flood rising, major multi-vehicle collision.
- `MEDIUM`: Localized fire, 1-2 moderate injuries, road fender-bender without entrapment.
- `LOW`: Stalled vehicles, minor trash fire, property damage with no injuries.

### Operational Priority & Safety Escalation:
- **Baseline**: `CRITICAL` → `P1`, `HIGH` → `P2`, `MEDIUM` → `P3`, `LOW` → `P4`.
- **Mandatory P1 Escalation**: Any incident with `people_trapped`, `fatalities`, or `hazardous_materials` + `explosion` escalates to **`P1`** regardless of baseline.
- **Critical Infrastructure Override**: Threats to hospitals, power stations, or dams trigger priority escalation.

### Calibrated Confidence:
- Scored strictly between `0.00` and `1.00`.
- If confidence drops below `0.70`, `isLowConfidence = true` flags the incident for immediate human operator review.

---

## 5. API Endpoints

### Health Check:
```http
GET /health
```

### Incident Classification:
```http
POST /api/v1/classify-incident
Content-Type: application/json

{
  "title": "Explosion at Chemical Plant",
  "description": "Boiler explosion at agrochemical plant. Thick toxic yellow fumes spreading. 3 workers trapped in production wing, multiple burn injuries.",
  "type": "OTHER",
  "source": "EMERGENCY_CALL",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "MIDC Industrial Area, Mumbai"
  }
}
```

Response:
```json
{
  "incidentType": "INDUSTRIAL_ACCIDENT",
  "severity": "CRITICAL",
  "priority": "P1",
  "confidence": 0.94,
  "signals": ["hazardous_materials", "explosion", "people_trapped", "injuries", "industrial", "3_people_trapped"],
  "reasoning": {
    "incidentType": "Classified as INDUSTRIAL ACCIDENT based on evidence (hazardous materials, explosion, people trapped). Overrides reported type 'OTHER' due to strong indicators.",
    "severity": "CRITICAL severity triggered by severe threat to human life: 3 persons reported trapped, Chemical / hazardous materials explosion, Injuries reported on scene.",
    "priority": "P1 EMERGENCY: Immediate emergency response required (dispatch target < 8 mins). Triggered by: Immediate life entrapment detected — mandatory P1 escalation; Chemical/explosive catastrophe risk — mandatory P1 escalation."
  },
  "suggestedCorrection": true,
  "originalType": "OTHER",
  "isLowConfidence": false,
  "model": "emergency-classifier-v1",
  "version": "1.0"
}
```

---

## 6. Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --port 8000 --reload

# Run tests
pytest tests/
```
