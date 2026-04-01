-- ============================================================
-- ParkMaster — Parking Slot Management System
-- Database Schema with Sample Data
-- ============================================================

CREATE DATABASE IF NOT EXISTS parkmaster;
USE parkmaster;

-- ============================================================
-- TABLE 1: parking_lots
-- ============================================================
CREATE TABLE parking_lots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  total_capacity INT NOT NULL DEFAULT 0,
  contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 2: slot_types
-- ============================================================
CREATE TABLE slot_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,          -- e.g. Car, Bike
  hourly_rate DECIMAL(8,2) NOT NULL,
  description VARCHAR(255)
);

-- ============================================================
-- TABLE 3: parking_slots
-- ============================================================
CREATE TABLE parking_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lot_id INT NOT NULL,
  slot_type_id INT NOT NULL,
  slot_number VARCHAR(10) NOT NULL,   -- e.g. A01, B12
  floor_level VARCHAR(10) DEFAULT 'G',
  status ENUM('available','occupied','maintenance') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_type_id) REFERENCES slot_types(id),
  UNIQUE KEY unique_slot (lot_id, slot_number)
);

-- ============================================================
-- TABLE 4: users
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  role ENUM('admin','user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 5: vehicles
-- ============================================================
CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  vehicle_number VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type ENUM('Car','Bike') NOT NULL,
  brand VARCHAR(50),
  color VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 6: parking_sessions
-- ============================================================
CREATE TABLE parking_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  entry_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time DATETIME,
  duration_minutes INT,
  status ENUM('active','completed','cancelled') DEFAULT 'active',
  created_by INT,
  FOREIGN KEY (slot_id) REFERENCES parking_slots(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 7: payments
-- ============================================================
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('cash','upi','card') DEFAULT 'cash',
  status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (session_id) REFERENCES parking_sessions(id),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 8: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  performed_by INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Parking Lots
INSERT INTO parking_lots (name, address, city, total_capacity, contact_phone) VALUES
('ParkMaster Central', '12 Station Road', 'Delhi', 50, '+91-9876543210'),
('ParkMaster East', '45 Ring Road', 'Noida', 30, '+91-9876543211');

-- Slot Types
INSERT INTO slot_types (name, hourly_rate, description) VALUES
('Car', 40.00, 'Standard 4-wheeler parking'),
('Bike', 15.00, '2-wheeler parking slot');

-- Parking Slots (50 slots: A01-A25 Car, B01-B25 Bike)
INSERT INTO parking_slots (lot_id, slot_type_id, slot_number, floor_level, status) VALUES
(1, 1, 'A01', 'G', 'occupied'),
(1, 1, 'A02', 'G', 'occupied'),
(1, 1, 'A03', 'G', 'available'),
(1, 1, 'A04', 'G', 'available'),
(1, 1, 'A05', 'G', 'occupied'),
(1, 1, 'A06', 'G', 'available'),
(1, 1, 'A07', 'G', 'available'),
(1, 1, 'A08', 'G', 'occupied'),
(1, 1, 'A09', 'G', 'available'),
(1, 1, 'A10', 'G', 'available'),
(1, 1, 'A11', '1', 'available'),
(1, 1, 'A12', '1', 'occupied'),
(1, 1, 'A13', '1', 'available'),
(1, 1, 'A14', '1', 'available'),
(1, 1, 'A15', '1', 'occupied'),
(1, 1, 'A16', '1', 'available'),
(1, 1, 'A17', '1', 'available'),
(1, 1, 'A18', '1', 'available'),
(1, 1, 'A19', '1', 'available'),
(1, 1, 'A20', '1', 'occupied'),
(1, 1, 'A21', '2', 'available'),
(1, 1, 'A22', '2', 'available'),
(1, 1, 'A23', '2', 'available'),
(1, 1, 'A24', '2', 'available'),
(1, 1, 'A25', '2', 'available'),
(1, 2, 'B01', 'G', 'occupied'),
(1, 2, 'B02', 'G', 'available'),
(1, 2, 'B03', 'G', 'occupied'),
(1, 2, 'B04', 'G', 'available'),
(1, 2, 'B05', 'G', 'available'),
(1, 2, 'B06', 'G', 'occupied'),
(1, 2, 'B07', 'G', 'available'),
(1, 2, 'B08', 'G', 'available'),
(1, 2, 'B09', 'G', 'available'),
(1, 2, 'B10', 'G', 'occupied'),
(1, 2, 'B11', '1', 'available'),
(1, 2, 'B12', '1', 'available'),
(1, 2, 'B13', '1', 'occupied'),
(1, 2, 'B14', '1', 'available'),
(1, 2, 'B15', '1', 'available'),
(1, 2, 'B16', '1', 'available'),
(1, 2, 'B17', '1', 'occupied'),
(1, 2, 'B18', '1', 'available'),
(1, 2, 'B19', '1', 'available'),
(1, 2, 'B20', '1', 'available'),
(1, 2, 'B21', '2', 'available'),
(1, 2, 'B22', '2', 'available'),
(1, 2, 'B23', '2', 'available'),
(1, 2, 'B24', '2', 'available'),
(1, 2, 'B25', '2', 'available');

-- Users
INSERT INTO users (full_name, email, phone, role) VALUES
('Admin User', 'admin@parkmaster.com', '+91-9900000001', 'admin'),
('Rajat Sharma', 'rajat@example.com', '+91-9811122233', 'user'),
('Priya Singh', 'priya@example.com', '+91-9822233344', 'user'),
('Amit Verma', 'amit@example.com', '+91-9833344455', 'user'),
('Sunita Rao', 'sunita@example.com', '+91-9844455566', 'user'),
('Deepak Nair', 'deepak@example.com', '+91-9855566677', 'user'),
('Kavita Joshi', 'kavita@example.com', '+91-9866677788', 'user'),
('Mohit Gupta', 'mohit@example.com', '+91-9877788899', 'user');

-- Vehicles
INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, color) VALUES
(2, 'DL01AB1234', 'Car',  'Maruti Suzuki', 'White'),
(3, 'DL02CD5678', 'Car',  'Hyundai',       'Silver'),
(4, 'UP14EF9012', 'Bike', 'Honda',         'Black'),
(5, 'DL03GH3456', 'Car',  'Toyota',        'Red'),
(6, 'HR26IJ7890', 'Bike', 'Bajaj',         'Blue'),
(7, 'DL04KL1234', 'Car',  'Tata',          'Grey'),
(8, 'UP32MN5678', 'Bike', 'TVS',           'Green'),
(2, 'DL05OP9012', 'Bike', 'Royal Enfield', 'Black'),
(3, 'DL06QR3456', 'Car',  'Honda',         'White'),
(4, 'UP16ST7890', 'Car',  'Kia',           'Blue');

-- Parking Sessions (active ones matching occupied slots)
INSERT INTO parking_sessions (slot_id, vehicle_id, entry_time, exit_time, duration_minutes, status, created_by) VALUES
(1,  1,  NOW() - INTERVAL 2  HOUR, NULL, NULL, 'active', 1),
(2,  2,  NOW() - INTERVAL 3  HOUR, NULL, NULL, 'active', 1),
(5,  4,  NOW() - INTERVAL 1  HOUR, NULL, NULL, 'active', 1),
(8,  6,  NOW() - INTERVAL 45 MINUTE, NULL, NULL, 'active', 1),
(12, 9,  NOW() - INTERVAL 5  HOUR, NULL, NULL, 'active', 1),
(15, 3,  NOW() - INTERVAL 30 MINUTE, NULL, NULL, 'active', 1),
(20, 10, NOW() - INTERVAL 2  HOUR, NULL, NULL, 'active', 1),
(26, 5,  NOW() - INTERVAL 1  HOUR, NULL, NULL, 'active', 1),
(28, 7,  NOW() - INTERVAL 20 MINUTE, NULL, NULL, 'active', 1),
(31, 8,  NOW() - INTERVAL 3  HOUR, NULL, NULL, 'active', 1),
(35, 4,  NOW() - INTERVAL 10 MINUTE, NULL, NULL, 'active', 1),  -- will conflict, just sample
(38, 5,  NOW() - INTERVAL 2  HOUR, NULL, NULL, 'active', 1),
(42, 3,  NOW() - INTERVAL 4  HOUR, NULL, NULL, 'active', 1),
(17, 6,  NOW() - INTERVAL 50 MINUTE, NULL, NULL, 'active', 1),
-- Completed sessions
(3,  1,  NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 4 HOUR, 120, 'completed', 1),
(4,  2,  NOW() - INTERVAL 8 HOUR, NOW() - INTERVAL 5 HOUR, 180, 'completed', 1),
(6,  3,  NOW() - INTERVAL 7 HOUR, NOW() - INTERVAL 3 HOUR, 240, 'completed', 1),
(9,  4,  NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 2 HOUR, 180, 'completed', 1),
(10, 5,  NOW() - INTERVAL 9 HOUR, NOW() - INTERVAL 6 HOUR, 180, 'completed', 1);

-- Payments
INSERT INTO payments (session_id, amount, payment_method, status, approved_by, paid_at) VALUES
(15, 80.00,  'cash', 'paid',    1, NOW() - INTERVAL 3 HOUR 50 MINUTE),
(16, 120.00, 'upi',  'paid',    1, NOW() - INTERVAL 4 HOUR 55 MINUTE),
(17, 160.00, 'cash', 'paid',    1, NOW() - INTERVAL 2 HOUR 55 MINUTE),
(18, 45.00,  'upi',  'paid',    1, NOW() - INTERVAL 1 HOUR 55 MINUTE),
(19, 45.00,  'cash', 'paid',    1, NOW() - INTERVAL 5 HOUR 55 MINUTE);

-- Audit Logs
INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details) VALUES
('VEHICLE_ENTRY',   'parking_sessions', 1, 1, 'Vehicle DL01AB1234 entered slot A01'),
('VEHICLE_ENTRY',   'parking_sessions', 2, 1, 'Vehicle DL02CD5678 entered slot A02'),
('PAYMENT_APPROVED','payments',         1, 1, 'Payment approved for session 15, amount ₹80'),
('PAYMENT_APPROVED','payments',         2, 1, 'Payment approved for session 16, amount ₹120'),
('USER_CREATED',    'users',            2, 1, 'New user Rajat Sharma registered'),
('VEHICLE_EXIT',    'parking_sessions', 15, 1, 'Vehicle DL01AB1234 exited from slot A03');
