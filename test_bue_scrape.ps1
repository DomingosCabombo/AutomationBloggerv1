# Teste de scraping do buedemusica.com
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$html = (Invoke-WebRequest -Uri "https://buedemusica.com" -UserAgent "Mozilla/5.0" -UseBasicParsing -TimeoutSec 30).Content

Write-Host "== HTML total: $($html.Length) chars ==" -ForegroundColor Cyan

# Conta quantos <article class="latestPost" foram encontrados
$articleMatches = [regex]::Matches($html, '<article[^>]*class="[^"]*latestPost[^"]*"[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
Write-Host "== Articles encontrados: $($articleMatches.Count) ==" -ForegroundColor Green

# Para cada article, extrai o href+title do primeiro <a>
$postRegex = [regex]'(?is)<article[^>]*class="[^"]*latestPost[^"]*"[^>]*>(.*?)</article>'
$linkRegex = [regex]'(?i)<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"'

$matches2 = $postRegex.Matches($html)
Write-Host "`n== Posts encontrados nos articles: $($matches2.Count) ==" -ForegroundColor Green

foreach ($m in $matches2) {
    $articleHtml = $m.Groups[1].Value
    $linkMatch = $linkRegex.Match($articleHtml)
    if ($linkMatch.Success) {
        $href = $linkMatch.Groups[1].Value
        $title = $linkMatch.Groups[2].Value
        # Decode entidades HTML
        $title = $title -replace '&#8211;', '–' -replace '&#038;', '&' -replace '&amp;', '&'
        Write-Host "  URL: $href" -ForegroundColor Yellow
        Write-Host "  TÍTULO: $title" -ForegroundColor White
        Write-Host ""
    }
}

# Verifica também se "Calema" aparece no HTML
if ($html -match "Calema") {
    Write-Host "✅ 'Calema' ENCONTRADO no HTML!" -ForegroundColor Green
    # Mostra o contexto
    $idx = $html.IndexOf("Calema")
    Write-Host "Contexto: $($html.Substring([Math]::Max(0,$idx-100), 300))" -ForegroundColor Cyan
} else {
    Write-Host "❌ 'Calema' NÃO encontrado no HTML!" -ForegroundColor Red
}
