const graphene = require('graphene-pk11');
const logger = require('../utils/logger'); // Assuming logger exists, if not I'll use console
// Wait, logger.js is effectively 'require(./logger)' in index.js, but let's check path.
// In index.js: var logger = require('./logger');
// So it is at root. src/services/.. -> ../../logger
// But previous signatureService used require('../utils/logger').
// Let me check if src/utils/logger exists.
// grep_search showed src/services/signatureService.js
// list_dir showed logger.js at root.
// signatureService.js required '../utils/logger', so maybe there is a logger in src/utils too?
// list_dir showed 'src' has 5 children.
// I'll check src contents later. For now I'll assume ../utils/logger or ../../logger.
// signatureService.js used: const logger = require('../utils/logger');
// So I will use that.

const config = require('../../config.json'); // config.json is at root
// config.json path relative to src/services is ../../config.json

let mod;
let session;

function init() {
    try {
        if (!config.dllPath) {
            throw new Error("DLL Path not defined in config.json");
        }
        
        mod = graphene.Module.load(config.dllPath, "ePass2003");
        mod.initialize();
        
        const slots = mod.getSlots(true);
        if (slots.length === 0) {
            throw new Error("No slots found. Connect your token.");
        }
        
        const slot = slots[0];
        session = slot.open();
        session.login(config.smartCardPin);
        
        return true;
    } catch (e) {
        console.error("PKCS#11 Init Error:", e);
        if (session) session.logout();
        if (mod) mod.finalize();
        throw e;
    }
}

function sign(data) {
    if (!session) init();
    
    // Find private key
    const keys = session.find({
        class: graphene.ObjectClass.PRIVATE_KEY,
        keyType: graphene.KeyType.RSA
    });
    
    if (keys.length === 0) {
        throw new Error("No private key found on token.");
    }
    
    const privateKey = keys.items(0);
    
    // Sign using RSA_PKCS (or whatever mechanism required)
    // ITIDA requires CAdES-BES which implies hashing then signing digest.
    // We usually sign the hash (SHA256).
    const mechanism = { name: "SHA256_RSA_PKCS" }; 
    // Or just RSA_PKCS if we pre-calculate hash. pkijs usually handles hashing.
    // pkijs needs a signing function that takes the data/hash and returns signature.
    
    return session.createSign(mechanism, privateKey).once(data);
}

function getCertificate() {
    if (!session) init();
    
    const certs = session.find({
        class: graphene.ObjectClass.CERTIFICATE,
        certType: graphene.CertificateType.X_509
    });
    
    if (certs.length === 0) {
        throw new Error("No certificate found on token.");
    }
    
    return certs.items(0).getAttribute("value");
}

function close() {
    if (session) {
        session.logout();
        session.close();
    }
    if (mod) {
        mod.finalize();
    }
}

module.exports = {
    init,
    sign,
    getCertificate,
    close
};
