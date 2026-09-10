const axios = require('axios');
const { satusehatConfig } = require('./config');

let cachedToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
    try {
        if (cachedToken && tokenExpiry && Date.now() < (tokenExpiry - 300000)) {
            return cachedToken;
        }

        const data = new URLSearchParams({
            client_id: satusehatConfig.clientId,
            client_secret: satusehatConfig.clientSecret
        });

        const response = await axios.post(`${satusehatConfig.authUrl}/accesstoken?grant_type=client_credentials`, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        cachedToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000);

        return cachedToken;
    } catch (error) {
        console.error('Gagal mendapatkan Access Token SATUSEHAT:', error.response?.data || error.message);
        throw new Error('Gagal Autentikasi ke SATUSEHAT');
    }
};

module.exports = { getAccessToken };
