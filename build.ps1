# Dot Music Player - Android Build Pipeline
$SDK_DIR = "C:\Users\rupai\AppData\Local\Android\Sdk"
$BUILD_TOOLS = "$SDK_DIR\build-tools\34.0.0"
$PLATFORM = "$SDK_DIR\platforms\android-34\android.jar"

$keystorePath = $env:DOTMUSIC_KEYSTORE_PATH
$storePassword = $env:DOTMUSIC_STORE_PASSWORD
$keyAlias = $env:DOTMUSIC_KEY_ALIAS
$keyPassword = $env:DOTMUSIC_KEY_PASSWORD

$requiredSigningValues = @{
    DOTMUSIC_KEYSTORE_PATH = $keystorePath
    DOTMUSIC_STORE_PASSWORD = $storePassword
    DOTMUSIC_KEY_ALIAS = $keyAlias
    DOTMUSIC_KEY_PASSWORD = $keyPassword
}
$missingSigningValues = @($requiredSigningValues.GetEnumerator() | Where-Object { [string]::IsNullOrWhiteSpace($_.Value) } | ForEach-Object { $_.Key })
if ($missingSigningValues.Count -gt 0) {
    throw "Release signing requires protected environment variables: $($missingSigningValues -join ', ')"
}
if (-not (Test-Path -LiteralPath $keystorePath -PathType Leaf)) {
    throw "Release keystore not found at DOTMUSIC_KEYSTORE_PATH. Keep signing keys outside the repository."
}

Write-Host ">>> 1. Compiling Android Resources..."
& "$BUILD_TOOLS\aapt2.exe" compile --dir android\res -o android\bin\res.zip
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host ">>> 2. Linking APK with assets..."
Remove-Item android\bin\unaligned.apk -ErrorAction SilentlyContinue
& "$BUILD_TOOLS\aapt2.exe" link -o android\bin\unaligned.apk -I $PLATFORM --manifest android\AndroidManifest.xml -A android\assets android\bin\res.zip --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

Write-Host ">>> 3. Compiling Java Source..."
New-Item -ItemType Directory -Force -Path android\bin\classes | Out-Null
& javac -d android\bin\classes -cp $PLATFORM (Get-ChildItem android\src\com\dotplayer\music\*.java).FullName
if ($LASTEXITCODE -ne 0) { throw "javac compilation failed" }

Write-Host ">>> 4. Converting Java bytecode to DEX..."
& "$BUILD_TOOLS\d8.bat" --output android\bin (Get-ChildItem android\bin\classes\com\dotplayer\music\*.class).FullName
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Write-Host ">>> 5. Adding classes.dex to APK..."
Push-Location android\bin
& "$BUILD_TOOLS\aapt.exe" add unaligned.apk classes.dex
Pop-Location
if ($LASTEXITCODE -ne 0) { throw "aapt add failed" }

Write-Host ">>> 6. Zipalign APK..."
Remove-Item android\bin\aligned.apk -ErrorAction SilentlyContinue
& "$BUILD_TOOLS\zipalign.exe" -f -p 4 android\bin\unaligned.apk android\bin\aligned.apk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

Write-Host ">>> 7. Signing APK with externally supplied release credentials..."
Remove-Item DotMusicPlayer.apk -ErrorAction SilentlyContinue
& "$BUILD_TOOLS\apksigner.bat" sign --ks $keystorePath --ks-pass env:DOTMUSIC_STORE_PASSWORD --ks-key-alias $keyAlias --key-pass env:DOTMUSIC_KEY_PASSWORD --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out DotMusicPlayer.apk android\bin\aligned.apk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

Write-Host ">>> 8. Verifying APK signature..."
& "$BUILD_TOOLS\apksigner.bat" verify --verbose DotMusicPlayer.apk
if ($LASTEXITCODE -ne 0) { throw "apksigner verification failed" }

$apkItem = Get-Item DotMusicPlayer.apk
Write-Host "SUCCESS: Built and Signed $($apkItem.FullName) - Size: $($apkItem.Length) bytes"
