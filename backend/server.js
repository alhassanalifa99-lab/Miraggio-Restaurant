require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Change this in production, and never commit it to a public repo
const WORKER_PASSWORD = process.env.WORKER_PASSWORD || 'fatawu123';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Data file paths
const dataDir = path.join(__dirname, 'data');
const branchesFile = path.join(dataDir, 'branches.json');
const menuFile = path.join(dataDir, 'menu.json');
const ordersFile = path.join(dataDir, 'orders.json');
const deliveryZonesFile = path.join(dataDir, 'delivery-zones.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Single restaurant location (Miraggio has one branch only)
const BRANCH_ID = 1;

// Helper functions to read/write data
function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// Initialize data files
function initializeData() {
  if (!fs.existsSync(branchesFile)) {
    const branch = [
      { id: BRANCH_ID, name: 'Miraggio Restaurant', location: 'Asawasi Dogo moro park', is_open: true }
    ];
    fs.writeFileSync(branchesFile, JSON.stringify(branch, null, 2));
  }

  if (!fs.existsSync(menuFile)) {
    const menuItems = [
      { id: 1, name: 'Classic Burger', description: 'Beef patty with lettuce, tomato, and special sauce', price: 25.00, category: 'Burgers', available: true },
      { id: 2, name: 'Cheese Burger', description: 'Beef patty with cheese, lettuce, and tomato', price: 30.00, category: 'Burgers', available: true },
      { id: 3, name: 'Chicken Burger', description: 'Crispy chicken fillet with coleslaw', price: 28.00, category: 'Burgers', available: true },
      { id: 4, name: 'Jollof Rice', description: 'Flavorful jollof rice with chicken', price: 35.00, category: 'Rice Meals', available: true },
      { id: 5, name: 'Fried Rice', description: 'Special fried rice with vegetables and chicken', price: 35.00, category: 'Rice Meals', available: true },
      { id: 6, name: 'Waakye', description: 'Traditional waakye with wele, egg, and fish', price: 30.00, category: 'Rice Meals', available: true },
      { id: 7, name: 'Soft Drink', description: 'Choice of soda', price: 8.00, category: 'Drinks', available: true },
      { id: 8, name: 'Bottled Water', description: '500ml bottled water', price: 5.00, category: 'Drinks', available: true },
      { id: 9, name: 'Fresh Juice', description: 'Orange or pineapple juice', price: 15.00, category: 'Drinks', available: true },
      { id: 10, name: 'French Fries', description: 'Crispy golden fries', price: 12.00, category: 'Sides', available: true },
      { id: 11, name: 'Plantain', description: 'Fried ripe plantain', price: 10.00, category: 'Sides', available: true },
      { id: 12, name: 'Salad', description: 'Fresh garden salad', price: 12.00, category: 'Sides', available: true }
    ];
    fs.writeFileSync(menuFile, JSON.stringify(menuItems, null, 2));
  }

  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(deliveryZonesFile)) {
    const zones = [
      { id: 1, name: 'Asawasi (nearby)', fee: 5.00 },
      { id: 2, name: 'Tamale Central / Aboabo', fee: 10.00 },
      { id: 3, name: 'Sagnarigu / Kalpohin', fee: 15.00 },
      { id: 4, name: 'Outside Tamale', fee: 25.00 }
    ];
    fs.writeFileSync(deliveryZonesFile, JSON.stringify(zones, null, 2));
  }
}

initializeData();

// One-time migration: if an old multi-branch file is still on disk, collapse it
// down to the single Miraggio branch and repoint any existing orders at it.
(function migrateToSingleBranch() {
  const branches = readData(branchesFile);
  if (branches.length > 1 || (branches[0] && branches[0].location !== 'Asawasi Dogo moro park')) {
    const singleBranch = [
      { id: BRANCH_ID, name: 'Miraggio Restaurant', location: 'Asawasi Dogo moro park', is_open: true }
    ];
    writeData(branchesFile, singleBranch);

    const orders = readData(ordersFile);
    const updatedOrders = orders.map(o => ({ ...o, branch_id: BRANCH_ID }));
    writeData(ordersFile, updatedOrders);
  }
})();

