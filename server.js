// ============================================================
// ParkMaster — Parking Slot Management System
// Backend: Node.js + Express + MySQL
// ============================================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB Config ────────────────────────────────────────────
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',          // ← Change to your MySQL password
  database: 'parkmaster',
  waitForConnections: true,
  connectionLimit: 10
};

let pool;
async function getPool() {
  if (!pool) pool = await mysql.createPool(dbConfig);
  return pool;
}

// ─── Helper ───────────────────────────────────────────────
async function query(sql, params = []) {
  const db = await getPool();
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function log(action, entityType, entityId, performedBy, details) {
  try {
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details) VALUES (?,?,?,?,?)`,
      [action, entityType, entityId, performedBy || 1, details]
    );
  } catch (_) {}
}

function calcAmount(entryTime, exitTime, hourlyRate) {
  const diffMs = new Date(exitTime) - new Date(entryTime);
  const hours = Math.max(1, Math.ceil(diffMs / 3600000)); // minimum 1 hour
  return parseFloat((hours * hourlyRate).toFixed(2));
}

// ============================================================
// ROUTES
// ============================================================

// ─── Dashboard ────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const [slotStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'available') AS available,
        SUM(status = 'occupied')  AS occupied,
        SUM(status = 'maintenance') AS maintenance
      FROM parking_slots WHERE lot_id = 1
    `);

    const [carStats] = await query(`
      SELECT
        SUM(ps.status = 'available') AS car_available,
        SUM(ps.status = 'occupied')  AS car_occupied
      FROM parking_slots ps
      JOIN slot_types st ON ps.slot_type_id = st.id
      WHERE st.name = 'Car' AND ps.lot_id = 1
    `);

    const [bikeStats] = await query(`
      SELECT
        SUM(ps.status = 'available') AS bike_available,
        SUM(ps.status = 'occupied')  AS bike_occupied
      FROM parking_slots ps
      JOIN slot_types st ON ps.slot_type_id = st.id
      WHERE st.name = 'Bike' AND ps.lot_id = 1
    `);

    const [revenueStats] = await query(`
      SELECT
        IFNULL(SUM(CASE WHEN status = 'paid' THEN amount END), 0) AS total_revenue,
        IFNULL(SUM(CASE WHEN status = 'pending' THEN amount END), 0) AS pending_amount,
        COUNT(*) AS total_transactions
      FROM payments
    `);

    const activeSessions = await query(`
      SELECT COUNT(*) AS count FROM parking_sessions WHERE status = 'active'
    `);

    res.json({
      slots: slotStats,
      cars: carStats,
      bikes: bikeStats,
      revenue: revenueStats,
      activeSessions: activeSessions[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get All Slots ─────────────────────────────────────────
app.get('/api/slots', async (req, res) => {
  try {
    const slots = await query(`
      SELECT ps.*, st.name AS type_name, st.hourly_rate,
             sess.id AS session_id, v.vehicle_number, sess.entry_time
      FROM parking_slots ps
      JOIN slot_types st ON ps.slot_type_id = st.id
      LEFT JOIN parking_sessions sess ON sess.slot_id = ps.id AND sess.status = 'active'
      LEFT JOIN vehicles v ON sess.vehicle_id = v.id
      WHERE ps.lot_id = 1
      ORDER BY ps.slot_number
    `);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vehicle Entry ──────────────────────────────────────────
app.post('/api/entry', async (req, res) => {
  const { vehicle_number, slot_id } = req.body;
  if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

  try {
    // Find or create vehicle
    let vehicles = await query(`SELECT * FROM vehicles WHERE vehicle_number = ?`, [vehicle_number.toUpperCase()]);
    if (!vehicles.length) return res.status(404).json({ error: 'Vehicle not registered. Please register the vehicle first.' });
    const vehicle = vehicles[0];

    // Check active session
    const active = await query(
      `SELECT id FROM parking_sessions WHERE vehicle_id = ? AND status = 'active'`,
      [vehicle.id]
    );
    if (active.length) return res.status(409).json({ error: 'Vehicle already has an active parking session.' });

    // Find slot
    let targetSlot;
    if (slot_id) {
      const slots = await query(`SELECT * FROM parking_slots WHERE id = ? AND status = 'available'`, [slot_id]);
      if (!slots.length) return res.status(409).json({ error: 'Selected slot is not available.' });
      targetSlot = slots[0];
    } else {
      // Auto-assign best matching slot
      const typeMatch = vehicle.vehicle_type === 'Car' ? 1 : 2;
      const available = await query(
        `SELECT * FROM parking_slots WHERE lot_id = 1 AND slot_type_id = ? AND status = 'available' ORDER BY slot_number LIMIT 1`,
        [typeMatch]
      );
      if (!available.length) return res.status(409).json({ error: 'No available slots for this vehicle type.' });
      targetSlot = available[0];
    }

    // Create session
    const result = await query(
      `INSERT INTO parking_sessions (slot_id, vehicle_id, entry_time, status, created_by) VALUES (?, ?, NOW(), 'active', 1)`,
      [targetSlot.id, vehicle.id]
    );

    // Mark slot occupied
    await query(`UPDATE parking_slots SET status = 'occupied' WHERE id = ?`, [targetSlot.id]);

    await log('VEHICLE_ENTRY', 'parking_sessions', result.insertId, 1,
      `Vehicle ${vehicle_number} entered slot ${targetSlot.slot_number}`);

    res.json({
      success: true,
      message: `Vehicle ${vehicle_number.toUpperCase()} assigned to slot ${targetSlot.slot_number}`,
      session_id: result.insertId,
      slot: targetSlot.slot_number
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vehicle Exit / Checkout ────────────────────────────────
app.post('/api/exit', async (req, res) => {
  const { vehicle_number, payment_method = 'cash' } = req.body;
  if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number required' });

  try {
    const vehicles = await query(`SELECT * FROM vehicles WHERE vehicle_number = ?`, [vehicle_number.toUpperCase()]);
    if (!vehicles.length) return res.status(404).json({ error: 'Vehicle not found.' });
    const vehicle = vehicles[0];

    const sessions = await query(
      `SELECT sess.*, ps.slot_number, st.hourly_rate
       FROM parking_sessions sess
       JOIN parking_slots ps ON sess.slot_id = ps.id
       JOIN slot_types st ON ps.slot_type_id = st.id
       WHERE sess.vehicle_id = ? AND sess.status = 'active'`,
      [vehicle.id]
    );
    if (!sessions.length) return res.status(404).json({ error: 'No active parking session found for this vehicle.' });
    const session = sessions[0];

    const exitTime = new Date();
    const diffMs = exitTime - new Date(session.entry_time);
    const durationMinutes = Math.ceil(diffMs / 60000);
    const amount = calcAmount(session.entry_time, exitTime, session.hourly_rate);

    // Update session
    await query(
      `UPDATE parking_sessions SET exit_time = NOW(), duration_minutes = ?, status = 'completed' WHERE id = ?`,
      [durationMinutes, session.id]
    );

    // Create payment record (pending)
    const payment = await query(
      `INSERT INTO payments (session_id, amount, payment_method, status) VALUES (?, ?, ?, 'pending')`,
      [session.id, amount, payment_method]
    );

    await log('VEHICLE_EXIT', 'parking_sessions', session.id, 1,
      `Vehicle ${vehicle_number} exited slot ${session.slot_number}. Amount: ₹${amount}. Awaiting admin approval.`);

    res.json({
      success: true,
      message: `Exit recorded. Payment of ₹${amount} is pending admin approval.`,
      payment_id: payment.insertId,
      amount,
      duration_minutes: durationMinutes,
      slot: session.slot_number
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Payments ──────────────────────────────────────────
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await query(`
      SELECT p.*, sess.entry_time, sess.exit_time, sess.duration_minutes,
             v.vehicle_number, v.vehicle_type,
             ps.slot_number,
             u.full_name AS approved_by_name
      FROM payments p
      JOIN parking_sessions sess ON p.session_id = sess.id
      JOIN vehicles v ON sess.vehicle_id = v.id
      JOIN parking_slots ps ON sess.slot_id = ps.id
      LEFT JOIN users u ON p.approved_by = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Approve Payment ──────────────────────────────────────
app.post('/api/approve-payment', async (req, res) => {
  const { payment_id } = req.body;
  if (!payment_id) return res.status(400).json({ error: 'Payment ID required' });

  try {
    const payments = await query(`SELECT * FROM payments WHERE id = ? AND status = 'pending'`, [payment_id]);
    if (!payments.length) return res.status(404).json({ error: 'Pending payment not found.' });
    const payment = payments[0];

    // Approve payment
    await query(
      `UPDATE payments SET status = 'paid', approved_by = 1, paid_at = NOW() WHERE id = ?`,
      [payment_id]
    );

    // Free the slot
    const sessions = await query(`SELECT slot_id FROM parking_sessions WHERE id = ?`, [payment.session_id]);
    if (sessions.length) {
      await query(`UPDATE parking_slots SET status = 'available' WHERE id = ?`, [sessions[0].slot_id]);
    }

    await log('PAYMENT_APPROVED', 'payments', payment_id, 1,
      `Payment #${payment_id} approved. Amount: ₹${payment.amount}`);

    res.json({ success: true, message: `Payment #${payment_id} approved. Slot is now available.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Parking Records ───────────────────────────────────────
app.get('/api/records', async (req, res) => {
  try {
    const records = await query(`
      SELECT sess.*, v.vehicle_number, v.vehicle_type,
             ps.slot_number, st.name AS slot_type, st.hourly_rate,
             p.amount, p.status AS payment_status, p.payment_method
      FROM parking_sessions sess
      JOIN vehicles v ON sess.vehicle_id = v.id
      JOIN parking_slots ps ON sess.slot_id = ps.id
      JOIN slot_types st ON ps.slot_type_id = st.id
      LEFT JOIN payments p ON p.session_id = sess.id
      ORDER BY sess.entry_time DESC
      LIMIT 100
    `);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Users ─────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  try {
    const users = await query(`
      SELECT u.*, COUNT(v.id) AS vehicle_count
      FROM users u
      LEFT JOIN vehicles v ON v.user_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { full_name, email, phone, role = 'user' } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name required' });
  try {
    const result = await query(
      `INSERT INTO users (full_name, email, phone, role) VALUES (?, ?, ?, ?)`,
      [full_name, email || null, phone || null, role]
    );
    await log('USER_CREATED', 'users', result.insertId, 1, `New user ${full_name} registered`);
    res.json({ success: true, id: result.insertId, message: 'User created successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Vehicles ──────────────────────────────────────────────
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await query(`
      SELECT v.*, u.full_name AS owner_name, u.phone AS owner_phone,
             (SELECT COUNT(*) FROM parking_sessions WHERE vehicle_id = v.id) AS total_visits,
             (SELECT entry_time FROM parking_sessions WHERE vehicle_id = v.id AND status = 'active' LIMIT 1) AS current_entry
      FROM vehicles v
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `);
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  const { user_id, vehicle_number, vehicle_type, brand, color } = req.body;
  if (!vehicle_number || !vehicle_type) return res.status(400).json({ error: 'Vehicle number and type required.' });
  try {
    const result = await query(
      `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, color) VALUES (?, ?, ?, ?, ?)`,
      [user_id || null, vehicle_number.toUpperCase(), vehicle_type, brand || null, color || null]
    );
    await log('VEHICLE_REGISTERED', 'vehicles', result.insertId, 1, `Vehicle ${vehicle_number} registered`);
    res.json({ success: true, id: result.insertId, message: 'Vehicle registered successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Vehicle number already registered.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Audit Logs ────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await query(`
      SELECT al.*, u.full_name AS performed_by_name
      FROM audit_logs al
      LEFT JOIN users u ON al.performed_by = u.id
      ORDER BY al.created_at DESC LIMIT 50
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve Frontend ────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚗 ParkMaster server running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
