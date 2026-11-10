using System.Collections;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace TrapWars.UI
{
    public static class DemoPresentationPolicy
    {
        public const string ConnectionUnavailable = "Connection unavailable. Try again.";
        public const string ControlsSeenKey = "trapwars.m8_3.controls_seen";

        public static string TradeFeedback(long cashDelta, int owned, int actionsRemaining) =>
            $"MOVE CONFIRMED\n{(cashDelta >= 0 ? "+" : "-")}${Mathf.Abs(cashDelta):N0} CASH  /  {owned} OWNED  /  {actionsRemaining} ACTIONS LEFT";

        public static string BuildIdentity()
        {
            var identity = Resources.Load<TextAsset>("BuildIdentity");
            return identity == null
                ? $"version={Application.version} commit=local"
                : identity.text.Trim();
        }

        public static void ResetLocalDemoPresentation()
        {
            PlayerPrefs.DeleteKey(ControlsSeenKey);
            PlayerPrefs.Save();
        }
    }

    public sealed class ControlIntroductionPresenter : MonoBehaviour
    {
        private RectTransform root = null!;

        public void Build()
        {
            var canvas = UiFactory.Canvas("ControlIntroduction", transform, 25);
            root = UiFactory.PanelRect("ControlStrip", canvas.transform, new Color(0.025f, 0.03f, 0.032f, 0.94f), new Vector2(0.08f, 0.035f), new Vector2(0.92f, 0.14f), Vector2.zero, Vector2.zero);
            var rail = UiFactory.PanelRect("ControlRail", root, UiFactory.Gold, Vector2.zero, new Vector2(0.008f, 1f), Vector2.zero, Vector2.zero);
            rail.GetComponent<Image>().raycastTarget = false;
            var heading = UiFactory.Text("ControlHeading", root, "TAKE THE BLOCK", 17, TextAnchor.MiddleLeft, UiFactory.Gold, FontStyle.Bold);
            UiFactory.SetRect(heading.rectTransform, new Vector2(0.035f, 0.54f), new Vector2(0.24f, 0.9f), Vector2.zero, Vector2.zero);
            var keyboard = UiFactory.Text("KeyboardControls", root, "WASD  MOVE     MOUSE  LOOK     E  INTERACT     SHIFT  SPRINT     TAB  PHONE     G  GRAPHICS", 17, TextAnchor.MiddleLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(keyboard.rectTransform, new Vector2(0.24f, 0.52f), new Vector2(0.97f, 0.92f), Vector2.zero, Vector2.zero);
            var gamepad = UiFactory.Text("GamepadControls", root, "GAMEPAD  STICKS MOVE / LOOK     A  INTERACT     L3  SPRINT     Y  PHONE     B  BACK", 15, TextAnchor.MiddleLeft, new Color(0.68f, 0.71f, 0.69f));
            UiFactory.SetRect(gamepad.rectTransform, new Vector2(0.24f, 0.1f), new Vector2(0.97f, 0.5f), Vector2.zero, Vector2.zero);
            root.gameObject.SetActive(false);
        }

        public void ShowOnce()
        {
            if (PlayerPrefs.GetInt(DemoPresentationPolicy.ControlsSeenKey, 0) == 1) return;
            PlayerPrefs.SetInt(DemoPresentationPolicy.ControlsSeenKey, 1);
            PlayerPrefs.Save();
            root.gameObject.SetActive(true);
            StartCoroutine(HideAfterDelay());
        }

        private IEnumerator HideAfterDelay()
        {
            var elapsed = 0f;
            while (elapsed < 8f)
            {
                if (Keyboard.current?.anyKey.wasPressedThisFrame == true || Gamepad.current != null && Gamepad.current.buttonSouth.wasPressedThisFrame)
                    elapsed += 0.5f;
                elapsed += UnityEngine.Time.unscaledDeltaTime;
                yield return null;
            }
            root.gameObject.SetActive(false);
        }
    }
}
