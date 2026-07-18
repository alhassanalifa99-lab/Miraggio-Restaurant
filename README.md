# Miraggio Restaurant - Fast Food Ordering System

A modern web-based ordering system for Miraggio Restaurant, located at Asawasi Dogo moro park.

## Quick Links (local dev)

Make sure both `backend` and `frontend` are running (`npm run dev` in each) before opening these.

| Site | URL |
|---|---|
| Customer ordering site | http://localhost:3000 |
| Worker login | http://localhost:3000/worker-login |
| Worker dashboard (after login) | http://localhost:3000/worker |
| Backend API (not a webpage — for reference only) | http://localhost:3001 |

## Features

- **Customer Ordering Interface**
  - Browse menu items by category (Burgers, Rice Meals, Drinks, Sides)
  - Add items to cart with quantity control
  - Add a special-instructions note per item (e.g. "no onion", "Coke not Fanta")
  - Choose **Pickup** or **Delivery** at checkout
    - Delivery orders select a delivery zone from a dropdown; each zone has its own flat fee added to the total
  - Place orders with customer details
  - Order confirmation with a random daily order number (e.g. #223) — resets each day, no two same-day orders collide
  - Order tracking with real-time status updates
  - Pay with MTN MoMo directly from the order confirmation page (see Payments section below)
  - Quick order tracking from main page

- **Worker Dashboard** (Password Protected)
  - Real password authentication against the backend (not just a client-side check)
  - View orders and filter by status
  - See each order's delivery type, zone, and any per-item customer notes
  - Confirm pending orders with queue number assignment
  - Update order status (Pending → Confirmed → Preparing → Ready → Completed)
  - Restaurant open/closed status control
  - Queue number recycling when orders complete
  - **New order alert**: dashboard polls every 15 seconds and plays a sound + shows a banner when a new order comes in
  - Logout functionality

## Tech Stack

### Frontend
- React 18
- React Router
- TailwindCSS
- Lucide Icons
- Axios
- Vite

### Backend
- Node.js
- Express
- JSON file-based storage
- Axios (for MoMo API calls)
- dotenv (for config/secrets)
- CORS

## Installation

Install dependencies separately:
```bash
cd backend
npm install
cd ../frontend
npm install
```

## Running the Application

Run backend and frontend in separate terminals:

```bash
# Backend (runs on port 3001)
cd backend
npm run dev
```

```bash
# Frontend (runs on port 3000)
cd frontend
npm run dev
```

Open the URL your frontend terminal prints — normally `http://localhost:3000`.

> Windows PowerShell note: `&&` doesn't chain commands the way it does in bash. Run each command on its own line, or separate them with `;`.

## Usage

### For Customers
1. Navigate to `http://localhost:3000`
2. Browse the menu, add items to your cart, and add a note per item if needed
3. Choose Pickup or Delivery (select your area if delivering)
4. Enter your name and phone number
5. Place your order
6. Save your order number (e.g. #223) for tracking
7. Optionally pay immediately with MTN MoMo on the confirmation page
8. Track your order status using the "Track Order" button or by entering your order number

### For Workers
1. Navigate to `http://localhost:3000/worker-login`
2. Enter the worker password (default: `fatawu123` — set via `WORKER_PASSWORD` in `backend/.env`)
3. Access the worker dashboard
4. Toggle restaurant open/closed status as needed
5. Filter orders by status
6. View order details, including delivery info and any item notes
7. Update order status as you process orders
8. Listen/watch for the new-order alert as orders come in
9. Logout when finished

## API Endpoints

### Branch
- `GET /api/branches` - Get the restaurant's info and open/closed status
- `PATCH /api/branches/:id/status` - Update open/closed status *(worker auth required)*

### Menu
- `GET /api/menu` - Get all available menu items

### Delivery Zones
- `GET /api/delivery-zones` - Get all delivery zones and their fees

### Orders
- `POST /api/orders` - Create a new order (checks if restaurant is open; accepts per-item notes and delivery info)
- `GET /api/orders` - Get all orders (supports `status` query param) *(worker auth required)*
- `GET /api/orders/:id` - Get a specific order by internal ID (used by the confirmation page)
- `GET /api/orders/track/:orderNumber` - Look up an order by its customer-facing order number (public, used by tracking page)
- `PATCH /api/orders/:id/status` - Update order status, including queue number management *(worker auth required)*

### Worker Auth
- `POST /api/worker/login` - Checks the worker password, returns a token used as `Authorization: Bearer <token>` on protected routes

### Payments (MTN MoMo)
- `POST /api/payment/momo/initiate` - Starts a MoMo "Request to Pay" for an order
- `GET /api/payment/momo/status/:referenceId` - Polls the status of a MoMo payment

## Data Storage

JSON file-based storage in `backend/data/`:
- `branches.json` - The restaurant's single location and open/closed status
- `menu.json` - Food and drink items
- `orders.json` - Customer orders, including notes, delivery info, and payment status
- `delivery-zones.json` - Delivery areas and their flat fees (edit this file directly to add/change zones)

Data files are automatically initialized with sample data on first run.

## Default Menu Items

### Burgers
- Classic Burger - GHS 25.00
- Cheese Burger - GHS 30.00
- Chicken Burger - GHS 28.00

### Rice Meals
- Jollof Rice - GHS 35.00
- Fried Rice - GHS 35.00
- Waakye - GHS 30.00

### Drinks
- Soft Drink - GHS 8.00
- Bottled Water - GHS 5.00
- Fresh Juice - GHS 15.00

### Sides
- French Fries - GHS 12.00
- Plantain - GHS 10.00
- Salad - GHS 12.00

## Default Delivery Zones

| Zone | Fee |
|---|---|
| Asawasi (nearby) | GHS 5.00 |
| Tamale Central / Aboabo | GHS 10.00 |
| Sagnarigu / Kalpohin | GHS 15.00 |
| Outside Tamale | GHS 25.00 |

Edit `backend/data/delivery-zones.json` to change these.

## Location

**Asawasi Dogo moro park** - single restaurant location (no multi-branch support)

## Security Features

- **Real worker authentication**: password checked server-side via `POST /api/worker/login`; a token is required (`Authorization: Bearer <token>`) on all order-management and branch-status endpoints
- **Default Worker Password**: `fatawu123` — change via `WORKER_PASSWORD` in `backend/.env` before going live
- **Restaurant Status Control**: workers can open/close the restaurant to prevent new orders when closed
- **Order Validation**: orders cannot be placed while closed

## Order Management System

- **Random Daily Order Numbers**: each order gets a random 3-digit number (e.g. #223), unique only among *that day's* orders — the sequence effectively resets every day
- **Queue Numbers**: assigned sequentially when orders are confirmed, and recycled as orders complete
- **Real-time Tracking**: customers track by order number via `/track-order/:orderNumber`
- **Status Progression**: Pending → Confirmed → Preparing → Ready → Completed

## Payments (MTN MoMo)

The app supports paying for an order directly with MTN Mobile Money (Collections API):

1. Register at [momodeveloper.mtn.com](https://momodeveloper.mtn.com) and subscribe to the **Collections** product to get your Subscription Key
2. Run `backend/scripts/create-momo-sandbox-user.js` once to generate your API user/key (see comments in that file)
3. Copy `backend/.env.example` to `backend/.env` and fill in `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`
4. Restart the backend — the "Pay with MTN MoMo" button on the order confirmation page will then work against MTN's sandbox

**Note:** MTN's sandbox only processes payments in EUR regardless of your real currency; production uses GHS once you have live credentials.

## Routes

### Customer Routes
- `/` - Main ordering page
- `/track-order` - Order tracking page
- `/track-order/:orderNumber` - Track a specific order
- `/order-confirmation/:orderId` - Order confirmation + MoMo payment page

### Worker Routes
- `/worker-login` - Worker login page
- `/worker` - Protected worker dashboard (requires authentication)