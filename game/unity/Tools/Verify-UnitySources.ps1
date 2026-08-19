param(
    [string]$UnityEditorRoot = "C:\Program Files\Unity\Hub\Editor\6000.3.20f1\Editor"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$dotnet = Join-Path $UnityEditorRoot "Data\NetCoreRuntime\dotnet.exe"
$compiler = Join-Path $UnityEditorRoot "Data\DotNetSdkRoslyn\csc.dll"
$templateAssemblies = Join-Path $UnityEditorRoot "Data\Resources\PackageManager\ProjectTemplates\libcache\com.unity.template.3d-cross-platform-17.0.14\ScriptAssemblies"
$outputRoot = Join-Path $projectRoot "Temp\StaticCompile"
New-Item -ItemType Directory -Force $outputRoot | Out-Null

$references = @()
$references += Get-ChildItem (Join-Path $UnityEditorRoot "Data\NetStandard\ref\2.1.0\*.dll") | ForEach-Object FullName
$references += Get-ChildItem (Join-Path $UnityEditorRoot "Data\Managed\UnityEngine\*.dll") | ForEach-Object FullName
$references += @(
    "Unity.InputSystem.dll",
    "UnityEngine.UI.dll",
    "Unity.RenderPipelines.Core.Runtime.dll",
    "Unity.RenderPipelines.Universal.Runtime.dll"
) | ForEach-Object { Join-Path $templateAssemblies $_ }
$references += Join-Path $UnityEditorRoot "Data\Managed\Newtonsoft.Json.dll"

function Invoke-Compile {
    param([string]$Name, [string]$SourceRoot, [string[]]$AssemblyReferences)
    $output = Join-Path $outputRoot "$Name.dll"
    $sources = Get-ChildItem $SourceRoot -Recurse -Filter "*.cs" | ForEach-Object FullName
    $arguments = @(
        $compiler,
        "-nologo",
        "-target:library",
        "-langversion:9.0",
        "-nullable:enable",
        "-define:UNITY_EDITOR",
        "-out:$output"
    )
    $arguments += $AssemblyReferences | ForEach-Object { "-reference:$_" }
    $arguments += $sources
    & $dotnet @arguments | Out-Host
    $compileExitCode = $LASTEXITCODE
    if ($compileExitCode -ne 0) { throw "$Name static compilation failed." }
    Write-Host "$Name static compilation passed."
    return $output
}

$core = Invoke-Compile "TrapWars.Core" (Join-Path $projectRoot "Assets\_TrapWars\Core") $references
$testReferences = $references + @(
    (Join-Path $templateAssemblies "UnityEngine.TestRunner.dll"),
    (Join-Path $UnityEditorRoot "Data\Resources\PackageManager\BuiltInPackages\com.unity.ext.nunit\net40\unity-custom\nunit.framework.dll"),
    (Join-Path $UnityEditorRoot "Data\NetStandard\compat\2.1.0\shims\netfx\mscorlib.dll"),
    $core
)
Invoke-Compile "TrapWars.EditModeTests" (Join-Path $projectRoot "Assets\_TrapWars\Tests\EditMode") $testReferences | Out-Null
Invoke-Compile "TrapWars.PlayModeTests" (Join-Path $projectRoot "Assets\_TrapWars\Tests\PlayMode") $testReferences | Out-Null
