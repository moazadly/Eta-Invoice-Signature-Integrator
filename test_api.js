const axios = require('axios');

async function testSign() {
    const payload = {
        "issuer": { "name": "Test Issuer" },
        "receiver": { "name": "Test Receiver" },
        "documentType": "I",
        "documentTypeVersion": "1.0",
        "dateTimeIssued": "2026-02-12T19:30:00Z",
        "taxpayerActivityCode": "1234",
        "internalID": "1001",
        "invoiceLines": [],
        "taxTotals": [],
        "netAmount": 100,
        "totalSalesAmount": 100,
        "totalAmount": 100,
        "extraDiscountAmount": 0,
        "totalDiscountAmount": 0,
        "totalItemsDiscountAmount": 0
    };

    try {
        console.log("Sending request to http://localhost:3000/api/invoice/sign...");
        const response = await axios.post('http://localhost:3000/api/invoice/sign', payload);
        console.log("Response Status:", response.status);
        console.log("Signed Payload received.");
        if (response.data.signatures && response.data.signatures.length > 0) {
            console.log("Signature found:", response.data.signatures[0].value.substring(0, 50) + "...");
        } else {
            console.error("No signature found in response!");
        }
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    }
}

// Give server time to start
setTimeout(testSign, 2000);
