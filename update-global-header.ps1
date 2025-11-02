# PowerShell script to update all HTML files to use global header

# Get all HTML files in the public directory
$htmlFiles = Get-ChildItem -Path "public" -Filter "*.html" -Exclude "login.html"

foreach ($file in $htmlFiles) {
    Write-Host "Updating $($file.Name)..."
    
    # Read the file content
    $content = Get-Content $file.FullName -Raw
    
    # Pattern to match the navigation section (from <!-- Navigation --> to </nav>)
    $navPattern = '(?s)<!-- Navigation -->.*?</nav>'
    
    # Check if the file has the navigation section
    if ($content -match $navPattern) {
        # Replace the navigation section with just the script reference
        $newContent = $content -replace $navPattern, ''
        
        # Add the global header script if not already present
        if ($newContent -notmatch 'components/global-header\.js') {
            $newContent = $newContent -replace '(src="auth-check\.js")', '$1
    <script src="components/global-header.js"></script>'
        }
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        
        Write-Host "✅ Updated $($file.Name)"
    } else {
        Write-Host "⚠️  No navigation section found in $($file.Name)"
    }
}

Write-Host "🎉 Global header update completed!"