// Order numbers shown to customers (e.g. #223) are random, not sequential —
// and only need to be unique among TODAY's orders, so they naturally
// "reset" each day. The internal `id` field stays sequential/permanent and
// is what everything else (status updates, lookups) is keyed on.
function generateDailyOrderNumber(orders) {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todaysNumbers = new Set(
    orders
      .filter(o => (o.created_at || '').slice(0, 10) === todayStr)
      .map(o => o.order_number)
  );

  let candidate;
  do {
    candidate = Math.floor(100 + Math.random() * 900); // 100–999
  } while (todaysNumbers.has(candidate));

  return candidate;
}

// Worker auth middleware — protects status-changing endpoints.
// Frontend must send: Authorization: Bearer <password>
function requireWorkerAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token !== WORKER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// API Routes

// Get the branch (single location)
app.get('/api/branches', (req, res) => {
  const branches = readData(branchesFile);
  res.json(branches);
});

// Update branch open/closed status (worker only)
app.patch('/api/branches/:id/status', requireWorkerAuth, (req, res) => {
  const { is_open } = req.body;

  if (typeof is_open !== 'boolean') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const branches = readData(branchesFile);
    branches[0].is_open = is_open;
    writeData(branchesFile, branches);

    res.json({ success: true, is_open });
  } catch (error) {
    console.error('Error updating branch status:', error);
    res.status(500).json({ error: 'Failed to update branch status' });
  }
});

// Get all menu items
app.get('/api/menu', (req, res) => {
  const menu = readData(menuFile).filter(item => item.available);
  res.json(menu);
});

// Get delivery zones (public — customer picks one when checking out)
app.get('/api/delivery-zones', (req, res) => {
  const zones = readData(deliveryZonesFile);
  res.json(zones);
});

