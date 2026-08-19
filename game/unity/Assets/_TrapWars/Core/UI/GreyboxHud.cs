using System.Collections;
using TrapWars.Interaction;
using TrapWars.Objectives;
using TrapWars.Services;
using TrapWars.State;
using UnityEngine;
using UnityEngine.UI;

namespace TrapWars.UI
{
    public sealed class GreyboxHud : MonoBehaviour, IInteractionPrompt
    {
        private Text cash = null!;
        private Text day = null!;
        private Text actions = null!;
        private Text objective = null!;
        private Text objectiveHint = null!;
        private Text cashDelta = null!;
        private Text prompt = null!;
        private RectTransform promptPanel = null!;
        private Text toast = null!;
        private RectTransform toastPanel = null!;
        private RectTransform loadingPanel = null!;
        private Text loadingText = null!;
        private GameStateStore state = null!;
        private long lastCash;
        private bool hasState;

        public void Configure(GameStateStore stateStore, ObjectiveDirector objectives, NetworkStatus network)
        {
            state = stateStore;
            Build();
            state.Changed += OnStateChanged;
            objectives.Changed += value => SetObjective(value, objectives.CurrentText);
            SetObjective(objectives.Current, objectives.CurrentText);
            network.Changed += () => SetLoading(network.CommandInProgress, network.Message);
        }

