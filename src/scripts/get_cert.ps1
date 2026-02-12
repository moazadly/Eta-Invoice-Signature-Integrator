
$certs = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.HasPrivateKey }

# Try to filter for smart cards if possible, or just take the first one
# Often smart card certs have specific KeyStorageProviders, but simplicity first.
if ($certs.Count -eq 0) {
    Write-Error "No certificates with private keys found."
    exit 1
}

# Use the first one
$cert = $certs[0]
$base64 = [Convert]::ToBase64String($cert.RawData)
Write-Output $base64
