const fs = require('fs');
const path = require('path');

const logFilePath = path.join(path.dirname(process.execPath), 'application.log');

// If running from source (node index.js), process.execPath is the node binary.
// We might want to log to the script directory in that case.
// If running as pkg, process.execPath is the executable itself.
// Determine log path based on environment
const getLogPath = () => {
    // If running as a packaged executable (process.pkg is defined)
    if (process.pkg) {
        return path.join(path.dirname(process.execPath), 'application.log');
    }
    // If running in development (node index.js)
    return path.join(__dirname, 'application.log');
};

const LOG_FILE = getLogPath();

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    // Still output to console for debug visibility
    if (level === 'ERROR') {
        console.error(logMessage.trim());
    } else {
        console.log(logMessage.trim());
    }

    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (err) {
        console.error(`Failed to write to log file: ${err.message}`);
    }
}

module.exports = {
    info: (message) => log('INFO', message),
    error: (message) => log('ERROR', message)
};
