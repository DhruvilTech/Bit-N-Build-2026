# EmergenX Emergency Command Platform — Backend (Node.js & Express.js)

Production-style backend foundation and database architecture for the **EmergenX Intelligent Emergency Response & Resource Coordination Platform**.

Built using **JavaScript (ES Modules)** with Node.js, Express.js, MongoDB, and Mongoose.

---

## 🏛 Layered Architecture

```text
Routes (/api/*)
  ↓
Controllers (Request handling, HTTP status codes)
  ↓
Services (Business logic & database coordination)
  ↓
Models (Mongoose schemas & 2dsphere indexing)
  ↓
MongoDB (Atlas Cluster)
```

Directory Structure:
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection & lifecycle event listeners
│   │   └── env.js               # Environment variables loader
│   ├── controllers/
│   │   ├── auth.controller.js       # Register, login, getMe
│   │   ├── facility.controller.js   # Hospitals & shelters
│   │   ├── health.controller.js     # /api/health & /api/system/status
│   │   ├── incident.controller.js   # Incident ingestion & query
│   │   ├── resource.controller.js   # Fleet & equipment
│   │   └── team.controller.js       # Field response teams
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT verify & RBAC authorization
│   │   ├── error.middleware.js      # Centralized error handler
│   │   ├── notFound.middleware.js   # 404 handler
│   │   └── validate.middleware.js   # Zod schema validation
│   ├── models/
│   │   ├── facility.model.js        # Hospital & Shelter schema with 2dsphere geo-index
│   │   ├── incident.model.js        # Central Incident schema with 2dsphere geo-index
│   │   ├── resource.model.js        # Fleet & equipment schema with 2dsphere geo-index
│   │   ├── team.model.js            # ResponseTeam schema with 2dsphere geo-index
│   │   └── user.model.js            # User model with bcrypt password hashing
│   ├── routes/
│   │   ├── auth.routes.js           # /api/auth
│   │   ├── facility.routes.js       # /api/facilities
│   │   ├── health.routes.js         # /api/health
│   │   ├── incident.routes.js       # /api/incidents
│   │   ├── index.js                 # Master API Router
│   │   ├── resource.routes.js       # /api/resources
│   │   ├── system.routes.js         # /api/system
│   │   └── team.routes.js           # /api/teams
│   ├── seed/
│   │   └── seed.js                  # Realistic demo data populator
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── facility.service.js
│   │   ├── incident.service.js
│   │   ├── resource.service.js
│   │   └── team.service.js
│   ├── utils/
│   │   ├── errors.js                # Custom AppError classes
│   │   ├── logger.js                # Structured logging
│   │   └── response.js              # Standard { success, message, data, error } formatter
│   ├── validators/
│   │   ├── auth.validator.js        # Zod request validation
│   │   └── incident.validator.js    # Zod incident schema
│   ├── app.js                       # Express app configuration & middleware
│   └── server.js                    # Server startup & graceful shutdown
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in `backend/` (refer to `.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed the Database
Populates MongoDB with 6 authenticated users, 22 realistic incidents (including seed incident `ER-2048`), 12 resources, 8 response teams, and 8 facilities:
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Production Server
```bash
npm start
```

### 5. Automated Postman Testing (`test.json`)
Import `test.json` directly into **Postman** (File → Import) or run headlessly via Newman:
```bash
npm run test:postman
```
* Contains **24 test requests** and **46 automated assertions** covering all endpoints, positive/negative test cases, and JWT token chaining.

---

## 📡 API Endpoints

### Health & Diagnostics
* `GET /api/health` — Health check (MongoDB status, uptime, timestamp)
* `GET /api/system/status` — Comprehensive diagnostics (Node version, memory usage, DB driver)

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register new operator or admin
* `POST /api/auth/login` — Login with credentials, returns JWT
* `GET /api/auth/me` — Get authenticated user profile (Bearer token required)

### Incidents (`/api/incidents`)
* `GET /api/incidents` — List incidents with filters (`type`, `severity`, `priority`, `status`, `search`, `page`, `limit`)
* `GET /api/incidents/:id` — Get single incident by `incidentId` (e.g., `ER-2048`) or `_id`
* `POST /api/incidents` — Ingest new emergency incident

### Resources (`/api/resources`)
* `GET /api/resources` — List fleet assets & equipment (`type`, `status`)
* `GET /api/resources/:id` — Get resource by ID

### Response Teams (`/api/teams`)
* `GET /api/teams` — List field units (`FIRE`, `MEDICAL`, `POLICE`, `RESCUE`)
* `GET /api/teams/:id` — Get team by ID

### Facilities (`/api/facilities`)
* `GET /api/facilities` — List hospitals, trauma centers & shelters
* `GET /api/facilities/:id` — Get facility by ID

---

## 🔒 Security & Standards

* **Password Security**: Passwords hashed with `bcryptjs` using 10 salt rounds; excluded by default in queries and JSON responses.
* **Security Headers**: Managed with `helmet`.
* **CORS**: Configured for `CLIENT_URL`.
* **Standard Response Envelope**:
  ```json
  {
    "success": true,
    "message": "...",
    "data": {}
  }
  ```
* **Geospatial Preparedness**: All location coordinates indexed with `2dsphere` geometry for fast proximity and routing queries.
