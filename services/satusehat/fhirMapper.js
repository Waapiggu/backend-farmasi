const { satusehatConfig } = require('./config');

const mapToMedicationRequest = (localData) => {
    return {
        "resourceType": "MedicationRequest",
        "identifier": [
            {
                "system": `http://sys-ids.kemkes.go.id/prescription/${satusehatConfig.organizationId}`,
                "use": "official",
                "value": localData.nomor_resep
            }
        ],
        "status": "active",
        "intent": "order",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                        "code": "outpatient",
                        "display": "Outpatient"
                    }
                ]
            }
        ],
        "medicationReference": {
            "reference": `Medication/${localData.id_kfa_obat}`,
            "display": localData.nama_obat
        },
        "subject": {
            "reference": `Patient/${localData.ihs_patient_id}`,
            "display": localData.nama_pasien
        },
        "encounter": {
            "reference": `Encounter/${localData.encounter_id}`
        },
        "authoredOn": localData.waktu_resep_dibuat,
        "requester": {
            "reference": `Practitioner/${localData.ihs_practitioner_id}`,
            "display": localData.nama_dokter
        },
        "reasonCode": [
            {
                "coding": [
                    {
                        "system": "http://hl7.org/fhir/sid/icd-10",
                        "code": localData.icd10_code,
                        "display": localData.diagnosis
                    }
                ]
            }
        ],
        "dosageInstruction": [
            {
                "sequence": 1,
                "text": localData.aturan_pakai,
                "timing": {
                    "repeat": {
                        "frequency": localData.frekuensi,
                        "period": 1,
                        "periodUnit": "d"
                    }
                },
                "route": {
                    "coding": [
                        {
                            "system": "http://www.whocc.no/atc",
                            "code": "O",
                            "display": "Oral"
                        }
                    ]
                }
            }
        ],
        "dispenseRequest": {
            "dispenseInterval": {
                "value": 1,
                "unit": "days",
                "system": "http://unitsofmeasure.org",
                "code": "d"
            },
            "validityPeriod": {
                "start": localData.valid_start,
                "end": localData.valid_end
            },
            "numberOfRepeatsAllowed": 0,
            "quantity": {
                "value": localData.jumlah_obat,
                "unit": "TAB",
                "system": "http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm",
                "code": "TAB"
            },
            "expectedSupplyDuration": {
                "value": localData.durasi_hari,
                "unit": "days",
                "system": "http://unitsofmeasure.org",
                "code": "d"
            }
        }
    };
};

const mapToMedicationDispense = (localData) => {
    return {
        "resourceType": "MedicationDispense",
        "identifier": [
            {
                "system": `http://sys-ids.kemkes.go.id/prescription/${satusehatConfig.organizationId}`,
                "use": "official",
                "value": localData.nomor_resep
            }
        ],
        "status": "completed",
        "category": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/medicationdispense-category",
                    "code": "outpatient",
                    "display": "Outpatient"
                }
            ]
        },
        "medicationReference": {
            "reference": `Medication/${localData.id_kfa_obat}`,
            "display": localData.nama_obat
        },
        "subject": {
            "reference": `Patient/${localData.ihs_patient_id}`,
            "display": localData.nama_pasien
        },
        "context": {
            "reference": `Encounter/${localData.encounter_id}`
        },
        "performer": [
            {
                "actor": {
                    "reference": `Practitioner/${localData.ihs_practitioner_id}`,
                    "display": localData.nama_apoteker
                }
            }
        ],
        "location": {
            "reference": `Location/${satusehatConfig.organizationId}`,
            "display": "Farmasi"
        },
        "authorizingPrescription": [
            {
                "reference": `MedicationRequest/${localData.satusehat_medication_request_id}`
            }
        ],
        "quantity": {
            "value": localData.jumlah_diserahkan,
            "unit": "TAB",
            "system": "http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm",
            "code": "TAB"
        },
        "daysSupply": {
            "value": localData.durasi_hari,
            "unit": "days",
            "system": "http://unitsofmeasure.org",
            "code": "d"
        },
        "whenPrepared": localData.waktu_disiapkan,
        "whenHandedOver": localData.waktu_diserahkan,
        "dosageInstruction": [
            {
                "sequence": 1,
                "text": localData.aturan_pakai,
                "timing": {
                    "repeat": {
                        "frequency": localData.frekuensi,
                        "period": 1,
                        "periodUnit": "d"
                    }
                }
            }
        ]
    };
};

const mapToPatient = (localData) => {
    return {
        "resourceType": "Patient",
        "identifier": [
            {
                "use": "official",
                "system": "https://fhir.kemkes.go.id/id/nik",
                "value": localData.nik
            }
        ],
        "name": [
            {
                "use": "official",
                "text": localData.nama_lengkap
            }
        ],
        "gender": localData.jenis_kelamin,
        "birthDate": localData.tanggal_lahir,
        "telecom": [
            {
                "system": "phone",
                "value": localData.nomor_telepon,
                "use": "mobile"
            }
        ],
        "address": [
            {
                "use": "home",
                "line": [
                    localData.alamat_jalan
                ],
                "city": localData.kota,
                "postalCode": localData.kode_pos,
                "country": "ID"
            }
        ]
    };
};

module.exports = { mapToMedicationRequest, mapToMedicationDispense, mapToPatient };