// Create order
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, items, delivery_type, delivery_zone_id } = req.body;

  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (delivery_type === 'delivery' && !delivery_zone_id) {
    return res.status(400).json({ error: 'delivery_zone_id is required for delivery orders' });
  }

  try {
    const menuItems = readData(menuFile);
    const branches = readData(branchesFile);
    const orders = readData(ordersFile);
    const deliveryZones = readData(deliveryZonesFile);

    const branch = branches[0];
    if (!branch || !branch.is_open) {
      return res.status(400).json({ error: 'Restaurant is currently closed' });
    }

    let itemsTotal = 0;
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(m => m.id === item.menu_item_id);
      if (menuItem) {
        itemsTotal += menuItem.price * item.quantity;
        return {
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price: menuItem.price,
          item_name: menuItem.name,
          note: (item.note || '').trim().slice(0, 200) // e.g. "no onion", "Coke not Fanta"
        };
      }
      return null;
    }).filter(Boolean);

    // Delivery zone + fee (pickup orders have no fee)
    let deliveryZone = null;
    let deliveryFee = 0;
    if (delivery_type === 'delivery') {
      deliveryZone = deliveryZones.find(z => z.id === delivery_zone_id);
      if (!deliveryZone) {
        return res.status(400).json({ error: 'Invalid delivery zone' });
      }
      deliveryFee = deliveryZone.fee;
    }

    const total = itemsTotal + deliveryFee;
    const orderNumber = generateDailyOrderNumber(orders);

    const newOrder = {
      id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
      order_number: orderNumber,
      customer_name,
      customer_phone,
      branch_id: BRANCH_ID,
      branch_name: branch.name,
      location: branch.location,
      delivery_type: delivery_type === 'delivery' ? 'delivery' : 'pickup',
      delivery_zone_name: deliveryZone ? deliveryZone.name : null,
      delivery_fee: deliveryFee,
      items_total: itemsTotal,
      total_amount: total,
      status: 'pending',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      items: orderItems
    };

    orders.push(newOrder);
    writeData(ordersFile, orders);

    res.status(201).json({
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      total_amount: total,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders (worker only)
app.get('/api/orders', requireWorkerAuth, (req, res) => {
  const { status } = req.query;

  const branches = readData(branchesFile);
  const branch = branches[0];

  let orders = readData(ordersFile).map(order => ({
    ...order,
    branch_name: branch ? branch.name : 'Unknown',
    location: branch ? branch.location : 'Unknown'
  }));

  if (status) {
    orders = orders.filter(order => order.status === status);
  }

  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(orders);
});

// Update order status (worker only)
app.patch('/api/orders/:id/status', requireWorkerAuth, (req, res) => {
  const { status } = req.body;
  const orderId = parseInt(req.params.id);

  if (!status || !['pending', 'confirmed', 'preparing', 'ready', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const orders = readData(ordersFile);
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    orders[orderIndex].status = status;
    if (status === 'confirmed') {
      orders[orderIndex].confirmed_at = new Date().toISOString();

      const confirmedOrders = orders.filter(o => o.status === 'confirmed');
      const maxQueueNumber = confirmedOrders.reduce((max, o) => Math.max(max, o.queue_number || 0), 0);
      orders[orderIndex].queue_number = maxQueueNumber + 1;
    }

    if (status === 'completed' && orders[orderIndex].queue_number) {
      const confirmedOrders = orders.filter(o =>
        o.status === 'confirmed' && o.id !== orderId
      );

      confirmedOrders.sort((a, b) => new Date(a.confirmed_at) - new Date(b.confirmed_at));

      confirmedOrders.forEach((order, index) => {
        const orderIdx = orders.findIndex(o => o.id === order.id);
        if (orderIdx !== -1) {
          orders[orderIdx].queue_number = index + 1;
        }
      });
    }

    writeData(ordersFile, orders);

    res.json({ success: true, status, queue_number: orders[orderIndex].queue_number });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get single order (public — used for order tracking)
app.get('/api/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const orders = readData(ordersFile);
  const branches = readData(branchesFile);

  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const branch = branches[0];
  if (branch) {
    order.branch_name = branch.name;
    order.location = branch.location;
  }

  res.json(order);
});

// Track order by order_number (public — used by the customer tracking page,
// so it does NOT require worker auth and does not expose other customers' data
// beyond what a customer already sees on their own confirmation page).
app.get('/api/orders/track/:orderNumber', (req, res) => {
  const orderNumber = parseInt(String(req.params.orderNumber).replace(/^0+/, ''), 10);
  const orders = readData(ordersFile);
  const branches = readData(branchesFile);

  const order = orders.find(o => o.order_number === orderNumber);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const branch = branches[0];
  if (branch) {
    order.branch_name = branch.name;
    order.location = branch.location;
  }

  res.json(order);
});

// Worker login — checks password, returns a token to use as Bearer auth
app.post('/api/worker/login', (req, res) => {
  const { password } = req.body;
  if (password === WORKER_PASSWORD) {
    return res.json({ success: true, token: WORKER_PASSWORD });
  }
  res.status(401).json({ error: 'Invalid password' });
});

// ---- MoMo Payment Routes ----
const momo = require('./momo');

// Start a payment: prompts the customer's phone for their MoMo PIN
app.post('/api/payment/momo/initiate', async (req, res) => {
  const { order_id, phone } = req.body;

  if (!order_id || !phone) {
    return res.status(400).json({ error: 'order_id and phone are required' });
  }

  try {
    const orders = readData(ordersFile);
    const order = orders.find(o => o.id === parseInt(order_id));

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const referenceId = await momo.requestToPay({
      amount: order.total_amount,
      phoneNumber: phone,
      externalId: order.id,
      payerMessage: `Miraggio order #${order.order_number}`,
      payeeNote: `Payment for order #${order.order_number}`
    });

    order.momo_reference_id = referenceId;
    order.payment_status = 'pending';
    writeData(ordersFile, orders);

    res.json({ reference_id: referenceId, status: 'pending' });
  } catch (error) {
    console.error('MoMo initiate error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to start MoMo payment' });
  }
});

// Poll this after initiate — call it every few seconds from the frontend
// until status is no longer "pending"
app.get('/api/payment/momo/status/:referenceId', async (req, res) => {
  try {
    const result = await momo.getTransactionStatus(req.params.referenceId);
    const status = result.status.toLowerCase(); // successful | failed | pending

    // Keep the order's stored payment_status in sync
    const orders = readData(ordersFile);
    const order = orders.find(o => o.momo_reference_id === req.params.referenceId);
    if (order) {
      order.payment_status = status;
      writeData(ordersFile, orders);
    }

    res.json({ status });
  } catch (error) {
    console.error('MoMo status error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to check payment status' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
