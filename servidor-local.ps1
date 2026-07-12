$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Any, 8080)
$server.Start()
$mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.pdf'='application/pdf' }
try {
  while ($true) {
    $client = $server.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    while (($line = $reader.ReadLine()) -ne '') { if ($null -eq $line) { break } }
    $requestPath = if ($requestLine -match '^GET\s+([^\s]+)') { $Matches[1].Split('?')[0] } else { '/' }
    $relative = [Uri]::UnescapeDataString($requestPath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if ($candidate.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($candidate); $status = '200 OK'
      $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $contentType = if ($mime[$extension]) { $mime[$extension] } else { 'application/octet-stream' }
    } else { $bytes = [Text.Encoding]::UTF8.GetBytes('Arquivo não encontrado'); $status = '404 Not Found'; $contentType = 'text/plain; charset=utf-8' }
    $headers = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n")
    $stream.Write($headers,0,$headers.Length); $stream.Write($bytes,0,$bytes.Length); $stream.Flush(); $client.Close()
  }
} finally { $server.Stop() }
