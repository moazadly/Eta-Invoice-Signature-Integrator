const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../logger'); 

// Handling path for pkg (packaged) vs local development
const SCRIPT_DIR = process.pkg ? path.join(__dirname, '../scripts') : path.join(__dirname, '../scripts');
// Actually, in pkg, __dirname points to virtual filesystem /snapshot/project/src/services
// scripts are at /snapshot/project/src/scripts
// However, PowerShell cannot read from /snapshot/ (virtual fs).
// We MUST extract the scripts to a temporary directory if we are running in pkg, OR
// we can read the script content in Node and pass it to PowerShell via -Command encoded.

// Strategy: Read script content and pass as Base64 encoded command to avoid FS issues with pkg.
// Or simple approach: If the user is running the EXE, they might have the 'scripts' folder alongside?
// No, user wants single EXE.

// Better Strategy for PKG + PowerShell:
// 1. Read the script file content in Node (fs.readFileSync works with pkg).
// 2. Write it to a temp file on the actual disk.
// 3. Execute PowerShell on that temp file.
// 4. Delete temp file.

const fs = require('fs');
const os = require('os');
// const { v4: uuidv4 } = require('uuid'); // Removed to avoid dependency

function getRandomFileName() {
    return path.join(os.tmpdir(), `ps_script_${Date.now()}_${Math.floor(Math.random() * 10000)}.ps1`);
}

function runPowerShell(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        // Read script from virtual FS (pkg compatible)
        const virtualScriptPath = path.join(__dirname, '../scripts', scriptName);
        let scriptContent;
        try {
            scriptContent = fs.readFileSync(virtualScriptPath);
        } catch (err) {
            return reject(new Error(`Failed to read script ${scriptName}: ${err.message}`));
        }

        // Write to temp file
        const tempFilePath = getRandomFileName();
        try {
            fs.writeFileSync(tempFilePath, scriptContent);
        } catch (err) {
            return reject(new Error(`Failed to write temp script: ${err.message}`));
        }

        logger.info(`Executing PowerShell script: ${scriptName}`);
        const ps = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', tempFilePath, ...args]);
        
        let stdout = '';
        let stderr = '';
        
        ps.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        ps.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ps.on('close', (code) => {
            // Cleanup temp file
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) { /* ignore */ }

            if (code !== 0) {
                reject(new Error(`PowerShell script ${scriptName} failed with code ${code}: ${stderr}`));
            } else {
                resolve(stdout.trim());
            }
        });
        
        ps.on('error', (err) => {
            // Cleanup temp file
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) { /* ignore */ }
            reject(err);
        });
    });
}

async function getCertificate() {
    try {
        const certBase64 = await runPowerShell('get_cert.ps1');
        return certBase64;
    } catch (error) {
        logger.error(`Failed to get certificate: ${error.message}`);
        throw error;
    }
}

    async function signHash(hashBase64) {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        let pin = "";
        try {
             const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
             pin = config.smartCardPin || "";
        } catch (e) {
             logger.warn("Could not read config.json for PIN: " + e.message);
        }

        const args = [hashBase64];
        if (pin) {
            args.push(pin);
        }

        const signatureBase64 = await runPowerShell('sign_data.ps1', args);
        return signatureBase64;
    } catch (error) {
        logger.error(`Failed to sign data: ${error.message}`);
        throw error;
    }
}

module.exports = {
    getCertificate,
    signHash
};
