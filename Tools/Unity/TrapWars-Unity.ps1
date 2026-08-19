[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('status', 'open', 'test-editmode', 'test-playmode', 'build-dev', 'build-release', 'run-validation', 'capture-m84')]
    [string]$Command = 'status'
)

$ErrorActionPreference = 'Stop'
$EditorVersion = '6000.3.20f1'
$EditorPath = "C:\Program Files\Unity\Hub\Editor\$EditorVersion\Editor\Unity.exe"
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ProjectPath = Join-Path $RepositoryRoot 'game\unity'
$ArtifactRoot = Join-Path $RepositoryRoot 'artifacts\unity-cli'

function Assert-Tooling {
    if (-not (Get-Command unity -ErrorAction SilentlyContinue)) {
        throw 'Official Unity CLI is not available on PATH.'
    }
    if (-not (Test-Path -LiteralPath $EditorPath)) {
        throw "Required Unity Editor is missing: $EditorPath"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath 'ProjectSettings\ProjectVersion.txt'))) {
        throw "Trap Wars Unity project is missing: $ProjectPath"
    }
}

function Invoke-UnityCli {
    param([Parameter(Mandatory)][string[]]$Arguments)
    & unity @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Unity CLI failed with exit code $LASTEXITCODE."
    }
}

function ConvertTo-QuotedArgument {
    param([string]$Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-UnityEditor {
    param([Parameter(Mandatory)][string[]]$Arguments)
    New-Item -ItemType Directory -Force -Path $ArtifactRoot | Out-Null
    $argumentLine = ($Arguments | ForEach-Object { ConvertTo-QuotedArgument $_ }) -join ' '
    $process = Start-Process -FilePath $EditorPath -ArgumentList $argumentLine -PassThru -WindowStyle Hidden
    $process.WaitForExit()
    $process.Refresh()
    if ($process.ExitCode -ne 0) {
        throw "Unity Editor failed with exit code $($process.ExitCode)."
    }
}

function Invoke-TestRun {
    param([ValidateSet('EditMode', 'PlayMode')][string]$Platform)
    $slug = $Platform.ToLowerInvariant()
    Invoke-UnityEditor @(
        '-batchmode',
        '-nographics',
        '-projectPath', $ProjectPath,
        '-runTests',
        '-testPlatform', $Platform,
        '-testResults', (Join-Path $ArtifactRoot "$slug-results.xml"),
        '-logFile', (Join-Path $ArtifactRoot "$slug.log")
    )
    [xml]$results = Get-Content -LiteralPath (Join-Path $ArtifactRoot "$slug-results.xml")
    $run = $results.'test-run'
    Write-Host "$Platform tests: $($run.result), passed=$($run.passed), failed=$($run.failed), skipped=$($run.skipped)"
    if ($run.result -ne 'Passed') { throw "$Platform tests did not pass." }
}

function Show-Status {
    Invoke-UnityCli @('--version')
    Invoke-UnityCli @('--format', 'json', 'auth', 'status')
    Invoke-UnityCli @('--format', 'json', 'editors', '-i')
    Invoke-UnityCli @('--format', 'json', 'projects', 'info', $ProjectPath)
    $projectVersion = Get-Content -LiteralPath (Join-Path $ProjectPath 'ProjectSettings\ProjectVersion.txt')
    if ($projectVersion -notmatch [regex]::Escape($EditorVersion)) {
        throw "Project is not pinned to Unity $EditorVersion."
    }
    Write-Host "Trap Wars project verified at $ProjectPath"
}

Assert-Tooling

switch ($Command) {
    'status' { Show-Status }
    'open' {
        Invoke-UnityCli @('projects', 'open', $ProjectPath, '--editor-version', $EditorVersion)
    }
    'test-editmode' { Invoke-TestRun 'EditMode' }
    'test-playmode' { Invoke-TestRun 'PlayMode' }
    'build-dev' {
        Invoke-UnityEditor @('-batchmode', '-projectPath', $ProjectPath, '-executeMethod', 'TrapWars.EditorTools.M8AssetPipeline.BuildDevelopmentPlayer', '-quit', '-logFile', (Join-Path $ArtifactRoot 'build-dev.log'))
    }
    'build-release' {
        Invoke-UnityEditor @('-batchmode', '-projectPath', $ProjectPath, '-executeMethod', 'TrapWars.EditorTools.M8AssetPipeline.BuildM84ReferenceMatchPlayer', '-quit', '-logFile', (Join-Path $ArtifactRoot 'build-release.log'))
    }
    'run-validation' {
        Show-Status
        Invoke-TestRun 'EditMode'
        Invoke-TestRun 'PlayMode'
        & (Join-Path $ProjectPath 'Tools\Verify-UnitySources.ps1')
        if ($LASTEXITCODE -ne 0) { throw 'Unity source validation failed.' }
    }
    'capture-m84' {
        $trigger = Join-Path $ProjectPath 'M8_4Evidence.trigger'
        Set-Content -LiteralPath $trigger -Value 'M8.4 CLI evidence route' -Encoding ascii
        try {
            Invoke-UnityEditor @('-projectPath', $ProjectPath, '-logFile', (Join-Path $ArtifactRoot 'capture-m84.log'))
        }
        finally {
            if (Test-Path -LiteralPath $trigger) { Remove-Item -LiteralPath $trigger -Force }
        }
    }
}
