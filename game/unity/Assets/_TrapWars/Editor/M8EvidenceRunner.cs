using System;
using System.IO;
using System.Linq;
using System.Reflection;
using TrapWars.Player;
using TrapWars.UI;
using TrapWars.Visuals;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

namespace TrapWars.EditorTools
{
    /// <summary>One-shot M8.1 Play Mode composition route. This is capture tooling, not first-time playtest evidence.</summary>
    [InitializeOnLoad]
    public static class M8EvidenceRunner
    {
        private const string ActiveSessionKey = "trapwars.m8.evidence.active";
        private static readonly string M81Trigger = Path.GetFullPath(Path.Combine(Application.dataPath, "../M8_1Evidence.trigger"));
        private static readonly string M82BTrigger = Path.GetFullPath(Path.Combine(Application.dataPath, "../M8_2BEvidence.trigger"));
        private static readonly string M83Trigger = Path.GetFullPath(Path.Combine(Application.dataPath, "../M8_3Evidence.trigger"));
        private static bool IsM83 => File.Exists(M83Trigger);
        private static bool IsM82B => File.Exists(M82BTrigger);
        private static string Trigger => IsM83 ? M83Trigger : IsM82B ? M82BTrigger : M81Trigger;
        private static string EvidenceDirectory => Path.GetFullPath(Path.Combine(Application.dataPath, IsM83 ? "../../../docs/evidence/m8_3/screenshots" : IsM82B ? "../../../docs/evidence/m8_2b/screenshots" : "../../../docs/evidence/m8_1/screenshots"));
        private static string EvidenceLabel => IsM83 ? "M8_3_EVIDENCE" : IsM82B ? "M8_2B_EVIDENCE" : "M8_1_EVIDENCE";
        private static int step;
        private static int dialogueAdvances;
        private static double nextActionAt;
        private static bool requestedPlay;
        private static bool openingObjectiveCompleted;
        private static double nextHeartbeatAt;

        static M8EvidenceRunner()
        {
            if (Application.isBatchMode || (!File.Exists(M81Trigger) && !File.Exists(M82BTrigger) && !File.Exists(M83Trigger))) return;
            if (SessionState.GetBool(ActiveSessionKey, false)) ResumeAfterReload();
            else Begin();
        }

        [MenuItem("Trap Wars/M8.1/Run Screenshot Composition Route")]
        public static void Begin()
        {
            Directory.CreateDirectory(EvidenceDirectory);
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.SetInt("trapwars.visual.quality", (int)M8QualityTier.High);
            PlayerPrefs.Save();
            step = 0;
            dialogueAdvances = 0;
            openingObjectiveCompleted = false;
            SessionState.SetBool(ActiveSessionKey, true);
            requestedPlay = !EditorApplication.isPlaying;
            nextActionAt = EditorApplication.timeSinceStartup + (requestedPlay ? 1d : 5d);
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
            Debug.Log($"[M8_EVIDENCE] route_requested playing={EditorApplication.isPlaying} trigger={Trigger}");
        }

        [MenuItem("Trap Wars/M8.2B/Run Screenshot Composition Route")]
        public static void BeginM82B() => Begin();

        [MenuItem("Trap Wars/M8.3/Run Screenshot Composition Route")]
        public static void BeginM83() => Begin();

        private static void ResumeAfterReload()
        {
            requestedPlay = !EditorApplication.isPlaying && !EditorApplication.isPlayingOrWillChangePlaymode;
            nextActionAt = EditorApplication.timeSinceStartup + 5d;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
            Debug.Log($"[M8_EVIDENCE] route_resumed playing={EditorApplication.isPlaying} will_change={EditorApplication.isPlayingOrWillChangePlaymode}");
        }

        private static void Tick()
        {
            if (!File.Exists(Trigger)) { EditorApplication.update -= Tick; return; }
            if (EditorApplication.isCompiling || EditorApplication.isUpdating || EditorApplication.timeSinceStartup < nextActionAt) return;
            if (EditorApplication.timeSinceStartup >= nextHeartbeatAt)
            {
                nextHeartbeatAt = EditorApplication.timeSinceStartup + 5d;
                Debug.Log($"[M8_EVIDENCE] heartbeat playing={EditorApplication.isPlaying} requested={requestedPlay} ready={Ready()} step={step}");
            }
            if (!EditorApplication.isPlaying)
            {
                if (!requestedPlay) return;
                requestedPlay = false;
                EditorApplication.isPlaying = true;
                nextActionAt = EditorApplication.timeSinceStartup + 5d;
                return;
            }

            try { RunStep(); }
            catch (Exception exception)
            {
                Debug.LogException(exception);
                Finish(2);
            }
        }

