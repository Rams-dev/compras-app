# Genera el .APK de Compras App con EAS Build (nube, no requiere Android Studio).
# Uso:  powershell -ExecutionPolicy Bypass -File ./scripts/build-apk.ps1
#   o:  npm run build:apk
# Requiere: cuenta de Expo (https://expo.dev/signup). El primer uso pide login.

$ErrorActionPreference = 'Stop'

function Need-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "Falta '$name' en el PATH. Instálalo y reintenta."
    exit 1
  }
}

Need-Command node
Need-Command npm

Write-Host '== 1/3 Verificando eas-cli...' -ForegroundColor Cyan
if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
  Write-Host 'Instalando eas-cli...' -ForegroundColor Yellow
  npm install -g eas-cli
}

Write-Host '== 2/3 Verificando login en Expo...' -ForegroundColor Cyan
eas whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Inicia sesión con tu cuenta de Expo...' -ForegroundColor Yellow
  eas login
}

Write-Host '== 3/3 Compilando APK (perfil preview)...' -ForegroundColor Cyan
eas build --platform android --profile preview

Write-Host ''
Write-Host 'Al terminar, descarga el .APK desde el enlace del build o con:' -ForegroundColor Green
Write-Host '  eas build:list --platform android --limit 1' -ForegroundColor Green
