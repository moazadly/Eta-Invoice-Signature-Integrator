const express = require('express');
const router = express.Router();
const signatureService = require('../services/signatureService');
const logger = require('../utils/logger');

/**
 * POST /api/invoice/sign
 * Sign an invoice payload and return with signature
 */
router.post('/sign', (req, res) => {
    const payload = req.body;

    // Basic validation
    if (!payload || Object.keys(payload).length === 0) {
        logger.error('Sign request received with empty payload');
        return res.status(400).json({
            success: false,
            error: 'Request body is required'
        });
    }

    // Sign the invoice
    const result = signatureService.signInvoice(payload);

    if (result.success) {
        // Return the signed payload directly
        return res.status(200).json(result.data);
    } else {
        return res.status(500).json({
            success: false,
            error: result.error
        });
    }
});

module.exports = router;
