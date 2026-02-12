const logger = require('./logger');
const signatureService = require('./src/services/signatureService');
const apiService = require('./src/services/apiService');

async function main() {
    try {
        logger.info("Starting invoice signature process...");

        // Payload data (Hardcoded as per original example)
        var payload = {
            "issuer": {
                "type": "B",
                "id": "204980143",
                "name": "Kempinski Hotel Soma bay",
                "address": {
                    "branchId": "0",
                    "country": "EG",
                    "governate": "cairo",
                    "regionCity": "Zamalek",
                    "street": "Hassan Sabry St",
                    "buildingNumber": "4",
                    "postalCode": "84711",
                    "floor": "1",
                    "room": "",
                    "landmark": "",
                    "additionalInformation": ""
                }
            },
            "receiver": {
                "type": "P",
                "id": "30307262102834",
                "name": "moaaz afify",
                "address": {
                    "branchId": "0",
                    "country": "EG",
                    "governate": "Giza",
                    "regionCity": "warraq",
                    "street": "mohamed salem st.",
                    "buildingNumber": "5",
                    "postalCode": "12661",
                    "floor": "",
                    "room": "",
                    "landmark": "",
                    "additionalInformation": ""
                }
            },
            "documentType": "I",
            "documentTypeVersion": "1.0",
            "dateTimeIssued": "2026-01-29T13:42:11Z",
            "taxpayerActivityCode": "5510",
            "internalID": "24563",
            "invoiceLines": [
                {
                    "description": "DISCOVERY Experience Rate Code",
                    "itemType": "EGS",
                    "itemCode": "EG-204980143-4858",
                    "unitType": "EA",
                    "quantity": 1,
                    "internalCode": "4858",
                    "salesTotal": 100,
                    "total": 114,
                    "valueDifference": 0,
                    "totalTaxableFees": 0,
                    "netTotal": 100,
                    "itemsDiscount": 0,
                    "unitValue": {
                        "currencySold": "EGP",
                        "amountEGP": 100
                    },
                    "taxableItems": [
                        {
                            "taxType": "T1",
                            "amount": 14,
                            "subType": "V009",
                            "rate": 14
                        }
                    ]
                }
            ],
            "taxTotals": [
                {
                    "taxType": "T1",
                    "amount": 14
                }
            ],
            "netAmount": 100,
            "totalSalesAmount": 100,
            "totalAmount": 114,
            "extraDiscountAmount": 0,
            "totalDiscountAmount": 0,
            "totalItemsDiscountAmount": 0
        };

        // 1. Sign Invoice
        logger.info("Signing invoice...");
        const signResult = await signatureService.signInvoice(payload);
        
        if (!signResult.success) {
            logger.error(`Signing failed: ${signResult.error}`);
            process.exit(1);
        }

        const signedPayload = signResult.data;
        // logger.info("Signed Payload: " + JSON.stringify(signedPayload, null, 2));

        // 2. Get Access Token
        logger.info("Getting access token...");
        const accessToken = await apiService.getToken();

        // 3. Submit
        logger.info("Submitting document...");
        const submissionResult = await apiService.submitDocuments(signedPayload, accessToken);

        logger.info("Process completed successfully.");

    } catch (error) {
        logger.error(`Process failed: ${error.message}`);
        process.exit(1);
    }
}

main();
