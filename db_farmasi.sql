-- =========================================================
-- DATABASE: db_farmasi
-- Sistem Informasi Farmasi Terintegrasi SATUSEHAT Platform
-- Mendukung Role: Dokter, Apoteker, Admin, dan Pasien
-- =========================================================

CREATE DATABASE IF NOT EXISTS `db_farmasi` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `db_farmasi`;

-- 1. TABEL PENGGUNA (users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('dokter', 'apoteker', 'admin', 'pasien') NOT NULL,
  `npa` VARCHAR(50) NULL COMMENT 'NPA IDI Dokter',
  `sipa` VARCHAR(50) NULL COMMENT 'SIPA Apoteker',
  `nik` VARCHAR(20) NULL COMMENT 'NIK Pasien',
  `ihs_number` VARCHAR(50) NULL COMMENT 'IHS SATUSEHAT Pasien',
  `phone` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL PASIEN (patients)
CREATE TABLE IF NOT EXISTS `patients` (
  `nik` VARCHAR(20) NOT NULL,
  `ihs_number` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `gender` ENUM('L', 'P') NOT NULL,
  `dob` DATE NOT NULL,
  `address` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL OBAT / MASTER KFA (medications)
CREATE TABLE IF NOT EXISTS `medications` (
  `id` VARCHAR(50) NOT NULL,
  `kfa_code_92` VARCHAR(50) NULL COMMENT 'KFA POV Peresepan Dokter',
  `kfa_code_93` VARCHAR(50) NULL COMMENT 'KFA POA Dispense Apoteker',
  `kfa_system` VARCHAR(100) DEFAULT 'http://sys-ids.kemkes.go.id/kfa',
  `name` VARCHAR(150) NOT NULL,
  `generic_name` VARCHAR(150) NOT NULL,
  `ingredient_code` VARCHAR(50) NULL,
  `form` VARCHAR(50) NOT NULL,
  `manufacturer` VARCHAR(100) NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) NOT NULL,
  `lot_number` VARCHAR(50) NULL,
  `expiration_date` DATE NULL,
  `medication_type` ENUM('formularium', 'non-formularium') DEFAULT 'formularium',
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `min_stock` INT NOT NULL DEFAULT 10,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL RESEP DOKTER / MedicationRequest (prescriptions)
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` VARCHAR(50) NOT NULL,
  `prescription_number` VARCHAR(50) NOT NULL UNIQUE,
  `prescription_item_number` VARCHAR(50) NULL,
  `patient_nik` VARCHAR(20) NOT NULL,
  `patient_ihs_number` VARCHAR(50) NULL,
  `patient_name` VARCHAR(100) NOT NULL,
  `medication_id` VARCHAR(50) NOT NULL,
  `medication_kfa` VARCHAR(50) NULL,
  `medication_name` VARCHAR(150) NOT NULL,
  `medication_form` VARCHAR(50) NULL,
  `dosage_route` VARCHAR(50) DEFAULT 'Oral',
  `dosage_value` FLOAT DEFAULT 1,
  `dosage_unit` VARCHAR(50) DEFAULT 'tablet',
  `dosage_timing_code` VARCHAR(20) DEFAULT 'QD',
  `dosage_additional_instruction` TEXT NULL,
  `dosage_patient_instruction` TEXT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `quantity_unit` VARCHAR(50) DEFAULT 'tablet',
  `expected_supply_days` INT DEFAULT 7,
  `substitution_allowed` TINYINT(1) DEFAULT 1,
  `payment_type` VARCHAR(50) DEFAULT 'BPJS-K',
  `sep_number` VARCHAR(50) NULL,
  `note` TEXT NULL,
  `status_reason` TEXT NULL,
  `requester_id` VARCHAR(50) NULL,
  `requester_name` VARCHAR(100) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, completed, cancelled, PENDING, DISPENSED',
  `authored_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABEL PENGELUARAN OBAT / MedicationDispense (dispenses)
CREATE TABLE IF NOT EXISTS `dispenses` (
  `id` VARCHAR(50) NOT NULL,
  `prescription_id` VARCHAR(50) NOT NULL,
  `prescription_number` VARCHAR(50) NOT NULL,
  `patient_name` VARCHAR(100) NOT NULL,
  `patient_ihs_number` VARCHAR(50) NULL,
  `medication_id` VARCHAR(50) NOT NULL,
  `medication_kfa` VARCHAR(50) NULL COMMENT 'Wajib KFA POA 93xxxxxx',
  `medication_name` VARCHAR(150) NOT NULL,
  `medication_form` VARCHAR(50) NULL,
  `quantity` INT NOT NULL,
  `quantity_unit` VARCHAR(50) NOT NULL,
  `dosage_route` VARCHAR(50) NULL,
  `dosage_value` FLOAT NULL,
  `dosage_unit` VARCHAR(50) NULL,
  `dosage_timing_code` VARCHAR(20) NULL,
  `dosage_additional_instruction` TEXT NULL,
  `substitution_was_substituted` TINYINT(1) DEFAULT 0,
  `price_per_item` DECIMAL(12,2) DEFAULT 0.00,
  `total_price` DECIMAL(12,2) DEFAULT 0.00,
  `payment_type` VARCHAR(50) NULL,
  `dispensed_by_id` VARCHAR(50) NULL,
  `dispensed_by_name` VARCHAR(100) NULL,
  `dispensed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) DEFAULT 'completed',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABEL AUDIT LOG AKTIVITAS SISTEM (system_activities)
CREATE TABLE IF NOT EXISTS `system_activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `type` VARCHAR(20) DEFAULT 'info',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- SEED DATA AWAL (DUMMY MEDIS SATUSEHAT)
-- =========================================================

-- Insert Akun Pengguna (Dokter, Apoteker, Admin, Pasien)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`, `npa`, `sipa`, `nik`, `ihs_number`, `phone`) VALUES
('USR-ADM', 'Administrator Farmasi', 'admin@farmasi.id', 'admin123', 'admin', NULL, NULL, NULL, NULL, '081122334455'),
('USR-001', 'dr. Ahmad Fauzi, Sp.PD', 'dokter@farmasi.id', 'dokter123', 'dokter', '1234567', NULL, NULL, NULL, '081234567890'),
('USR-003', 'dr. Sinta Maharani, Sp.A', 'sinta@farmasi.id', 'dokter123', 'dokter', '7654321', NULL, NULL, NULL, '081298765432'),
('USR-002', 'apt. Siti Nurhaliza, S.Farm.', 'apoteker@farmasi.id', 'apoteker123', 'apoteker', NULL, 'SIPA-001/2024', NULL, NULL, '089876543210'),
('USR-004', 'apt. Dimas Anggara, S.Farm.', 'dimas@farmasi.id', 'apoteker123', 'apoteker', NULL, 'SIPA-002/2024', NULL, NULL, '089812345678'),
('USR-PAT-001', 'Budi Santoso', 'budi@pasien.id', 'pasien123', 'pasien', NULL, NULL, '3201234567890001', 'P02478375304', '081311112222'),
('USR-PAT-002', 'Siti Rahayu', 'siti@pasien.id', 'pasien123', 'pasien', NULL, NULL, '3201234567890002', 'P02478375305', '081333334444'),
('USR-PAT-003', 'Rizky Pratama', 'andi@pasien.id', 'pasien123', 'pasien', NULL, NULL, '3201234567890005', 'P02478375308', '081355556666');

-- Insert Data Pasien
INSERT IGNORE INTO `patients` (`nik`, `ihs_number`, `name`, `gender`, `dob`, `address`) VALUES
('3201234567890001', 'P02478375304', 'Budi Santoso', 'L', '1985-03-15', 'Jl. Merdeka No.12, Jakarta Pusat'),
('3201234567890002', 'P02478375305', 'Siti Rahayu', 'P', '1990-07-22', 'Jl. Sudirman No.45, Jakarta Selatan'),
('3201234567890003', 'P02478375306', 'Hendra Wijaya', 'L', '1975-11-08', 'Jl. Gatot Subroto No.88, Jakarta'),
('3201234567890004', 'P02478375307', 'Dewi Kusuma', 'P', '1998-02-14', 'Jl. Veteran No.3, Bogor'),
('3201234567890005', 'P02478375308', 'Rizky Pratama', 'L', '2001-09-30', 'Jl. Diponegoro No.21, Depok');

-- Insert Katalog Obat & Kode KFA
INSERT IGNORE INTO `medications` (`id`, `kfa_code_92`, `kfa_code_93`, `name`, `generic_name`, `ingredient_code`, `form`, `manufacturer`, `stock`, `unit`, `lot_number`, `expiration_date`, `medication_type`, `price`, `min_stock`) VALUES
('MED-001', '92000511', '93002205', 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)', 'Paracetamol', '91000101', 'Sirup', 'Erlimpex', 150, 'Botol', 'LOT2025A001', '2027-06-30', 'non-formularium', 25000.00, 20),
('MED-002', '92000210', '93000105', 'Amoxicillin 500mg Kapsul', 'Amoxicillin', '91000039', 'Kapsul', 'Kimia Farma', 8, 'Strip (10 kapsul)', 'LOT2025B002', '2026-12-31', 'formularium', 15000.00, 20),
('MED-003', '92001450', '93001234', 'Metformin 500mg Tablet', 'Metformin', '91000311', 'Tablet', 'Kalbe Farma', 320, 'Strip (10 tablet)', 'LOT2025C003', '2027-03-15', 'formularium', 5000.00, 30),
('MED-004', '92002100', '93005678', 'Omeprazole 20mg Kapsul', 'Omeprazole', '91000488', 'Kapsul', 'Sanbe Farma', 0, 'Kotak (30 kapsul)', 'LOT2025D004', '2026-09-30', 'formularium', 18000.00, 15),
('MED-005', '92003300', '93009999', 'Amlodipine 5mg Tablet', 'Amlodipine', '91000028', 'Tablet', 'Dexa Medica', 200, 'Strip (10 tablet)', 'LOT2025E005', '2027-08-20', 'formularium', 8000.00, 30),
('MED-006', '92004100', '93011200', 'Azithromycin 500mg Tablet Salut Selaput', 'Azithromycin', '91000235', 'Tablet Salut Selaput', 'Pfizer Indonesia', 12, 'Strip (3 tablet)', 'LOT2025F006', '2027-01-15', 'non-formularium', 35000.00, 20),
('MED-007', 'KFA_CODE_DUMMY_001', 'KFA_CODE_DUMMY_001_POA', 'Cetirizine HCl 10mg Tablet (KFA Dummy)', 'Cetirizine Hydrochloride', '91000999', 'Tablet', 'Generik Farmasi RI', 95, 'Strip (10 tablet)', 'LOT2026DUMMY', '2028-12-31', 'formularium', 6000.00, 20);

-- Insert Resep Dokter
INSERT IGNORE INTO `prescriptions` (`id`, `prescription_number`, `prescription_item_number`, `patient_nik`, `patient_ihs_number`, `patient_name`, `medication_id`, `medication_kfa`, `medication_name`, `medication_form`, `dosage_route`, `dosage_value`, `dosage_unit`, `dosage_timing_code`, `dosage_additional_instruction`, `dosage_patient_instruction`, `quantity`, `quantity_unit`, `expected_supply_days`, `substitution_allowed`, `payment_type`, `sep_number`, `requester_id`, `requester_name`, `status`) VALUES
('MR-001', 'RX-2026-0001', 'RXI-2026-0001', '3201234567890001', 'P02478375304', 'Budi Santoso', 'MED-003', '92001450', 'Metformin 500mg Tablet', 'Tablet', 'Oral', 1, 'tablet', 'BID', 'Diminum setelah makan', 'Minum dengan segelas air putih', 60, 'tablet', 30, 1, 'BPJS-K', 'SEP-2026-00123', 'USR-001', 'dr. Ahmad Fauzi, Sp.PD', 'active'),
('MR-002', 'RX-2026-0001', 'RXI-2026-0002', '3201234567890001', 'P02478375304', 'Budi Santoso', 'MED-005', '92003300', 'Amlodipine 5mg Tablet', 'Tablet', 'Oral', 1, 'tablet', 'QD', 'Diminum pagi hari', 'Minum secara teratur setiap hari', 30, 'tablet', 30, 0, 'BPJS-K', 'SEP-2026-00123', 'USR-001', 'dr. Ahmad Fauzi, Sp.PD', 'active'),
('MR-003', 'RX-2026-0002', 'RXI-2026-0003', '3201234567890002', 'P02478375305', 'Siti Rahayu', 'MED-001', '92000511', 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)', 'Sirup', 'Oral', 5, 'mL', 'TID', 'Kocok sebelum diminum', 'Diminum 3x sehari 5mL bila demam', 2, 'Botol', 5, 1, 'Biaya-Sendiri', NULL, 'USR-001', 'dr. Ahmad Fauzi, Sp.PD', 'completed'),
('MR-004', 'RX-2026-0003', 'RXI-2026-0004', '3201234567890003', 'P02478375306', 'Hendra Wijaya', 'MED-004', '92002100', 'Omeprazole 20mg Kapsul', 'Kapsul', 'Oral', 1, 'kapsul', 'QD', 'Diminum 30 menit sebelum makan', '', 30, 'kapsul', 30, 0, 'Asuransi-Swasta', NULL, 'USR-001', 'dr. Ahmad Fauzi, Sp.PD', 'cancelled'),
('MR-005', 'RX-2026-0004', 'RXI-2026-0005', '3201234567890004', 'P02478375307', 'Dewi Kusuma', 'MED-002', '92000210', 'Amoxicillin 500mg Kapsul', 'Kapsul', 'Oral', 1, 'kapsul', 'TID', 'Habiskan antibiotik', 'Minum 3x sehari, habiskan meskipun sudah membaik', 21, 'kapsul', 7, 1, 'BPJS-K', 'SEP-2026-00456', 'USR-001', 'dr. Ahmad Fauzi, Sp.PD', 'active');

-- Insert Riwayat Dispense Apoteker
INSERT IGNORE INTO `dispenses` (`id`, `prescription_id`, `prescription_number`, `patient_name`, `patient_ihs_number`, `medication_id`, `medication_kfa`, `medication_name`, `medication_form`, `quantity`, `quantity_unit`, `dosage_route`, `dosage_value`, `dosage_unit`, `dosage_timing_code`, `total_price`, `payment_type`, `dispensed_by_id`, `dispensed_by_name`, `status`) VALUES
('MD-001', 'MR-003', 'RX-2026-0002', 'Siti Rahayu', 'P02478375305', 'MED-001', '93002205', 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)', 'Sirup', 2, 'Botol', 'Oral', 5, 'mL', 'TID', 50000.00, 'Biaya-Sendiri', 'USR-002', 'apt. Siti Nurhaliza, S.Farm.', 'completed');

-- Insert Aktivitas Awal
INSERT INTO `system_activities` (`actor`, `role`, `action`, `description`, `type`) VALUES
('dr. Ahmad Fauzi, Sp.PD', 'dokter', 'CREATE_PRESCRIPTION', 'Menerbitkan resep RX-2026-0004 untuk Dewi Kusuma (Amoxicillin 500mg)', 'info'),
('apt. Siti Nurhaliza, S.Farm.', 'apoteker', 'DISPENSE_MEDICATION', 'Menyerahkan obat Paracetamol 120mg/5mL untuk Siti Rahayu (MD-001)', 'success'),
('dr. Ahmad Fauzi, Sp.PD', 'dokter', 'CANCEL_PRESCRIPTION', 'Membatalkan resep RX-2026-0003 Hendra Wijaya (Stok habis)', 'warning'),
('SATUSEHAT Sandbox', 'system', 'SYNC_SATUSEHAT', 'Sinkronisasi 4 resource MedicationRequest & 1 MedicationDispense berhasil', 'info');
