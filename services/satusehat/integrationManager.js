const { mapToPatient, mapToMedicationRequest, mapToMedicationDispense } = require('./fhirMapper');
const { postFhirResource } = require('./apiClient');

const syncPrescriptionToSatuSehat = async (prescriptionData) => {
    try {
        const fhirPayload = mapToMedicationRequest(prescriptionData);
        const response = await postFhirResource('MedicationRequest', fhirPayload);
        
        return {
            success: true,
            satusehat_id: response.id,
            message: 'Berhasil mengirim MedicationRequest',
            raw_response: response
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            raw_error: error.response?.data || error
        };
    }
};

const syncDispenseToSatuSehat = async (dispenseData) => {
    try {
        const fhirPayload = mapToMedicationDispense(dispenseData);
        const response = await postFhirResource('MedicationDispense', fhirPayload);
        
        return {
            success: true,
            satusehat_id: response.id,
            message: 'Berhasil mengirim MedicationDispense',
            raw_response: response
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            raw_error: error.response?.data || error
        };
    }
};

const syncPatientToSatuSehat = async (patientData) => {
    try {
        const fhirPayload = mapToPatient(patientData);
        const response = await postFhirResource('Patient', fhirPayload);
        
        return {
            success: true,
            ihs_number: response.id,
            message: 'Berhasil mendaftarkan Pasien',
            raw_response: response
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            raw_error: error.response?.data || error
        };
    }
};

module.exports = { syncPrescriptionToSatuSehat, syncDispenseToSatuSehat, syncPatientToSatuSehat };
