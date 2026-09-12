# Instala lo mínimo de Android (platform-tools con adb) sin Android Studio.
# Uso: powershell -ExecutionPolicy Bypass -File ./scripts/setup-adb.ps1
#   o: npm run setup:adb
# Después: conecta el celular por USB (con depuración USB activada) y usa npm run android.

$ErrorActionPreference = 'Stop'

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$pt = Join-Path $sdk 'platform-tools'
$zip = Join-Path $env:TEMP 'platform-tools.zip'

if (-not (Test-Path (Join-Path $pt 'adb.exe'))) {
  Write-Host 'Descargando platform-tools...' -ForegroundColor Cyan
  Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $zip
  Write-Host 'Extrayendo...' -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path $sdk | Out-Null
  Expand-Archive -Path $zip -DestinationPath $sdk -Force
  Remove-Item $zip -Force
} else {
  Write-Host 'platform-tools ya instalado.' -ForegroundColor Green
}

Write-Host 'Configurando variables de entorno de usuario...' -ForegroundColor Cyan
setx ANDROID_HOME "$sdk" | Out-Null
setx ANDROID_SDK_ROOT "$sdk" | Out-Null

$regPath = 'HKCU:\Environment'
$curPath = (Get-ItemProperty -Path $regPath -Name Path).Path
if ($curPath -notlike "*$pt*") {
  Set-ItemProperty -Path $regPath -Name Path -Value "$curPath;$pt"
  Write-Host 'Agregado a PATH de usuario.' -ForegroundColor Green
} else {
  Write-Host 'Ya estaba en PATH.' -ForegroundColor Green
}

$env:Path = "$env:Path;$pt"
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

Write-Host 'Verificando adb...' -ForegroundColor Cyan
adb version

Write-Host ''
Write-Host 'Listo. Conecta el celular por USB con depuración USB activada y corre:' -ForegroundColor Green
Write-Host '  adb devices   # debe listar tu equipo' -ForegroundColor Green
Write-Host '  npm run android' -ForegroundColor Green