        private static void RunStep()
        {
            if (!Ready())
            {
                nextActionAt = EditorApplication.timeSinceStartup + 0.5d;
                return;
            }
            if (!openingObjectiveCompleted)
            {
                Menu("Trap Wars/M7 Acceptance/Show Word");
                Menu("Trap Wars/M7 Acceptance/Close Overlay");
                openingObjectiveCompleted = true;
                nextActionAt = EditorApplication.timeSinceStartup + 0.8d;
                return;
            }

            switch (step)
            {
                case 0:
                    Capture("01-hero-safehouse.png");
                    Schedule(1.2d);
                    break;
                case 1:
                    Teleport(new Vector3(0f, 0.1f, 7.2f), 0f, 13f);
                    Capture("02-hero-street-exit.png");
                    Schedule(1.2d);
                    break;
                case 2:
                    Menu("Trap Wars/M7 Acceptance/Leave Safehouse");
                    Teleport(new Vector3(0f, 0.1f, 14.5f), 0f, 15f);
                    Next(0.8d);
                    break;
                case 3:
                    Capture("03-street-wide.png");
                    Next(1.5d);
                    break;
                case 4:
                    Menu("Trap Wars/M7 Acceptance/Movement/Forward");
                    Next(0.55d);
                    break;
                case 5:
                    Menu("Trap Wars/M7 Acceptance/Close Overlay");
                    Teleport(new Vector3(-0.7f, 0.1f, 39.2f), -31f, 9f);
                    Next(1.2d);
                    break;
                case 6:
                    Capture("04-ray.png");
                    Next(1.5d);
                    break;
                case 7:
                    Menu("Trap Wars/M7 Acceptance/Meet Contact");
                    Next(0.8d);
                    break;
                case 8:
                    Menu("Trap Wars/M7 Acceptance/Advance Dialogue");
                    Next(0.35d);
                    break;
                case 9:
                    Capture("05-ray-conversation.png");
                    dialogueAdvances = 12;
                    Next(0.7d);
                    break;
                case 10:
                    if (Find<DialoguePresenter>().IsOpen && dialogueAdvances-- > 0)
                    {
                        Menu("Trap Wars/M7 Acceptance/Advance Dialogue");
                        nextActionAt = EditorApplication.timeSinceStartup + 0.38d;
                        return;
                    }
                    Menu("Trap Wars/M7 Acceptance/Show Word");
                    Next(0.8d);
                    break;
                case 11:
                    Capture("06-phone.png");
                    Next(1.2d);
                    break;
                case 12:
                    Menu("Trap Wars/M7 Acceptance/Close Overlay");
                    Teleport(new Vector3(0f, 0.1f, 59f), 0f, 12f);
                    Next(1d);
                    break;
                case 13:
                    Capture("07-the-hub.png");
                    Next(1.2d);
                    break;
                case 14:
                    Menu("Trap Wars/M7 Acceptance/Open Market");
                    Next(0.8d);
                    break;
                case 15:
                    Capture("08-market-flow.png");
                    Next(1.2d);
                    break;
                case 16:
                    Menu("Trap Wars/M7 Acceptance/Buy One");
                    Next(1.8d);
                    break;
                case 17:
                    Capture("09-market-consequence.png");
                    Next(1.2d);
                    break;
                case 18:
                    Menu("Trap Wars/M7 Acceptance/Close Overlay");
                    Menu("Trap Wars/M7 Acceptance/Show Word");
                    Next(0.9d);
                    break;
                case 19:
                    Menu("Trap Wars/M7 Acceptance/Close Overlay");
                    Teleport(new Vector3(0f, 0.1f, 51f), 180f, 18f);
                    Menu("Trap Wars/M7 Acceptance/End Day Flow");
                    Next(4.5d);
                    break;
                case 20:
                    Capture("10-liquidity-reveal.png");
                    Next(1.2d);
                    break;
                case 21:
                    Menu("Trap Wars/M7 Acceptance/Close Overlay");
                    Capture("11-night-street.png");
                    Next(1.2d);
                    break;
                case 22:
                    Teleport(new Vector3(0f, 0.1f, 14.5f), 0f, 12f);
                    Menu("Trap Wars/M7 Acceptance/Show Word");
                    Next(0.8d);
                    break;
                case 23:
                    Capture("12-day-two-hook.png");
                    Menu("Trap Wars/M8/Log Visual + Performance Metrics");
                    Next(2d);
                    break;
                default:
                    Finish(0);
                    break;
            }
        }

        private static void Schedule(double delay)
        {
            step++;
            nextActionAt = EditorApplication.timeSinceStartup + delay;
        }

        private static void Next(double delay) => Schedule(delay);

        private static bool Ready() => Resources.FindObjectsOfTypeAll<Text>()
            .Any(value => value.text.StartsWith("CASH  $", StringComparison.Ordinal));

        private static void Capture(string name)
        {
            var path = Path.Combine(EvidenceDirectory, name);
            ScreenCapture.CaptureScreenshot(path, 1);
            Debug.Log($"[{EvidenceLabel}] step={step:00} screenshot={path}");
        }

        private static void Teleport(Vector3 position, float yaw, float pitch)
        {
            var motor = Find<ThirdPersonMotor>();
            var controller = motor.GetComponent<CharacterController>();
            controller.enabled = false;
            motor.transform.position = position;
            controller.enabled = true;
            var rig = Find<ThirdPersonCameraRig>();
            SetField(rig, "yaw", yaw);
            SetField(rig, "pitch", pitch);
            SetField(rig, "smoothedPivot", position + Vector3.up * 1.48f);
            var rotation = Quaternion.Euler(pitch, yaw, 0f);
            var pivot = position + Vector3.up * 1.48f;
            rig.transform.SetPositionAndRotation(pivot + rotation * Vector3.right * 0.52f + rotation * Vector3.back * 4.05f, rotation);
        }

        private static void Menu(string path)
        {
            if (!EditorApplication.ExecuteMenuItem(path)) throw new InvalidOperationException($"M8 evidence menu item unavailable: {path}");
        }

        private static T Find<T>() where T : UnityEngine.Object =>
            UnityEngine.Object.FindFirstObjectByType<T>() ?? throw new InvalidOperationException($"M8 evidence requires {typeof(T).Name}.");

        private static void SetField(object target, string field, object value) =>
            (target.GetType().GetField(field, BindingFlags.Instance | BindingFlags.NonPublic)
                ?? throw new MissingFieldException(target.GetType().Name, field)).SetValue(target, value);

        private static void Finish(int exitCode)
        {
            Debug.Log($"[{EvidenceLabel}] complete exit_code={exitCode}");
            SessionState.EraseBool(ActiveSessionKey);
            if (File.Exists(Trigger)) File.Delete(Trigger);
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            EditorApplication.Exit(exitCode);
        }
    }
}
