const signatureService = require('./src/services/signatureService');

// Mock powershellService to avoid actual signing/dependencies
const powershellService = require('./src/services/powershellService');
powershellService.getCertificate = async () => "MII..."; // Mock cert
powershellService.signHash = async () => "MII..."; // Mock signature

// Mock canonicalizer if needed, but we want to test the service logic
// We can just run signInvoice and check the returned data object.

const testPayload = {
    "documentType": "c",
    "someNullField": null,
    "nested": {
        "ok": "value",
        "bad": null,
        "list": [
            { "id": 1, "void": null },
            { "id": 2 }
        ]
    }
};

(async () => {
    try {
        console.log("Original Payload:", JSON.stringify(testPayload, null, 2));
        const result = await signatureService.signInvoice(testPayload);
        
        if (result.success) {
            console.log("\nSuccess!");
            console.log("Returned Payload:", JSON.stringify(result.data, null, 2));
            
            // Checks
            const hasNull = JSON.stringify(result.data).includes("null");
            const docType = result.data.documentType;
            
            console.log("\n--- Verification ---");
            console.log(`Document Type is 'C': ${docType === 'C'}`);
            console.log(`Payload contains 'null': ${hasNull}`);
            
            if (docType === 'C' && !hasNull) {
                console.log("PASS: Payload was cleaned and normalized correctly.");
            } else {
                console.log("FAIL: Payload was NOT cleaned properly.");
            }
        } else {
            console.error("Signing failed:", result.error);
        }
    } catch (e) {
        console.error("Test failed:", e);
    }
})();
