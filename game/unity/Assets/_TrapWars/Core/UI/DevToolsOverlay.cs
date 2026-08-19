using System.Collections.Generic;
using System.Linq;
using System.Threading;
using TrapWars.Config;
using TrapWars.Interaction;
using TrapWars.Objectives;
using TrapWars.Phone;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.State;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Profiling;
using UnityEngine.UI;

namespace TrapWars.UI
{
    public sealed class DevToolsOverlay : MonoBehaviour
    {
        private RectTransform root = null!;
        private Text info = null!;
        private TrapWarsRuntimeConfig config = null!;
        private GameStateStore state = null!;
        private IGameRunService runs = null!;
        private Transform player = null!;
        private ThirdPersonMotor motor = null!;
        private ObjectiveDirector objectives = null!;
        private TrapPhoneController phone = null!;
        private InteractionScanner scanner = null!;
        private IReadOnlyDictionary<string, Transform> points = null!;
        private GreyboxHud hud = null!;
        private InputAction toggle = null!;
        private readonly Queue<float> frameTimes = new();

        public void Configure(TrapWarsRuntimeConfig runtimeConfig, GameStateStore stateStore, IGameRunService runService, ThirdPersonMotor playerMotor, ObjectiveDirector objectiveDirector, TrapPhoneController phoneController, InteractionScanner interactionScanner, IReadOnlyDictionary<string, Transform> teleportPoints, GreyboxHud greyboxHud)
        {
            config = runtimeConfig; state = stateStore; runs = runService; motor = playerMotor; player = playerMotor.transform; objectives = objectiveDirector; phone = phoneController; scanner = interactionScanner; points = teleportPoints; hud = greyboxHud;
            Build();
            toggle = new InputAction("ToggleDevTools", binding: "<Keyboard>/f1");
            toggle.Enable();
#if !(UNITY_EDITOR || DEVELOPMENT_BUILD)
            enabled = false;
#endif
        }

        private void Build()
        {
            var canvas = UiFactory.Canvas("DevTools", transform, 100);
            root = UiFactory.PanelRect("DevPanel", canvas.transform, new Color(0.02f, 0.02f, 0.025f, 0.94f), new Vector2(0.01f, 0.42f), new Vector2(0.32f, 0.98f), Vector2.zero, Vector2.zero);
            info = UiFactory.Text("Info", root, string.Empty, 19, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(info.rectTransform, new Vector2(0.06f, 0.37f), new Vector2(0.94f, 0.94f), Vector2.zero, Vector2.zero);
            var reload = UiFactory.Button("Reload", root, "RELOAD PROJECTION", UiFactory.Green, Reload);
            UiFactory.SetRect(reload.GetComponent<RectTransform>(), new Vector2(0.06f, 0.26f), new Vector2(0.94f, 0.34f), Vector2.zero, Vector2.zero);
            var index = 0;
            foreach (var name in new[] { "Safehouse", "Contact", "Market" })
            {
                var captured = name;
                var button = UiFactory.Button(captured, root, captured.ToUpperInvariant(), UiFactory.Panel, () => Teleport(captured));
                UiFactory.SetRect(button.GetComponent<RectTransform>(), new Vector2(0.06f + index * 0.3f, 0.1f), new Vector2(0.32f + index * 0.3f, 0.2f), Vector2.zero, Vector2.zero);
                index += 1;
            }
            root.gameObject.SetActive(false);
        }

        private void Update()
        {
            if (toggle != null && toggle.WasPressedThisFrame()) root.gameObject.SetActive(!root.gameObject.activeSelf);
            frameTimes.Enqueue(UnityEngine.Time.unscaledDeltaTime * 1000f);
            while (frameTimes.Count > 180) frameTimes.Dequeue();
            if (!root.gameObject.activeSelf || state.Current == null) return;
            var average = frameTimes.Count == 0 ? 0f : frameTimes.Average();
            var max = frameTimes.Count == 0 ? 0f : frameTimes.Max();
            var sorted = frameTimes.OrderBy(value => value).ToArray();
            var p95 = sorted.Length == 0 ? 0f : sorted[Mathf.Clamp(Mathf.CeilToInt(sorted.Length * 0.95f) - 1, 0, sorted.Length - 1)];
            var target = scanner.Current?.Prompt ?? "--";
            var segment = player.position.z < 10f ? "SAFEHOUSE" : player.position.z < 38f ? "STREET" : player.position.z < 56f ? "CONTACT" : "MARKET";
            info.text = $"M7.5 GAME FEEL\n\nSegment  {segment}\nObjective  {objectives.Current}\nTarget  {target}\nPhone  {(phone.IsOpen ? "OPEN" : "CLOSED")}\nSpeed  {motor.CurrentSpeed:F2} m/s\n\nRun  {Short(state.Current.RunId)}\nVersion  {state.Current.StateVersion}\nDay  {state.Current.Day}\n\nFrame avg  {average:F2} ms\nFrame P95  {p95:F2} ms\nFrame max  {max:F2} ms\nFPS  {(average > 0 ? 1000f / average : 0):F0}\nAllocated  {Profiler.GetTotalAllocatedMemoryLong() / (1024f * 1024f):F1} MB";
        }

        private async void Reload()
        {
            var result = await runs.RefreshAsync(CancellationToken.None);
            hud.Toast(result.IsSuccess ? "Projection refreshed." : result.Error?.Message ?? "Refresh failed.", result.IsSuccess ? UiFactory.Green : UiFactory.Red);
        }

        private void Teleport(string point)
        {
            if (!points.TryGetValue(point, out var target)) return;
            var controller = player.GetComponent<CharacterController>();
            if (controller != null) controller.enabled = false;
            player.position = target.position;
            if (controller != null) controller.enabled = true;
        }

        private static string Short(string value) => string.IsNullOrWhiteSpace(value) ? "--" : value.Substring(0, Mathf.Min(8, value.Length));

        private void OnDestroy()
        {
            toggle?.Dispose();
        }
    }
}
