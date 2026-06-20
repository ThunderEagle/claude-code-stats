Add-Type -AssemblyName System.Drawing

$size = 128
$bmp = [System.Drawing.Bitmap]::new($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background: dark slate
$bgColor = [System.Drawing.Color]::FromArgb(255, 24, 24, 38)
$g.Clear($bgColor)

# Rounded rect background (simulate with filled ellipses at corners + rects)
$radius = 18
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 32, 32, 52))
$roundRectPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
$roundRectPath.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
$roundRectPath.AddArc($size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
$roundRectPath.AddArc($size - $radius * 2, $size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
$roundRectPath.AddArc(0, $size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
$roundRectPath.CloseFigure()
$g.FillPath($brush, $roundRectPath)

# Pulse / EKG line — drawn as a polyline
# Points: flat left -> sharp spike -> flat right
$orange = [System.Drawing.Color]::FromArgb(255, 232, 121, 56)
$pen = [System.Drawing.Pen]::new($orange, 4.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$cy = 70  # vertical center of the waveform
$points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(10,  $cy),
    [System.Drawing.PointF]::new(36,  $cy),
    [System.Drawing.PointF]::new(46,  $cy - 30),
    [System.Drawing.PointF]::new(56,  $cy + 22),
    [System.Drawing.PointF]::new(64,  $cy - 42),
    [System.Drawing.PointF]::new(72,  $cy + 14),
    [System.Drawing.PointF]::new(80,  $cy),
    [System.Drawing.PointF]::new(118, $cy)
)
$g.DrawLines($pen, $points)

# Label "CP" in small text at top-left as a subtle brand mark
$fontFamily = [System.Drawing.FontFamily]::new("Segoe UI")
$font = [System.Drawing.Font]::new($fontFamily, 13, [System.Drawing.FontStyle]::Bold)
$labelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, 232, 121, 56))
$g.DrawString("ClaudePulse", $font, $labelBrush, 8, 10)

$font.Dispose()
$pen.Dispose()
$brush.Dispose()
$labelBrush.Dispose()
$g.Dispose()

$outPath = Join-Path $PSScriptRoot "..\icon.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Icon saved to $outPath"
