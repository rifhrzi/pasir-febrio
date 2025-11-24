$source = ".\pasir-febrio\client\src\pages"
$dest = "..\client\src\pages"

Copy-Item "$source\Income.jsx" "$dest\Income.jsx" -Force
Copy-Item "$source\Expense.jsx" "$dest\Expense.jsx" -Force
Copy-Item "$source\Loans.jsx" "$dest\Loans.jsx" -Force
Copy-Item "$source\Dashboard.jsx" "$dest\Dashboard.jsx" -Force

Write-Host "Pages copied successfully"

