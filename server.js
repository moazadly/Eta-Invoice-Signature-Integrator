const app = require('./src/app');
const config = require('./src/config');
const logger = require('./logger'); // Correct path to root logger

const PORT = config.port || 3000;

try {
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Invoice signing endpoint: POST http://localhost:${PORT}/api/invoice/sign`);
    });
} catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1);
});
