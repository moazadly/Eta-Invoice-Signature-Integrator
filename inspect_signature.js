const fs = require('fs');
const pkijs = require('pkijs');
const asn1js = require('asn1js');
const crypto = require('crypto');

// Polyfill for pkijs
const webcrypto = crypto.webcrypto;
pkijs.setEngine("newEngine", webcrypto, new pkijs.CryptoEngine({ name: "", crypto: webcrypto, subtle: webcrypto.subtle }));

const validSignatureBase64 = "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";

const buffer = Buffer.from(validSignatureBase64.replace(/\s/g, ''), 'base64');
console.log("Buffer length:", buffer.length);
console.log("First 10 bytes:", buffer.subarray(0, 10).toString('hex'));

// OID: 1.2.840.113549.1.7.1 (id-data) -> 06 09 2a 86 48 86 f7 0d 01 07 01
const idDataOID = Buffer.from('06092a864886f70d010701', 'hex');
const idDataIdx = buffer.indexOf(idDataOID);
console.log("id-data OID found at:", idDataIdx);

// OID: 1.2.840.113549.1.7.5 (digestedData) -> 06 09 2a 86 48 86 f7 0d 01 07 05
const digestedDataOID = Buffer.from('06092a864886f70d010705', 'hex');
const digestedDataIdx = buffer.indexOf(digestedDataOID);
console.log("digestedData OID found at:", digestedDataIdx);

if (idDataIdx !== -1) {
    const nextBytes = buffer.subarray(idDataIdx + idDataOID.length, idDataIdx + idDataOID.length + 5);
    console.log("Bytes after id-data:", nextBytes.toString('hex'));
}
if (digestedDataIdx !== -1) {
    const nextBytes = buffer.subarray(digestedDataIdx + digestedDataOID.length, digestedDataIdx + digestedDataOID.length + 5);
    console.log("Bytes after digestedData:", nextBytes.toString('hex'));
}