        private void Build()
        {
            var canvas = UiFactory.Canvas("HUD", transform, 10);
            var top = UiFactory.PanelRect("Status", canvas.transform, new Color(0.025f, 0.03f, 0.032f, 0.92f), new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -62f), Vector2.zero);
            cash = Slice(top, "CASH  --", 0.02f, 0.24f, UiFactory.Green);
            day = Slice(top, "DAY  --", 0.39f, 0.56f, UiFactory.Paper);
            actions = Slice(top, "ACTIONS  --", 0.71f, 0.95f, UiFactory.Gold);
            cashDelta = UiFactory.Text("CashDelta", canvas.transform, string.Empty, 19, TextAnchor.MiddleLeft, UiFactory.Green, FontStyle.Bold);
            UiFactory.SetRect(cashDelta.rectTransform, new Vector2(0.02f, 1f), new Vector2(0.24f, 1f), new Vector2(0f, -100f), new Vector2(0f, -66f));
            cashDelta.gameObject.SetActive(false);
            var objectivePlate = UiFactory.PanelRect("ObjectivePlate", canvas.transform, new Color(0.015f, 0.017f, 0.016f, 0.88f), new Vector2(0f, 1f), new Vector2(0.46f, 1f), new Vector2(24f, -154f), new Vector2(-8f, -80f));
            var objectiveRail = UiFactory.PanelRect("ObjectiveRail", objectivePlate, UiFactory.Gold, new Vector2(0f, 0f), new Vector2(0.012f, 1f), Vector2.zero, Vector2.zero);
            objectiveRail.GetComponent<Image>().raycastTarget = false;
            objective = UiFactory.Text("Objective", objectivePlate, string.Empty, 21, TextAnchor.MiddleLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(objective.rectTransform, new Vector2(0f, 0.48f), Vector2.one, new Vector2(22f, 0f), new Vector2(-10f, 0f));
            objectiveHint = UiFactory.Text("ObjectiveHint", objectivePlate, string.Empty, 16, TextAnchor.MiddleLeft, new Color(0.78f, 0.79f, 0.75f));
            UiFactory.SetRect(objectiveHint.rectTransform, Vector2.zero, new Vector2(1f, 0.52f), new Vector2(22f, 0f), new Vector2(-10f, 0f));
            promptPanel = UiFactory.PanelRect("PromptPlate", canvas.transform, new Color(0.015f, 0.017f, 0.016f, 0.9f), new Vector2(0.73f, 0f), new Vector2(0.97f, 0f), new Vector2(0f, 36f), new Vector2(0f, 88f));
            prompt = UiFactory.Text("InteractionPrompt", promptPanel, string.Empty, 20, TextAnchor.MiddleCenter, UiFactory.Paper, FontStyle.Bold);
            promptPanel.gameObject.SetActive(false);

            var location = UiFactory.PanelRect("LocationPlate", canvas.transform, new Color(0.015f, 0.017f, 0.016f, 0.82f), new Vector2(0.025f, 0.025f), new Vector2(0.23f, 0.115f), Vector2.zero, Vector2.zero);
            var locationText = UiFactory.Text("Location", location, "THE TRAP\nYOUR SAFEHOUSE", 17, TextAnchor.MiddleLeft, UiFactory.Green, FontStyle.Bold);
            UiFactory.SetRect(locationText.rectTransform, Vector2.zero, Vector2.one, new Vector2(18f, 4f), new Vector2(-8f, -4f));

            toastPanel = UiFactory.PanelRect("Toast", canvas.transform, UiFactory.Ink, new Vector2(0.62f, 0.82f), new Vector2(0.97f, 0.94f), Vector2.zero, Vector2.zero);
            toast = UiFactory.Text("ToastText", toastPanel, string.Empty, 22, TextAnchor.MiddleLeft, UiFactory.Paper);
            UiFactory.SetRect(toast.rectTransform, Vector2.zero, Vector2.one, new Vector2(24f, 10f), new Vector2(-24f, -10f));
            toastPanel.gameObject.SetActive(false);

            loadingPanel = UiFactory.PanelRect("NetworkStatus", canvas.transform, new Color(0f, 0f, 0f, 0.62f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            loadingText = UiFactory.Text("NetworkText", loadingPanel, "CONNECTING...", 28, TextAnchor.MiddleCenter, UiFactory.Paper, FontStyle.Bold);
            loadingPanel.gameObject.SetActive(false);
        }

        private static Text Slice(RectTransform parent, string value, float min, float max, Color color)
        {
            var text = UiFactory.Text(value, parent, value, 25, TextAnchor.MiddleCenter, color, FontStyle.Bold);
            UiFactory.SetRect(text.rectTransform, new Vector2(min, 0f), new Vector2(max, 1f), Vector2.zero, Vector2.zero);
            return text;
        }

        private void OnStateChanged(RunPresentationModel run)
        {
            if (hasState && run.Cash != lastCash)
            {
                StopCoroutine(nameof(ShowCashDelta));
                StartCoroutine(ShowCashDelta(run.Cash - lastCash));
            }
            cash.text = $"CASH  ${run.Cash:N0}";
            day.text = $"DAY  {run.Day}";
            actions.text = $"ACTIONS  {run.ActionsRemaining}";
            lastCash = run.Cash;
            hasState = true;
        }

        private void SetObjective(GreyboxObjective current, string value)
        {
            objective.text = value.ToUpperInvariant();
            objectiveHint.text = current switch
            {
                GreyboxObjective.CheckWordOnTheStreet => "See what's moving in your neighborhood.  Press TAB to open your phone.",
                GreyboxObjective.LeaveSafehouse => "Step outside and read the block.",
                GreyboxObjective.InvestigateBlock => "Look for what changed before you trust the rumor.",
                GreyboxObjective.MeetContact => "Find Ray and hear the play.",
                GreyboxObjective.ReviewOpportunity => "Compare the word, the quote, and your cash.",
                GreyboxObjective.MakeYourMove => "Choose whether the risk is worth one action.",
                GreyboxObjective.SeeMarketOutcome => "Check your phone for what changed.",
                GreyboxObjective.EndTheDay => "End Day from the Trap Phone when you're ready.",
                GreyboxObjective.DayTwoHook => "A new message is waiting on your phone.",
                _ => "Day 2 is waiting."
            };
            objective.transform.localScale = new Vector3(1.04f, 1.04f, 1f);
            StartCoroutine(nameof(SettleObjective));
        }

        private IEnumerator SettleObjective()
        {
            for (var elapsed = 0f; elapsed < 0.16f; elapsed += UnityEngine.Time.unscaledDeltaTime)
            {
                objective.transform.localScale = Vector3.Lerp(new Vector3(1.04f, 1.04f, 1f), Vector3.one, elapsed / 0.16f);
                yield return null;
            }
            objective.transform.localScale = Vector3.one;
        }

        private IEnumerator ShowCashDelta(long delta)
        {
            cashDelta.text = $"{(delta > 0 ? "+" : "")}${delta:N0}";
            cashDelta.color = delta >= 0 ? UiFactory.Green : UiFactory.Red;
            cashDelta.gameObject.SetActive(true);
            yield return new WaitForSecondsRealtime(2f);
            cashDelta.gameObject.SetActive(false);
        }

        public void Show(string value)
        {
            prompt.text = $"E   {value}";
            promptPanel.gameObject.SetActive(true);
        }

        public void Hide() => promptPanel.gameObject.SetActive(false);

        public void Toast(string message, Color? accent = null)
        {
            StopCoroutine(nameof(HideToast));
            toast.text = message;
            toast.color = accent ?? UiFactory.Paper;
            toastPanel.gameObject.SetActive(true);
            StartCoroutine(nameof(HideToast));
        }

        private IEnumerator HideToast()
        {
            yield return new WaitForSecondsRealtime(3.2f);
            toastPanel.gameObject.SetActive(false);
        }

        public void SetLoading(bool visible, string message = "")
        {
            loadingText.text = string.IsNullOrWhiteSpace(message) ? "CONNECTING..." : message.ToUpperInvariant();
            loadingPanel.gameObject.SetActive(visible);
        }
    }
}
