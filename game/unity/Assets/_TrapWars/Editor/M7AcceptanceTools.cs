using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using TrapWars.Interaction;
using TrapWars.Market;
using TrapWars.Phone;
using TrapWars.Player;
using TrapWars.State;
using TrapWars.UI;
using TrapWars.World;
using TrapWars.Visuals;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Profiling;

namespace TrapWars.EditorTools
{
    [InitializeOnLoad]
    public static class M7AcceptanceTools
    {
        private static readonly List<float> FrameTimes = new();
        private static Key[] movementKeys = Array.Empty<Key>();
        private static double movementEndsAt;
        private static Vector3 movementStart;
        private static string movementLabel = string.Empty;
        private static int m75CaptureIndex;
        private static int m8CaptureIndex;
        private static readonly string[] M75CaptureNames =
        {
            "01-improved-safehouse.png",
            "02-humanoid-player.png",
            "03-street-neighborhood.png",
            "04-trap-phone.png",
            "05-npc-conversation.png",
            "06-market-interaction.png",
            "07-consequence-reveal.png",
            "08-night-state.png",
            "09-day-two-hook.png"
        };
        private static readonly string[] M8CaptureNames =
        {
            "01-hero-safehouse.png",
            "02-safehouse-interior.png",
            "03-first-street-reveal.png",
            "04-hero-walking-block.png",
            "05-ray-portrait.png",
            "06-ray-conversation.png",
            "07-trap-phone.png",
            "08-market-interaction.png",
            "09-economic-consequence.png",
            "10-education-reveal.png",
            "11-daytime-block.png",
            "12-nighttime-block.png"
        };

        static M7AcceptanceTools()
        {
            if (Application.isBatchMode) return;
            EditorApplication.update -= Sample;
            EditorApplication.update += Sample;
        }

        [MenuItem("Trap Wars/M7 Acceptance/Open Phone _F2")]
        private static void OpenPhone() => Require<TrapPhoneController>().Open();

        [MenuItem("Trap Wars/M7 Acceptance/Capture Resume Evidence _F1")]
        private static void CaptureResumeEvidence()
        {
            var path = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/m7/12-save-resume.png"));
            ScreenCapture.CaptureScreenshot(path);
            Debug.Log($"[M7_RUNTIME] screenshot={path}");
        }

        [MenuItem("Trap Wars/M7.5/Capture Next Evidence %F11")]
        private static void CaptureNextM75Evidence()
        {
            if (!EditorApplication.isPlaying) return;
            var index = Mathf.Clamp(m75CaptureIndex, 0, M75CaptureNames.Length - 1);
            var directory = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/m7_5"));
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, M75CaptureNames[index]);
            ScreenCapture.CaptureScreenshot(path);
            Debug.Log($"[M7_5_RUNTIME] screenshot={path}");
            m75CaptureIndex = Mathf.Min(m75CaptureIndex + 1, M75CaptureNames.Length - 1);
        }

