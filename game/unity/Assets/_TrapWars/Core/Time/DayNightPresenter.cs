using System;
using System.Collections;
using TrapWars.Services;
using UnityEngine;

namespace TrapWars.Time
{
    public sealed class DayNightPresenter : MonoBehaviour
    {
        private Light sun = null!;
        private IAudioService audioService = null!;
        public event Action? TransitionCompleted;

        public void Configure(Light directionalLight, IAudioService audio)
        {
            sun = directionalLight;
            audioService = audio;
        }

        public void PresentNightTransition(int nextDay)
        {
            StopAllCoroutines();
            StartCoroutine(Transition(nextDay));
        }

        private IEnumerator Transition(int nextDay)
        {
            audioService.PlayTransition();
            var startIntensity = sun.intensity;
            var startColor = sun.color;
            var startAmbient = RenderSettings.ambientLight;
            var practicals = FindObjectsByType<Light>(FindObjectsSortMode.None);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            for (var elapsed = 0f; elapsed < 3.2f; elapsed += UnityEngine.Time.unscaledDeltaTime)
            {
                var t = Mathf.SmoothStep(0f, 1f, elapsed / 3.2f);
                sun.transform.rotation = Quaternion.Slerp(sun.transform.rotation, Quaternion.Euler(12f, -18f, 0f), t);
                sun.intensity = Mathf.Lerp(startIntensity, 1.08f, t);
                sun.color = Color.Lerp(startColor, new Color(0.38f, 0.48f, 0.72f), t);
                RenderSettings.ambientLight = Color.Lerp(startAmbient, new Color(0.46f, 0.48f, 0.54f), t);
                RenderSettings.fogColor = Color.Lerp(new Color(0.3f, 0.31f, 0.3f), new Color(0.2f, 0.21f, 0.25f), t);
                RenderSettings.fogDensity = Mathf.Lerp(0f, 0.0045f, t);
                foreach (var light in practicals)
                {
                    if (light == null || light == sun) continue;
                    var targetIntensity = light.name.Contains("character_fill") ? 1.4f : light.name.Contains("safehouse") ? 4.4f : 5f;
                    light.intensity = Mathf.Lerp(light.intensity, targetIntensity, t);
                    light.color = Color.Lerp(light.color, new Color(1f, 0.64f, 0.32f), t * 0.45f);
                }
                yield return null;
            }
            yield return new WaitForSecondsRealtime(0.55f);
            TransitionCompleted?.Invoke();
        }
    }
}
