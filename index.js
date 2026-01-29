// Basic Node.js Invoice Signature for Windows (pkg compatible)
var os = require('os');
var logger = require('./logger');
var chilkat;

try {
  // Directly require the Windows version to avoid pkg trying to resolve optional dependencies
  // for other platforms (which causes build errors if they are missing).
  chilkat = require('@chilkat/ck-node18-win64');
} catch (e) { 
  logger.error("Failed to load Chilkat module: " + e.message);
  process.exit(1);
}

function chilkatExample() {

    var success = false;

    // This example assumes the Chilkat API to have been previously unlocked.
    // See Global Unlock Sample for sample code.

    var crypt = new chilkat.Crypt2();
    crypt.VerboseLogging = true;

    var cert = new chilkat.Cert();
    cert.VerboseLogging = true;

    // Set the smart card PIN, which will be needed for signing.
    cert.SmartCardPin = "15710115";

    // There are many ways to load the certificate.  
    // This example was created for a customer using an ePass2003 USB token.
    // Assuming the USB token is the only source of a hardware-based private key..
    success = cert.LoadFromSmartcard("");
    if (success == false) {
        logger.error(cert.LastErrorText);
        return;
    }

    // Tell the crypt class to use this cert.
    success = crypt.SetSigningCert(cert);
    if (success == false) {
        logger.error(crypt.LastErrorText);
        return;
    }

    var cmsOptions = new chilkat.JsonObject();
    // Setting "DigestData" causes OID 1.2.840.113549.1.7.5 (digestData) to be used.
    cmsOptions.UpdateBool("DigestData",true);
    cmsOptions.UpdateBool("OmitAlgorithmIdNull",true);

    // Indicate that we are passing normal JSON and we want Chilkat do automatically
    // do the ITIDA JSON canonicalization:
    cmsOptions.UpdateBool("CanonicalizeITIDA",true);

    crypt.CmsOptions = cmsOptions.Emit();

    // The CadesEnabled property applies to all methods that create CMS/PKCS7 signatures. 
    // To create a CAdES-BES signature, set this property equal to true. 
    crypt.CadesEnabled = true;

    crypt.HashAlgorithm = "sha256";

    var jsonSigningAttrs = new chilkat.JsonObject();
    jsonSigningAttrs.UpdateInt("contentType",1);
    jsonSigningAttrs.UpdateInt("signingTime",1);
    jsonSigningAttrs.UpdateInt("messageDigest",1);
    jsonSigningAttrs.UpdateInt("signingCertificateV2",1);
    crypt.SigningAttributes = jsonSigningAttrs.Emit();

    // By default, all the certs in the chain of authentication are included in the signature.
    // If desired, we can choose to only include the signing certificate:
    crypt.IncludeCertChain = false;

    // Pass a JSON document such as the following.  Chilkat will do the ITIDA canonicalization.
    // (It is the canonicalized JSON that gets signed.)
    var json = new chilkat.JsonObject();

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

    json.Load(JSON.stringify(payload));

    json.EmitCompact = true;
    var jsonToSign = json.Emit();

    // Create the CAdES-BES signature.
    crypt.EncodingMode = "base64";

    // Make sure we sign the utf-8 byte representation of the JSON string
    crypt.Charset = "utf-8";

    var sigBase64 = crypt.SignStringENC(jsonToSign);
    if (crypt.LastMethodSuccess == false) {
        logger.error(crypt.LastErrorText);
        return;
    }

    logger.info("Base64 signature:");
    logger.info(sigBase64);

    // Insert the base64 signature into the JSON to be sent
    json.UpdateString("signatures[0].signatureType","I");
    json.UpdateString("signatures[0].value",sigBase64);

    // Wrap the JSON in  {"documents":[ ... ]}
    var sbToSend = new chilkat.StringBuilder();
    sbToSend.Append("{\"documents\":[");
    sbToSend.Append(json.Emit());
    sbToSend.Append("]}");

    // ------------------------------------------------------------------------
    // Get an access token using our client ID and client secret key
    var clientId = "53fe1527-c9d9-4481-9a9d-9f3786af06d1";
    var clientSecretKey = "ba6a702c-8b49-40c8-9986-6d83558661f3";

    var http = new chilkat.Http();

    // Causes the Authorization: Basic header to be added..
    http.Login = clientId;
    http.Password = clientSecretKey;
    http.BasicAuth = true;

    var req = new chilkat.HttpRequest();
    req.HttpVerb = "POST";
    req.Path = "/connect/token";
    req.ContentType = "application/x-www-form-urlencoded";
    req.AddParam("grant_type","client_credentials");
    req.AddHeader("Connection","close");
    req.AddHeader("pososversion", "windows");

    // req.AddHeader("pososversion", "windows"); // Moved inside loop or defined above

    http.Accept = "application/json";

    // var resp = new chilkat.HttpResponse(); // Not needed for SynchronousRequest in Node.js, it returns the object
    var resp = http.SynchronousRequest("id.eta.gov.eg", 443, true, req);
    if (http.LastMethodSuccess == false) {
        logger.error(http.LastErrorText);
        return;
    }

    http.CloseAllConnections();

    logger.info("Response status code: " + resp.StatusCode);
    logger.info("Response body:");
    logger.info(resp.BodyStr);

    if (resp.StatusCode !== 200) {
        logger.error("Failed.");
        return;
    }

    var jsonToken = new chilkat.JsonObject();
    success = jsonToken.Load(resp.BodyStr);

    var accessToken = jsonToken.StringOf("access_token");
    logger.info("access_token = " + accessToken);

    // ------------------------------------------------------------------------
    // Submit the signed JSON to the ETA (Egypt Tax Authority) Portal

    // No longer sending basic authentication...
    http.Login = "";
    http.Password = "";
    http.BasicAuth = false;

    // Setting the AuthToken property causes the "Authorization: Bearer <token>" header to be added to each request.
    http.AuthToken = accessToken;

    var jsonStr = sbToSend.GetAsString();
    var url = "https://api.invoicing.eta.gov.eg/api/v1/documentsubmissions";
    
    // Use PostJson3 for sending JSON content
    resp = http.PostJson3(url, "application/json; charset=utf-8", jsonStr);
    if (http.LastMethodSuccess == false) {
        logger.error(http.LastErrorText);
        return;
    }

    logger.info("Response status code: " + resp.StatusCode);
    logger.info("Response body:");
    logger.info(resp.BodyStr);

}

chilkatExample();
