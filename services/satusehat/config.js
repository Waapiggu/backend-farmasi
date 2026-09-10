require('dotenv').config();

const satusehatConfig = {
    authUrl: process.env.SATUSEHAT_AUTH_URL || 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1',
    baseUrl: process.env.SATUSEHAT_BASE_URL || 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1',
    clientId: process.env.SATUSEHAT_CLIENT_ID,
    clientSecret: process.env.SATUSEHAT_CLIENT_SECRET,
    organizationId: process.env.SATUSEHAT_ORGANIZATION_ID
};

module.exports = { satusehatConfig };
