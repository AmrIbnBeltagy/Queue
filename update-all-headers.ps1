# PowerShell script to update all HTML files to use global header

# List of HTML files to update (excluding login.html)
$htmlFiles = @(
    "public/index.html",
    "public/admin-users.html", 
    "public/agents.html",
    "public/degrees.html",
    "public/specialities.html",
    "public/monitors.html"
)

foreach ($filePath in $htmlFiles) {
    if (Test-Path $filePath) {
        Write-Host "Updating $filePath..."
        
        # Read the file content
        $content = Get-Content $filePath -Raw
        
        # Check if global header script is already present
        if ($content -notmatch 'components/global-header\.js') {
            # Add the global header script after auth-check.js
            $content = $content -replace '(src="auth-check\.js")', '$1
    <script src="components/global-header.js"></script>'
            
            # Remove the entire navigation section
            $content = $content -replace '(?s)<!-- Navigation -->.*?</nav>', ''
            
            # Write the updated content back to the file
            Set-Content -Path $filePath -Value $content -NoNewline
            
            Write-Host "✅ Updated $filePath"
        } else {
            Write-Host "⚠️  $filePath already has global header"
        }
    } else {
        Write-Host "❌ File not found: $filePath"
    }
}

Write-Host "🎉 Global header update completed!"






