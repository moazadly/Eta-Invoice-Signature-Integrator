const express = require('express');
const invoiceRoutes = require('./routes/invoiceRoutes');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());

// Request/Response logging middleware
app.use((req, res, next) => {
    // Log the request
    const requestLog = {
        method: req.method,
        url: req.originalUrl,
        body: req.body
    };
    logger.info(`REQUEST: ${JSON.stringify(requestLog)}`);

    // Capture the original res.json to log the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
        logger.info(`RESPONSE: ${JSON.stringify(data)}`);
        return originalJson(data);
    };

    next();
});

// Routes
app.use('/api/invoice', invoiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Handle JSON parsing errors specifically
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.error(`JSON Parse Error: ${err.message}`);
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body: ' + err.message
        });
    }

    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

module.exports = app;
