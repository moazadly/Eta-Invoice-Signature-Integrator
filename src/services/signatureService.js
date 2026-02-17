const pkijs = require('pkijs');
const asn1js = require('asn1js');
const crypto = require('crypto');
const powershellService = require('./powershellService');
const serialize = require('../utils/canonicalizer');
const logger = require('../../logger'); 

// Polyfill for pkijs if needed (Node 18 has global webcrypto)
const webcrypto = crypto.webcrypto;
pkijs.setEngine("newEngine", webcrypto, new pkijs.CryptoEngine({ name: "", crypto: webcrypto, subtle: webcrypto.subtle }));

/**
 * Creates CAdES-BES signature for the invoice.
 * @param {Object} payload - Invoice object.
 * @returns {Promise<Object>} - { success: true, data: signedPayload }
 */
async function signInvoice(payload) {
    try {
        logger.info("Signature process started.");
        
        // 1. Canonicalize
        
        // Clean and Normalize Payload (in-place)
        // ensure documentType is uppercase
        if (payload.documentType) {
            payload.documentType = payload.documentType.toUpperCase();
        }

        // Recursive function to remove null/undefined values
        const removeNulls = (obj) => {
            if (Array.isArray(obj)) {
                 return obj.map(v => removeNulls(v)).filter(v => v !== null && v !== undefined);
            } else if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    if (obj[key] === null || obj[key] === undefined) {
                        delete obj[key];
                    } else {
                        removeNulls(obj[key]);
                    }
                });
            }
            return obj;
        };
        
        removeNulls(payload);
        
        // Debug Log to verify cleanup
        if (process.env.DEBUG_SIGNATURE) {
            console.log("Cleaned Payload:", JSON.stringify(payload, null, 2));
        }

        const canonicalString = serialize(payload);
        const dataBuffer = Buffer.from(canonicalString, 'utf8');
        // logger.info("Canonicalization complete.");

        // 2. Hash the data (SHA-256)
        const hashBuffer = crypto.createHash('sha256').update(dataBuffer).digest();
        const hashBase64 = hashBuffer.toString('base64');
        logger.info(`Data hashed. Hash: ${hashBase64}`);
        
        // 3. Get Certificate
        const certBase64 = await powershellService.getCertificate();
        logger.info("Certificate retrieved from smart card.");
        
        const certBuffer = Buffer.from(certBase64, 'base64');
        const certificate = pkijs.Certificate.fromBER(certBuffer);
        
        // 4. Create SignedData Structure (CAdES-BES)
        // We construct it manually or via pkijs classes
        
        // Create SignerId (IssuerAndSerialNumber)
        const issuerAndSerialNumber = new pkijs.IssuerAndSerialNumber({
            issuer: certificate.issuer,
            serialNumber: certificate.serialNumber
        });

        // Create EncapsulatedContentInfo
        // (ContentInfo is constructed directly inside SignedData to ensure consistency)

        // 53. Create SignedAttributes
        // 1. ContentType must match EncapsulatedContentInfo eContentType
        const attrContentType = new pkijs.Attribute({
            type: "1.2.840.113549.1.9.3",
            values: [new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.5" })] // digestedData
        });

        // 2. SigningTime
        const attrSigningTime = new pkijs.Attribute({
            type: "1.2.840.113549.1.9.5",
            values: [new asn1js.UTCTime({ valueDate: new Date() })]
        });

        // 3. MessageDigest
        const hashArrayBuffer = new Uint8Array(hashBuffer).buffer;
        const attrMessageDigest = new pkijs.Attribute({
            type: "1.2.840.113549.1.9.4",
            values: [new asn1js.OctetString({ valueHex: hashArrayBuffer })]
        });

        // 4. ESSCertIDv2
        const certHash = crypto.createHash('sha256').update(certBuffer).digest();
        logger.info(`Cert hash calculated: ${certHash.toString('hex')}`);

        const algId = new pkijs.AlgorithmIdentifier({ 
            algorithmId: "2.16.840.1.101.3.4.2.1" // SHA-256
        });
        const algIdSchema = algId.toSchema();

        if (!algIdSchema || typeof algIdSchema.toBER !== 'function') {
            logger.error("algIdSchema is invalid or missing toBER");
        }

        // Convert Buffer to ArrayBuffer for asn1js just to be safe
        const certHashArrayBuffer = new Uint8Array(certHash).buffer;

        const essCertIDv2 = new asn1js.Sequence({
            value: [
                algIdSchema,
                new asn1js.OctetString({ valueHex: certHashArrayBuffer })
            ]
        });

        // Manual construction of SigningCertificateV2
        const signingCertificateV2 = new asn1js.Sequence({
            value: [
                new asn1js.Sequence({ // certs (SEQUENCE OF ESSCertIDv2)
                    value: [essCertIDv2] 
                })
            ]
        });

        const attrSigningCertificateV2 = new pkijs.Attribute({
            type: "1.2.840.113549.1.9.16.2.47",
            values: [signingCertificateV2]
        });

        logger.info("Attributes created. Constructing SignedAttributes...");
        
        try {
            // Test encoding of individual attributes to isolate the error
            logger.info("Testing attrContentType...");
            attrContentType.toSchema().toBER(false);
            
            logger.info("Testing attrSigningTime...");
            attrSigningTime.toSchema().toBER(false);
            
            logger.info("Testing attrMessageDigest...");
            attrMessageDigest.toSchema().toBER(false);
            
            logger.info("Testing attrSigningCertificateV2...");
            attrSigningCertificateV2.toSchema().toBER(false);
            
            logger.info("Individual attributes encoded successfully.");
        } catch (e) {
             logger.error(`Failed to encode individual attribute. Error: ${e.message}`);
             throw new Error(`Attribute encoding failed: ${e.message}`);
        }

        const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
            type: 0,
            attributes: [
                attrContentType,
                attrSigningTime,
                attrMessageDigest,
                attrSigningCertificateV2
            ]
        });

        // Encode SignedAttributes to DER for signing
        // IMPLICIT TAGGING context-specific [0] is handled by pkijs.SignedAndUnsignedAttributes.toSchema().encodedBlock
        // But we need the SET part. pkijs .toSchema() returns SET OF Attribute.
        // We need to encode it with the tag [0] separate or handled?
        // pkijs `SignedData.sign` does this internally. 
        // We need: SET(SignedAttributes) DER encoded.
        // Actually, for signature calculation, it is the DER encoding of the EXPLICIT SET of Attributes, 
        // changed to IMPLICIT [0] in the SignerInfo structure but NOT for hashing.
        // RFC 5652: "SignedAttributes value ... is the DER encoding of the SetOfAttributes value."
        
        const signedAttrsSchema = signedAttrs.toSchema();
        const signedAttrsBer = signedAttrsSchema.toBER(false);
        
        // We need to change the tag to SET (0x31) for hashing if it is not already?
        // pkijs `SignerInfo` uses `signedAttrs`.
        
        // Let's use `pkijs` internal helper or mimic it.
        // `pkijs` normally doesn't expose the buffer it signs easily without using `.sign()`.
        
        // WORKAROUND: We construct a Mock Signer?
        // Or we just accept that we need to encode it correctly.
        // SetOfAttributes is a SET (0x31).
        // signedAttrs.toSchema() returns a structure. 
        // Let's rely on `signedAttrs.encodedValue`.
        
        const signedAttrsParams = {
            type: 0,
            attributes: [
                attrContentType,
                attrSigningTime,
                attrMessageDigest,
                attrSigningCertificateV2
            ]
        };
        const signedAttrsObj = new pkijs.SignedAndUnsignedAttributes(signedAttrsParams);
        const signedAttrsEncoded = signedAttrsObj.toSchema().toBER(false);
        
        // Create signature
        // The input to signature is SHA256(SignedAttributes).
        // BUT SignedAttributes matches the IMPLICIT [0] tag (0xA0).
        // For hashing, we must use the EXPLICIT SET tag (0x31).
        
        const signedAttrsBuffer = new Uint8Array(signedAttrsEncoded);
        signedAttrsBuffer[0] = 0x31; // Change tag from [0] to SET
        
        const attrsHash = crypto.createHash('sha256').update(signedAttrsBuffer).digest();
        const attrsHashBase64 = attrsHash.toString('base64');
        
        // 5. Sign with PowerShell
        const signatureBase64 = await powershellService.signHash(attrsHashBase64);
        const signatureBuffer = Buffer.from(signatureBase64, 'base64');

        // 6. Create SignerInfo
        // 6. Create SignerInfo
        const signerInfo = new pkijs.SignerInfo({
            version: 1,
            sid: new pkijs.IssuerAndSerialNumber({
                issuer: certificate.issuer,
                serialNumber: certificate.serialNumber
            }),
            digestAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: "2.16.840.1.101.3.4.2.1" }), // SHA-256
            signedAttrs: signedAttrsObj,
            signatureAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: "1.2.840.113549.1.1.1" }), // rsaEncryption
            signature: new asn1js.OctetString({ valueHex: new Uint8Array(signatureBuffer).buffer })
        });

        // 7. Create SignedData
        // Based on analysis of valid signature:
        // EncapsulatedContentInfo eContentType is id-digestedData (1.2.840.113549.1.7.5)
        // And it HAS content. The content appears to be the DigestedData structure itself.
        
        // Construct DigestedData structure
        // DigestedData ::= SEQUENCE {
        //   version CMSVersion,
        //   digestAlgorithm DigestAlgorithmIdentifier,
        //   encapContentInfo EncapsulatedContentInfo,
        //   digest Digest }
        
        // HOWEVER, the ETA documentation says "4. Sign the hash created using CADES-BES signature".
        // And the valid signature inspection showed the content was around 1261 bytes.
        // If we are just signing the hash, we might not need to construct the full DigestedData content manually IF pkijs can do it.
        // But pkijs doesn't strongly support DigestedData as a content type for SignedData easily.
        
        // Let's look at the valid signature content bytes "a0 82 04 ed ...". 
        // This is [0] EXPLICIT CONTENT of length ~1261.
        
        // Wait, if the user error is "Attached digital signature is not supported", 
        // and my "Truly Detached" signature failed with that error,
        // and the "Valid Signature" HAS content...
        // Perhaps the "Attached... not supported" comes from the FACT that I was sending "id-data" without content (Detached), 
        // but the server logic is:
        // "If ContentType == id-data, I expect Attached content. If no content -> Error 'Attached... not supported' (bad error msg for 'Missing Content')"
        // "If ContentType == id-digestedData, I might handle it differently."
        
        // OR, the valid signature provided by the user IS NOT what I should be generating?
        // The user said "this is example for vaild signature".
        // It uses `digestedData`.
        
        // Let's implement `digestedData` with NO content first?
        // No, the valid signature HAS content.
        
        // What if I just use `id-data` but include the ORIGINAL JSON as attached content?
        // "Attached digital signature is not supported".
        // This implies they DO NOT want attached content.
        
        // Let's try `digestedData` (1.2.840.113549.1.7.5) as the OID, but DETACHED (no content).
        // This matches the OID of the valid signature but respect "Detached". 
        // If that fails, I am lost on what "content" to put in.
        
        const signedData = new pkijs.SignedData({
            version: 3,
            encapContentInfo: new pkijs.ContentInfo({
                contentType: "1.2.840.113549.1.7.5" // digestedData
            }),
            certificates: [certificate],
            signerInfos: [signerInfo]
        });

        // Force Detached for digestedData
        signedData.encapContentInfo.toSchema = function() {
            return new asn1js.Sequence({
                value: [
                    new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.5" })
                ]
            });
        };

        const contentInfo = new pkijs.ContentInfo({
            contentType: "1.2.840.113549.1.7.2", // signedData
            content: signedData.toSchema()
        });

        const cmsDer = contentInfo.toSchema().toBER(false);
        const cmsBase64 = Buffer.from(cmsDer).toString('base64');
        
        logger.info("Signature generated successfully via PowerShell/pkijs");

        // 8. Construct Final Object
        // canonicalString is ETA-specific serialization (not valid JSON), so we cannot parse it.
        // We use the original payload. 
        const signedPayload = JSON.parse(JSON.stringify(payload));
        signedPayload.signatures = [{
            signatureType: "I",
            value: cmsBase64
        }];

        return { success: true, data: signedPayload };

    } catch (error) {
        logger.error(`Signature generation error: ${error.message}`);
        console.error(error); // backup log
        return { success: false, error: error.message };
    }
}

module.exports = {
    signInvoice
};
