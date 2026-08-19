using TrapWars.Services;
using UnityEngine;
using UnityEngine.UI;

namespace TrapWars.UI
{
    public sealed class EducationRevealPresenter : MonoBehaviour
    {
        private RectTransform root = null!;
        private RectTransform deeperPanel = null!;
        private Text street = null!;
        private Text happened = null!;
        private Text deeper = null!;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;

        public void Build(IAnalyticsService analyticsService, IAudioService audio)
        {
            analytics = analyticsService;
            audioService = audio;
            var canvas = UiFactory.Canvas("EducationReveal", transform, 60);
            root = UiFactory.PanelRect("InsightVeil", canvas.transform, new Color(0f, 0f, 0f, 0.24f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var card = UiFactory.PanelRect("InsightCard", root, new Color(0.035f, 0.04f, 0.042f, 0.98f), new Vector2(0.08f, 0.16f), new Vector2(0.67f, 0.84f), Vector2.zero, Vector2.zero);
            var rail = UiFactory.PanelRect("InsightRail", card, UiFactory.Gold, new Vector2(0f, 0f), new Vector2(0.012f, 1f), Vector2.zero, Vector2.zero);
            rail.GetComponent<Image>().raycastTarget = false;
            var eyebrow = UiFactory.Text("Eyebrow", card, "WHAT JUST HAPPENED", 19, TextAnchor.MiddleLeft, UiFactory.Gold, FontStyle.Bold);
            UiFactory.SetRect(eyebrow.rectTransform, new Vector2(0.07f, 0.86f), new Vector2(0.93f, 0.95f), Vector2.zero, Vector2.zero);
            street = UiFactory.Text("Street", card, string.Empty, 31, TextAnchor.UpperLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(street.rectTransform, new Vector2(0.07f, 0.65f), new Vector2(0.93f, 0.85f), Vector2.zero, Vector2.zero);
            var termLabel = UiFactory.Text("TermLabel", card, "THE REAL TERM", 17, TextAnchor.MiddleLeft, UiFactory.Green, FontStyle.Bold);
            UiFactory.SetRect(termLabel.rectTransform, new Vector2(0.07f, 0.55f), new Vector2(0.42f, 0.63f), Vector2.zero, Vector2.zero);
            var term = UiFactory.Text("Term", card, "LIQUIDITY", 42, TextAnchor.MiddleLeft, UiFactory.Green, FontStyle.Bold);
            UiFactory.SetRect(term.rectTransform, new Vector2(0.07f, 0.43f), new Vector2(0.7f, 0.56f), Vector2.zero, Vector2.zero);
            happened = UiFactory.Text("Happened", card, string.Empty, 23, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(happened.rectTransform, new Vector2(0.07f, 0.23f), new Vector2(0.93f, 0.43f), Vector2.zero, Vector2.zero);
            var dig = UiFactory.Button("DigDeeper", card, "DIG DEEPER", UiFactory.Panel, ToggleDeeper);
            UiFactory.SetRect(dig.GetComponent<RectTransform>(), new Vector2(0.07f, 0.08f), new Vector2(0.34f, 0.18f), Vector2.zero, Vector2.zero);
            var close = UiFactory.Button("Close", card, "BACK TO THE BLOCK", UiFactory.Green, Hide);
            UiFactory.SetRect(close.GetComponent<RectTransform>(), new Vector2(0.57f, 0.08f), new Vector2(0.93f, 0.18f), Vector2.zero, Vector2.zero);

            deeperPanel = UiFactory.PanelRect("DeeperPanel", root, new Color(0.04f, 0.05f, 0.05f, 0.98f), new Vector2(0.69f, 0.32f), new Vector2(0.95f, 0.68f), Vector2.zero, Vector2.zero);
            deeper = UiFactory.Text("DeeperText", deeperPanel, string.Empty, 20, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(deeper.rectTransform, Vector2.zero, Vector2.one, new Vector2(24f, 24f), new Vector2(-24f, -24f));
            deeperPanel.gameObject.SetActive(false);
            root.gameObject.SetActive(false);
        }

        public void Show(long beforePrice, long afterPrice)
        {
            var movedUp = afterPrice >= beforePrice;
            street.text = movedUp ? "More buyers showed up after your move." : "The exit got thinner while you were exposed.";
            happened.text = $"The visible quote moved from ${beforePrice:N0} to ${afterPrice:N0}. Liquidity is how easily you can enter or exit without forcing a worse price.";
            deeper.text = "YOUR ROOM TO MOVE\n\nCash gives you options. Inventory creates exposure. A crowded exit can change the price before everyone gets through.\n\nYou did not get robbed by a random number. You accepted a position while the available market changed.";
            deeperPanel.gameObject.SetActive(false);
            root.gameObject.SetActive(true);
            audioService.PlayCue(GameFeelAudioCue.Consequence);
            analytics.Track("education.reveal_shown", new System.Collections.Generic.Dictionary<string, object> { ["concept_id"] = "liquidity" });
        }

        private void ToggleDeeper()
        {
            deeperPanel.gameObject.SetActive(!deeperPanel.gameObject.activeSelf);
            analytics.Track("education.deeper_toggled", new System.Collections.Generic.Dictionary<string, object> { ["concept_id"] = "liquidity", ["visible"] = deeperPanel.gameObject.activeSelf });
        }

        public void Hide() => root.gameObject.SetActive(false);
    }
}
