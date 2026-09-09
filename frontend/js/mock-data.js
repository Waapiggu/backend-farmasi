/**
 * mock-data.js
 * Data dummy sesuai standar SatuSehat FHIR Pelayanan Kefarmasian
 * - Status menggunakan nilai FHIR: active, completed, cancelled, on-hold
 * - Kode KFA: 92xxxxxx (resep dokter) / 93xxxxxx (dispense apoteker)
 * - Jenis pembiayaan: BPJS-K, Biaya-Sendiri, Biaya-Perusahaan, Asuransi-Swasta
 * - Waktu format UTC+00
 */

const MOCK_DATA = {

  // ─── USERS ─────────────────────────────────────────────
  users: [
    {
      id: 'USR-001', email: 'dokter@farmasi.id', password: 'dokter123',
      name: 'dr. Ahmad Fauzi, Sp.PD', role: 'dokter',
      npa: '1234567', phone: '081234567890'
    },
    {
      id: 'USR-002', email: 'apoteker@farmasi.id', password: 'apoteker123',
      name: 'apt. Siti Nurhaliza, S.Farm.', role: 'apoteker',
      sipa: 'SIPA-001/2024', phone: '089876543210'
    }
  ],

  // ─── PATIENTS ─────────────────────────────────────────
  patients: [
    { ihs_number: 'P02478375304', name: 'Budi Santoso', nik: '3201234567890001', gender: 'L', dob: '1985-03-15', address: 'Jl. Merdeka No.12, Jakarta Pusat' },
    { ihs_number: 'P02478375305', name: 'Siti Rahayu', nik: '3201234567890002', gender: 'P', dob: '1990-07-22', address: 'Jl. Sudirman No.45, Jakarta Selatan' },
    { ihs_number: 'P02478375306', name: 'Hendra Wijaya', nik: '3201234567890003', gender: 'L', dob: '1975-11-08', address: 'Jl. Gatot Subroto No.88, Jakarta' },
    { ihs_number: 'P02478375307', name: 'Dewi Kusuma', nik: '3201234567890004', gender: 'P', dob: '1998-02-14', address: 'Jl. Veteran No.3, Bogor' },
    { ihs_number: 'P02478375308', name: 'Rizky Pratama', nik: '3201234567890005', gender: 'L', dob: '2001-09-30', address: 'Jl. Diponegoro No.21, Depok' }
  ],

  // ─── MEDICATIONS (Obat) ────────────────────────────────
  medications: [
    {
      id: 'MED-001',
      kfa_code_92: '92000511', // POV – untuk dokter boleh gunakan ini
      kfa_code_93: '93002205', // POA – wajib untuk apoteker
      kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
      name: 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)',
      generic_name: 'Paracetamol',
      ingredient_code: '91000101', // BZA
      form: 'Sirup',
      manufacturer: 'Erlimpex',
      stock: 150,
      unit: 'Botol',
      lot_number: 'LOT2025A001',
      expiration_date: '2027-06-30',
      medication_type: 'non-formularium',
      price: 25000,
      min_stock: 20
    },
    {
      id: 'MED-002',
      kfa_code_92: '92000210',
      kfa_code_93: '93000105',
      kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
      name: 'Amoxicillin 500mg Kapsul',
      generic_name: 'Amoxicillin',
      ingredient_code: '91000039',
      form: 'Kapsul',
      manufacturer: 'Kimia Farma',
      stock: 8, // stok menipis
      unit: 'Strip (10 kapsul)',
      lot_number: 'LOT2025B002',
      expiration_date: '2026-12-31',
      medication_type: 'formularium',
      price: 15000,
      min_stock: 20
    },
    {
      id: 'MED-003',
      kfa_code_92: '92001450',
      kfa_code_93: '93001234',
      kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
      name: 'Metformin 500mg Tablet',
      generic_name: 'Metformin',
      ingredient_code: '91000311',
      form: 'Tablet',
      manufacturer: 'Kalbe Farma',
      stock: 320,
      unit: 'Strip (10 tablet)',
      lot_number: 'LOT2025C003',
      expiration_date: '2027-03-15',
      medication_type: 'formularium',
      price: 5000,
      min_stock: 30
    },
    {
      id: 'MED-004',
      kfa_code_92: '92002100',
      kfa_code_93: '93005678',
      kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
      name: 'Omeprazole 20mg Kapsul',
      generic_name: 'Omeprazole',
      ingredient_code: '91000488',
      form: 'Kapsul',
      manufacturer: 'Sanbe Farma',
      stock: 0, // habis
      unit: 'Kotak (30 kapsul)',
      lot_number: 'LOT2025D004',
      expiration_date: '2026-09-30',
      medication_type: 'formularium',
      price: 18000,
      min_stock: 15
    },
    {
      id: 'MED-005',
      kfa_code_92: '92003300',
      kfa_code_93: '93009999',
      kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
      name: 'Amlodipine 5mg Tablet',
      generic_name: 'Amlodipine',
      ingredient_code: '91000028',
      form: 'Tablet',
      manufacturer: 'Dexa Medica',
      stock: 200,
      unit: 'Strip (10 tablet)',
      lot_number: 'LOT2025E005',
      expiration_date: '2027-08-20',
      medication_type: 'formularium',
      price: 8000,
      min_stock: 30
    },
    {
      id: 'MED-006',
      kfa_code_92: '92004100',
      kfa_code_93: '93011200',
      kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
      name: 'Azithromycin 500mg Tablet Salut Selaput (ZITHRAX)',
      generic_name: 'Azithromycin',
      ingredient_code: '91000235',
      form: 'Tablet Salut Selaput',
      manufacturer: 'Pfizer Indonesia',
      stock: 12, // menipis
      unit: 'Strip (3 tablet)',
      lot_number: 'LOT2025F006',
      expiration_date: '2027-01-15',
      medication_type: 'non-formularium',
      price: 35000,
      min_stock: 20
    }
  ],

  // ─── PRESCRIPTIONS (MedicationRequest) ───────────────
  prescriptions: [
    {
      id: 'MR-001',
      prescription_number: 'RX-2026-0001',
      prescription_item_number: 'RXI-2026-0001',
      identifier_system: 'http://sys-ids.kemkes.go.id/prescription/org-001',
      status: 'active',           // FHIR: active | completed | cancelled | on-hold | stopped
      intent: 'order',
      authored_on: '2026-09-09T03:30:00+00:00', // UTC+00 (WIB -7)
      authored_on_display: '09 Sep 2026, 10:30 WIB',

      // Patient
      patient_ihs_number: 'P02478375304',
      patient_name: 'Budi Santoso',
      patient_nik: '3201234567890001',

      // Medication (dokter boleh 92 atau 93)
      medication_id: 'MED-003',
      medication_kfa: '92001450',
      medication_name: 'Metformin 500mg Tablet',
      medication_form: 'Tablet',

      // Dosage Instruction
      dosage_route: { code: '26643006', display: 'Oral', system: 'http://snomed.info/sct' },
      dosage_value: 1,
      dosage_unit: 'tablet',
      dosage_timing_code: 'BID',
      dosage_timing_repeat: { frequency: 2, period: 1, periodUnit: 'd' },
      dosage_additional_instruction: 'Diminum setelah makan',
      dosage_patient_instruction: 'Minum dengan segelas air putih',

      // Dispense Request
      quantity: 60,
      quantity_unit: 'tablet',
      expected_supply_days: 30,

      // Substitution
      substitution_allowed: true,

      // Supporting
      payment_type: 'BPJS-K',
      sep_number: 'SEP-2026-00123',
      note: 'Pantau gula darah setiap 2 minggu',

      // Requester (Dokter)
      requester_id: 'USR-001',
      requester_name: 'dr. Ahmad Fauzi, Sp.PD',
      requester_npa: '1234567',
      requester_phone: '081234567890',

      // Encounter
      encounter_id: 'ENC-2026-001',
      service_type: { code: '64', display: 'Pharmacy', system: 'http://terminology.hl7.org/CodeSystem/service-type' }
    },
    {
      id: 'MR-002',
      prescription_number: 'RX-2026-0001',
      prescription_item_number: 'RXI-2026-0002',
      identifier_system: 'http://sys-ids.kemkes.go.id/prescription/org-001',
      status: 'active',
      intent: 'order',
      authored_on: '2026-09-09T03:30:00+00:00',
      authored_on_display: '09 Sep 2026, 10:30 WIB',

      patient_ihs_number: 'P02478375304',
      patient_name: 'Budi Santoso',
      patient_nik: '3201234567890001',

      medication_id: 'MED-005',
      medication_kfa: '92003300',
      medication_name: 'Amlodipine 5mg Tablet',
      medication_form: 'Tablet',

      dosage_route: { code: '26643006', display: 'Oral', system: 'http://snomed.info/sct' },
      dosage_value: 1,
      dosage_unit: 'tablet',
      dosage_timing_code: 'QD',
      dosage_timing_repeat: { frequency: 1, period: 1, periodUnit: 'd' },
      dosage_additional_instruction: 'Diminum pagi hari',
      dosage_patient_instruction: 'Minum secara teratur setiap hari pada waktu yang sama',

      quantity: 30,
      quantity_unit: 'tablet',
      expected_supply_days: 30,
      substitution_allowed: false,

      payment_type: 'BPJS-K',
      sep_number: 'SEP-2026-00123',
      note: '',
      requester_id: 'USR-001',
      requester_name: 'dr. Ahmad Fauzi, Sp.PD',
      requester_npa: '1234567',
      requester_phone: '081234567890',
      encounter_id: 'ENC-2026-001',
      service_type: { code: '64', display: 'Pharmacy', system: 'http://terminology.hl7.org/CodeSystem/service-type' }
    },
    {
      id: 'MR-003',
      prescription_number: 'RX-2026-0002',
      prescription_item_number: 'RXI-2026-0003',
      identifier_system: 'http://sys-ids.kemkes.go.id/prescription/org-001',
      status: 'completed',
      intent: 'order',
      authored_on: '2026-09-08T04:15:00+00:00',
      authored_on_display: '08 Sep 2026, 11:15 WIB',

      patient_ihs_number: 'P02478375305',
      patient_name: 'Siti Rahayu',
      patient_nik: '3201234567890002',

      medication_id: 'MED-001',
      medication_kfa: '92000511',
      medication_name: 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)',
      medication_form: 'Sirup',

      dosage_route: { code: '26643006', display: 'Oral', system: 'http://snomed.info/sct' },
      dosage_value: 5,
      dosage_unit: 'mL',
      dosage_timing_code: 'TID',
      dosage_timing_repeat: { frequency: 3, period: 1, periodUnit: 'd' },
      dosage_additional_instruction: 'Kocok sebelum diminum',
      dosage_patient_instruction: 'Diminum 3x sehari 5mL bila demam',

      quantity: 2,
      quantity_unit: 'Botol',
      expected_supply_days: 5,
      substitution_allowed: true,

      payment_type: 'Biaya-Sendiri',
      sep_number: null,
      note: 'Demam 38.5°C',
      requester_id: 'USR-001',
      requester_name: 'dr. Ahmad Fauzi, Sp.PD',
      requester_npa: '1234567',
      requester_phone: '081234567890',
      encounter_id: 'ENC-2026-002',
      service_type: { code: '64', display: 'Pharmacy', system: 'http://terminology.hl7.org/CodeSystem/service-type' }
    },
    {
      id: 'MR-004',
      prescription_number: 'RX-2026-0003',
      prescription_item_number: 'RXI-2026-0004',
      identifier_system: 'http://sys-ids.kemkes.go.id/prescription/org-001',
      status: 'cancelled',
      intent: 'order',
      authored_on: '2026-09-07T05:00:00+00:00',
      authored_on_display: '07 Sep 2026, 12:00 WIB',

      patient_ihs_number: 'P02478375306',
      patient_name: 'Hendra Wijaya',
      patient_nik: '3201234567890003',

      medication_id: 'MED-004',
      medication_kfa: '92002100',
      medication_name: 'Omeprazole 20mg Kapsul',
      medication_form: 'Kapsul',

      dosage_route: { code: '26643006', display: 'Oral', system: 'http://snomed.info/sct' },
      dosage_value: 1,
      dosage_unit: 'kapsul',
      dosage_timing_code: 'QD',
      dosage_timing_repeat: { frequency: 1, period: 1, periodUnit: 'd' },
      dosage_additional_instruction: 'Diminum 30 menit sebelum makan',
      dosage_patient_instruction: '',

      quantity: 30,
      quantity_unit: 'kapsul',
      expected_supply_days: 30,
      substitution_allowed: false,

      payment_type: 'Asuransi-Swasta',
      sep_number: null,
      note: 'GERD dengan gejala berat',
      status_reason: 'Obat tidak tersedia (stok habis)',
      requester_id: 'USR-001',
      requester_name: 'dr. Ahmad Fauzi, Sp.PD',
      requester_npa: '1234567',
      requester_phone: '081234567890',
      encounter_id: 'ENC-2026-003',
      service_type: { code: '64', display: 'Pharmacy', system: 'http://terminology.hl7.org/CodeSystem/service-type' }
    },
    {
      id: 'MR-005',
      prescription_number: 'RX-2026-0004',
      prescription_item_number: 'RXI-2026-0005',
      identifier_system: 'http://sys-ids.kemkes.go.id/prescription/org-001',
      status: 'active',
      intent: 'order',
      authored_on: '2026-09-09T05:45:00+00:00',
      authored_on_display: '09 Sep 2026, 12:45 WIB',

      patient_ihs_number: 'P02478375307',
      patient_name: 'Dewi Kusuma',
      patient_nik: '3201234567890004',

      medication_id: 'MED-002',
      medication_kfa: '92000210',
      medication_name: 'Amoxicillin 500mg Kapsul',
      medication_form: 'Kapsul',

      dosage_route: { code: '26643006', display: 'Oral', system: 'http://snomed.info/sct' },
      dosage_value: 1,
      dosage_unit: 'kapsul',
      dosage_timing_code: 'TID',
      dosage_timing_repeat: { frequency: 3, period: 1, periodUnit: 'd' },
      dosage_additional_instruction: 'Habiskan antibiotik',
      dosage_patient_instruction: 'Minum 3x sehari, habiskan meskipun sudah merasa baikan',

      quantity: 21,
      quantity_unit: 'kapsul',
      expected_supply_days: 7,
      substitution_allowed: true,

      payment_type: 'BPJS-K',
      sep_number: 'SEP-2026-00456',
      note: 'Infeksi saluran napas atas',
      requester_id: 'USR-001',
      requester_name: 'dr. Ahmad Fauzi, Sp.PD',
      requester_npa: '1234567',
      requester_phone: '081234567890',
      encounter_id: 'ENC-2026-004',
      service_type: { code: '64', display: 'Pharmacy', system: 'http://terminology.hl7.org/CodeSystem/service-type' }
    }
  ],

  // ─── DISPENSES (MedicationDispense) ──────────────────
  dispenses: [
    {
      id: 'MD-001',
      prescription_id: 'MR-003',
      prescription_number: 'RX-2026-0002',
      dispensed_at: '2026-09-08T06:30:00+00:00',
      dispensed_at_display: '08 Sep 2026, 13:30 WIB',

      patient_name: 'Siti Rahayu',
      patient_ihs_number: 'P02478375305',

      // Medication – apoteker WAJIB kode 93
      medication_id: 'MED-001',
      medication_kfa: '93002205',
      medication_name: 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)',
      medication_form: 'Sirup',

      // Dispense quantity
      quantity: 2,
      quantity_unit: 'Botol',

      // Dosage
      dosage_route: { code: '26643006', display: 'Oral', system: 'http://snomed.info/sct' },
      dosage_value: 5,
      dosage_unit: 'mL',
      dosage_timing_code: 'TID',
      dosage_timing_repeat: { frequency: 3, period: 1, periodUnit: 'd' },
      dosage_additional_instruction: 'Kocok sebelum diminum',

      // Substitution
      substitution_was_substituted: false,
      substitution_type: null,
      substitution_reason: null,
      substitution_responsible_party: null,

      // Pricing (ChargeItemDefinition)
      price_per_item: 25000,
      total_price: 50000,
      payment_type: 'Biaya-Sendiri',

      // Dispensed by
      dispensed_by_id: 'USR-002',
      dispensed_by_name: 'apt. Siti Nurhaliza, S.Farm.',

      status: 'completed'
    }
  ],

  // ─── DASHBOARD STATS ─────────────────────────────────
  dashboard_stats: {
    dokter: {
      my_prescriptions_today: 5,
      active_prescriptions: 2,
      completed_prescriptions: 2,
      cancelled_prescriptions: 1,
      last_updated: '2026-09-09T12:30:00+07:00'
    },
    apoteker: {
      total_prescriptions_today: 12,
      total_dispensed_today: 8,
      pending_queue: 4,
      low_stock_count: 2,
      out_of_stock_count: 1,
      last_updated: '2026-09-09T12:30:00+07:00'
    }
  },

  // ─── LOOKUP DATA ──────────────────────────────────────
  dosage_routes: [
    { code: '26643006', display: 'Oral (Diminum)', system: 'http://snomed.info/sct' },
    { code: '78421000', display: 'Intramuscular / Suntik IM', system: 'http://snomed.info/sct' },
    { code: '47625008', display: 'Intravena / Suntik IV', system: 'http://snomed.info/sct' },
    { code: '6064005',  display: 'Topikal (Oles/Salep)', system: 'http://snomed.info/sct' },
    { code: '54485002', display: 'Tetes Mata (Ophthalmic)', system: 'http://snomed.info/sct' },
    { code: '10547007', display: 'Tetes Telinga (Otic)', system: 'http://snomed.info/sct' },
    { code: '46713006', display: 'Nasal (Semprot Hidung)', system: 'http://snomed.info/sct' },
    { code: '16857009', display: 'Vaginal', system: 'http://snomed.info/sct' },
    { code: '37161004', display: 'Rektal / Suppositoria', system: 'http://snomed.info/sct' },
    { code: '34206005', display: 'Sublingual (Bawah Lidah)', system: 'http://snomed.info/sct' }
  ],

  timing_codes: [
    { code: 'QD',  label: '1x sehari',   repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
    { code: 'BID', label: '2x sehari',   repeat: { frequency: 2, period: 1, periodUnit: 'd' } },
    { code: 'TID', label: '3x sehari',   repeat: { frequency: 3, period: 1, periodUnit: 'd' } },
    { code: 'QID', label: '4x sehari',   repeat: { frequency: 4, period: 1, periodUnit: 'd' } },
    { code: 'Q6H', label: 'Tiap 6 jam',  repeat: { frequency: 1, period: 6, periodUnit: 'h' } },
    { code: 'Q8H', label: 'Tiap 8 jam',  repeat: { frequency: 1, period: 8, periodUnit: 'h' } },
    { code: 'Q12H',label: 'Tiap 12 jam', repeat: { frequency: 1, period: 12, periodUnit: 'h' } },
    { code: 'AM',  label: 'Pagi hari',   repeat: { frequency: 1, period: 1, periodUnit: 'd', when: 'MORN' } },
    { code: 'PM',  label: 'Malam hari',  repeat: { frequency: 1, period: 1, periodUnit: 'd', when: 'EVE' } },
    { code: 'PRN', label: 'Bila perlu',  repeat: null }
  ],

  payment_types: ['BPJS-K', 'Biaya-Sendiri', 'Biaya-Perusahaan', 'Asuransi-Swasta'],

  substitution_types: [
    { code: 'E', display: 'Equivalent (Setara)' },
    { code: 'F', display: 'Formulary (Sesuai Formularium)' },
    { code: 'G', display: 'Generic (Generik)' }
  ],

  substitution_reasons: [
    { code: 'OS', display: 'Out of Stock (Stok Habis)' },
    { code: 'RR', display: 'Regulatory Requirement' },
    { code: 'CT', display: 'Continuing Therapy' },
    { code: 'FP', display: 'Formulary Policy' }
  ]
};
