const axios = require('axios');
const path = require('path');
const logger = require('../../logger');   
// Ensure config is loaded correctly
const configPath = path.resolve(__dirname, '../../config.json');
const config = require(configPath);
require('dotenv').config();

// ETA URLs
const ID_SRV_URL = "https://id.eta.gov.eg";
const API_SRV_URL = "https://api.invoicing.eta.gov.eg";

async function getToken() {
    try {
        const clientId = process.env.CLIENT_ID || "53fe1527-c9d9-4481-9a9d-9f3786af06d1"; // Fallback to hardcoded from original
        const clientSecret = process.env.CLIENT_SECRET || "ba6a702c-8b49-40c8-9986-6d83558661f3";

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);

        const response = await axios.post(`${ID_SRV_URL}/connect/token`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'pososversion': 'windows'
            }
        });

        if (response.status === 200 && response.data.access_token) {
            logger.info("Access token retrieved successfully");
            return response.data.access_token;
        } else {
            throw new Error(`Failed to retrieve token. Status: ${response.status}`);
        }
    } catch (error) {
        logger.error(`Token retrieval failed: ${error.message}`);
        // Log full error for debugging
        if (error.response) {
            logger.error(`Data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

async function submitDocuments(signedPayload, accessToken) {
    try {
        const url = `${API_SRV_URL}/api/v1/documentsubmissions`;
        
        // Wrap payload in documents array as per original code
        const body = {
            documents: [signedPayload]
        };

        const response = await axios.post(url, body, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=utf-8'
            }
        });

        logger.info(`Submission response status: ${response.status}`);
        logger.info(`Submission ID: ${response.data.submissionId}`);
        logger.info("Response body: " + JSON.stringify(response.data));
        
        return response.data;

    } catch (error) {
        logger.error(`Submission failed: ${error.message}`);
        if (error.response) {
            logger.error(`Status: ${error.response.status}`);
            logger.error(`Data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

module.exports = {
    getToken,
    submitDocuments
};
