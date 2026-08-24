using System.Collections;
using System.Collections.Generic;
using System.Threading;
using TrapWars.Networking;
using TrapWars.Objectives;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.State;
using TrapWars.UI;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace TrapWars.Market
{
    public sealed class MarketController : MonoBehaviour
    {
        private RectTransform root = null!;
        private RectTransform panel = null!;
        private RectTransform feedbackPanel = null!;
        private Text detail = null!;
        private Text feedback = null!;
        private Button review = null!;
        private Button buy = null!;
        private Button sell = null!;
        private ThirdPersonMotor motor = null!;
        private CharacterAnimationDriver animationDriver = null!;
        private ThirdPersonCameraRig cameraRig = null!;
        private GameStateStore state = null!;
        private IGameRunService runs = null!;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;
        private ObjectiveDirector objectives = null!;
        private GreyboxHud hud = null!;
        private readonly string selectedAsset = "weed";
        private bool pending;
        private float openedAt;

        public bool IsOpen => root != null && root.gameObject.activeSelf;

        public void Configure(ThirdPersonMotor playerMotor, GameStateStore stateStore, IGameRunService runService, IAnalyticsService analyticsService, IAudioService audio, ObjectiveDirector objectiveDirector, GreyboxHud greyboxHud)
        {
            motor = playerMotor;
            animationDriver = motor.GetComponent<CharacterAnimationDriver>();
            cameraRig = FindFirstObjectByType<ThirdPersonCameraRig>();
            state = stateStore;
            runs = runService;
            analytics = analyticsService;
            audioService = audio;
            objectives = objectiveDirector;
            hud = greyboxHud;
            Build();
            state.Changed += _ => Refresh();
        }

        private void Build()
        {
            var canvas = UiFactory.Canvas("Market", transform, 35);
            root = UiFactory.PanelRect("MarketContext", canvas.transform, new Color(0f, 0f, 0f, 0.2f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            panel = UiFactory.PanelRect("MarketDecision", root, new Color(0.045f, 0.05f, 0.052f, 0.97f), new Vector2(0.54f, 0.1f), new Vector2(0.96f, 0.9f), Vector2.zero, Vector2.zero);
            var marker = UiFactory.Text("Marker", panel, "THE HUB  /  LIVE QUOTE", 18, TextAnchor.MiddleLeft, UiFactory.Green, FontStyle.Bold);
            UiFactory.SetRect(marker.rectTransform, new Vector2(0.07f, 0.9f), new Vector2(0.93f, 0.97f), Vector2.zero, Vector2.zero);
            var heading = UiFactory.Text("Heading", panel, "READ THE PLAY", 38, TextAnchor.MiddleLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(heading.rectTransform, new Vector2(0.07f, 0.78f), new Vector2(0.93f, 0.9f), Vector2.zero, Vector2.zero);
            var context = UiFactory.Text("Context", panel, "WORD: demand is moving fast.\nRAY: keep enough cash for an exit.", 20, TextAnchor.UpperLeft, UiFactory.Gold);
            UiFactory.SetRect(context.rectTransform, new Vector2(0.07f, 0.63f), new Vector2(0.93f, 0.77f), Vector2.zero, Vector2.zero);
            detail = UiFactory.Text("Detail", panel, string.Empty, 25, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(detail.rectTransform, new Vector2(0.07f, 0.36f), new Vector2(0.93f, 0.62f), Vector2.zero, Vector2.zero);
            review = UiFactory.Button("Review", panel, "REVIEW THE PLAY", UiFactory.Gold, ReviewOpportunity);
            UiFactory.SetRect(review.GetComponent<RectTransform>(), new Vector2(0.07f, 0.25f), new Vector2(0.93f, 0.34f), Vector2.zero, Vector2.zero);
            buy = UiFactory.Button("Buy", panel, "BUY 1", UiFactory.Green, () => Trade(true));
            UiFactory.SetRect(buy.GetComponent<RectTransform>(), new Vector2(0.07f, 0.14f), new Vector2(0.46f, 0.23f), Vector2.zero, Vector2.zero);
            sell = UiFactory.Button("Sell", panel, "SELL 1", UiFactory.Gold, () => Trade(false));
            UiFactory.SetRect(sell.GetComponent<RectTransform>(), new Vector2(0.54f, 0.14f), new Vector2(0.93f, 0.23f), Vector2.zero, Vector2.zero);
            var close = UiFactory.Button("Close", panel, "BACK TO THE BLOCK", UiFactory.Panel, Close);
            UiFactory.SetRect(close.GetComponent<RectTransform>(), new Vector2(0.54f, 0.035f), new Vector2(0.93f, 0.105f), Vector2.zero, Vector2.zero);

            feedbackPanel = UiFactory.PanelRect("TradeFeedback", root, new Color(0.04f, 0.24f, 0.16f, 0.96f), new Vector2(0.08f, 0.67f), new Vector2(0.48f, 0.84f), Vector2.zero, Vector2.zero);
            feedback = UiFactory.Text("TradeFeedbackText", feedbackPanel, string.Empty, 25, TextAnchor.MiddleLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(feedback.rectTransform, Vector2.zero, Vector2.one, new Vector2(24f, 12f), new Vector2(-24f, -12f));
            feedbackPanel.gameObject.SetActive(false);
            root.gameObject.SetActive(false);
        }

        public void Open()
        {
            root.gameObject.SetActive(true);
            motor.InputEnabled = false;
            animationDriver.PulseInteract();
            cameraRig?.SetContext(CameraContext.Market);
            openedAt = UnityEngine.Time.unscaledTime;
            analytics.Track("market.viewed", new Dictionary<string, object> { ["market_id"] = "market_hub_01" });
            Refresh();
        }

        public void Close()
        {
            if (pending) return;
            root.gameObject.SetActive(false);
            feedbackPanel.gameObject.SetActive(false);
            motor.InputEnabled = true;
            cameraRig?.SetContext(CameraContext.Exploration);
        }

        private void Update()
        {
            if (!IsOpen) return;
            var keyboard = Keyboard.current;
            if (keyboard == null) return;
            if (keyboard.escapeKey.wasPressedThisFrame)
            {
                Close();
                return;
            }
            if ((keyboard.enterKey.wasPressedThisFrame || keyboard.numpadEnterKey.wasPressedThisFrame || keyboard.spaceKey.wasPressedThisFrame) && review.gameObject.activeSelf)
            {
                ReviewOpportunity();
                return;
            }
            if (keyboard.bKey.wasPressedThisFrame && buy.interactable)
                Trade(true);
        }

        private void ReviewOpportunity()
        {
            if (objectives.Current != GreyboxObjective.ReviewOpportunity) return;
            audioService.PlayUi();
            analytics.Track("market.opportunity_reviewed", new Dictionary<string, object> { ["asset_id"] = selectedAsset });
            objectives.AdvanceFrom(GreyboxObjective.ReviewOpportunity);
            Refresh();
        }

        private void Refresh()
        {
            if (state.Current == null || root == null) return;
            var run = state.Current;
            var price = run.Prices.TryGetValue(selectedAsset, out var value) ? value : 0;
            detail.text = $"WEED\n\nQUOTE   ${price:N0}\nOWNED   {run.Owned(selectedAsset)}\nCASH   ${run.Cash:N0}\nACTION COST   1\n\nRISK: the move is active; the exit may narrow.";
            var needsReview = objectives.Current == GreyboxObjective.ReviewOpportunity;
            review.gameObject.SetActive(needsReview);
            var decisionOpen = objectives.Current >= GreyboxObjective.MakeYourMove && objectives.Current <= GreyboxObjective.SeeMarketOutcome;
            buy.interactable = decisionOpen && !pending && run.IsLegal("BuyAsset", selectedAsset);
            sell.interactable = decisionOpen && !pending && run.IsLegal("SellAsset", selectedAsset);
            buy.image.color = buy.interactable ? UiFactory.Green : UiFactory.Panel;
            sell.image.color = sell.interactable ? UiFactory.Gold : UiFactory.Panel;
        }

        private async void Trade(bool isBuy)
        {
            if (pending || state.Current == null) return;
            var type = isBuy ? "BuyAsset" : "SellAsset";
            if (!state.Current.IsLegal(type, selectedAsset))
            {
                audioService.PlayCue(GameFeelAudioCue.Invalid);
                hud.Toast(isBuy ? "That move is not available." : "Nothing available to sell.", UiFactory.Red);
                return;
            }
            var beforeCash = state.Current.Cash;
            var command = isBuy ? CommandFactory.Buy(state.Current.StateVersion, selectedAsset, 1) : CommandFactory.Sell(state.Current.StateVersion, selectedAsset, 1);
            pending = true;
            Refresh();
            analytics.Track("market.trade_requested", new Dictionary<string, object> { ["asset_id"] = selectedAsset, ["side"] = isBuy ? "buy" : "sell", ["command_id"] = command.CommandId });
            analytics.Track("market.decision_dwell", new Dictionary<string, object> { ["market_id"] = "market_hub_01", ["duration_ms"] = Mathf.RoundToInt((UnityEngine.Time.unscaledTime - openedAt) * 1000f) });
            var result = await runs.SubmitAsync(command, CancellationToken.None);
            pending = false;
            if (!result.IsSuccess)
            {
                hud.Toast(result.Error?.ReasonCode.Length > 0 ? result.Error.ReasonCode.Replace('_', ' ') : result.Error?.Message ?? "Trade rejected.", UiFactory.Red);
                Refresh();
                return;
            }
            audioService.PlayTrade();
            animationDriver.PulseInteract();
            var cashDelta = state.Current!.Cash - beforeCash;
            analytics.Track("market.trade_completed", new Dictionary<string, object> { ["asset_id"] = selectedAsset, ["side"] = isBuy ? "buy" : "sell", ["state_version"] = result.Value!.Run.StateVersion });
            hud.Toast($"{(isBuy ? "Bought" : "Sold")} 1 {selectedAsset}. Cash and inventory updated.", UiFactory.Green);
            feedback.text = DemoPresentationPolicy.TradeFeedback(cashDelta, state.Current.Owned(selectedAsset), state.Current.ActionsRemaining);
            StopCoroutine(nameof(HideFeedback));
            StartCoroutine(nameof(HideFeedback));
            objectives.AdvanceFrom(GreyboxObjective.MakeYourMove);
            Refresh();
        }

        private IEnumerator HideFeedback()
        {
            feedbackPanel.gameObject.SetActive(true);
            var original = feedbackPanel.localScale;
            feedbackPanel.localScale = original * 0.94f;
            for (var elapsed = 0f; elapsed < 0.18f; elapsed += UnityEngine.Time.unscaledDeltaTime)
            {
                feedbackPanel.localScale = Vector3.Lerp(original * 0.94f, original, elapsed / 0.18f);
                yield return null;
            }
            yield return new WaitForSecondsRealtime(2.6f);
            feedbackPanel.gameObject.SetActive(false);
        }
    }
}
