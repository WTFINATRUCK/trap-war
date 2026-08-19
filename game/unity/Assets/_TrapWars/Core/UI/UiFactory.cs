using System;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace TrapWars.UI
{
    public static class UiFactory
    {
        public static readonly Color Ink = new(0.055f, 0.06f, 0.065f, 0.97f);
        public static readonly Color Panel = new(0.095f, 0.105f, 0.11f, 0.96f);
        public static readonly Color Paper = new(0.91f, 0.92f, 0.89f, 1f);
        public static readonly Color Green = new(0.18f, 0.78f, 0.48f, 1f);
        public static readonly Color Gold = new(0.94f, 0.68f, 0.18f, 1f);
        public static readonly Color Red = new(0.91f, 0.28f, 0.24f, 1f);

        private static Font? font;
        private static float textScale = 1f;
        public static Font Font => font ??= Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        public static void ConfigureTextScale(float value) => textScale = Mathf.Clamp(value, 0.85f, 1.5f);

        public static Canvas Canvas(string name, Transform? parent = null, int order = 0)
        {
            EnsureEventSystem();
            var root = new GameObject(name, typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            if (parent != null) root.transform.SetParent(parent, false);
            var canvas = root.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = order;
            var scaler = root.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            return canvas;
        }

        private static void EnsureEventSystem()
        {
            if (UnityEngine.Object.FindFirstObjectByType<EventSystem>() != null) return;
            new GameObject("EventSystem", typeof(EventSystem), typeof(InputSystemUIInputModule));
        }

        public static RectTransform PanelRect(string name, Transform parent, Color color, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            var panel = new GameObject(name, typeof(RectTransform), typeof(Image));
            panel.transform.SetParent(parent, false);
            panel.GetComponent<Image>().color = color;
            var rect = panel.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            return rect;
        }

        public static Text Text(string name, Transform parent, string value, int size, TextAnchor alignment, Color color, FontStyle style = FontStyle.Normal)
        {
            var item = new GameObject(name, typeof(RectTransform), typeof(Text));
            item.transform.SetParent(parent, false);
            var text = item.GetComponent<Text>();
            text.font = Font;
            text.text = value;
            var scaledSize = Mathf.RoundToInt(size * textScale);
            text.fontSize = scaledSize;
            text.alignment = alignment;
            text.color = color;
            text.fontStyle = style;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Truncate;
            text.resizeTextForBestFit = true;
            text.resizeTextMinSize = Mathf.Max(12, scaledSize / 2);
            text.resizeTextMaxSize = scaledSize;
            Stretch(item.GetComponent<RectTransform>(), 0f);
            return text;
        }

        public static Button Button(string name, Transform parent, string label, Color color, UnityAction clicked)
        {
            var item = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            item.transform.SetParent(parent, false);
            item.GetComponent<Image>().color = color;
            var button = item.GetComponent<Button>();
            button.targetGraphic = item.GetComponent<Image>();
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.08f, 1.08f, 1.08f, 1f);
            colors.pressedColor = new Color(0.78f, 0.82f, 0.8f, 1f);
            colors.selectedColor = Color.white;
            colors.disabledColor = new Color(0.35f, 0.38f, 0.37f, 0.72f);
            colors.fadeDuration = 0.08f;
            button.colors = colors;
            button.onClick.AddListener(clicked);
            var text = Text("Label", item.transform, label, 25, TextAnchor.MiddleCenter, color.grayscale < 0.45f ? Paper : Ink, FontStyle.Bold);
            text.raycastTarget = false;
            return button;
        }

        public static void SetRect(RectTransform rect, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
        }

        public static void Stretch(RectTransform rect, float inset)
        {
            SetRect(rect, Vector2.zero, Vector2.one, Vector2.one * inset, Vector2.one * -inset);
        }
    }
}
