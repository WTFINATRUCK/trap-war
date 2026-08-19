using UnityEngine;

namespace TrapWars.Config
{
    public sealed class AccessibilitySettings
    {
        private const string TextScaleKey = "trapwars.accessibility.text_scale";
        private const string MasterVolumeKey = "trapwars.accessibility.master_volume";
        private const string LookSensitivityKey = "trapwars.accessibility.look_sensitivity";
        private const string CaptionsKey = "trapwars.accessibility.captions";

        public float TextScale { get; private set; } = 1f;
        public float MasterVolume { get; private set; } = 0.8f;
        public float LookSensitivityMultiplier { get; private set; } = 1f;
        public bool CaptionsEnabled { get; private set; } = true;

        public static AccessibilitySettings Load()
        {
            return new AccessibilitySettings
            {
                TextScale = Mathf.Clamp(PlayerPrefs.GetFloat(TextScaleKey, 1f), 0.85f, 1.5f),
                MasterVolume = Mathf.Clamp01(PlayerPrefs.GetFloat(MasterVolumeKey, 0.8f)),
                LookSensitivityMultiplier = Mathf.Clamp(PlayerPrefs.GetFloat(LookSensitivityKey, 1f), 0.5f, 2f),
                CaptionsEnabled = PlayerPrefs.GetInt(CaptionsKey, 1) == 1
            };
        }

        public void Save(float textScale, float masterVolume, float lookSensitivityMultiplier, bool captionsEnabled)
        {
            TextScale = Mathf.Clamp(textScale, 0.85f, 1.5f);
            MasterVolume = Mathf.Clamp01(masterVolume);
            LookSensitivityMultiplier = Mathf.Clamp(lookSensitivityMultiplier, 0.5f, 2f);
            CaptionsEnabled = captionsEnabled;
            PlayerPrefs.SetFloat(TextScaleKey, TextScale);
            PlayerPrefs.SetFloat(MasterVolumeKey, MasterVolume);
            PlayerPrefs.SetFloat(LookSensitivityKey, LookSensitivityMultiplier);
            PlayerPrefs.SetInt(CaptionsKey, CaptionsEnabled ? 1 : 0);
            PlayerPrefs.Save();
        }
    }
}
