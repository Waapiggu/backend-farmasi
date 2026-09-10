/**
 * satusehat.js – SATUSEHAT Sandbox Simulation Layer
 * Standar: FHIR R4 Pelayanan Kefarmasian Kemenkes RI
 * Ref: https://satusehat.kemkes.go.id/platform/docs/id/interoperability/kefarmasian/
 * 
 * Keamanan:
 * - Kredensial & Client Secret riil TIDAK disimpan di frontend.
 * - Layer ini menyediakan simulasi RESTful FHIR Sandbox interaktif untuk prototype & monitoring.
 */

const SATUSEHATService = (() => {
  const SANDBOX_CONFIG = {
    env: 'Sandbox / Staging DTO Kemenkes RI',
    fhir_base_url: 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1',
    organization_id: '10000004', // Dummy Faskes Organization ID
    location_id: 'LOC-FARMASI-01',
    kfa_system: 'http://sys-ids.kemkes.go.id/kfa',
    snomed_system: 'http://snomed.info/sct'
  };

  // Log transaksi sinkronisasi SATUSEHAT (In-Memory)
  const syncLogs = [
    {
      id: 'SS-LOG-001',
      resource_type: 'MedicationRequest',
      resource_id: 'MR-001',
      status_code: 201,
      status_text: 'Created',
      timestamp: '2026-09-09T03:30:15+00:00',
      timestamp_display: '09 Sep 2026, 10:30 WIB',
      details: 'Prescription RX-2026-0001 synced (Metformin 500mg, KFA: 92001450)'
    },
    {
      id: 'SS-LOG-002',
      resource_type: 'MedicationDispense',
      resource_id: 'MD-001',
      status_code: 201,
      status_text: 'Created',
      timestamp: '2026-09-08T06:30:20+00:00',
      timestamp_display: '08 Sep 2026, 13:30 WIB',
      details: 'Dispense MD-001 synced (Paracetamol Sirup, KFA: 93002205)'
    },
    {
      id: 'SS-LOG-003',
      resource_type: 'Encounter',
      resource_id: 'ENC-2026-001',
      status_code: 200,
      status_text: 'OK',
      timestamp: '2026-09-09T03:00:00+00:00',
      timestamp_display: '09 Sep 2026, 10:00 WIB',
      details: 'Encounter Rawat Jalan Budi Santoso verified'
    }
  ];

  // Helper konversi payload sistem lokal ke FHIR R4 MedicationRequest
  function buildMedicationRequestPayload(p) {
    return {
      resourceType: 'MedicationRequest',
      identifier: [
        {
          system: `http://sys-ids.kemkes.go.id/prescription/${SANDBOX_CONFIG.organization_id}`,
          use: 'official',
          value: p.prescription_number
        },
        {
          system: `http://sys-ids.kemkes.go.id/prescription-item/${SANDBOX_CONFIG.organization_id}`,
          use: 'official',
          value: p.prescription_item_number || p.prescription_number + '-1'
        }
      ],
      status: p.status === 'completed' ? 'completed' : p.status === 'cancelled' ? 'cancelled' : 'active',
      intent: 'order',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
              code: 'outpatient',
              display: 'Outpatient'
            }
          ]
        }
      ],
      medicationCodeableConcept: {
        coding: [
          {
            system: SANDBOX_CONFIG.kfa_system,
            code: p.medication_kfa || 'KFA_CODE_DUMMY_001',
            display: p.medication_name
          }
        ]
      },
      subject: {
        reference: `Patient/${p.patient_ihs_number || 'P02478375304'}`,
        display: p.patient_name
      },
      encounter: {
        reference: `Encounter/${p.encounter_id || 'ENC-2026-001'}`
      },
      authoredOn: p.authored_on || new Date().toISOString(),
      requester: {
        reference: `Practitioner/${p.requester_id || 'USR-001'}`,
        display: p.requester_name
      },
      dosageInstruction: [
        {
          sequence: 1,
          text: `${p.dosage_value} ${p.dosage_unit} — ${p.dosage_timing_code}. ${p.dosage_additional_instruction || ''}`,
          additionalInstruction: p.dosage_additional_instruction ? [
            { text: p.dosage_additional_instruction }
          ] : [],
          patientInstruction: p.dosage_patient_instruction || '',
          timing: {
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation',
                  code: p.dosage_timing_code || 'QD'
                }
              ]
            }
          },
          route: {
            coding: [
              {
                system: SANDBOX_CONFIG.snomed_system,
                code: p.dosage_route?.code || '26643006',
                display: p.dosage_route?.display || 'Oral'
              }
            ]
          },
          doseAndRate: [
            {
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/dose-rate-type',
                    code: 'ordered',
                    display: 'Ordered'
                  }
                ]
              },
              doseQuantity: {
                value: p.dosage_value,
                unit: p.dosage_unit
              }
            }
          ]
        }
      ],
      dispenseRequest: {
        quantity: {
          value: p.quantity,
          unit: p.quantity_unit
        },
        expectedSupplyDuration: {
          value: p.expected_supply_days || 7,
          unit: 'days',
          system: 'http://unitsofmeasure.org',
          code: 'd'
        }
      },
      substitution: {
        allowedBoolean: !!p.substitution_allowed
      }
    };
  }

  // Helper konversi payload sistem lokal ke FHIR R4 MedicationDispense
  function buildMedicationDispensePayload(d) {
    return {
      resourceType: 'MedicationDispense',
      identifier: [
        {
          system: `http://sys-ids.kemkes.go.id/prescription/${SANDBOX_CONFIG.organization_id}`,
          use: 'official',
          value: d.prescription_number
        },
        {
          system: `http://sys-ids.kemkes.go.id/dispense/${SANDBOX_CONFIG.organization_id}`,
          use: 'official',
          value: d.id
        }
      ],
      status: 'completed',
      category: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/medicationdispense-category',
            code: 'outpatient',
            display: 'Outpatient'
          }
        ]
      },
      medicationCodeableConcept: {
        coding: [
          {
            system: SANDBOX_CONFIG.kfa_system,
            code: d.medication_kfa || '93002205', // Wajib kode 93xxxxxx untuk dispense
            display: d.medication_name
          }
        ]
      },
      subject: {
        reference: `Patient/${d.patient_ihs_number || 'P02478375304'}`,
        display: d.patient_name
      },
      authorizingPrescription: [
        {
          reference: `MedicationRequest/${d.prescription_id}`
        }
      ],
      performer: [
        {
          actor: {
            reference: `Practitioner/${d.dispensed_by_id || 'USR-002'}`,
            display: d.dispensed_by_name || 'Apoteker'
          }
        }
      ],
      location: {
        reference: `Location/${SANDBOX_CONFIG.location_id}`,
        display: 'Depo Farmasi Rawat Jalan'
      },
      quantity: {
        value: d.quantity,
        unit: d.quantity_unit
      },
      whenHandedOver: d.dispensed_at || new Date().toISOString(),
      dosageInstruction: [
        {
          text: `${d.dosage_value} ${d.dosage_unit} — ${d.dosage_timing_code}`,
          additionalInstruction: d.dosage_additional_instruction ? [
            { text: d.dosage_additional_instruction }
          ] : []
        }
      ],
      substitution: {
        wasSubstituted: !!d.substitution_was_substituted,
        type: d.substitution_type ? {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution',
            code: d.substitution_type
          }]
        } : undefined,
        reason: d.substitution_reason ? [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
            code: d.substitution_reason
          }]
        }] : undefined
      }
    };
  }

  // Simulasi API Methods
  async function getPatient(nik) {
    await new Promise(r => setTimeout(r, 250));
    const patient = (typeof MOCK_DATA !== 'undefined' ? MOCK_DATA.patients : []).find(p => p.nik === nik);
    if (!patient) throw new Error('Data Pasien tidak ditemukan di master data SatuSehat');
    return {
      resourceType: 'Patient',
      id: patient.ihs_number,
      identifier: [
        { system: 'https://fhir.kemkes.go.id/id/nik', value: patient.nik },
        { system: 'https://fhir.kemkes.go.id/id/ihs-number', value: patient.ihs_number }
      ],
      name: [{ use: 'official', text: patient.name }],
      gender: patient.gender === 'L' ? 'male' : 'female',
      birthDate: patient.dob,
      address: [{ text: patient.address }]
    };
  }

  async function getPractitioner(identifier) {
    await new Promise(r => setTimeout(r, 200));
    const user = (typeof MOCK_DATA !== 'undefined' ? MOCK_DATA.users : []).find(u => u.id === identifier || u.npa === identifier || u.sipa === identifier);
    if (!user) throw new Error('Practitioner tidak ditemukan');
    return {
      resourceType: 'Practitioner',
      id: user.id,
      identifier: [
        { system: user.role === 'dokter' ? 'https://fhir.kemkes.go.id/id/npa-idi' : 'https://fhir.kemkes.go.id/id/sipa', value: user.npa || user.sipa || '0000' }
      ],
      name: [{ use: 'official', text: user.name }]
    };
  }

  async function createMedicationRequest(prescriptionData) {
    await new Promise(r => setTimeout(r, 300));
    const payload = buildMedicationRequestPayload(prescriptionData);
    
    // Simpan ke log audit
    syncLogs.unshift({
      id: 'SS-LOG-' + String(syncLogs.length + 1).padStart(3, '0'),
      resource_type: 'MedicationRequest',
      resource_id: prescriptionData.id || 'MR-NEW',
      status_code: 201,
      status_text: 'Created (Sandbox)',
      timestamp: new Date().toISOString(),
      timestamp_display: typeof Utils !== 'undefined' ? Utils.formatDateTime(new Date().toISOString()) : new Date().toLocaleString(),
      details: `Prescription ${prescriptionData.prescription_number} terverifikasi FHIR R4 (${prescriptionData.medication_name})`
    });

    return {
      status: 201,
      message: 'MedicationRequest successfully synchronized with SATUSEHAT Sandbox',
      fhir_payload: payload
    };
  }

  async function createMedicationDispense(dispenseData) {
    await new Promise(r => setTimeout(r, 300));
    const payload = buildMedicationDispensePayload(dispenseData);

    syncLogs.unshift({
      id: 'SS-LOG-' + String(syncLogs.length + 1).padStart(3, '0'),
      resource_type: 'MedicationDispense',
      resource_id: dispenseData.id || 'MD-NEW',
      status_code: 201,
      status_text: 'Created (Sandbox)',
      timestamp: new Date().toISOString(),
      timestamp_display: typeof Utils !== 'undefined' ? Utils.formatDateTime(new Date().toISOString()) : new Date().toLocaleString(),
      details: `MedicationDispense ${dispenseData.id} terkirim ke SATUSEHAT (KFA POA: ${dispenseData.medication_kfa || '93002205'})`
    });

    return {
      status: 201,
      message: 'MedicationDispense successfully synchronized with SATUSEHAT Sandbox',
      fhir_payload: payload
    };
  }

  function getSyncLogs() {
    return [...syncLogs];
  }

  function getConfig() {
    return { ...SANDBOX_CONFIG };
  }

  return {
    getConfig,
    getSyncLogs,
    getPatient,
    getPractitioner,
    createMedicationRequest,
    createMedicationDispense,
    buildMedicationRequestPayload,
    buildMedicationDispensePayload
  };
})();
