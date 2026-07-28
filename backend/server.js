require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Change this in production, and never commit it to a public repo
const WORKER_PASSWORD = process.env.WORKER_PASSWORD || 'fatawu123';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Single restaurant location (Miraggio has one branch only)
const BRANCH_ID = 1;

// Order numbers shown to customers (e.g. #223) are random, not sequential —
// and only need to be unique among TODAY's orders, so they naturally
// "reset" each day. The internal `id` (a Postgres serial) stays permanent
// and is what everything else (status updates, lookups) is keyed on.
async function generateDailyOrderNumber() {
  const { rows } = await pool.query(
    `select order_number from orders where created_at >= date_trunc('day', now())`
  );
  const todaysNumbers = new Set(rows.map(r => r.order_number));

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
app.get('/api/branches', async (req, res) => {
  try {
    const { rows } = await pool.query('select * from branches');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching branches:', error.message);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

// Update branch open/closed status (worker only)
app.patch('/api/branches/:id/status', requireWorkerAuth, async (req, res) => {
  const { is_open } = req.body;

  if (typeof is_open !== 'boolean') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await pool.query('update branches set is_open = $1 where id = $2', [is_open, BRANCH_ID]);
    res.json({ success: true, is_open });
  } catch (error) {
    console.error('Error updating branch status:', error.message);
    res.status(500).json({ error: 'Failed to update branch status' });
  }
});

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const { rows } = await pool.query('select * from menu_items where available = true');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching menu:', error.message);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Get delivery zones (public — customer picks one when checking out)
app.get('/api/delivery-zones', async (req, res) => {
  try {
    const { rows } = await pool.query('select * from delivery_zones');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching delivery zones:', error.message);
    res.status(500).json({ error: 'Failed to fetch delivery zones' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, items, delivery_type, delivery_zone_id } = req.body;

  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (delivery_type === 'delivery' && !delivery_zone_id) {
    return res.status(400).json({ error: 'delivery_zone_id is required for delivery orders' });
  }

  try {
    const { rows: menuRows } = await pool.query('select * from menu_items');
    const { rows: branchRows } = await pool.query('select * from branches where id = $1', [BRANCH_ID]);

    const branch = branchRows[0];
    if (!branch || !branch.is_open) {
      return res.status(400).json({ error: 'Restaurant is currently closed' });
    }

    let itemsTotal = 0;
    const orderItems = items.map(item => {
      const menuItem = menuRows.find(m => m.id === item.menu_item_id);
      if (menuItem) {
        const price = parseFloat(menuItem.price);
        itemsTotal += price * item.quantity;
        return {
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price,
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
      const { rows: zoneRows } = await pool.query('select * from delivery_zones where id = $1', [delivery_zone_id]);
      deliveryZone = zoneRows[0];
      if (!deliveryZone) {
        return res.status(400).json({ error: 'Invalid delivery zone' });
      }
      deliveryFee = parseFloat(deliveryZone.fee);
    }

    const total = itemsTotal + deliveryFee;
    const orderNumber = await generateDailyOrderNumber();

    const insertResult = await pool.query(
      `insert into orders
        (order_number, customer_name, customer_phone, branch_id, branch_name, location,
         delivery_type, delivery_zone_name, delivery_fee, items_total, total_amount, status, items)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12)
       returning id, order_number`,
      [
        orderNumber,
        customer_name,
        customer_phone,
        BRANCH_ID,
        branch.name,
        branch.location,
        delivery_type === 'delivery' ? 'delivery' : 'pickup',
        deliveryZone ? deliveryZone.name : null,
        deliveryFee,
        itemsTotal,
        total,
        JSON.stringify(orderItems)
      ]
    );

    const newOrder = insertResult.rows[0];

    res.status(201).json({
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      total_amount: total,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders (worker only)
app.get('/api/orders', requireWorkerAuth, async (req, res) => {
  const { status } = req.query;

  try {
    const { rows } = status
      ? await pool.query('select * from orders where status = $1 order by created_at desc', [status])
      : await pool.query('select * from orders order by created_at desc');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (worker only)
app.patch('/api/orders/:id/status', requireWorkerAuth, async (req, res) => {
  const { status } = req.body;
  const orderId = parseInt(req.params.id);

  if (!status || !['pending', 'confirmed', 'preparing', 'ready', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    let updated;

    if (status === 'confirmed') {
      const { rows: maxRows } = await pool.query(
        `select coalesce(max(queue_number), 0) as max_queue from orders where status = 'confirmed'`
      );
      const nextQueueNumber = maxRows[0].max_queue + 1;

      const { rows } = await pool.query(
        `update orders set status = $1, confirmed_at = now(), queue_number = $2 where id = $3 returning *`,
        [status, nextQueueNumber, orderId]
      );
      updated = rows[0];
    } else {
      const { rows } = await pool.query(
        `update orders set status = $1 where id = $2 returning *`,
        [status, orderId]
      );
      updated = rows[0];
    }

    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // When order is completed, recycle queue numbers among remaining confirmed orders
    if (status === 'completed' && updated.queue_number) {
      const { rows: confirmedOrders } = await pool.query(
        `select id from orders where status = 'confirmed' and id != $1 order by confirmed_at asc`,
        [orderId]
      );

      for (let i = 0; i < confirmedOrders.length; i++) {
        await pool.query('update orders set queue_number = $1 where id = $2', [i + 1, confirmedOrders[i].id]);
      }
    }

    res.json({ success: true, status, queue_number: updated.queue_number });
  } catch (error) {
    console.error('Error updating order:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get single order (public — used for order confirmation page)
app.get('/api/orders/:id', async (req, res) => {
  const orderId = parseInt(req.params.id);

  try {
    const { rows } = await pool.query('select * from orders where id = $1', [orderId]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Track order by order_number (public — used by the customer tracking page,
// so it does NOT require worker auth and does not expose other customers' data
// beyond what a customer already sees on their own confirmation page).
app.get('/api/orders/track/:orderNumber', async (req, res) => {
  const orderNumber = parseInt(String(req.params.orderNumber).replace(/^0+/, ''), 10);

  try {
    const { rows } = await pool.query(
      'select * from orders where order_number = $1 order by created_at desc limit 1',
      [orderNumber]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error tracking order:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
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
    const { rows } = await pool.query('select * from orders where id = $1', [parseInt(order_id)]);
    const order = rows[0];

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

    await pool.query(
      'update orders set momo_reference_id = $1, payment_status = $2 where id = $3',
      [referenceId, 'pending', order.id]
    );

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
    await pool.query(
      'update orders set payment_status = $1 where momo_reference_id = $2',
      [status, req.params.referenceId]
    );

    res.json({ status });
  } catch (error) {
    console.error('MoMo status error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to check payment status' });
  }
});

// ---- Paystack Checkout Flow ----
// Payment happens BEFORE the order is created — so an abandoned or failed
// payment never creates a row in `orders` and never shows up on the worker
// dashboard. The order is only created once /checkout/verify confirms
// Paystack actually received the money.
const paystack = require('./paystack');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Start checkout: validates the cart, computes the real total server-side,
// and starts a Paystack transaction. Returns a URL to redirect the customer to.
app.post('/api/checkout/initiate', async (req, res) => {
  const { customer_name, customer_phone, items, delivery_type, delivery_zone_id } = req.body;

  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (delivery_type === 'delivery' && !delivery_zone_id) {
    return res.status(400).json({ error: 'delivery_zone_id is required for delivery orders' });
  }

  try {
    const { rows: menuRows } = await pool.query('select * from menu_items');
    const { rows: branchRows } = await pool.query('select * from branches where id = $1', [BRANCH_ID]);

    const branch = branchRows[0];
    if (!branch || !branch.is_open) {
      return res.status(400).json({ error: 'Restaurant is currently closed' });
    }

    let itemsTotal = 0;
    const orderItems = items.map(item => {
      const menuItem = menuRows.find(m => m.id === item.menu_item_id);
      if (menuItem) {
        const price = parseFloat(menuItem.price);
        itemsTotal += price * item.quantity;
        return {
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price,
          item_name: menuItem.name,
          note: (item.note || '').trim().slice(0, 200)
        };
      }
      return null;
    }).filter(Boolean);

    let deliveryZone = null;
    let deliveryFee = 0;
    if (delivery_type === 'delivery') {
      const { rows: zoneRows } = await pool.query('select * from delivery_zones where id = $1', [delivery_zone_id]);
      deliveryZone = zoneRows[0];
      if (!deliveryZone) {
        return res.status(400).json({ error: 'Invalid delivery zone' });
      }
      deliveryFee = parseFloat(deliveryZone.fee);
    }

    const total = itemsTotal + deliveryFee;

    // Paystack requires an email even though this app never collects one —
    // this placeholder is only used by Paystack internally, never shown to
    // the customer or the restaurant.
    const email = `guest+${Date.now()}@miraggio-orders.local`;

    const transaction = await paystack.initializeTransaction({
      email,
      amountGHS: total,
      callbackUrl: `${FRONTEND_URL}/payment-callback`,
      metadata: {
        customer_name,
        customer_phone,
        delivery_type: delivery_type === 'delivery' ? 'delivery' : 'pickup',
        delivery_zone_name: deliveryZone ? deliveryZone.name : null,
        delivery_fee: deliveryFee,
        items_total: itemsTotal,
        items: orderItems
      }
    });

    res.json({
      authorization_url: transaction.authorization_url,
      reference: transaction.reference
    });
  } catch (error) {
    console.error('Checkout initiate error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to start checkout' });
  }
});

// Called by the frontend after Paystack redirects the customer back.
// Confirms payment actually succeeded, THEN creates the order.
app.get('/api/checkout/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    // Idempotency: if this reference already created an order (e.g. the
    // customer refreshed the callback page), just return that same order
    // instead of creating a duplicate.
    const { rows: existing } = await pool.query(
      'select id, order_number, total_amount from orders where payment_reference = $1',
      [reference]
    );
    if (existing[0]) {
      return res.json({
        order_id: existing[0].id,
        order_number: existing[0].order_number,
        total_amount: existing[0].total_amount,
        status: 'pending'
      });
    }

    const transaction = await paystack.verifyTransaction(reference);

    if (transaction.status !== 'success') {
      return res.status(400).json({ error: 'Payment was not successful', payment_status: transaction.status });
    }

    const metadata = transaction.metadata || {};
    const { rows: branchRows } = await pool.query('select * from branches where id = $1', [BRANCH_ID]);
    const branch = branchRows[0];

    const totalAmount = transaction.amount / 100; // Paystack amount is in pesewas
    const orderNumber = await generateDailyOrderNumber();

    const insertResult = await pool.query(
      `insert into orders
        (order_number, customer_name, customer_phone, branch_id, branch_name, location,
         delivery_type, delivery_zone_name, delivery_fee, items_total, total_amount, status,
         items, payment_status, payment_reference)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,'paid',$13)
       returning id, order_number`,
      [
        orderNumber,
        metadata.customer_name || 'Guest',
        metadata.customer_phone || null,
        BRANCH_ID,
        branch ? branch.name : 'Miraggio Restaurant',
        branch ? branch.location : 'Asawasi Dogo moro park',
        metadata.delivery_type || 'pickup',
        metadata.delivery_zone_name || null,
        metadata.delivery_fee || 0,
        metadata.items_total || totalAmount,
        totalAmount,
        JSON.stringify(metadata.items || []),
        reference
      ]
    );

    const newOrder = insertResult.rows[0];

    res.json({
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      total_amount: totalAmount,
      status: 'pending'
    });
  } catch (error) {
    console.error('Checkout verify error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
