# Genereert resources/icon.ico vanaf nul met GDI+.
# Tekent een World Archery doel (van centrum naar buiten: geel, rood, blauw,
# zwart, wit) op meerdere groottes en verpakt ze in een multi-resolutie ICO
# bestand met PNG-payloads.

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$resourcesDir = Join-Path $repoRoot 'resources'
$outPath = Join-Path $resourcesDir 'icon.ico'

$sizes = 256, 128, 64, 48, 32, 16

# Tekenvolgorde: van buiten naar binnen. Zo blijft de zichtbare kleurvolgorde
# (centrum -> buitenrand) geel, rood, blauw, zwart, wit.
$rings = @(
    @{ Ratio = 1.00; Color = [System.Drawing.Color]::FromArgb(255, 255, 255) }, # wit
    @{ Ratio = 0.80; Color = [System.Drawing.Color]::FromArgb( 26,  26,  26) }, # zwart
    @{ Ratio = 0.60; Color = [System.Drawing.Color]::FromArgb( 29, 112, 184) }, # blauw
    @{ Ratio = 0.40; Color = [System.Drawing.Color]::FromArgb(230,  57,  70) }, # rood
    @{ Ratio = 0.20; Color = [System.Drawing.Color]::FromArgb(245, 197,  24) }  # geel
)

$blobs = New-Object System.Collections.ArrayList

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    foreach ($ring in $rings) {
        $diam = [int][Math]::Round($size * $ring.Ratio)
        if ($diam -lt 1) { $diam = 1 }
        $offset = [int][Math]::Floor(($size - $diam) / 2.0)
        $brush = New-Object System.Drawing.SolidBrush($ring.Color)
        $g.FillEllipse($brush, $offset, $offset, $diam, $diam)
        $brush.Dispose()
    }

    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    [void]$blobs.Add([pscustomobject]@{ Size = $size; Data = $ms.ToArray() })
    $ms.Dispose()
}

# ICO container schrijven: 6-byte header + N x 16-byte entries + PNG payloads.
$ico = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ico)

$bw.Write([UInt16]0)             # reserved
$bw.Write([UInt16]1)             # type: 1 = icoon
$bw.Write([UInt16]$blobs.Count)  # aantal afbeeldingen

$headerSize = 6
$entrySize = 16
$dataOffset = $headerSize + ($entrySize * $blobs.Count)

foreach ($blob in $blobs) {
    $dim = if ($blob.Size -ge 256) { 0 } else { $blob.Size }  # 0 = 256
    $bw.Write([byte]$dim)               # breedte
    $bw.Write([byte]$dim)               # hoogte
    $bw.Write([byte]0)                  # palet-grootte (0 = geen palet)
    $bw.Write([byte]0)                  # gereserveerd
    $bw.Write([UInt16]1)                # color planes
    $bw.Write([UInt16]32)               # bits per pixel
    $bw.Write([UInt32]$blob.Data.Length)
    $bw.Write([UInt32]$dataOffset)
    $dataOffset += $blob.Data.Length
}

foreach ($blob in $blobs) {
    $bw.Write($blob.Data)
}

$bw.Flush()
[System.IO.File]::WriteAllBytes($outPath, $ico.ToArray())
$bw.Dispose()
$ico.Dispose()

$bytes = (Get-Item $outPath).Length
Write-Host "icon.ico geschreven: $outPath ($bytes bytes, $($blobs.Count) groottes)"
