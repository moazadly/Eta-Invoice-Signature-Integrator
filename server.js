const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Invoice signing endpoint: POST http://localhost:${PORT}/api/invoice/sign`);
});