        [MenuItem("Trap Wars/M8/Capture Next Hero Frame %&F11")]
        private static void CaptureNextM8Evidence()
        {
            if (!EditorApplication.isPlaying) return;
            var index = Mathf.Clamp(m8CaptureIndex, 0, M8CaptureNames.Length - 1);
            var directory = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/m8"));
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, M8CaptureNames[index]);
            ScreenCapture.CaptureScreenshot(path, 1);
            Debug.Log($"[M8_EVIDENCE] index={index + 1} screenshot={path}");
            m8CaptureIndex = Mathf.Min(m8CaptureIndex + 1, M8CaptureNames.Length - 1);
        }

        [MenuItem("Trap Wars/M8/Quality/Low")]
        private static void M8QualityLow() => ApplyQuality(M8QualityTier.Low);

        [MenuItem("Trap Wars/M8/Quality/Medium")]
        private static void M8QualityMedium() => ApplyQuality(M8QualityTier.Medium);

        [MenuItem("Trap Wars/M8/Quality/High")]
        private static void M8QualityHigh() => ApplyQuality(M8QualityTier.High);

        [MenuItem("Trap Wars/M8/Log Visual + Performance Metrics")]
        private static void LogM8Metrics()
        {
            if (!EditorApplication.isPlaying) return;
            var triangles = UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None).Sum(mesh => M8AssetRuntime.TriangleCount(mesh.sharedMesh))
                + UnityEngine.Object.FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None).Sum(mesh => M8AssetRuntime.TriangleCount(mesh.sharedMesh));
            var renderers = UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None);
            var materialCount = renderers.SelectMany(renderer => renderer.sharedMaterials).Where(material => material != null).Distinct().Count();
            var sorted = FrameTimes.OrderBy(value => value).ToArray();
            var average = sorted.Length == 0 ? 0f : sorted.Average();
            var p95 = sorted.Length == 0 ? 0f : sorted[Mathf.Clamp(Mathf.CeilToInt(sorted.Length * 0.95f) - 1, 0, sorted.Length - 1)];
            Debug.Log($"[M8_PROFILE] tier={Require<M8QualityController>().Tier} fps={(average > 0f ? 1000f / average : 0f):F1} avg_ms={average:F2} p95_ms={p95:F2} triangles={triangles} renderers={renderers.Length} materials={materialCount} lights={UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Length} skinned={UnityEngine.Object.FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None).Length} allocated_mb={Profiler.GetTotalAllocatedMemoryLong() / (1024f * 1024f):F1} managed_mb={GC.GetTotalMemory(false) / (1024f * 1024f):F1}");
        }

        [MenuItem("Trap Wars/M8/Reset Demo State %&d")]
        private static void ResetM8DemoState()
        {
            if (EditorApplication.isPlaying) return;
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.DeleteKey("trapwars.visual.quality");
            DemoPresentationPolicy.ResetLocalDemoPresentation();
            PlayerPrefs.Save();
            m8CaptureIndex = 0;
            Debug.Log("[M8_DEMO] local projection and quality preference reset; authoritative backend records preserved");
        }

        [MenuItem("Trap Wars/M8.3/Reset Local Human Test")]
        private static void ResetM83HumanTest()
        {
            if (EditorApplication.isPlaying) return;
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.SetInt("trapwars.visual.quality", (int)M8QualityTier.High);
            DemoPresentationPolicy.ResetLocalDemoPresentation();
            PlayerPrefs.Save();
            m8CaptureIndex = 0;
            Debug.Log("[M8_3_DEMO_RESET] local guest, onboarding, and quality reset; backend records and production configuration preserved");
        }

        [MenuItem("Trap Wars/M7.5/Reset Local Guest %&g")]
        private static void ResetLocalGuest()
        {
            if (EditorApplication.isPlaying) return;
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.Save();
            m75CaptureIndex = 0;
            Debug.Log("[M7_5_RUNTIME] local development guest reset; backend records preserved");
        }

        private static void ApplyQuality(M8QualityTier tier)
        {
            if (!EditorApplication.isPlaying) return;
            PlayerPrefs.SetInt("trapwars.visual.quality", (int)tier);
            PlayerPrefs.Save();
            Require<M8QualityController>().Apply(tier);
        }

        [MenuItem("Trap Wars/M7 Acceptance/Show Word _F3")]
        private static void ShowWord()
        {
            var phone = Require<TrapPhoneController>();
            phone.Open();
            Invoke(phone, "SelectTab", "WORD");
        }

        [MenuItem("Trap Wars/M7 Acceptance/Close Overlay _F4")]
        private static void CloseOverlay()
        {
            var phone = UnityEngine.Object.FindFirstObjectByType<TrapPhoneController>();
            var market = UnityEngine.Object.FindFirstObjectByType<MarketController>();
            var dialogue = UnityEngine.Object.FindFirstObjectByType<DialoguePresenter>();
            var education = UnityEngine.Object.FindFirstObjectByType<EducationRevealPresenter>();
            if (phone != null && phone.IsOpen) phone.Close();
            if (market != null && market.IsOpen) market.Close();
            if (dialogue != null && dialogue.IsOpen) dialogue.Close();
            education?.Hide();
            var motor = UnityEngine.Object.FindFirstObjectByType<ThirdPersonMotor>();
            if (motor != null) motor.InputEnabled = true;
        }

        [MenuItem("Trap Wars/M7 Acceptance/Leave Safehouse _F5")]
        private static void LeaveSafehouse()
        {
            var player = Require<ThirdPersonMotor>().gameObject;
            Require<SafehouseExitInteractable>().Interact(new InteractionContext(player));
        }

        [MenuItem("Trap Wars/M7 Acceptance/Meet Contact _F6")]
        private static void MeetContact()
        {
            var player = Require<ThirdPersonMotor>();
            Teleport(player, new Vector3(-2.4f, 0.1f, 39.8f));
            Require<NpcContactInteractable>().Interact(new InteractionContext(player.gameObject));
        }

        [MenuItem("Trap Wars/M7.5/Inspect Delivery Clue %F10")]
        private static void InspectDeliveryClue()
        {
            var player = Require<ThirdPersonMotor>();
            var clue = UnityEngine.Object.FindObjectsByType<WorldClueInteractable>(FindObjectsSortMode.None)
                .First(value => value.name == "clue_delivery_board");
            Teleport(player, new Vector3(-6.2f, 0.1f, 24f));
            clue.Interact(new InteractionContext(player.gameObject));
            Debug.Log("[M7_5_RUNTIME] optional_interaction=delivery_board");
        }

        [MenuItem("Trap Wars/M7 Acceptance/Advance Dialogue _F7")]
        private static void AdvanceDialogue() => Require<DialoguePresenter>().Advance();

        [MenuItem("Trap Wars/M7 Acceptance/Open Market _F8")]
        private static void OpenMarket()
        {
            var player = Require<ThirdPersonMotor>();
            Teleport(player, new Vector3(0f, 0.1f, 59f));
            Require<MarketController>().Open();
        }

        [MenuItem("Trap Wars/M7 Acceptance/Buy One _F9")]
        private static void BuyOne()
        {
            var market = Require<MarketController>();
            var objectives = UnityEngine.Object.FindFirstObjectByType<DevToolsOverlay>() == null
                ? null
                : GetPrivate<TrapWars.Objectives.ObjectiveDirector>(Require<DevToolsOverlay>(), "objectives");
            if (objectives != null && objectives.Current == TrapWars.Objectives.GreyboxObjective.ReviewOpportunity)
                Invoke(market, "ReviewOpportunity");
            Invoke(market, "Trade", true);
        }

        [MenuItem("Trap Wars/M7 Acceptance/Sell One _F10")]
        private static void SellOne() => Invoke(Require<MarketController>(), "Trade", false);

        [MenuItem("Trap Wars/M7 Acceptance/End Day Flow _F11")]
        private static void EndDayFlow()
        {
            var market = Require<MarketController>();
            if (market.IsOpen) market.Close();
            var phone = Require<TrapPhoneController>();
            phone.Open();
            Invoke(phone, "SelectTab", "WORD");
            Invoke(phone, "EndDay");
        }

        [MenuItem("Trap Wars/M7 Acceptance/Log Runtime State _F12")]
        private static void LogRuntimeState()
        {
            var devTools = Require<DevToolsOverlay>();
            var state = GetPrivate<GameStateStore>(devTools, "state").Current;
            var player = Require<ThirdPersonMotor>();
            var sorted = FrameTimes.OrderBy(value => value).ToArray();
            var average = sorted.Length == 0 ? 0f : sorted.Average();
            var p95 = sorted.Length == 0 ? 0f : sorted[Mathf.Clamp(Mathf.CeilToInt(sorted.Length * 0.95f) - 1, 0, sorted.Length - 1)];
            var max = sorted.Length == 0 ? 0f : sorted[^1];
            Debug.Log($"[M7_RUNTIME] run_id={state?.RunId} version={state?.StateVersion} day={state?.Day} cash={state?.Cash} actions={state?.ActionsRemaining} position={player.transform.position:F2} frame_avg_ms={average:F2} frame_p95_ms={p95:F2} frame_max_ms={max:F2} fps={(average > 0f ? 1000f / average : 0f):F1} allocated_mb={Profiler.GetTotalAllocatedMemoryLong() / (1024f * 1024f):F1} managed_mb={GC.GetTotalMemory(false) / (1024f * 1024f):F1}");
        }

        [MenuItem("Trap Wars/M7 Acceptance/Movement/Forward %F5")]
        private static void MoveForward() => StartMovement("forward", Key.W);

        [MenuItem("Trap Wars/M7 Acceptance/Movement/Strafe %F6")]
        private static void Strafe() => StartMovement("strafe", Key.D);

        [MenuItem("Trap Wars/M7 Acceptance/Movement/Diagonal %F7")]
        private static void Diagonal() => StartMovement("diagonal", Key.W, Key.D);

        [MenuItem("Trap Wars/M7 Acceptance/Movement/Sprint %F8")]
        private static void Sprint() => StartMovement("sprint", Key.W, Key.LeftShift);

        [MenuItem("Trap Wars/M7 Acceptance/Camera/Orbit %F9")]
        private static void Orbit()
        {
            if (!EditorApplication.isPlaying || Mouse.current == null) return;
            InputSystem.QueueDeltaStateEvent(Mouse.current.delta, new Vector2(180f, -35f));
            Debug.Log("[M7_RUNTIME] camera_orbit_input delta=(180,-35)");
        }

        private static void StartMovement(string label, params Key[] keys)
        {
            if (!EditorApplication.isPlaying || Keyboard.current == null) return;
            movementLabel = label;
            movementKeys = keys;
            movementEndsAt = EditorApplication.timeSinceStartup + 1.5d;
            movementStart = Require<ThirdPersonMotor>().transform.position;
            EditorApplication.update -= PumpMovement;
            EditorApplication.update += PumpMovement;
        }

        private static void PumpMovement()
        {
            if (!EditorApplication.isPlaying || Keyboard.current == null || EditorApplication.timeSinceStartup >= movementEndsAt)
            {
                if (Keyboard.current != null) InputSystem.QueueStateEvent(Keyboard.current, new KeyboardState());
                EditorApplication.update -= PumpMovement;
                var motor = UnityEngine.Object.FindFirstObjectByType<ThirdPersonMotor>();
                if (motor != null)
                {
                    var distance = Vector3.Distance(movementStart, motor.transform.position);
                    Debug.Log($"[M7_RUNTIME] movement={movementLabel} duration_s=1.5 distance_m={distance:F2} normalized_speed={motor.NormalizedSpeed:F2} end={motor.transform.position:F2}");
                }
                return;
            }
            InputSystem.QueueStateEvent(Keyboard.current, new KeyboardState(movementKeys));
        }

        private static void Sample()
        {
            if (!EditorApplication.isPlaying) return;
            FrameTimes.Add(UnityEngine.Time.unscaledDeltaTime * 1000f);
            if (FrameTimes.Count > 3600) FrameTimes.RemoveRange(0, FrameTimes.Count - 3600);
        }

        private static T Require<T>() where T : UnityEngine.Object
        {
            var value = UnityEngine.Object.FindFirstObjectByType<T>();
            if (value == null) throw new InvalidOperationException($"M7 acceptance requires {typeof(T).Name} in Play Mode.");
            return value;
        }

        private static T GetPrivate<T>(object target, string fieldName) =>
            (T)(target.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic)?.GetValue(target)
                ?? throw new MissingFieldException(target.GetType().Name, fieldName));

        private static void Invoke(object target, string methodName, params object[] arguments)
        {
            var method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.NonPublic)
                ?? throw new MissingMethodException(target.GetType().Name, methodName);
            method.Invoke(target, arguments);
        }

        private static void Teleport(ThirdPersonMotor player, Vector3 position)
        {
            var controller = player.GetComponent<CharacterController>();
            controller.enabled = false;
            player.transform.position = position;
            controller.enabled = true;
        }
    }
}
