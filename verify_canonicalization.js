const serialize = require('./src/utils/canonicalizer');
const crypto = require('crypto');

const payload = {"issuer":{"type":"B","id":"204980143","name":"Kempinski Hotel Soma bay","address":{"branchId":"0","country":"EG","governate":"cairo","regionCity":"Zamalek","street":"Hassan Sabry St","buildingNumber":"4","postalCode":"84711","floor":"1","room":"","landmark":"","additionalInformation":""}},"receiver":{"type":"P","id":"30307262102834","name":"moaaz afify","address":{"branchId":"0","country":"EG","governate":"Giza","regionCity":"warraq","street":"mohamed salem st.","buildingNumber":"5","postalCode":"12661","floor":"","room":"","landmark":"","additionalInformation":""}},"documentType":"I","documentTypeVersion":"1.0","dateTimeIssued":"2026-02-12T22:10:13Z","taxpayerActivityCode":"5510","internalID":"25","invoiceLines":[{"description":"Room Charge","itemType":"EGS","itemCode":"EG-204980143-1000","unitType":"EA","quantity":1,"internalCode":"1000","salesTotal":1.0014,"total":1.29,"valueDifference":0,"totalTaxableFees":0.13018,"netTotal":1.0014,"itemsDiscount":0,"unitValue":{"currencySold":"EGP","amountEGP":1.0014},"taxableItems":[{"taxType":"T9","amount":0.12017,"subType":"SC01","rate":12},{"taxType":"T10","amount":0.01001,"subType":"Mn01","rate":1},{"taxType":"T1","amount":0.15842,"subType":"V009","rate":14}]}],"taxTotals":[{"taxType":"T1","amount":0.15842},{"taxType":"T9","amount":0.12017},{"taxType":"T10","amount":0.01001}],"netAmount":1.0014,"totalSalesAmount":1.0014,"totalAmount":1.29,"extraDiscountAmount":0,"totalDiscountAmount":0,"totalItemsDiscountAmount":0};

console.log("Original Payload:", JSON.stringify(payload));
const canonicalString = serialize(payload);
console.log("Canonical String:", canonicalString);

const hashBuffer = crypto.createHash('sha256').update(Buffer.from(canonicalString, 'utf8')).digest();
const hashBase64 = hashBuffer.toString('base64');
console.log("Hash:", hashBase64);

// Additional checks
console.log("Checking sort order...");
// Check if TAXTOTALS comes after TAXPAYERACTIVITYCODE
const keys = Object.keys(payload);
keys.sort((a,b) => a.toUpperCase().localeCompare(b.toUpperCase()));
console.log("Sorted Keys (Uppercase LocaleCompare):", keys);

const strictKeys = Object.keys(payload).sort((a,b) => {
    const uA = a.toUpperCase();
    const uB = b.toUpperCase();
    if (uA < uB) return -1;
    if (uA > uB) return 1;
    return 0;
});
console.log("Sorted Keys (Strict ASCII):", strictKeys);
