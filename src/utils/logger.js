const fs = require('fs');
const path = require('path');

// Get logs directory path
const getLogsDir = () => {
    const execDir = path.basename(process.execPath).startsWith('node')
        ? path.join(__dirname, '..', '..')
        : path.dirname(process.execPath);
    return path.join(execDir, 'logs');
};

// Get today's log file path
const getLogFilePath = () => {
    const logsDir = getLogsDir();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logsDir, `${today}.log`);
};

// Ensure logs directory exists
const ensureLogsDir = () => {
    const logsDir = getLogsDir();
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
};

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    // Always output to console
    if (level === 'ERROR') {
        console.error(logMessage.trim());
    } else {
        console.log(logMessage.trim());
    }

    // Write errors to file
    if (level === 'ERROR') {
        try {
            ensureLogsDir();
            fs.appendFileSync(getLogFilePath(), logMessage);
        } catch (err) {
            console.error(`Failed to write to log file: ${err.message}`);
        }
    }
}

module.exports = {
    info: (message) => log('INFO', message),
    error: (message) => log('ERROR', message)
};
