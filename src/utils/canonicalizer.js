/**
 * Serialize the JSON object according to ITIDA rules.
 * 
 * Algorithm Overview based on ETA SDK Documentation:
 * 1. Documents processed recursively.
 * 2. All property names are converted to uppercase.
 * 3. All property values are taken without any processing (simple types enclosed in double quotes).
 * 4. Arrays: recursive serialization with repeated key name.
 * 
 * @param {Object} obj - The object to canonicalize.
 * @returns {string} - The serialized string.
 */
function serialize(obj) {
    if (obj === null || obj === undefined) {
        return "";
    }

    // Simple types (string, number, boolean)
    if (typeof obj !== 'object' || obj instanceof Date) {
        return `"${obj}"`;
    }

    let serializedString = "";

    // Iterate over keys
    // "foreach element in the structure"
    // The ETA example ("one-doc.json" vs "one-doc-serialized.json.txt") shows that the order of keys
    // is PRESERVED from the source document (e.g. "issuer" then "receiver", "taxpayer" then "internalID").
    // It is NOT sorted alphabetically.
    const keys = Object.keys(obj);

    for (const key of keys) {
        const value = obj[key];
        const upperKey = key.toUpperCase();

        if (Array.isArray(value)) {
            // Rule 5: Array serialization result is prefixed with the array property name
            // and every array element is preceded with the array property name.
            
            // Example: "TAXABLEITEMS" "TAXABLEITEMS" <item1> "TAXABLEITEMS" <item2> ...
            
            serializedString += `"${upperKey}"`;
            
            for (const item of value) {
                serializedString += `"${upperKey}"`;
                serializedString += serialize(item);
            }
        } else {
            // Rule 4: Property name enclosed in double quotes
            serializedString += `"${upperKey}"`;
            // Rule 3: Property value enclosed in double quotes (via recursive call)
            serializedString += serialize(value);
        }
    }

    return serializedString;
}

module.exports = serialize;
