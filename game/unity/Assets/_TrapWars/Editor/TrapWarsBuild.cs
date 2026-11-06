using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace TrapWars.EditorTools
{
    /// <summary>
    /// Build entry points used from the Editor menu, the local helper script and CI
    /// (<c>-executeMethod TrapWars.EditorTools.TrapWarsBuild.BuildWebGL</c>).
    /// </summary>
    public static class TrapWarsBuild
    {
        private const string MainScene = "Assets/Scenes/Main.unity";
        private const string IdentityAsset = "Assets/_TrapWars/Resources/BuildIdentity.txt";

        /// <summary>Builds the public browser demo into <c>public/play/game</c>, which the website serves at /play.</summary>
        [MenuItem("Trap Wars/Build/WebGL Demo")]
        public static void BuildWebGL()
        {
            var output = OutputOverride() ?? Path.Combine(RepositoryRoot(), "public", "play", "game");
            PlayerSettings.WebGL.template = "PROJECT:TrapWars";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            Build(output, BuildTarget.WebGL, BuildOptions.None);
        }

        /// <summary>Builds a Windows development player into <c>Builds/Windows</c> for local testing.</summary>
        [MenuItem("Trap Wars/Build/Windows Development Player")]
        public static void BuildWindowsDevelopment()
        {
            var output = OutputOverride() ?? Path.Combine(RepositoryRoot(), "Builds", "Windows", "TrapWars.exe");
            Build(output, BuildTarget.StandaloneWindows64, BuildOptions.Development);
        }

        private static void Build(string output, BuildTarget target, BuildOptions options)
        {
            Directory.CreateDirectory(target == BuildTarget.WebGL ? output : Path.GetDirectoryName(output)!);
            WriteBuildIdentity();
            BuildReport report;
            try
            {
                report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { MainScene },
                    locationPathName = output,
                    target = target,
                    options = options
                });
            }
            finally
            {
                AssetDatabase.DeleteAsset(IdentityAsset);
            }

            var summary = report.summary;
            Debug.Log($"[BUILD] target={target} result={summary.result} size_mb={summary.totalSize / (1024f * 1024f):F1} duration={summary.totalTime} output={output}");
            if (summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException($"{target} build failed: {summary.result}");
        }

        /// <summary>Stamps version and commit into the player so the running build can report exactly what it is.</summary>
        private static void WriteBuildIdentity()
        {
            var commit = Environment.GetEnvironmentVariable("GITHUB_SHA");
            if (string.IsNullOrWhiteSpace(commit)) commit = Git("rev-parse HEAD") ?? "unknown";
            if (commit.Length > 12) commit = commit.Substring(0, 12);
            File.WriteAllText(Path.GetFullPath(IdentityAsset), $"version={PlayerSettings.bundleVersion} commit={commit} built={DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}");
            AssetDatabase.ImportAsset(IdentityAsset, ImportAssetOptions.ForceSynchronousImport);
        }

        private static string? OutputOverride()
        {
            var value = Environment.GetEnvironmentVariable("TRAPWARS_BUILD_OUTPUT");
            return string.IsNullOrWhiteSpace(value) ? null : Path.GetFullPath(value);
        }

        private static string RepositoryRoot() => Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));

        private static string? Git(string arguments)
        {
            try
            {
                var info = new System.Diagnostics.ProcessStartInfo("git", arguments)
                {
                    WorkingDirectory = RepositoryRoot(),
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var process = System.Diagnostics.Process.Start(info);
                if (process == null) return null;
                var output = process.StandardOutput.ReadToEnd().Trim();
                process.WaitForExit();
                return process.ExitCode == 0 && output.Length > 0 ? output : null;
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
