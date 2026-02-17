const serialize = require('./src/utils/canonicalizer');

const failingPayload = {
    "issuer":{"type":"B","id":"204980143","name":"Kempinski Hotel Soma bay","address":{"branchId":"0","country":"EG","governate":"cairo","regionCity":"Zamalek","street":"Hassan Sabry St","buildingNumber":"4","postalCode":"84711","floor":"1","room":"","landmark":"","additionalInformation":""}},
    "receiver":{"type":"B","id":"340442352","name":"Euro net Middle East, Africa and Pakistan","address":{"branchId":"0","country":"EG","governate":"Cairo","regionCity":"New Cairo","street":"Nehro st.","buildingNumber":"0000","postalCode":"00000","floor":"","room":"","landmark":"","additionalInformation":""}},
    "documentType":"c",
    "documentTypeVersion":"1.0",
    "dateTimeIssued":"2026-02-15T14:52:25Z",
    "taxpayerActivityCode":"5510",
    "internalID":"278076",
    "invoiceLines":[
        {
            "description":"Miscellenous",
            "itemType":"EGS",
            "itemCode":"EG-204980143-6100",
            "unitType":"EA",
            "quantity":1,
            "internalCode":"6100",
            "salesTotal":4500,
            "total":4500,
            "valueDifference":0,
            "totalTaxableFees":0,
            "netTotal":4500,
            "itemsDiscount":0,
            "unitValue":{
                "currencySold":"EGP",
                "amountEGP":4500,
                "amountSold":null
            },
            "taxableItems":[]
        }
    ],
    "taxTotals":[],
    "netAmount":4500,
    "totalSalesAmount":4500,
    "totalAmount":4500,
    "extraDiscountAmount":0,
    "totalDiscountAmount":0,
    "totalItemsDiscountAmount":0,
    "references":[]
};

const workingPayload = {
    "issuer": { "type": "B", "id": "204980143", "name": "Kempinski Hotel Soma bay", "address": { "branchId": "0", "country": "EG", "governate": "cairo", "regionCity": "Zamalek", "street": "Hassan Sabry St", "buildingNumber": "4", "postalCode": "84711", "floor": "1", "room": "", "landmark": "", "additionalInformation": "" } },
    "receiver": { "type": "F", "id": "CZZM1YK86", "name": "Joern Alexander Laufersweiler ", "address": { "branchId": "0", "country": "DE", "governate": "RP", "regionCity": "Gau-Algesheim", "street": "14 Gappono", "buildingNumber": "0", "postalCode": "55435" } },
    "documentType": "I",
    "documentTypeVersion": "1.0",
    "dateTimeIssued": "2026-02-17T11:44:40Z",
    "taxpayerActivityCode": "5510",
    "internalID": "279890",
    "purchaseOrderReference": "78630687",
    "invoiceLines": [
        {
            "description": "The View Restaurant Dinner Bev.Non Alc",
            "itemType": "EGS",
            "itemCode": "EG-204980143-2033",
            "unitType": "EA",
            "quantity": 1,
            "internalCode": "2033",
            "salesTotal": 410.98,
            "total": 410.98,
            "valueDifference": 0,
            "totalTaxableFees": 0,
            "netTotal": 410.98,
            "itemsDiscount": 0,
            "unitValue": {
                "currencySold": "EGP",
                "amountEGP": 410.98
            },
            "taxableItems": []
        }
    ]
};

console.log("--- FAILING PAYLOAD CANONICALIZATION ---");
const failingCanonical = serialize(failingPayload);
console.log(failingCanonical);
console.log("\n--- KEY CHECK: amountSold ---");
// Extract the part around AMOUNTSOLD to see what happened
const match = failingCanonical.match(/"AMOUNTSOLD".{0,10}/);
console.log("Match for 'AMOUNTSOLD':", match ? match[0] : "Not found");

console.log("\n--- TEST: FIXING amountSold (removing it) ---");
const testPayload1 = JSON.parse(JSON.stringify(failingPayload));
delete testPayload1.invoiceLines[0].unitValue.amountSold;
testPayload1.documentType = "C"; // Trying uppercase C too
const testCanonical1 = serialize(testPayload1);
console.log(testCanonical1);

console.log("\n--- TEST: FIXING Just documentType (keep amountSold: null) ---");
const testPayload2 = JSON.parse(JSON.stringify(failingPayload));
testPayload2.documentType = "C";
const testCanonical2 = serialize(testPayload2);
console.log(testCanonical2);
