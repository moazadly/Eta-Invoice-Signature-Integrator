param(
    [string]$HashBase64,
    [string]$Pin
)

if ([string]::IsNullOrEmpty($HashBase64)) {
    Write-Error "HashBase64 parameter is required."
    exit 1
}

$certs = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.HasPrivateKey }

if ($certs.Count -eq 0) {
    Write-Error "No certificates with private keys found."
    exit 1
}

# Use the first one (MUST match get_cert.ps1 logic)
$cert = $certs[0]

# Decode Hash
$hashBytes = [Convert]::FromBase64String($HashBase64)

# Get Private Key
try {
    # Check if we have a PIN and can use CspParameters for RSACryptoServiceProvider (Legacy CSP)
    $rsa = $null

    if (-not [string]::IsNullOrEmpty($Pin)) {
        try {
            # Attempt to use CSP Parameters with PIN
            # Note: This generally works for 'Legacy' CSPs (e.g., ePass2003 CSP).
            # It might not work for CNG (KSP) providers directly without more complex interop.
            
            $privKey = $cert.PrivateKey
            if ($privKey -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
                $cspParams = New-Object System.Security.Cryptography.CspParameters
                $cspParams.ProviderType = $privKey.CspKeyContainerInfo.ProviderType
                $cspParams.ProviderName = $privKey.CspKeyContainerInfo.ProviderName
                $cspParams.KeyContainerName = $privKey.CspKeyContainerInfo.KeyContainerName
                $cspParams.KeyNumber = $privKey.CspKeyContainerInfo.KeyNumber
                $cspParams.Flags = [System.Security.Cryptography.CspProviderFlags]::UseExistingKey
                
                # Set the PIN
                $securePin = ConvertTo-SecureString $Pin -AsPlainText -Force
                $cspParams.KeyPassword = $securePin
                
                $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cspParams)
            }
        }
        catch {
            Write-Warning "Failed to apply PIN to CSP: $_. Falling back to default prompt."
        }
    }

    # Fallback / Default Access
    if ($null -eq $rsa) {
        # Try legacy property first
        $rsa = $cert.PrivateKey
        
        # If null, try to get CNG key via extension method (available in .NET 4.6+)
        if ($null -eq $rsa) {
            $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
        }
    }

    if ($null -eq $rsa) {
        Write-Error "Could not access Private Key object."
        exit 1
    }

    if ($rsa -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
        # Old CAPI
        $signature = $rsa.SignHash($hashBytes, "SHA256")
    }
    elseif ($rsa -is [System.Security.Cryptography.RSA]) {
        # CNG or generic RSA (Base class for RSACng)
        $signature = $rsa.SignHash($hashBytes, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    }
    else {
        Write-Error "Unknown private key type: $($rsa.GetType().FullName)"
        exit 1
    }
    
    $sigBase64 = [Convert]::ToBase64String($signature)
    Write-Output $sigBase64
}
catch {
    Write-Error "Signing failed: $_"
    exit 1
}
