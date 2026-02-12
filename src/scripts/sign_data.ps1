param(
    [string]$HashBase64
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
    # Try legacy property first
    $rsa = $cert.PrivateKey
    
    # If null, try to get CNG key via extension method (available in .NET 4.6+)
    if ($null -eq $rsa) {
        # Load the assembly if needed (usually loaded by default in PS 5.1+)
        # [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]
        
        # We can use the GetRSAPrivateKey method
        $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
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
