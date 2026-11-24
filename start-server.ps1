# ==============================================================================
# SERVIDOR WEB LOCAL PARA TRANSMILENIO CCO MONITOR
# Ejecutable nativo en PowerShell sin necesidad de Node.js o Python
# ==============================================================================

param(
    [int]$Port = 8080
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$url = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "  TRANSMILENIO CCO - SERVIDOR LOCAL INICIADO CON ÉXITO" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host " Accede desde tu navegador en: " -NoNewline
    Write-Host $url -ForegroundColor Cyan
    Write-Host " Presiona Ctrl+C en esta terminal para detener el servidor." -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Red

    # Abrir navegador automáticamente
    Start-Process $url

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relativePath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($relativePath)) {
            $relativePath = "index.html"
        }

        $filePath = Join-Path $scriptDir $relativePath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Extensiones y tipos MIME
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                Default { "application/octet-stream" }
            }

            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Archivo no encontrado")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
