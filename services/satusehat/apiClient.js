const axios = require('axios');
const { satusehatConfig } = require('./config');
const { getAccessToken } = require('./oauth');

const postFhirResource = async (resourceType, payload) => {
    try {
        const token = await getAccessToken();
        
        const response = await axios.post(`${satusehatConfig.baseUrl}/${resourceType}`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error(`Error POST ${resourceType}:`, error.response?.data || error.message);
        throw error;
    }
};

const getFhirResource = async (resourceType, id) => {
    try {
        const token = await getAccessToken();
        
        const response = await axios.get(`${satusehatConfig.baseUrl}/${resourceType}/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error(`Error GET ${resourceType}/${id}:`, error.response?.data || error.message);
        throw error;
    }
};

module.exports = { postFhirResource, getFhirResource };
