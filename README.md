# PS-9 // Intelligent Emergency Response & Resource Coordination Platform

A next-generation emergency command and operations platform prototype built for disaster-management authorities, emergency control rooms, rescue brigades, medical coordinators, and first responders.

Built for **Bit-N-Build 2026 Hackathon**.

---

## 🚀 Live Demo & Presentation Flow

1. **Launch**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173)

2. **Presentation Scenario Walkthrough**:
   - **Public Landing (`/`)**: High-tech hero visualization, multi-source data convergence diagram (Citizen Reports, 911 Calls, IoT Sensors, Drones, Hospitals converging into the Intelligent Core), and the 7-stage emergency lifecycle.
   - **Operator Authentication (`/login`)**: Futuristic split login screen with real-time biometric and station clearance selection.
   - **Command Center Dashboard (`/command-center`)**: Top 6 live KPI cards, interactive Leaflet tactical map with animated hazard perimeters and unit routes, real-time streaming incident feed, and automated situational briefing.
   - **Autonomous Simulator (`SIMULATE EMERGENCY`)**: Click the pulsing red header button to trigger an instant multi-system emergency (Industrial Fire, Highway Pileup, Flash Flood, or Hazmat Leak). Watch the event cascade live across KPI counters, map pins, AI triage classification, and autonomous unit dispatch.
   - **Incident Inspection (`/incidents/ER-2048`)**: Deep-dive into seed incident `#ER-2048` showing 94% AI classification confidence, 7 aggregated citizen/sensor reports with reliability scoring, and progressive milestone timeline.
   - **Full Geospatial Command (`/map`)**: Fullscreen tactical geospatial intelligence with layer filters, hazard radius overlays, and hospital saturation indicators.
   - **Smart Resource Coordination (`/resources`)**: AI-driven nearest-unit recommendation with distance calculation, capability matching, and 1-click dispatch.
   - **Response Teams (`/teams`)**: Roster of field units with live status, vehicle assets, and simulated two-way radio handshakes.
   - **Alerts & Escalation (`/alerts`)**: Response delay detection flags units exceeding SLA benchmarks and provides instant command escalation.
   - **Response AI Assistant (`/assistant`)**: Conversational tactical AI with animated holographic orb, real-time waveform, and dynamic situational queries.
   - **Operational Analytics (`/analytics`)**: Recharts data visualizations covering incident frequency by hour, arrival times vs target SLA, and fleet capacity.
   - **System Preferences (`/settings`)**: Theme switcher (Command Dark / Operations Light), tactical audio synth effects, and response delay threshold calibration.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + 3D Glassmorphism Design System
- **Animation**: Framer Motion + Canvas Radar Beam + Split Magnetic Cursor
- **Mapping**: Leaflet with CartoDB Dark Matter telemetry overlays
- **Visual Analytics**: Recharts
- **Icons**: Lucide React
- **Audio Feedback**: Web Audio API tactical sound synthesizer (sonars, warbles, dispatches)

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/       # MetricCards, LiveIncidentFeed
│   │   ├── layout/          # Header, Sidebar, AppLayout, NotificationsDrawer
│   │   ├── map/             # EmergencyMap (Leaflet integration)
│   │   └── ui/              # GlassCard, GlowButton, StatusBadge, SplitCursor, RadarBackground, SimulatorModal
│   ├── context/             # EmergencyContext (Central reactive live state & simulation engine)
│   ├── data/                # mockData.ts (Comprehensive incidents, teams, facilities, and scenarios)
│   ├── pages/               # All 13 major application views
│   ├── types/               # TypeScript models
│   └── utils/               # audio.ts (Tactical sound synthesis)
```