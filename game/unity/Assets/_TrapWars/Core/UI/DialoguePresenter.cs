using System;
using System.Collections;
using System.Collections.Generic;
using TrapWars.Dialogue;
using TrapWars.Services;
using UnityEngine;
using UnityEngine.UI;

namespace TrapWars.UI
{
    public sealed class DialoguePresenter : MonoBehaviour, IDialogueService
    {
        private RectTransform root = null!;
        private Text speaker = null!;
        private Text line = null!;
        private Text progress = null!;
        private Button choice = null!;
        private Text choiceText = null!;
        private DialogueSequence? sequence;
        private Action? completed;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;
        private int index;
        private string fullLine = string.Empty;
        private bool revealing;
        private float canAdvanceAt;

        public bool IsOpen => root != null && root.gameObject.activeSelf;

        public void Build(IAnalyticsService analyticsService, IAudioService audio)
        {
            analytics = analyticsService;
            audioService = audio;
            var canvas = UiFactory.Canvas("Dialogue", transform, 40);
            root = UiFactory.PanelRect("DialogueScene", canvas.transform, new Color(0f, 0f, 0f, 0.12f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var band = UiFactory.PanelRect("DialogueBand", root, new Color(0.035f, 0.04f, 0.042f, 0.97f), new Vector2(0.055f, 0.045f), new Vector2(0.68f, 0.32f), Vector2.zero, Vector2.zero);
            var rail = UiFactory.PanelRect("SpeakerRail", band, UiFactory.Gold, new Vector2(0f, 0f), new Vector2(0.012f, 1f), Vector2.zero, Vector2.zero);
            rail.GetComponent<Image>().raycastTarget = false;
            speaker = UiFactory.Text("Speaker", band, string.Empty, 21, TextAnchor.MiddleLeft, UiFactory.Gold, FontStyle.Bold);
            UiFactory.SetRect(speaker.rectTransform, new Vector2(0.06f, 0.72f), new Vector2(0.7f, 0.96f), Vector2.zero, Vector2.zero);
            progress = UiFactory.Text("Progress", band, string.Empty, 16, TextAnchor.MiddleRight, new Color(0.65f, 0.68f, 0.66f), FontStyle.Bold);
            UiFactory.SetRect(progress.rectTransform, new Vector2(0.72f, 0.74f), new Vector2(0.94f, 0.95f), Vector2.zero, Vector2.zero);
            line = UiFactory.Text("Line", band, string.Empty, 27, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(line.rectTransform, new Vector2(0.06f, 0.21f), new Vector2(0.94f, 0.73f), Vector2.zero, Vector2.zero);
            choice = UiFactory.Button("Continue", band, "LISTEN", UiFactory.Green, () => Advance());
            UiFactory.SetRect(choice.GetComponent<RectTransform>(), new Vector2(0.68f, 0.035f), new Vector2(0.94f, 0.19f), Vector2.zero, Vector2.zero);
            choiceText = choice.GetComponentInChildren<Text>();
            root.gameObject.SetActive(false);
        }

        public void Present(DialogueSequence dialogue, Action? onCompleted = null)
        {
            sequence = dialogue;
            completed = onCompleted;
            index = 0;
            root.gameObject.SetActive(true);
            ShowLine();
        }

        public void Advance(int choiceIndex = -1)
        {
            if (sequence == null) return;
            if (revealing)
            {
                StopCoroutine(nameof(RevealLine));
                line.text = fullLine;
                revealing = false;
                canAdvanceAt = UnityEngine.Time.unscaledTime + 0.18f;
                return;
            }
            if (UnityEngine.Time.unscaledTime < canAdvanceAt) return;
            var current = sequence.Lines[index];
            if (current.Choices.Count > 0)
                analytics.Track("npc.followup_selected", new Dictionary<string, object> { ["dialogue_id"] = sequence.DialogueId, ["line_index"] = index, ["choice_index"] = Mathf.Max(0, choiceIndex) });
            index += 1;
            if (index >= sequence.Lines.Count)
            {
                var callback = completed;
                Close();
                callback?.Invoke();
                return;
            }
            ShowLine();
        }

        public void Close()
        {
            StopAllCoroutines();
            root.gameObject.SetActive(false);
            sequence = null;
            completed = null;
            revealing = false;
        }

        private void ShowLine()
        {
            var current = sequence!.Lines[index];
            speaker.text = current.Speaker.ToUpperInvariant();
            fullLine = current.Text;
            progress.text = $"{index + 1:00} / {sequence.Lines.Count:00}";
            choiceText.text = current.Choices.Count > 0 ? current.Choices[0].ToUpperInvariant() : index == sequence.Lines.Count - 1 ? "DONE" : "CONTINUE";
            analytics.Track("npc.dialogue_line_viewed", new Dictionary<string, object> { ["dialogue_id"] = sequence.DialogueId, ["line_index"] = index, ["speaker"] = current.Speaker });
            audioService.PlayCue(GameFeelAudioCue.Dialogue);
            StopCoroutine(nameof(RevealLine));
            StartCoroutine(nameof(RevealLine));
        }

        private IEnumerator RevealLine()
        {
            revealing = true;
            line.text = string.Empty;
            var charactersPerSecond = 62f;
            for (var count = 1; count <= fullLine.Length; count++)
            {
                line.text = fullLine.Substring(0, count);
                yield return new WaitForSecondsRealtime(1f / charactersPerSecond);
            }
            revealing = false;
            canAdvanceAt = UnityEngine.Time.unscaledTime + Mathf.Clamp(fullLine.Length * 0.008f, 0.35f, 1.25f);
        }
    }
}
