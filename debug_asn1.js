const pkijs = require('pkijs');
const asn1js = require('asn1js');
const crypto = require('crypto');

// Polyfill
const webcrypto = crypto.webcrypto;
pkijs.setEngine("newEngine", webcrypto, new pkijs.CryptoEngine({ name: "", crypto: webcrypto, subtle: webcrypto.subtle }));

try {
    const certBuffer = Buffer.from("test");
    const certHash = crypto.createHash('sha256').update(certBuffer).digest();

    console.log("Constructing ESSCertIDv2...");
    
    const algId = new pkijs.AlgorithmIdentifier({ 
        algorithmId: "2.16.840.1.101.3.4.2.1" 
    });
    console.log("AlgID Schema:", algId.toSchema());

    const essCertIDv2 = new asn1js.Sequence({
        value: [
            algId.toSchema(), 
            new asn1js.OctetString({ valueHex: certHash })
        ]
    });
    console.log("ESSCertIDv2 constructed");

    const signingCertificateV2 = new asn1js.Sequence({
        value: [
            new asn1js.Sequence({ 
                value: [essCertIDv2] 
            })
        ]
    });
    console.log("SigningCertificateV2 constructed");

    const attrSigningCertificateV2 = new pkijs.Attribute({
        type: "1.2.840.113549.1.9.16.2.47",
        values: [signingCertificateV2]
    });
    console.log("Attribute constructed");
    
    console.log("Attribute toSchema...");
    const attrSchema = attrSigningCertificateV2.toSchema();
    console.log("Attribute toBER...");
    const attrBer = attrSchema.toBER(false);
    console.log("Attribute BER success");

    const attrContentType = new pkijs.Attribute({
        type: "1.2.840.113549.1.9.3",
        values: [new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.1" })]
    });

    const attrSigningTime = new pkijs.Attribute({
        type: "1.2.840.113549.1.9.5",
        values: [new asn1js.UTCTime({ valueDate: new Date() })]
    });

    const hashBuffer = crypto.randomBytes(32);
    const attrMessageDigest = new pkijs.Attribute({
        type: "1.2.840.113549.1.9.4",
        values: [new asn1js.OctetString({ valueHex: hashBuffer })]
    });

    const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
        type: 0,
        attributes: [
            attrContentType,
            attrSigningTime,
            attrMessageDigest,
            attrSigningCertificateV2
        ]
    });

    console.log("SignedAttrs toSchema...");
    const schema = signedAttrs.toSchema();
    console.log("SignedAttrs toBER...");
    const ber = schema.toBER(false);
    console.log("Success!");

} catch (e) {
    console.error("Error:", e);
    console.error("Stack:", e.stack);
}
