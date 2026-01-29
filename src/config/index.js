const fs = require('fs');
const path = require('path');

// Determine config file path based on execution context
const getConfigPath = () => {
    const execDir = path.basename(process.execPath).startsWith('node')
        ? path.join(__dirname, '..', '..')
        : path.dirname(process.execPath);
    return path.join(execDir, 'config.json');
};

let config = {};

try {
    const configPath = getConfigPath();
    const configContent = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
} catch (err) {
    console.error(`Failed to load config.json: ${err.message}`);
    console.error('Please ensure config.json exists with smartCardPin and port settings.');
    process.exit(1);
}

module.exports = {
    smartCardPin: config.smartCardPin || '',
    port: config.port || 3000
};
