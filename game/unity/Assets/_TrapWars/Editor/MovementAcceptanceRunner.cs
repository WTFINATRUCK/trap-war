using System;
using System.IO;
using System.Linq;
using TrapWars.Player;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.UI;

namespace TrapWars.EditorTools
{
    [InitializeOnLoad]
    public static class MovementAcceptanceRunner
    {
        private const string ActiveSessionKey = "trapwars.repair.movement.active";
        private static readonly string Trigger = Path.GetFullPath(Path.Combine(Application.dataPath, "../MovementAcceptance.trigger"));
        private static readonly string EvidenceDirectory = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/dev_environment/movement"));
        private static double startedAt;
        private static int phaseIndex;
        private static bool requestedPlay;
        private static Gamepad virtualGamepad = null!;
        private static Vector3 phaseStart;

        private static readonly (double At, string Name, Vector2 Move, bool Sprint)[] Phases =
        {
            (0d, "idle", Vector2.zero, false),
            (3d, "walk", new Vector2(0f, 0.34f), false),
            (7d, "stop_after_walk", Vector2.zero, false),
            (9d, "jog", Vector2.up, false),
            (13d, "sprint", Vector2.up, true),
            (17d, "stop_after_sprint", Vector2.zero, false),
            (19d, "turn_right", Vector2.right, false),
            (22d, "turn_back", Vector2.down, false),
            (25d, "diagonal", new Vector2(-0.72f, 0.72f), false),
            (28d, "phone_open", Vector2.zero, false),
            (31d, "phone_close", Vector2.zero, false)
        };

        static MovementAcceptanceRunner()
        {
            if (Application.isBatchMode || !File.Exists(Trigger)) return;
            if (SessionState.GetBool(ActiveSessionKey, false)) ResumeAfterReload();
            else Begin();
        }

        [MenuItem("Trap Wars/Repair/Run Movement Acceptance")]
        public static void Begin()
        {
            Directory.CreateDirectory(EvidenceDirectory);
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.SetInt("trapwars.visual.quality", 2);
            PlayerPrefs.Save();
            phaseIndex = 0;
            startedAt = 0d;
            requestedPlay = !EditorApplication.isPlaying;
            SessionState.SetBool(ActiveSessionKey, true);
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
            Debug.Log($"[MOVEMENT_ACCEPTANCE] requested trigger={Trigger}");
        }

        private static void ResumeAfterReload()
        {
            phaseIndex = 0;
            startedAt = 0d;
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
            if (startedAt <= 0d)
            {
                virtualGamepad = InputSystem.AddDevice<Gamepad>("Trap Wars Movement Acceptance");
                if (!EditorApplication.ExecuteMenuItem("Trap Wars/M7 Acceptance/Leave Safehouse"))
                    throw new InvalidOperationException("Movement acceptance could not enter the open-street test lane.");
                startedAt = EditorApplication.timeSinceStartup;
                phaseStart = Require<ThirdPersonMotor>().transform.position;
                FocusGameView();
                Debug.Log("[MOVEMENT_ACCEPTANCE] started duration_s=34 locomotion=controller_driven evidence=uninterrupted");
            }

            var elapsed = EditorApplication.timeSinceStartup - startedAt;
            while (phaseIndex < Phases.Length && elapsed >= Phases[phaseIndex].At)
            {
                BeginPhase(Phases[phaseIndex]);
                phaseIndex++;
            }

            var activeIndex = Mathf.Clamp(phaseIndex - 1, 0, Phases.Length - 1);
            QueueInput(Phases[activeIndex].Move, Phases[activeIndex].Sprint);
            if (elapsed >= 34d) Finish(0, elapsed);
        }

        private static void BeginPhase((double At, string Name, Vector2 Move, bool Sprint) phase)
        {
            var motor = Require<ThirdPersonMotor>();
            var distance = Vector3.Distance(phaseStart, motor.transform.position);
            Debug.Log($"[MOVEMENT_ACCEPTANCE] phase={phase.Name} elapsed_s={phase.At:F1} previous_distance_m={distance:F2} speed_mps={motor.CurrentSpeed:F2} normalized_speed={motor.NormalizedSpeed:F2}");
            phaseStart = motor.transform.position;
            ScreenCapture.CaptureScreenshot(Path.Combine(EvidenceDirectory, $"{phaseIndex + 1:00}-{phase.Name}.png"));
            if (phase.Name == "phone_open") EditorApplication.ExecuteMenuItem("Trap Wars/M7 Acceptance/Open Phone");
            if (phase.Name == "phone_close") EditorApplication.ExecuteMenuItem("Trap Wars/M7 Acceptance/Close Overlay");
        }

        private static void QueueInput(Vector2 move, bool sprint)
        {
            var state = new GamepadState { leftStick = move };
            if (sprint) state = state.WithButton(GamepadButton.LeftStick);
            InputSystem.QueueStateEvent(virtualGamepad, state);
        }

        private static bool Ready() => Resources.FindObjectsOfTypeAll<Text>()
            .Any(value => value.text.StartsWith("CASH  $", StringComparison.Ordinal));

        private static T Require<T>() where T : UnityEngine.Object =>
            UnityEngine.Object.FindFirstObjectByType<T>() ?? throw new InvalidOperationException($"Movement acceptance requires {typeof(T).Name}.");

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
            QueueInput(Vector2.zero, false);
            if (virtualGamepad != null) InputSystem.RemoveDevice(virtualGamepad);
            var motor = UnityEngine.Object.FindFirstObjectByType<ThirdPersonMotor>();
            Debug.Log($"[MOVEMENT_ACCEPTANCE] complete exit_code={exitCode} duration_s={elapsed:F1} final_position={motor?.transform.position.ToString("F2") ?? "missing"}");
            SessionState.EraseBool(ActiveSessionKey);
            if (File.Exists(Trigger)) File.Delete(Trigger);
            EditorApplication.update -= Tick;
            EditorApplication.isPlaying = false;
            EditorApplication.Exit(exitCode);
        }
    }
}
