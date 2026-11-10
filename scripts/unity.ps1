<#
.SYNOPSIS
    Runs Unity batch-mode tasks for the Trap Wars project on Windows.

.EXAMPLE
    ./scripts/unity.ps1 build-webgl
    ./scripts/unity.ps1 test-editmode
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0, Mandatory)]
    [ValidateSet('test-editmode', 'test-playmode', 'build-webgl', 'build-windows')]
    [string]$Command,

    [string]$EditorPath = "C:\Program Files\Unity\Hub\Editor\6000.3.20f1\Editor\Unity.exe"
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ProjectPath = Join-Path $RepositoryRoot 'game\unity'
$LogRoot = Join-Path $ProjectPath 'Logs'

if (-not (Test-Path -LiteralPath $EditorPath)) {
    throw "Unity Editor not found at $EditorPath. Install 6000.3.20f1 with WebGL Build Support, or pass -EditorPath."
}
New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null

function Invoke-Unity {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $process = Start-Process -FilePath $EditorPath -ArgumentList $Arguments -PassThru -NoNewWindow -Wait
    if ($process.ExitCode -ne 0) { throw "Unity exited with code $($process.ExitCode). See $LogRoot." }
}

function Invoke-Tests {
    param([ValidateSet('EditMode', 'PlayMode')][string]$Platform)
    $results = Join-Path $LogRoot "$($Platform.ToLowerInvariant())-results.xml"
    Invoke-Unity @('-batchmode', '-nographics', '-projectPath', "`"$ProjectPath`"", '-runTests', '-testPlatform', $Platform,
        '-testResults', "`"$results`"", '-logFile', "`"$(Join-Path $LogRoot "$Platform.log")`"")
    Write-Host "$Platform tests passed. Results: $results"
}

function Invoke-Build {
    param([string]$Method, [string]$LogName)
    Invoke-Unity @('-batchmode', '-nographics', '-quit', '-projectPath', "`"$ProjectPath`"",
        '-executeMethod', "TrapWars.EditorTools.TrapWarsBuild.$Method", '-logFile', "`"$(Join-Path $LogRoot $LogName)`"")
    Write-Host "Build finished. Log: $(Join-Path $LogRoot $LogName)"
}

switch ($Command) {
    'test-editmode' { Invoke-Tests 'EditMode' }
    'test-playmode' { Invoke-Tests 'PlayMode' }
    'build-webgl'   { Invoke-Build 'BuildWebGL' 'build-webgl.log' }
    'build-windows' { Invoke-Build 'BuildWindowsDevelopment' 'build-windows.log' }
}
