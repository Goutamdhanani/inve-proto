# StockPilot — Technical Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Folder Structure](#4-repository-folder-structure)
5. [Backend Detailed Documentation](#5-backend-detailed-documentation)
6. [Authentication System](#6-authentication-system)
7. [Inventory System Logic](#7-inventory-system-logic)
8. [POS (Point of Sale) Workflow](#8-pos-point-of-sale-workflow)
9. [Employee Module](#9-employee-module)
10. [Reporting System](#10-reporting-system)
11. [Frontend Architecture](#11-frontend-architecture)
12. [State Management](#12-state-management)
13. [API Communication](#13-api-communication)
14. [Barcode System](#14-barcode-system)
15. [Security Considerations](#15-security-considerations)
16. [Performance Considerations](#16-performance-considerations)
17. [Deployment](#17-deployment)
18. [Future Improvements](#18-future-improvements)
19. [Conclusion](#19-conclusion)

---

## 1. Project Overview

### What is StockPilot?

StockPilot (also branded as **Inventory Avengers**) is a full-stack, multi-role inventory and point-of-sale (POS) management system built for retail businesses that operate one or more physical store locations. It provides a unified web application for tracking products, recording sales, managing staff, monitoring inventory levels, and generating business reports — all from a single dashboard.

### What Problem Does It Solve?

Small to medium retail businesses often struggle with:

- **Inventory visibility** — knowing how much stock is available across multiple locations in real time
- **Sales reconciliation** — tracking transactions, payment methods, and per-employee performance
- **Staff management** — onboarding new employees securely through an approval workflow instead of unrestricted access
- **Return handling** — processing refunds and automatically restoring stock levels
- **Audit accountability** — recording a tamper-evident log of every significant action taken in the system

StockPilot addresses each of these by providing a role-aware REST API backend and a responsive React SPA frontend.

### Who Are the Users?

The system supports three roles, each with a distinct set of privileges:

| Role | Description |
|------|-------------|
| **owner** | Full system access. Manages all stores, approves/rejects registrations, views all audit logs, promotes and suspends employees, and generates cross-store reports. |
| **manager** | Scoped to their assigned store. Can approve staff registrations for their own store, manage that store's inventory, view store-level employees, access reports, and approve normal inventory operations. Cannot promote employees to manager level. |
| **staff** | Day-to-day operational access. Can browse and manage inventory (within their store), create sales and process returns. Cannot access reports, employee management, audit logs, or approval workflows. |

### Main Capabilities

Based on the actual codebase, StockPilot includes the following features:

- **User Registration and Approval Workflow** — New users register with a pending status; owners/managers approve or reject them and assign a role and store.
- **JWT Authentication** — Stateless login with 7-day tokens, re-validated against the database on every request.
- **Product Catalogue** — Global product listing with name, category, cost/selling prices, quantity, SKU, barcode, and threshold fields.
- **Multi-Store Inventory Tracking** — Per-store inventory records (productId + storeId), with threshold-based low-stock alerts.
- **Point of Sale (POS)** — Cart-based sales interface with product search, live QR/barcode scanning (html5-qrcode), manual barcode lookup, store-scoped stock deduction, and PDF receipt generation.
- **Returns Processing** — Full return workflow that restores stock and records refund amounts.
- **Reports and Analytics** — Filterable sales reports with revenue, order count, and estimated profit. Dashboard KPIs with a 7-day revenue line chart (Chart.js).
- **Employee Management** — List, view, promote, demote, transfer, and suspend employees. Manager cross-store access is prevented at both route and middleware level.
- **Store Management** — Create, update, soft-delete stores, and assign managers.
- **Approval Requests** — Managers can submit product deletion requests that require owner approval.
- **Audit Logs** — Paginated, role-scoped log of every key action (user approvals, store changes, promotions, password changes, etc.).
- **Notifications** — In-app notification bell that polls every 30 seconds; supports per-notification and bulk mark-as-read.
- **Role-Based Access Control** — Frontend route guards (`ProtectedRoute`, `RoleRoute`) and backend middleware (`protect`, `authorize`, `authorizeStore`).
- **Owner Seed Script** — Automatically creates the owner account and demo users on first startup.
- **Password Security** — Regex-enforced strength requirement and bcrypt hashing with 10 salt rounds.

---

## 2. System Architecture

### Overview

StockPilot uses a classic three-tier web application architecture:

- **Presentation Layer** — React 18 SPA (Vite) served as static assets
- **Application Layer** — Node.js / Express REST API
- **Data Layer** — MongoDB Atlas via Mongoose ODM

### Data Flow Diagram

```
┌─────────────────────┐         HTTP/REST          ┌─────────────────────┐
│   React Frontend    │ ──────────────────────────▶ │   Express Backend   │
│   (Vite + Zustand)  │ ◀────────────────────────── │   (Node.js)         │
└─────────────────────┘       JSON responses        └──────────┬──────────┘
                                                               │ Mongoose
                                                               ▼
                                                    ┌─────────────────────┐
                                                    │  MongoDB Atlas      │
                                                    │  (Cloud Database)   │
                                                    └─────────────────────┘
```

### How Frontend Communicates with Backend

- **Development**: Vite's built-in dev server proxies all `/api/*` requests to `http://localhost:5000`, eliminating CORS issues during local development.
- **Production**: Vercel's rewrite rules (defined in `vercel.json`) forward `/api/:path*` requests to the hosted backend URL.
- **In all environments**: The frontend Axios instance uses `baseURL: '/api'`, so the same request code works in both environments without modification.

### How Backend Communicates with MongoDB

- Mongoose is used as the Object Document Mapper (ODM).
- `connectDB()` in `backend/config/db.js` calls `mongoose.connect(process.env.MONGO_URI)`.
- Each data entity is defined as a Mongoose schema in `backend/models/`.
- Relationships are expressed as `ObjectId` references (e.g., `ref: 'Store'`) and resolved using `.populate()` in route handlers.

---

## 3. Technology Stack

### Backend

| Technology | Purpose in This Project |
|-----------|------------------------|
| **Node.js** | Runtime for the Express server. Non-blocking I/O enables handling many concurrent API requests efficiently without threads. |
| **Express.js** | Minimal HTTP framework used for routing, middleware chaining, and JSON response handling. All routes are organized in separate files under `backend/routes/` and mounted in `server.js`. |
| **MongoDB** | Flexible document store well-suited for the evolving schema of inventory and sales data. Hosted on MongoDB Atlas (cloud). |
| **Mongoose** | ODM providing schema validation, type casting, pre-save hooks (e.g., password hashing), virtual fields (e.g., `profit`), and compound indexes. |
| **jsonwebtoken** | Signs and verifies JWTs for stateless authentication. Tokens carry `{ id, name, email, role, storeId }` and expire in 7 days. |
| **bcryptjs** | Hashes passwords with 10 salt rounds in a pre-save hook on the User model. Used for both hashing and comparison (`bcrypt.compare`). |
| **express-rate-limit** | Two limiters: a general limiter (500 req / 15 min) applied globally, and a tighter auth limiter (20 req / 15 min) applied only to `/api/auth`. |
| **cors** | Enables Cross-Origin Resource Sharing so the React dev server (port 5173) can communicate with the Express server (port 5000). |
| **dotenv** | Loads environment variables from `.env` into `process.env`. |

### Frontend

| Technology | Purpose in This Project |
|-----------|------------------------|
| **React 18** | Component-based UI library. All pages and UI elements are React components. Uses hooks (`useState`, `useEffect`, `useCallback`, `useRef`). |
| **Vite 5** | Build tool with native ES module support, fast HMR, and a built-in dev proxy for `/api` requests. Produces a `dist/` output for production. |
| **Tailwind CSS 3** | Utility-first CSS framework. Custom component classes (`.btn`, `.card`, `.badge`, `.form-control`, etc.) are defined with `@apply` directives in `index.css`. No separate custom CSS files are needed. |
| **Zustand 4** | Lightweight global state management for authentication state (`token`, `user`, `isAuthenticated`). Reads from and writes to `localStorage` to persist auth across page reloads. |
| **Axios 1** | HTTP client. A single Axios instance is created with `baseURL: '/api'`. Request and response interceptors handle token injection and 401 auto-logout globally. |
| **React Router 6** | Client-side routing. `<BrowserRouter>` wraps the app; `<Routes>` and `<Route>` define all page paths. `ProtectedRoute` and `RoleRoute` components gate authenticated and role-restricted pages. |
| **Chart.js 4 + react-chartjs-2** | Used on the Dashboard page to render a line chart of revenue for the last 7 days. |
| **JsBarcode** | Generates barcode SVG images for products in the Inventory page. |
| **html5-qrcode** | Provides a live camera-based QR/barcode scanner in the Sales / POS page. |
| **jsPDF** | Generates PDF receipts after a sale is completed. |
| **react-icons** | Icon library (Feather Icons set used throughout the UI). |

---

## 4. Repository Folder Structure

```
inve-proto/
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── README.md                 # Project README
├── PROJECT_DOCUMENTATION.md  # This file — full technical documentation
├── vercel.json               # Vercel deployment config (API rewrites + build settings)
│
├── backend/                  # Node.js Express API server
│   ├── server.js             # App entry point: middleware, rate limiting, route mounting, static serving
│   ├── package.json          # Backend dependencies and npm scripts
│   ├── config/
│   │   └── db.js             # MongoDB connection via Mongoose (connectDB function)
│   ├── middleware/
│   │   ├── auth.js           # protect, authorize, authorizeStore middleware
│   │   └── roleGuard.js      # Dead code — duplicate of authorize (unused)
│   ├── models/               # Mongoose schema definitions
│   │   ├── User.js           # Users with roles/status, bcrypt pre-save hook
│   │   ├── Product.js        # Global product catalogue with virtual profit field
│   │   ├── Sale.js           # Sales transactions with items array
│   │   ├── Store.js          # Store locations with managerId reference
│   │   ├── Inventory.js      # Per-store inventory records (compound unique index)
│   │   ├── Return.js         # Return/refund records
│   │   ├── Approval.js       # Approval request records (product deletions etc.)
│   │   ├── Notification.js   # User notification messages
│   │   └── AuditLog.js       # Immutable audit trail of actions
│   ├── routes/               # Express route handlers
│   │   ├── auth.js           # Login, register, change-password, logout
│   │   ├── products.js       # CRUD for products + barcode lookup
│   │   ├── sales.js          # Create and list sales transactions
│   │   ├── stores.js         # Store CRUD, manager assignment, per-store stats
│   │   ├── inventory.js      # Inventory listing and adjustment
│   │   ├── returns.js        # Create and list returns
│   │   ├── reports.js        # Dashboard KPIs and sales reports
│   │   ├── approvals.js      # User approval workflow + general approval records
│   │   ├── employees.js      # Employee listing, promote, demote, transfer, suspend, delete
│   │   ├── auditLogs.js      # Paginated audit log retrieval
│   │   └── notifications.js  # Notification retrieval and mark-as-read
│   └── scripts/
│       └── seedOwner.js      # Seeds owner account + 3 demo users on startup
│
└── frontend/                 # React SPA (Vite)
    ├── index.html            # Vite HTML entry point with <div id="root">
    ├── vite.config.js        # Vite config: React plugin, /api proxy, dist output dir
    ├── tailwind.config.js    # Tailwind config: content paths, custom primary color
    ├── postcss.config.js     # PostCSS config for Tailwind
    ├── package.json          # Frontend dependencies
    └── src/
        ├── App.jsx           # Root component — React Router route definitions
        ├── main.jsx          # React DOM entry point — mounts App into #root
        ├── index.css         # Global styles: Tailwind directives + @apply component classes
        ├── api/
        │   └── axios.js      # Axios instance, request/response interceptors, helper exports
        ├── store/
        │   └── authStore.js  # Zustand store: token, user, isAuthenticated + actions
        ├── utils/
        │   └── helpers.js    # fmt (CAD currency), fmtDate, fmtShortDate, getDayKey, getLast7Days
        ├── components/
        │   ├── ProtectedRoute.jsx        # Redirects to /login if not authenticated
        │   ├── RoleRoute.jsx             # Redirects to /forbidden if role not in allowed list
        │   ├── NotificationDropdown.jsx  # Bell icon with dropdown, 30-second polling
        │   ├── layout/
        │   │   ├── DashboardLayout.jsx   # Wrapper: Sidebar + Topbar + <main>
        │   │   ├── Sidebar.jsx           # Fixed left navigation, role-filtered nav items
        │   │   └── Topbar.jsx            # Fixed top bar: page title, role badge, notifications, logout
        │   └── ui/
        │       ├── Alert.jsx             # Contextual alert with auto-close and dismiss button
        │       ├── Badge.jsx             # Badge + RoleBadge components with variant styling
        │       ├── Card.jsx              # KPI card with title, value, icon
        │       ├── LoadingSpinner.jsx    # Animated spinner with optional text label
        │       └── Modal.jsx            # Accessible modal dialog (Escape to close, backdrop click)
        └── pages/
            ├── Login.jsx               # Login form with password toggle
            ├── Register.jsx            # Registration form with password validation
            ├── Dashboard.jsx           # KPI cards, 7-day revenue chart, top products, low stock
            ├── Inventory.jsx           # Product list with JsBarcode, add/edit/delete modals
            ├── Sales.jsx               # POS interface: product grid, cart, QR scanner, PDF receipt
            ├── Returns.jsx             # Return form and returns history
            ├── Reports.jsx             # Filterable sales report with summary KPIs
            ├── Approvals.jsx           # Approval request list (product deletions etc.)
            ├── Stores.jsx              # Store list for managers/staff
            ├── OwnerStores.jsx         # Store CRUD management for owner role
            ├── EmployeeManagement.jsx  # Employee list with promote/demote/suspend actions
            ├── EmployeeProfile.jsx     # Individual employee detail view
            ├── UserApprovals.jsx       # Pending user registration approval workflow
            ├── AuditLog.jsx            # Paginated audit log viewer (owner only)
            └── ForbiddenPage.jsx       # 403 page for role-restricted routes
```

---

## 5. Backend Detailed Documentation

### `backend/server.js`

The application entry point. It:

1. Loads environment variables via `dotenv`.
2. Calls `connectDB()` and, once connected, runs `seedOwner()` to ensure the owner account exists.
3. Defines two rate limiters using `express-rate-limit`:
   - `generalLimiter` — 500 requests per 15-minute window, applied to all routes.
   - `authLimiter` — 20 requests per 15-minute window, applied only to `/api/auth`.
4. Applies `cors()` and `express.json()` middleware globally.
5. Mounts all route modules under `/api/*`.
6. Serves the frontend static files: checks for a `frontend/dist/` production build first, falls back to `frontend/` source directory.
7. Adds a catch-all `GET *` handler that returns `index.html` (enabling React Router client-side navigation).
8. Starts the HTTP server on `process.env.PORT || 5000`.

```js
// Route mounting in server.js
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/notifications', require('./routes/notifications'));
```

---

### `backend/config/db.js`

Exports an async `connectDB()` function that:

- Calls `mongoose.connect(process.env.MONGO_URI)`.
- Logs the connected host on success.
- Logs the error and calls `process.exit(1)` on failure.

```js
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};
```

---

### `backend/middleware/auth.js`

Contains three exported middleware functions:

#### `protect`

Extracts and verifies the JWT from the `Authorization: Bearer <token>` header. Then:

1. Decodes the token using `JWT_SECRET`.
2. Fetches the **full user object from MongoDB** (not relying on stale JWT claims) using `User.findById(decoded.id).select('-passwordHash')`.
3. Checks `user.status === 'approved'`; returns 403 if not.
4. Attaches a normalized `req.user` object: `{ id, name, email, role, status, storeId, mustChangePassword }`.

```js
const protect = async (req, res, next) => {
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-passwordHash');
  if (!user) return res.status(401).json({ ... });
  if (user.status !== 'approved') return res.status(403).json({ ... });
  req.user = { id: user._id.toString(), name: user.name, email: user.email,
               role: user.role, status: user.status,
               storeId: user.storeId ? user.storeId.toString() : null,
               mustChangePassword: user.mustChangePassword };
  next();
};
```

#### `authorize(...roles)`

Returns a middleware that checks `req.user.role` against the given list of allowed roles. Returns 403 if the role is not included.

```js
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};
```

#### `authorizeStore`

Ensures non-owner users can only access data for their own store when a `storeId` is provided in the query or body:

- Owner → passes through unconditionally.
- Manager/Staff → if `requestedStoreId` doesn't match `req.user.storeId`, returns 403.

---

### Models

#### `User.js`

Represents system users. Key fields:

```js
const userSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true, lowercase: true },
  passwordHash:      { type: String, required: true },
  role:              { type: String, enum: ['owner', 'manager', 'staff'], default: 'staff' },
  status:            { type: String,
                       enum: ['pending', 'approved', 'rejected', 'suspended', 'deactivated'],
                       default: 'pending' },
  storeId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  mustChangePassword:{ type: Boolean, default: false },
  lastLogin:         { type: Date },
  createdAt:         { type: Date, default: Date.now }
});
```

**Pre-save hook** — Hashes the `passwordHash` field with bcrypt (10 salt rounds) whenever it is modified. Raw passwords must be stored into `passwordHash`; the hook will hash before saving.

```js
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});
```

**Instance method** — `matchPassword(enteredPassword)` uses `bcrypt.compare` to verify a plain-text password against the stored hash.

---

#### `Product.js`

Global product catalogue (not store-scoped). Fields:

```js
const productSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  category:     { type: String, required: true },
  costPrice:    { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity:     { type: Number, required: true, default: 0 },
  threshold:    { type: Number, default: 10 },
  sku:          { type: String, unique: true, sparse: true },
  barcode:      { type: String, default: '' },
  barcodeType:  { type: String, default: 'CODE128' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:    { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
```

**Virtual field** — `profit` computes `sellingPrice - costPrice` on the fly.

---

#### `Sale.js`

Records a completed sale transaction. Fields:

```js
const saleSchema = new mongoose.Schema({
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, sku: String, qty: Number, price: Number
  }],
  totalAmount:   { type: Number, required: true },
  subtotal:      { type: Number, default: 0 },
  tax:           { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card'], required: true },
  employeeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName:  { type: String, default: 'Walk-in' },
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  receiptNumber: { type: String, unique: true, sparse: true },
  createdAt:     { type: Date, default: Date.now }
});
```

Note: `tax` is always `0` in the current implementation (a reserved field for future use).

---

#### `Store.js`

Represents a physical retail store location:

```js
const storeSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  address:   { type: String, default: '' },
  code:      { type: String, required: true, unique: true, uppercase: true },
  phone:     { type: String, default: '' },
  email:     { type: String, default: '' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:    { type: String, enum: ['active', 'inactive'], default: 'active' },
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
```

Soft-delete is done by setting `status: 'inactive'` and `isActive: false` via `DELETE /api/stores/:id`.

---

#### `Inventory.js`

Links a product to a store with a per-location quantity. The compound unique index enforces that each product can only have one inventory record per store:

```js
const inventorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  storeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Store',   required: true },
  quantity:  { type: Number, required: true, default: 0 },
  threshold: { type: Number, default: 10 },
  updatedAt: { type: Date, default: Date.now }
});

inventorySchema.index({ productId: 1, storeId: 1 }, { unique: true });
```

---

#### `Return.js`

Records a product return and refund:

```js
const returnSchema = new mongoose.Schema({
  saleId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Sale',    required: true },
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:    { type: Number, required: true },
  reason:      { type: String,
                 enum: ['damaged', 'wrong item', 'expired', 'other'],
                 required: true },
  refundAmount:{ type: Number, required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});
```

---

#### `Approval.js`

Tracks approval requests (currently used for manager-initiated product deletions):

```js
const approvalSchema = new mongoose.Schema({
  action:      { type: String, required: true },
  description: { type: String, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  metadata:    { type: mongoose.Schema.Types.Mixed },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});
```

---

#### `Notification.js`

In-app notifications delivered to specific users:

```js
const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  read:     { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt:{ type: Date, default: Date.now }
});
```

---

#### `AuditLog.js`

Immutable record of actions taken in the system:

```js
const auditLogSchema = new mongoose.Schema({
  actorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:   { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  storeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  createdAt:{ type: Date, default: Date.now }
});
```

Recorded actions include: `create_store`, `update_store`, `delete_store`, `assign_store_manager`, `approve_user`, `reject_user`, `change_password`, `promote_employee`, `demote_employee`, `transfer_employee`, `suspend_employee`, `remove_employee`.

---

### Routes

#### `auth.js` — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/login` | Public | Validates credentials, checks status, updates `lastLogin`, returns JWT + user object |
| `POST` | `/register` | Public | Validates password regex, creates `status: 'pending'` user, notifies owners/managers |
| `POST` | `/logout` | `protect` | Stateless logout acknowledgement (client clears token) |
| `PUT` | `/change-password` | `protect` | Validates current password, updates hash, clears `mustChangePassword`, writes audit log |
| `POST` | `/forgot` | Public | Placeholder endpoint (not implemented) |

---

#### `products.js` — `/api/products`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any authenticated | Returns all products, populated with creator name |
| `GET` | `/lookup?barcode=X` | Any authenticated | Finds a product by barcode value |
| `POST` | `/` | owner, manager | Creates product; auto-generates SKU if absent; auto-creates `Inventory` record for the user's store |
| `PUT` | `/:id` | owner, manager | Updates product fields |
| `DELETE` | `/:id` | owner → deletes; manager → creates approval request | Owner deletes immediately; manager submits a deletion request for owner approval |

---

#### `sales.js` — `/api/sales`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | Any authenticated | Creates sale; deducts from `Inventory` (if `storeId`) or `Product.quantity` (single-store); generates unique receipt number |
| `GET` | `/` | Any authenticated | Returns all sales (optionally filtered by `?storeId=`), populated with employee name and store |

---

#### `stores.js` — `/api/stores`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any authenticated | Owner: all stores. Manager/Staff: their assigned store only (as single-element array) |
| `POST` | `/` | owner | Creates store, records audit log entry |
| `PUT` | `/:id` | owner | Updates store (strips `managerId` to prevent accidental override) |
| `DELETE` | `/:id` | owner | Soft-delete: sets `status: 'inactive'` and `isActive: false` |
| `PUT` | `/:id/manager` | owner | Assigns a manager user to the store |
| `GET` | `/:id/stats` | owner, manager | Returns per-store KPIs: daily/monthly revenue, total sales, staff count, inventory value, low-stock count |

---

#### `inventory.js` — `/api/inventory`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any authenticated | Manager/Staff are forced to their `storeId`; Owner can filter by `?storeId=` and `?productId=`. Returns records populated with product and store info. |
| `POST` | `/adjust` | owner, manager | Upserts an inventory record (`findOneAndUpdate` with `$set`). Manager is restricted to their own store. |

---

#### `returns.js` — `/api/returns`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | Any authenticated | Restores `Product.quantity`, creates return record |
| `GET` | `/` | Any authenticated | Returns all returns, populated with sale, product name, and processor |

---

#### `reports.js` — `/api/reports`

All routes require `protect` + `authorize('owner', 'manager')`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard` | owner, manager | Aggregates: daily revenue, monthly revenue, total sales count, inventory value, low-stock count, staff count. Optionally filtered by `?storeId=`. |
| `GET` | `/sales` | owner, manager | Filterable sales report by `startDate`, `endDate`, `paymentMethod`, `storeId`. Returns sales array + `{ totalRevenue, totalOrders, totalProfit, profitMargin }` |

---

#### `approvals.js` — `/api/approvals`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/pending-users` | owner, manager | Lists all users with `status: 'pending'` |
| `PUT` | `/users/:id/approve` | owner, manager | Sets `status: 'approved'`, assigns role/storeId, writes audit log, sends notification. Managers can only approve staff for their own store. |
| `PUT` | `/users/:id/reject` | owner, manager | Sets `status: 'rejected'`, writes audit log, sends notification |
| `GET` | `/` | Any authenticated | Owner: all approvals. Others: only their own requests. |
| `POST` | `/` | Any authenticated | Creates a generic approval request |
| `PUT` | `/:id` | owner | Approves or rejects an approval request; if `delete_product` action is approved, the product is deleted |

---

#### `employees.js` — `/api/employees`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | owner, manager | Owner: all employees (optionally filtered by `?storeId=`). Manager: own store only. |
| `GET` | `/:id` | owner, manager | Get single employee. Manager blocked from cross-store access. |
| `PUT` | `/:id/promote` | owner only (manager call returns 403) | Promotes staff → manager, writes audit log, notifies employee |
| `PUT` | `/:id/demote` | owner | Demotes manager → staff, writes audit log, notifies employee |
| `PUT` | `/:id/transfer` | owner | Transfers employee to another store, writes audit log, notifies employee |
| `PUT` | `/:id/suspend` | owner | Sets `status: 'suspended'`, writes audit log. Cannot suspend owner. |
| `DELETE` | `/:id` | owner | Removes employee, clears `managerId` on any stores they managed, writes audit log. Cannot remove owner. |

---

#### `auditLogs.js` — `/api/audit-logs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | owner, manager | Returns paginated audit logs. Owner sees all; manager sees only their store. Supports `?page=` and `?limit=` (default: page 1, 50 per page). Returns `{ success, data, total, page, pages }`. |

---

#### `notifications.js` — `/api/notifications`

All routes require `protect`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Any authenticated | Returns current user's last 50 notifications and `unreadCount` |
| `PUT` | `/read-all` | Any authenticated | Marks all of the user's notifications as read |
| `PUT` | `/:id/read` | Any authenticated | Marks a single notification as read (ownership-checked) |

---

### `backend/scripts/seedOwner.js`

Runs automatically after `connectDB()` resolves on server startup. It:

1. Looks for the owner account by `OWNER_EMAIL` (defaults to `owner@inventoryavengers.com`).
2. If the owner exists but the password is corrupted (double-hashed from a previous double-hash bug), it resets the password.
3. If the owner does not exist, creates it with `mustChangePassword: true`.
4. Seeds three demo accounts if they do not exist yet:
   - `owner@demo.com` (role: owner)
   - `manager@demo.com` (role: manager)
   - `staff@demo.com` (role: staff)
   All demo accounts use `password123` as the plaintext password (hashed by the pre-save hook).

Can also be run directly via `node scripts/seedOwner.js`.

---

## 6. Authentication System

### Step-by-Step Login Flow

1. User submits `email` + `password` to `POST /api/auth/login`.
2. Server finds the user by email (case-insensitive via `lowercase: true` in schema).
3. Calls `user.matchPassword(password)` — bcrypt compare.
4. Checks `user.status`:
   - `pending` → 403 "Your account is pending approval"
   - `rejected` → 403 "Your account registration was rejected"
   - `suspended` → 403 "Your account has been suspended"
   - `deactivated` → 403 "Your account has been deactivated"
   - Any non-`approved` value → 403 "Account is not approved"
5. Updates `user.lastLogin` to the current timestamp and saves (without re-triggering validation).
6. Signs a JWT with `{ id, name, email, role, storeId }`, expires in `JWT_EXPIRES_IN` env var (default: `7d`).
7. Returns `{ success: true, token, user: { id, name, email, role, storeId, mustChangePassword } }`.
8. Frontend stores `token` and `user` in `localStorage` and updates Zustand state.
9. Every subsequent API request attaches `Authorization: Bearer <token>` via Axios interceptor.
10. `protect` middleware re-fetches the full user from DB on every protected request to catch real-time status changes (e.g., a suspended account can no longer make requests even if their token is still valid).

### Password Strength Regex

Used at registration and password change:

```js
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
```

Requirements: at least 8 characters, one uppercase letter, one digit, one special character.

### Token Signing

```js
const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
```

---

## 7. Inventory System Logic

### Architecture

- **Products are global** — a single `Product` document represents a SKU available across all stores.
- **Inventory records are store-scoped** — the `Inventory` model links `productId + storeId` with a compound unique index, storing the quantity and threshold for that specific location.

### Auto-Creation on Product Add

When a manager or staff member creates a product, an `Inventory` record is automatically created for their store:

```js
const targetStoreId =
  req.user.role === 'manager' || req.user.role === 'staff'
    ? req.user.storeId
    : req.body.storeId || null;
if (targetStoreId) {
  await Inventory.findOneAndUpdate(
    { productId: product._id, storeId: targetStoreId },
    { $setOnInsert: { productId: product._id, storeId: targetStoreId,
                      quantity: req.body.quantity || 0, threshold: req.body.threshold || 10 } },
    { upsert: true, new: true }
  );
}
```

### Inventory Adjustment

`POST /api/inventory/adjust` upserts an `Inventory` record using `findOneAndUpdate` with the `upsert` option. Managers can only adjust inventory for their own store.

### Stock Deduction on Sale

Two modes exist depending on whether a `storeId` is provided with the sale:

- **Multi-store mode** (storeId provided): Looks up the `Inventory` record for `{ productId, storeId }`. Deducts `qty` from `inv.quantity`.
- **Single-store / legacy mode** (no storeId): Deducts `qty` directly from `product.quantity`.

### Stock Restoration on Return

Returns always restore `product.quantity` directly (not the `Inventory` record), as returns are currently not store-scoped:

```js
product.quantity += quantity;
await product.save();
```

---

## 8. POS (Point of Sale) Workflow

1. Staff opens the **Sales / POS** page (`/sales`).
2. All products are loaded from `GET /api/products`.
3. Staff can:
   - Search products by name/category in the product grid.
   - Click a product card to add it to the cart.
   - Open the barcode scanner (`html5-qrcode`) to scan a physical product.
   - Enter a barcode manually and look up via `GET /api/products/lookup?barcode=X`.
4. Cart state is managed in local React state — items can be incremented/decremented/removed.
5. Staff selects payment method (`cash` or `card`), optionally enters customer name.
6. If the user is an owner, a store selector appears to pick which store's inventory to deduct from.
7. Staff clicks **Checkout**, triggering `POST /api/sales` with:
   ```json
   { "items": [...], "totalAmount": 45.99, "paymentMethod": "cash",
     "customerName": "Jane Smith", "storeId": "<optional>" }
   ```
8. Backend validates each item:
   - Finds the product by `productId`.
   - If `storeId` provided: checks for an `Inventory` record; verifies `inv.quantity >= item.qty`.
   - Deducts the quantity and saves.
9. Backend generates a unique `receiptNumber` in format `RCP-YYYYMMDD-XXXX` (collision-checked with a loop).
10. The `Sale` document is created and returned.
11. Frontend shows a success modal with receipt details.
12. Staff can generate a PDF receipt via `jsPDF`.

---

## 9. Employee Module

### Roles and Capabilities

| Capability | Owner | Manager | Staff |
|-----------|-------|---------|-------|
| View all employees | ✅ | Own store only | ❌ |
| Promote staff → manager | ✅ | ❌ | ❌ |
| Demote manager → staff | ✅ | ❌ | ❌ |
| Transfer to another store | ✅ | ❌ | ❌ |
| Suspend account | ✅ | ❌ | ❌ |
| Remove employee | ✅ | ❌ | ❌ |
| View own employee profile | ✅ | ✅ | ✅ |

### How Role Restrictions Work

- Route-level: `authorize('owner')` or `authorize('owner', 'manager')` applied to individual routes.
- Data-level: Manager routes apply a `filter.storeId = req.user.storeId` filter before querying.
- Cross-store prevention: `GET /api/employees/:id` explicitly checks `String(employee.storeId?._id) !== String(req.user.storeId)` for managers.

### Promotion Flow

```
Owner → PUT /api/employees/:id/promote
  → employee.role = 'manager'
  → AuditLog: { action: 'promote_employee', metadata: { from: 'staff', to: 'manager' } }
  → Notification to employee: "You have been promoted to Manager."
```

### Demotion Flow

```
Owner → PUT /api/employees/:id/demote
  → employee.role = 'staff'
  → AuditLog: { action: 'demote_employee', metadata: { from: 'manager', to: 'staff' } }
  → Notification to employee: "Your role has been changed to Staff."
```

### Transfer Flow

```
Owner → PUT /api/employees/:id/transfer { storeId }
  → employee.storeId = newStoreId
  → AuditLog: { action: 'transfer_employee', metadata: { from: oldStoreId, to: newStoreId } }
  → Notification to employee: "You have been transferred to a new store."
```

---

## 10. Reporting System

### Dashboard Endpoint — `GET /api/reports/dashboard`

Aggregates the following metrics, optionally scoped to a `storeId`:

| Metric | Calculation |
|--------|-------------|
| `dailyRevenue` | Sum of `totalAmount` for sales created today |
| `monthlyRevenue` | Sum of `totalAmount` for sales created this calendar month |
| `salesCount` | Total count of all sales matching the filter |
| `inventoryValue` | Sum of `inv.quantity * inv.productId.price` for each inventory record |
| `lowStockCount` | Count of inventory records where `quantity <= threshold` |
| `staffCount` | Count of approved users with role `manager` or `staff` matching the store filter |

### Sales Report Endpoint — `GET /api/reports/sales`

Supports query filters:
- `startDate` — ISO date string, inclusive
- `endDate` — ISO date string, inclusive (time set to 23:59:59.999)
- `paymentMethod` — `cash` or `card`
- `storeId` — restricts to that store's sales

Returns:
```json
{
  "sales": [...],
  "summary": {
    "totalRevenue": 12500.00,
    "totalOrders": 85,
    "totalProfit": 2500.00,
    "profitMargin": "20.0"
  }
}
```

Note: `totalProfit` is estimated as `totalRevenue * 0.2` (hardcoded 20% margin for demo purposes).

### Per-Store Stats — `GET /api/stores/:id/stats`

In addition to the global reports endpoints, each store has its own stats endpoint that uses MongoDB aggregation pipelines:

```js
const dailySalesAgg = await Sale.aggregate([
  { $match: { storeId: storeObjId, createdAt: { $gte: todayStart } } },
  { $group: { _id: null, total: { $sum: '$totalAmount' } } }
]);
```

Returns `dailySales`, `dailyProfit` (20% of sales), `monthlySales`, `monthlyProfit`, `monthlySalesCount`, `totalSalesCount`, `totalStaff`, `inventoryValue`, and `lowStockCount`.

### Frontend Visualization

The Dashboard page uses **Chart.js** (via `react-chartjs-2`) to render a **line chart** of revenue over the last 7 days:

```js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
// ...
const chartData = {
  labels,
  datasets: [{
    label: 'Revenue ($)',
    data: labels.map((l) => revenueMap[l]),
    fill: true,
    backgroundColor: 'rgba(79,70,229,0.08)',
    borderColor: '#4f46e5',
    tension: 0.4,
  }],
};
```

---

## 11. Frontend Architecture

### Entry Points

**`frontend/src/main.jsx`** — Bootstraps React into the DOM:

```js
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**`frontend/src/App.jsx`** — Defines all client-side routes using React Router v6. The root path `/` redirects to `/dashboard`. A catch-all `*` route also redirects to `/dashboard`.

### Route Guard Components

- **`ProtectedRoute`** — Reads `isAuthenticated` from Zustand. If false, redirects to `/login`.
- **`RoleRoute`** — Checks both `isAuthenticated` and that `user.role` is in the allowed `roles` array. If not authenticated → `/login`; if wrong role → `/forbidden`.

### Layout System

Every authenticated page is wrapped in `<DashboardLayout>`, which renders:
- `<Sidebar />` — Fixed left navigation (250px wide), shows role-filtered nav items, displays "Inventory Avengers" branding.
- `<Topbar />` — Fixed top bar (60px tall), shows the page title (derived from `PAGE_TITLES` map), user's `RoleBadge`, `NotificationDropdown`, user avatar initial, and logout button.
- `<main>` — Content area with `ml-[250px] pt-[60px]` offset, padded at `p-6`.

### Pages

| Page | Route | Roles | Description |
|------|-------|-------|-------------|
| `Login.jsx` | `/login` | Public | Email/password form with show/hide toggle |
| `Register.jsx` | `/register` | Public | Registration form, submits to pending state |
| `Dashboard.jsx` | `/dashboard` | Any auth | KPI cards, 7-day revenue chart, top products, low stock, recent sales |
| `Inventory.jsx` | `/inventory` | Any auth | Product/inventory list with barcode generation, add/edit/delete |
| `Sales.jsx` | `/sales` | Any auth | POS interface with product grid, cart, QR scanner, PDF receipt |
| `Returns.jsx` | `/returns` | Any auth | Return form + returns history |
| `Reports.jsx` | `/reports` | owner, manager | Filterable sales report with summary KPIs |
| `Approvals.jsx` | `/approvals` | Any auth | Approval request list |
| `Stores.jsx` | `/stores` | owner, manager | Store list view |
| `OwnerStores.jsx` | (embedded) | owner | Full store management (create, edit, assign manager) |
| `EmployeeManagement.jsx` | `/employees` | owner, manager | Employee list with action buttons |
| `EmployeeProfile.jsx` | `/employees/:id` | owner, manager | Individual employee detail |
| `UserApprovals.jsx` | `/user-approvals` | owner, manager | Pending user registration approval queue |
| `AuditLog.jsx` | `/audit-log` | owner | Paginated audit log viewer |
| `ForbiddenPage.jsx` | `/forbidden` | Any | 403 error page |

---

## 12. State Management

### `authStore.js` (Zustand)

The single global store manages authentication state across all components:

```js
const useAuthStore = create((set, get) => ({
  token:           getStoredToken(),    // from localStorage
  user:            getStoredUser(),     // parsed JSON from localStorage
  isAuthenticated: !!getStoredToken(),

  login: async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isAuthenticated: true });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  checkRole: (...roles) => {
    const { user } = get();
    return user && roles.includes(user.role);
  },

  changePassword: async (currentPassword, newPassword) => {
    const data = await apiPut('/auth/change-password', { currentPassword, newPassword });
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
    return data;
  },
}));
```

**Persistence**: State is read from `localStorage` on initialization so authenticated sessions survive page refreshes.

**`mustChangePassword`**: After `changePassword()` succeeds, the store clears this flag on the in-memory and localStorage user object so the force-change-password prompt disappears without requiring a full re-login.

---

## 13. API Communication

### Axios Instance (`frontend/src/api/axios.js`)

A single Axios instance is created with `baseURL: '/api'`:

```js
const api = axios.create({ baseURL: '/api' });

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Helper Exports

```js
export const apiGet    = (url, params) => api.get(url, { params }).then((r) => r.data);
export const apiPost   = (url, data)   => api.post(url, data).then((r) => r.data);
export const apiPut    = (url, data)   => api.put(url, data).then((r) => r.data);
export const apiDelete = (url)         => api.delete(url).then((r) => r.data);
```

These helpers unwrap `response.data` automatically, so callers receive the JSON body directly.

### Vite Proxy (Development)

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

This transparently proxies all `/api/*` requests from the Vite dev server (port 5173) to the Express backend (port 5000), avoiding CORS issues during development.

### Vercel Rewrites (Production)

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-url.com/api/:path*"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd backend && npm install"
}
```

The second rewrite rule (`/((?!api/).*)` → `/index.html`) ensures React Router handles all non-API routes, enabling deep-link navigation (e.g., `yourdomain.com/dashboard` works on page refresh).

---

## 14. Barcode System

The barcode system consists of three integrated parts:

### Backend — Barcode Fields on Product

The `Product` model stores two barcode fields:

```js
barcode:     { type: String, default: '' },
barcodeType: { type: String, default: 'CODE128' },
```

### Backend — Barcode Lookup Endpoint

```
GET /api/products/lookup?barcode=VALUE
```

Searches for a product with an exact `barcode` match and returns the product document (with creator name populated). Returns 404 if no product is found.

### Frontend — Barcode Generation (Inventory Page)

The `Inventory.jsx` page uses **JsBarcode** to render a barcode SVG for each product:

```js
import JsBarcode from 'jsbarcode';
// ...
JsBarcode(svgRef.current, product.barcode, { format: product.barcodeType || 'CODE128' });
```

The barcode SVG can be downloaded as an image directly from the browser.

### Frontend — Barcode Scanning (Sales / POS Page)

The `Sales.jsx` page integrates **html5-qrcode** for live camera-based scanning:

```js
import { Html5QrcodeScanner } from 'html5-qrcode';
// ...
// Scanner is initialized in a modal, scanned value is looked up via
// GET /api/products/lookup?barcode=<scanned_value>
```

A manual text input also allows barcode entry without a camera.

---

## 15. Security Considerations

| Concern | Implementation |
|---------|---------------|
| **Authentication** | JWT signed with `JWT_SECRET`, expires in 7 days. Secret must be a long random string in production. |
| **Token validation on every request** | `protect` middleware re-fetches the user from MongoDB on every protected request — stale JWT claims (e.g., a suspended user's token) cannot bypass status checks. |
| **Password hashing** | bcrypt with 10 salt rounds via pre-save hook. Prevents rainbow table attacks. |
| **Password strength** | Regex enforced at registration and password change: min 8 chars, 1 uppercase, 1 digit, 1 special character. |
| **First-login password change** | Owner account is seeded with `mustChangePassword: true`. |
| **Role-based access control** | `authorize(...roles)` middleware at route level; data-level scoping for manager store isolation. |
| **Cross-store data isolation** | `authorizeStore` middleware and per-route checks prevent managers from accessing other stores' data. |
| **Rate limiting** | 500 req/15 min general, 20 req/15 min for auth routes — mitigates brute-force attacks. |
| **401 auto-logout** | Axios response interceptor clears localStorage and redirects to `/login` on any 401 response. |
| **Input validation** | Required fields validated at Mongoose schema level and at route level. |
| **No secret in JWT payload** | `passwordHash` is never included in JWT or responses. |

---

## 16. Performance Considerations

| Area | Consideration |
|------|--------------|
| **Compound index** | `{ productId: 1, storeId: 1 }` unique index on `Inventory` makes per-store inventory lookups O(log n) instead of full-collection scans. |
| **Pagination** | Audit logs use `skip`/`limit` with a `?page=` query parameter to avoid loading the full audit history at once. |
| **Vite build** | Native ES modules and Rollup bundling produce optimized chunks. HMR in development is significantly faster than Create React App. |
| **Zustand vs Context** | Zustand's selective subscription model prevents components from re-rendering when unrelated state changes. |
| **Axios interceptors** | Centralized token attachment and 401 handling reduce per-request boilerplate and avoid duplicated logic across dozens of API calls. |
| **Notification polling** | `NotificationDropdown` polls every 30 seconds — a simple interval-based approach that avoids the complexity of WebSockets while providing near-real-time updates. |
| **Promise.all for dashboard** | The dashboard fetches sales, products, and KPI stats concurrently using `Promise.all`, halving the time to first paint compared to sequential fetches. |

---

## 17. Deployment

### Development Setup

```bash
# Terminal 1 — Backend
cd backend
npm install
cp ../.env.example ../.env   # fill in MONGO_URI and JWT_SECRET
npm run dev                  # nodemon server.js, port 5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev                  # Vite dev server, port 5173 (proxies /api to 5000)
```

### Production Setup

The application can be deployed as:

1. **Backend** — Any Node.js host (Render, Railway, Fly.io, etc.):
   ```bash
   cd backend && npm install && npm start
   ```
   Set all environment variables on the platform.

2. **Frontend** — Vercel (configured via `vercel.json`):
   - `buildCommand`: `cd frontend && npm install && npm run build`
   - `outputDirectory`: `frontend/dist`
   - Update the `destination` in `vercel.json` rewrites to point to the deployed backend URL.

Alternatively, the Express server can serve the frontend directly (it falls back to `frontend/dist/` if the build exists, otherwise serves `frontend/`).

### Environment Variables

From `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the Express server | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | — |
| `JWT_SECRET` | Secret for signing JWTs | — |
| `JWT_EXPIRES_IN` | JWT expiry duration | `7d` |
| `REFRESH_TOKEN_SECRET` | Reserved (not currently used) | — |
| `REFRESH_TOKEN_EXPIRES_IN` | Reserved (not currently used) | `30d` |
| `OWNER_EMAIL` | Initial owner account email | `owner@inventoryavengers.com` |
| `OWNER_PASSWORD` | Initial owner account password | `OwnerSecure#2024` |

---

## 18. Future Improvements

Based on the current state of the codebase, the following areas are identified as incomplete, partially implemented, or absent:

- **Full refresh token flow** — `REFRESH_TOKEN_SECRET` and `REFRESH_TOKEN_EXPIRES_IN` are present in `.env.example` but not implemented in the backend.
- **Real-time notifications** — Currently uses 30-second polling. WebSockets or Server-Sent Events (SSE) would provide true real-time updates.
- **Advanced analytics** — Profit trends over time, top-selling products per store, per-employee sales performance, and inventory turnover rate are not yet implemented.
- **CSV / PDF export for reports** — The Sales page generates individual PDF receipts via `jsPDF`, but bulk report export is not yet available.
- **Full multi-store switching UI** — Owner can filter some views by store, but there is no dedicated "switch active store" context that carries across all pages automatically.
- **Barcode hardware scanner integration** — The camera-based `html5-qrcode` scanner is implemented, but integration with USB HID barcode scanners (which emit keyboard input) would require an additional key-listener approach.
- **Password reset via email** — `POST /api/auth/forgot` exists but returns a stub response. A full email-based password reset flow is not implemented.
- **Tax calculation** — The `tax` field exists on `Sale` documents and is reserved in the model, but is always set to `0`.
- **Mobile PWA** — The application is web-based but not yet a Progressive Web App. Adding a service worker and manifest would enable offline-capable mobile installation.
- **Deactivation vs. Suspension** — The `deactivated` status exists in the User model enum but there is no `PUT /api/employees/:id/deactivate` endpoint (only `suspend` is implemented).

---

## 19. Conclusion

StockPilot is a well-structured, production-oriented inventory and POS management system built with a modern JavaScript stack:

- **Backend**: Express + MongoDB/Mongoose provides a clean, RESTful API with proper separation of concerns (models, routes, middleware). The authentication system is robust: JWT-based but backed by per-request DB lookups to prevent stale-token exploits. Rate limiting, bcrypt hashing, role-based middleware, and store-scoped data isolation provide a solid security baseline.

- **Frontend**: The React 18 + Vite + Zustand + Tailwind stack is industry-standard. Component reuse (layout, UI primitives), centralized API communication (Axios instance with interceptors), and client-side route guards are all implemented correctly. The use of `@apply` directives in Tailwind keeps component styling consistent without needing a component library.

- **Data model**: The multi-store inventory model (global products linked to stores via `Inventory` join documents) is a well-chosen design that supports both single-store and multi-store deployments without schema changes.

- **Current state**: The system is functionally complete for core retail operations — product management, POS sales, inventory tracking, employee management, user approvals, audit logging, and reporting. Several advanced features (real-time notifications, full CSV exports, password reset emails, tax calculation) are reserved fields or stub implementations awaiting development.

The codebase is well-organized, follows consistent conventions, and provides a solid foundation for iterating toward a fully production-ready multi-tenant retail management platform.
