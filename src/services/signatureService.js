const logger = require('../utils/logger');
const config = require('../config');

let chilkat;

try {
    chilkat = require('@chilkat/ck-node18-linux64');
} catch (e) {
    try {
        chilkat = require('@chilkat/ck-node18-win64');
    } catch (e2) {
        logger.error("Failed to load Chilkat module: " + e2.message);
        process.exit(1);
    }
}

/**
 * Sign an invoice payload with CAdES-BES signature
 * @param {Object} payload - The invoice payload to sign
 * @returns {Object} - { success: boolean, data?: Object, error?: string }
 */
function signInvoice(payload) {
    try {
        const crypt = new chilkat.Crypt2();
        crypt.VerboseLogging = true;

        const cert = new chilkat.Cert();
        cert.VerboseLogging = true;

        // Set the smart card PIN from config
        cert.SmartCardPin = config.smartCardPin;

        // Load certificate from smart card
        const certLoaded = cert.LoadFromSmartcard("");
        if (!certLoaded) {
            logger.error(cert.LastErrorText);
            return { success: false, error: "Failed to load certificate from smart card" };
        }

        // Set signing certificate
        const certSet = crypt.SetSigningCert(cert);
        if (!certSet) {
            logger.error(crypt.LastErrorText);
            return { success: false, error: "Failed to set signing certificate" };
        }

        // Configure CMS options for ITIDA
        const cmsOptions = new chilkat.JsonObject();
        cmsOptions.UpdateBool("DigestData", true);
        cmsOptions.UpdateBool("OmitAlgorithmIdNull", true);
        cmsOptions.UpdateBool("CanonicalizeITIDA", true);
        crypt.CmsOptions = cmsOptions.Emit();

        // Enable CAdES-BES signature
        crypt.CadesEnabled = true;
        crypt.HashAlgorithm = "sha256";

        // Configure signing attributes
        const jsonSigningAttrs = new chilkat.JsonObject();
        jsonSigningAttrs.UpdateInt("contentType", 1);
        jsonSigningAttrs.UpdateInt("signingTime", 1);
        jsonSigningAttrs.UpdateInt("messageDigest", 1);
        jsonSigningAttrs.UpdateInt("signingCertificateV2", 1);
        crypt.SigningAttributes = jsonSigningAttrs.Emit();

        // Only include the signing certificate
        crypt.IncludeCertChain = false;

        // Prepare JSON for signing
        const json = new chilkat.JsonObject();
        json.Load(JSON.stringify(payload));
        json.EmitCompact = true;
        const jsonToSign = json.Emit();

        // Create the signature
        crypt.EncodingMode = "base64";
        crypt.Charset = "utf-8";

        const sigBase64 = crypt.SignStringENC(jsonToSign);
        if (!crypt.LastMethodSuccess) {
            logger.error(crypt.LastErrorText);
            return { success: false, error: "Failed to create signature" };
        }

        logger.info("Signature generated successfully");

        // Add signature to payload
        json.UpdateString("signatures[0].signatureType", "I");
        json.UpdateString("signatures[0].value", sigBase64);

        // Parse the signed JSON back to object
        const signedPayload = JSON.parse(json.Emit());

        return { success: true, data: signedPayload };

    } catch (err) {
        logger.error(`Signature generation error: ${err.message}`);
        return { success: false, error: err.message };
    }
}

module.exports = {
    signInvoice
};
