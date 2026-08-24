using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using TrapWars.Networking;
using TrapWars.Objectives;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.State;
using TrapWars.Time;
using TrapWars.UI;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace TrapWars.Phone
{
    public sealed class TrapPhoneController : MonoBehaviour
    {
        private RectTransform root = null!;
        private RectTransform phoneBody = null!;
        private CanvasGroup canvasGroup = null!;
        private Text title = null!;
        private Text body = null!;
        private Text notification = null!;
        private Button endDayButton = null!;
        private readonly Dictionary<string, Button> tabButtons = new();
        private IPlayerInputSource input = null!;
        private ThirdPersonMotor motor = null!;
        private CharacterAnimationDriver animationDriver = null!;
        private ThirdPersonCameraRig cameraRig = null!;
        private GameStateStore state = null!;
        private IGameRunService runs = null!;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;
        private ObjectiveDirector objectives = null!;
        private DayNightPresenter dayNight = null!;
        private EducationRevealPresenter education = null!;
        private GreyboxHud hud = null!;
        private string currentTab = "Home";
        private bool commandPending;
        private float openedAt;
        private bool animating;

        public bool IsOpen => root != null && root.gameObject.activeSelf;

        public void Configure(IPlayerInputSource inputSource, ThirdPersonMotor playerMotor, GameStateStore stateStore, IGameRunService runService, IAnalyticsService analyticsService, IAudioService audio, ObjectiveDirector objectiveDirector, DayNightPresenter dayPresenter, EducationRevealPresenter educationPresenter, GreyboxHud greyboxHud)
        {
            input = inputSource;
            motor = playerMotor;
            animationDriver = motor.GetComponent<CharacterAnimationDriver>();
            cameraRig = FindFirstObjectByType<ThirdPersonCameraRig>();
            state = stateStore;
            runs = runService;
            analytics = analyticsService;
            audioService = audio;
            objectives = objectiveDirector;
            dayNight = dayPresenter;
            education = educationPresenter;
            hud = greyboxHud;
            Build();
            state.Changed += _ => Refresh();
        }

        private void Build()
        {
            var canvas = UiFactory.Canvas("TrapPhone", transform, 30);
            root = UiFactory.PanelRect("PhoneWorldVeil", canvas.transform, new Color(0f, 0f, 0f, 0.06f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            canvasGroup = root.gameObject.AddComponent<CanvasGroup>();
            var shell = UiFactory.PanelRect("PhoneShell", root, new Color(0.01f, 0.012f, 0.013f, 0.995f), new Vector2(0.735f, 0.075f), new Vector2(0.965f, 0.94f), Vector2.zero, Vector2.zero);
            var shellImage = shell.GetComponent<Image>(); shellImage.sprite = RoundedPhoneSprite(); shellImage.type = Image.Type.Sliced;
            phoneBody = UiFactory.PanelRect("PhoneBody", shell, new Color(0.035f, 0.04f, 0.042f, 0.995f), new Vector2(0.035f, 0.025f), new Vector2(0.965f, 0.975f), Vector2.zero, Vector2.zero);
            var bodyImage = phoneBody.GetComponent<Image>(); bodyImage.sprite = RoundedPhoneSprite(); bodyImage.type = Image.Type.Sliced;
            var rail = UiFactory.PanelRect("IdentityRail", phoneBody, UiFactory.Green, new Vector2(0f, 0f), new Vector2(0.012f, 1f), Vector2.zero, Vector2.zero);
            rail.GetComponent<Image>().raycastTarget = false;
            var speaker = UiFactory.PanelRect("Speaker", phoneBody, new Color(0.16f, 0.18f, 0.18f), new Vector2(0.39f, 0.955f), new Vector2(0.61f, 0.965f), Vector2.zero, Vector2.zero);
            speaker.GetComponent<Image>().raycastTarget = false;
            var brand = UiFactory.Text("Brand", phoneBody, "TRAP PHONE", 17, TextAnchor.MiddleCenter, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(brand.rectTransform, new Vector2(0.07f, 0.90f), new Vector2(0.93f, 0.955f), Vector2.zero, Vector2.zero);
            var notificationPanel = UiFactory.PanelRect("NotificationBadge", phoneBody, UiFactory.Gold, new Vector2(0.75f, 0.915f), new Vector2(0.92f, 0.965f), Vector2.zero, Vector2.zero);
            notification = UiFactory.Text("Notification", notificationPanel, "1 NEW", 16, TextAnchor.MiddleCenter, UiFactory.Ink, FontStyle.Bold);
            title = UiFactory.Text("Title", phoneBody, "HOME", 34, TextAnchor.MiddleLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(title.rectTransform, new Vector2(0.07f, 0.79f), new Vector2(0.93f, 0.9f), Vector2.zero, Vector2.zero);
            body = UiFactory.Text("Body", phoneBody, string.Empty, 19, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(body.rectTransform, new Vector2(0.07f, 0.25f), new Vector2(0.93f, 0.78f), Vector2.zero, Vector2.zero);

            var tabLabels = new[] { "HOME", "WORD", "STASH", "CONTACTS" };
            for (var index = 0; index < tabLabels.Length; index++)
            {
                var tab = tabLabels[index];
                var button = UiFactory.Button($"Tab{tab}", phoneBody, tab, index == 0 ? UiFactory.Green : UiFactory.Panel, () => SelectTab(tab));
                UiFactory.SetRect(button.GetComponent<RectTransform>(), new Vector2(0.045f + index * 0.235f, 0.14f), new Vector2(0.235f + index * 0.235f, 0.205f), Vector2.zero, Vector2.zero);
                tabButtons[tab] = button;
            }
            endDayButton = UiFactory.Button("EndDay", phoneBody, "END DAY", UiFactory.Green, EndDay);
            UiFactory.SetRect(endDayButton.GetComponent<RectTransform>(), new Vector2(0.58f, 0.035f), new Vector2(0.93f, 0.105f), Vector2.zero, Vector2.zero);
            var close = UiFactory.Button("Close", phoneBody, "PUT AWAY", UiFactory.Panel, Close);
            UiFactory.SetRect(close.GetComponent<RectTransform>(), new Vector2(0.07f, 0.035f), new Vector2(0.37f, 0.105f), Vector2.zero, Vector2.zero);
            root.gameObject.SetActive(false);
        }

        private void Update()
        {
            if (input == null || commandPending || animating) return;
            if (!IsOpen && !motor.InputEnabled) return;
            if (input.PhonePressed) { if (IsOpen) Close(); else Open(); }
            else if (IsOpen && input.BackPressed) Close();
            else if (IsOpen) HandleKeyboardShortcuts();
        }

        private void HandleKeyboardShortcuts()
        {
            var keyboard = Keyboard.current;
            if (keyboard == null) return;
            if (keyboard.digit1Key.wasPressedThisFrame || keyboard.numpad1Key.wasPressedThisFrame) SelectTab("HOME");
            else if (keyboard.digit2Key.wasPressedThisFrame || keyboard.numpad2Key.wasPressedThisFrame || keyboard.wKey.wasPressedThisFrame) SelectTab("WORD");
            else if (keyboard.digit3Key.wasPressedThisFrame || keyboard.numpad3Key.wasPressedThisFrame || keyboard.sKey.wasPressedThisFrame) SelectTab("STASH");
            else if (keyboard.digit4Key.wasPressedThisFrame || keyboard.numpad4Key.wasPressedThisFrame || keyboard.cKey.wasPressedThisFrame) SelectTab("CONTACTS");
            else if ((keyboard.enterKey.wasPressedThisFrame || keyboard.numpadEnterKey.wasPressedThisFrame) && endDayButton.interactable) EndDay();
        }

        public void Open()
        {
            if (root == null) return;
            StopAllCoroutines();
            root.gameObject.SetActive(true);
            motor.InputEnabled = false;
            animationDriver.SetPhoneOpen(true);
            cameraRig?.SetContext(CameraContext.Phone);
            audioService.PlayPhone();
            openedAt = UnityEngine.Time.unscaledTime;
            analytics.Track("phone.opened", new Dictionary<string, object> { ["surface"] = currentTab.ToLowerInvariant() });
            if (objectives.Current == GreyboxObjective.SeeMarketOutcome || objectives.Current == GreyboxObjective.DayTwoHook)
                analytics.Track("player.returned_to_phone", new Dictionary<string, object> { ["objective_id"] = objectives.Current.ToString() });
            Refresh();
            StartCoroutine(AnimatePhone(true));
        }

        public void Close()
        {
            if (!IsOpen) return;
            analytics.Track("phone.session_duration", new Dictionary<string, object> { ["duration_ms"] = Mathf.RoundToInt((UnityEngine.Time.unscaledTime - openedAt) * 1000f), ["last_surface"] = currentTab.ToLowerInvariant() });
            StopAllCoroutines();
            animating = false;
            StartCoroutine(AnimatePhone(false));
        }

        private void SelectTab(string tab)
        {
            currentTab = tab == "WORD" ? "Word" : char.ToUpperInvariant(tab[0]) + tab.Substring(1).ToLowerInvariant();
            audioService.PlayUi();
            if (currentTab == "Word")
            {
                analytics.Track("rumor.viewed", new Dictionary<string, object> { ["rumor_id"] = "m7_market_hub_chatter" });
                notification.gameObject.SetActive(false);
                if (objectives.Current == GreyboxObjective.CheckWordOnTheStreet) objectives.AdvanceFrom(GreyboxObjective.CheckWordOnTheStreet);
                else if (objectives.Current == GreyboxObjective.SeeMarketOutcome) objectives.AdvanceFrom(GreyboxObjective.SeeMarketOutcome);
                else if (objectives.Current == GreyboxObjective.DayTwoHook) objectives.AdvanceFrom(GreyboxObjective.DayTwoHook);
            }
            Refresh();
        }

        private void Refresh()
        {
            if (root == null || state.Current == null) return;
            var run = state.Current;
            if (objectives.Current == GreyboxObjective.Complete)
            {
                title.text = "DAY 1 COMPLETE";
                body.text = "YOU JUST EXPERIENCED\n\nMarket information\nRisk and reward\nLiquidity\nPrice movement\nCapital allocation\n\nTRAP WARS IS JUST GETTING STARTED.";
                notification.gameObject.SetActive(false);
                foreach (var pair in tabButtons) pair.Value.gameObject.SetActive(false);
                endDayButton.gameObject.SetActive(false);
                return;
            }

            foreach (var pair in tabButtons) pair.Value.gameObject.SetActive(true);
            endDayButton.gameObject.SetActive(true);
            title.text = currentTab.ToUpperInvariant();
            foreach (var pair in tabButtons)
                pair.Value.image.color = string.Equals(pair.Key, currentTab, System.StringComparison.OrdinalIgnoreCase) ? UiFactory.Green : UiFactory.Panel;
            body.text = currentTab switch
            {
                "Home" => run.Day > 1
                    ? $"DAY {run.Day}\n\nCash   ${run.Cash:N0}\nActions   {run.ActionsRemaining}\n\nNEW: Ray sent a location pin. The next opportunity is already moving."
                    : $"CASH BALANCE\n${run.Cash:N2}\n\nWORD ON THE STREET\nNeighborhood intel\n\nMARKET\nBuy / Sell opportunities\n\nINVENTORY\nAssets you own\n\nMESSAGES\nNew messages\n\nCONTACTS\nPeople in your network",
                "Word" => WordCopy(run),
                "Stash" => StashCopy(run),
                "Contacts" => ContactsCopy(run),
                _ => string.Empty
            };
            var canEndDay = run.IsLegal("EndDay")
                && objectives.Current == GreyboxObjective.EndTheDay
                && !commandPending;
            endDayButton.interactable = canEndDay;
            endDayButton.image.color = canEndDay ? UiFactory.Green : UiFactory.Panel;
        }

        private IEnumerator AnimatePhone(bool opening)
        {
            animating = true;
            var duration = opening ? 0.2f : 0.14f;
            var startPosition = opening ? new Vector3(130f, -16f, 0f) : Vector3.zero;
            var endPosition = opening ? Vector3.zero : new Vector3(130f, -16f, 0f);
            var startAlpha = opening ? 0f : 1f;
            var endAlpha = opening ? 1f : 0f;
            for (var elapsed = 0f; elapsed < duration; elapsed += UnityEngine.Time.unscaledDeltaTime)
            {
                var t = Mathf.SmoothStep(0f, 1f, elapsed / duration);
                phoneBody.anchoredPosition3D = Vector3.Lerp(startPosition, endPosition, t);
                phoneBody.localScale = Vector3.one * Mathf.Lerp(opening ? 0.97f : 1f, opening ? 1f : 0.97f, t);
                canvasGroup.alpha = Mathf.Lerp(startAlpha, endAlpha, t);
                yield return null;
            }
            phoneBody.anchoredPosition3D = endPosition;
            canvasGroup.alpha = endAlpha;
            if (!opening)
            {
                audioService.PlayCue(GameFeelAudioCue.PhoneClose);
                root.gameObject.SetActive(false);
                motor.InputEnabled = true;
                animationDriver.SetPhoneOpen(false);
                cameraRig?.SetContext(CameraContext.Exploration);
            }
            animating = false;
        }

        private static string WordCopy(RunPresentationModel run)
        {
            var known = run.Forecasts.Count > 0
                ? string.Join("\n", run.Forecasts.Select(item => $"{item.AssetId.ToUpperInvariant()}  {item.Direction.ToUpperInvariant()} / {item.MagnitudeBand.ToUpperInvariant()}  through Day {item.ExpiresDay}"))
                : "Ray says the market hub has been moving inventory fast. No promises. Check the board and keep an exit open.";
            return $"WORD ON THE STREET\n\n{known}\n\nKnown info only. The move is still yours.";
        }

        private static string StashCopy(RunPresentationModel run)
        {
            var carried = string.Join("\n", run.Inventory.Where(pair => pair.Value > 0).Select(pair => $"{pair.Key.ToUpperInvariant()}   {pair.Value} carried"));
            if (string.IsNullOrWhiteSpace(carried)) carried = "Nothing carried.";
            return $"CURRENT LOAD\n\n{carried}\n\nUse the safehouse stash point to deposit or withdraw.";
        }

        private static string ContactsCopy(RunPresentationModel run)
        {
            var contacts = run.Clients.Count == 0 ? "RAY   Street contact" : string.Join("\n", run.Clients.Select(pair => $"{pair.Key.ToUpperInvariant()}   {(pair.Value.Completed ? "Complete" : pair.Value.Accepted ? "Active" : "Available")}"));
            return $"CONTACTS\n\n{contacts}";
        }

        private static Sprite RoundedPhoneSprite()
        {
            const int size = 64;
            const float radius = 14f;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            var pixels = new Color32[size * size];
            for (var y = 0; y < size; y++)
            for (var x = 0; x < size; x++)
            {
                var cx = Mathf.Clamp(x, radius, size - radius - 1f);
                var cy = Mathf.Clamp(y, radius, size - radius - 1f);
                var inside = (new Vector2(x - cx, y - cy)).sqrMagnitude <= radius * radius;
                pixels[y * size + x] = inside ? new Color32(255, 255, 255, 255) : new Color32(255, 255, 255, 0);
            }
            texture.SetPixels32(pixels); texture.Apply(false, true);
            return Sprite.Create(texture, new Rect(0f, 0f, size, size), Vector2.one * 0.5f, 100f, 0, SpriteMeshType.FullRect, Vector4.one * radius);
        }

        private async void EndDay()
        {
            if (commandPending
                || state.Current == null
                || !state.Current.IsLegal("EndDay")
                || objectives.Current != GreyboxObjective.EndTheDay) return;
            commandPending = true;
            Refresh();
            var before = state.Current.Prices.TryGetValue("weed", out var value) ? value : 0;
            var result = await runs.SubmitAsync(CommandFactory.EndDay(state.Current.StateVersion), CancellationToken.None);
            commandPending = false;
            if (!result.IsSuccess)
            {
                hud.Toast(result.Error?.Message ?? "The day could not advance.", UiFactory.Red);
                Refresh();
                return;
            }
            analytics.Track("day.completed", new Dictionary<string, object> { ["completed_day"] = result.Value!.Run.Day - 1 });
            var after = state.Current!.Prices.TryGetValue("weed", out var next) ? next : before;
            currentTab = "Home";
            notification.gameObject.SetActive(true);
            Close();
            dayNight.PresentNightTransition(state.Current.Day);
            void RevealAfterTransition()
            {
                dayNight.TransitionCompleted -= RevealAfterTransition;
                education.Show(before, after);
                hud.Toast("New word just came in. Day 2 is live.", UiFactory.Gold);
            }
            dayNight.TransitionCompleted += RevealAfterTransition;
            if (objectives.Current == GreyboxObjective.EndTheDay) objectives.AdvanceFrom(GreyboxObjective.EndTheDay);
        }
    }
}
