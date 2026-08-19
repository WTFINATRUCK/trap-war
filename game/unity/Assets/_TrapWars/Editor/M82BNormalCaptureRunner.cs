using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

namespace TrapWars.EditorTools
{
    /// <summary>Paced, continuous reviewer route. It is instrumented evidence, not a first-time human playtest.</summary>
    [InitializeOnLoad]
    public static class M82BNormalCaptureRunner
    {
        private const string ActiveSessionKey = "trapwars.m8_2b.normal_capture.active";
        private static readonly string Trigger = Path.GetFullPath(Path.Combine(Application.dataPath, "../M8_2BNormalCapture.trigger"));
        private static int actionIndex;
        private static double routeStartedAt;
        private static double nextHeartbeatAt;
        private static bool requestedPlay;

        private static readonly (double At, string Menu)[] Route =
        {
            (0d, "Trap Wars/M7 Acceptance/Show Word"),
            (24d, "Trap Wars/M7 Acceptance/Close Overlay"),
            (36d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (40d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (48d, "Trap Wars/M7 Acceptance/Leave Safehouse"),
            (62d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (67d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (72d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (82d, "Trap Wars/M7.5/Inspect Delivery Clue"),
            (112d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (117d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (125d, "Trap Wars/M7 Acceptance/Camera/Orbit"),
            (146d, "Trap Wars/M7 Acceptance/Meet Contact"),
            (170d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (184d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (198d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (214d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (230d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (246d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (260d, "Trap Wars/M7 Acceptance/Advance Dialogue"),
            (274d, "Trap Wars/M7 Acceptance/Show Word"),
            (304d, "Trap Wars/M7 Acceptance/Close Overlay"),
            (318d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (323d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (328d, "Trap Wars/M7 Acceptance/Movement/Forward"),
            (342d, "Trap Wars/M7 Acceptance/Open Market"),
            (382d, "Trap Wars/M7 Acceptance/Buy One"),
            (416d, "Trap Wars/M7 Acceptance/Close Overlay"),
            (430d, "Trap Wars/M7 Acceptance/Show Word"),
            (452d, "Trap Wars/M7 Acceptance/End Day Flow"),
            (486d, "Trap Wars/M7 Acceptance/Close Overlay"),
            (498d, "Trap Wars/M7 Acceptance/Show Word"),
            (516d, "Trap Wars/M8/Log Visual + Performance Metrics")
        };

        static M82BNormalCaptureRunner()
        {
            if (Application.isBatchMode || !File.Exists(Trigger)) return;
            if (SessionState.GetBool(ActiveSessionKey, false)) ResumeAfterReload();
            else Begin();
        }

        [MenuItem("Trap Wars/M8.2B/Run Paced Continuous Route")]
        public static void Begin()
        {
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.SetInt("trapwars.visual.quality", 2);
            PlayerPrefs.Save();
            actionIndex = 0;
            routeStartedAt = 0d;
            SessionState.SetBool(ActiveSessionKey, true);
            requestedPlay = !EditorApplication.isPlaying;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
            Debug.Log($"[M8_2B_NORMAL_CAPTURE] requested trigger={Trigger}");
        }

        private static void ResumeAfterReload()
        {
            actionIndex = 0;
            routeStartedAt = 0d;
            requestedPlay = !EditorApplication.isPlaying && !EditorApplication.isPlayingOrWillChangePlaymode;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
        }

        private static void Tick()
        {
            if (!File.Exists(Trigger)) { EditorApplication.update -= Tick; return; }
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) return;
            if (!EditorApplication.isPlaying)
            {
                if (!requestedPlay) return;
                requestedPlay = false;
                EditorApplication.isPlaying = true;
                return;
            }
            if (!Ready()) return;

            if (routeStartedAt <= 0d)
            {
                routeStartedAt = EditorApplication.timeSinceStartup;
                nextHeartbeatAt = routeStartedAt;
                FocusGameView();
                Debug.Log("[M8_2B_NORMAL_CAPTURE] route_started target_duration_s=538 classification=paced_instrumented_reviewer_route fresh_day_1=true");
            }

            var elapsed = EditorApplication.timeSinceStartup - routeStartedAt;
            if (elapsed >= nextHeartbeatAt - routeStartedAt)
            {
                nextHeartbeatAt = EditorApplication.timeSinceStartup + 30d;
                Debug.Log($"[M8_2B_NORMAL_CAPTURE] heartbeat elapsed_s={elapsed:F1} action={actionIndex}/{Route.Length}");
            }
            while (actionIndex < Route.Length && elapsed >= Route[actionIndex].At + 10d)
            {
                var action = Route[actionIndex++];
                if (!EditorApplication.ExecuteMenuItem(action.Menu))
                {
                    Debug.LogError($"[M8_2B_NORMAL_CAPTURE] unavailable menu={action.Menu}");
                    Finish(2, elapsed);
                    return;
                }
                Debug.Log($"[M8_2B_NORMAL_CAPTURE] elapsed_s={elapsed:F1} menu={action.Menu}");
            }
            if (elapsed >= 538d) Finish(0, elapsed);
        }

        private static bool Ready() => Resources.FindObjectsOfTypeAll<Text>()
            .Any(value => value.text.StartsWith("CASH  $", StringComparison.Ordinal));

        private static void FocusGameView()
        {
            var type = Type.GetType("UnityEditor.GameView,UnityEditor");
            if (type == null) return;
            var window = EditorWindow.GetWindow(type);
            window.maximized = true;
            window.Focus();
        }

        private static void Finish(int exitCode, double elapsed)
        {
            Debug.Log($"[M8_2B_NORMAL_CAPTURE] complete exit_code={exitCode} duration_s={elapsed:F1}");
            SessionState.EraseBool(ActiveSessionKey);
            if (File.Exists(Trigger)) File.Delete(Trigger);
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            EditorApplication.Exit(exitCode);
        }
    }
}
