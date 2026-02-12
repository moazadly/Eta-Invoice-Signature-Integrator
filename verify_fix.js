const pkijs = require('pkijs');
const asn1js = require('asn1js');
const crypto = require('crypto');

// Polyfill
const webcrypto = crypto.webcrypto;
pkijs.setEngine("newEngine", webcrypto, new pkijs.CryptoEngine({ name: "", crypto: webcrypto, subtle: webcrypto.subtle }));

// Mock logic from signatureService.js
function createSignature() {
    // ... Simplified recreation of the logic I added to signatureService.js ...
    const signedData = new pkijs.SignedData({
        version: 3,
        encapContentInfo: new pkijs.ContentInfo({
            contentType: "1.2.840.113549.1.7.1"
        }),
        signerInfos: []
    });

    // The Fix I applied
    signedData.encapContentInfo.toSchema = function() {
        return new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.1" })
            ]
        });
    };

    const contentInfo = new pkijs.ContentInfo({
        contentType: "1.2.840.113549.1.7.2",
        content: signedData.toSchema()
    });

    return contentInfo.toSchema().toBER(false);
}

const ber = createSignature();
const cmsBase64 = Buffer.from(ber).toString('base64');

console.log("Generated Base64:", cmsBase64);

// Now inspect it
const asn1 = asn1js.fromBER(ber);
const contentInfo = new pkijs.ContentInfo({ schema: asn1.result });
const signedData = new pkijs.SignedData({ schema: contentInfo.content });

console.log("EncapsulatedContentInfo ContentType:", signedData.encapContentInfo.eContentType);
if (signedData.encapContentInfo.eContent) {
    console.log("Content: PRESENT");
} else {
    // Double check raw ASN.1 to be sure pkijs isn't hiding empty content
    const innerSeq = asn1.result.valueBlock.value[1].valueBlock.value[0]; // SignedData
    const encapContentInfo = innerSeq.valueBlock.value[2]; // encapContentInfo
    if (encapContentInfo.valueBlock.value.length > 1) {
        console.log("Raw Content: PRESENT");
    } else {
        console.log("Raw Content: ABSENT (Truly Detached)");
    }
}
