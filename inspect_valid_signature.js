const fs = require('fs');
const asn1js = require('asn1js');
const pkijs = require('pkijs');
const crypto = require('crypto');

// Polyfill
const webcrypto = crypto.webcrypto;
pkijs.setEngine("newEngine", webcrypto, new pkijs.CryptoEngine({ name: "", crypto: webcrypto, subtle: webcrypto.subtle }));

const validSignatureBase64 = "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";

const buffer = Buffer.from(validSignatureBase64.replace(/\s/g, ''), 'base64');
console.log("Buffer length:", buffer.length);
console.log("First bytes:", buffer.subarray(0, 10).toString('hex'));
const arrayBuffer = new Uint8Array(buffer).buffer;

const asn1 = asn1js.fromBER(arrayBuffer);
if (asn1.offset === (-1)) {
    console.log("Can not parse binary data");
} else {
    try {
        const contentInfo = new pkijs.ContentInfo({ schema: asn1.result });
        console.log("ContentType:", contentInfo.contentType);
        
        if (contentInfo.contentType === "1.2.840.113549.1.7.2") { // SignedData
            const signedData = new pkijs.SignedData({ schema: contentInfo.content });
            console.log("SignedData Version:", signedData.version);
            
            console.log("EncapsulatedContentInfo ContentType:", signedData.encapContentInfo.eContentType);
            console.log("EncapsulatedContentInfo eContent Present:", !!signedData.encapContentInfo.eContent);
            
            for (const signer of signedData.signerInfos) {
                console.log("SignerInfo Version:", signer.version);
                if (signer.signedAttrs) {
                    console.log("Signed Attributes Present");
                    for (const attr of signer.signedAttrs.attributes) {
                        console.log("Attribute OID:", attr.type);
                        if (attr.type === "1.2.840.113549.1.9.4") { // MessageDigest
                             console.log("MessageDigest Found");
                        }
                        if (attr.type === "1.2.840.113549.1.9.3") { // ContentType
                             console.log("ContentType Attribute Found");
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.log("Error parsing:", e.message);
    }
}
