const fs = require('fs');
const path = require('path');

// Determine config file path based on execution context
// Determine config file path based on execution context
const getConfigPath = () => {
    // If running as packaged executable
    if (process.pkg) {
        return path.join(path.dirname(process.execPath), 'config.json');
    }
    // If running from source (dev)
    return path.join(__dirname, '..', '..', 'config.json');
};

let config = {};

try {
    const configPath = getConfigPath();
    // We cannot use the logger here because logger might depend on config? 
    // No, logger depends on fs/path. But let's require logger to log startup errors to file.
    // However, logger is in ../utils/logger? No, root logger.js.
    // Let's try to require logger relative to here: ../../logger
    
    if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
    } else {
        throw new Error(`Config file not found at: ${configPath}`);
    }
} catch (err) {
    const fs = require('fs');
    const path = require('path');
    const logPath = process.pkg ? path.join(path.dirname(process.execPath), 'startup_error.log') : 'startup_error.log';
    fs.writeFileSync(logPath, `Failed to load config: ${err.message}\nStack: ${err.stack}`);
    process.exit(1);
}

module.exports = {
    smartCardPin: config.smartCardPin || '',
    port: config.port || 3000
};
