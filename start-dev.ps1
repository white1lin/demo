$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeBin = "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$pnpm = "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

$env:Path = "$nodeBin;$env:Path"
Set-Location $projectRoot
& $pnpm run dev
