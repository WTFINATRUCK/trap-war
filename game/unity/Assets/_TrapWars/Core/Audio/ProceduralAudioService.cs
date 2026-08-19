using System;
using System.Collections.Generic;
using TrapWars.Services;
using UnityEngine;

namespace TrapWars.Audio
{
    public sealed class ProceduralAudioService : IAudioService
    {
        private readonly AudioSource ui;
        private readonly AudioSource phone;
        private readonly AudioSource gameplay;
        private readonly AudioSource ambience;
        private readonly AudioSource music;
        private readonly Dictionary<string, AudioClip> clips = new();
        private readonly AudioClip[] footsteps;
        private float lastFootstepAt;
        private int footstepIndex;

        public float MasterVolume
        {
            get => AudioListener.volume;
            set => AudioListener.volume = Mathf.Clamp01(value);
        }

        public ProceduralAudioService(GameObject host)
        {
            ui = Bus(host, "AudioBus_UI", false);
            phone = Bus(host, "AudioBus_Phone", false);
            gameplay = Bus(host, "AudioBus_Gameplay", false);
            ambience = host.AddComponent<AudioSource>();
            ambience.name = "AudioBus_Ambience";
            ambience.playOnAwake = false;
            ambience.loop = true;
            ambience.spatialBlend = 0f;
            ambience.clip = CreateAmbience("NeighborhoodAmbience", 8f);
            ambience.volume = 0.035f;
            ambience.Play();
            music = Bus(host, "AudioBus_Music", true);
            music.clip = CreateMusicBed("M8_TemporaryMusicBed", 16f);
            music.volume = 0.045f;
            music.Play();
            clips["ui"] = LoadOrFallback("M8/Audio/M8_UI_Select", () => CreateTone("UI", 520f, 0.045f, 0.08f));
            clips["phone"] = LoadOrFallback("M8/Audio/M8_Phone_Open", () => CreateDoubleTone("Phone", 760f, 940f, 0.18f, 0.12f));
            clips["phone_close"] = LoadOrFallback("M8/Audio/M8_Phone_Close", () => CreateTone("PhoneClose", 430f, 0.08f, 0.08f));
            clips["trade"] = LoadOrFallback("M8/Audio/M8_Trade", () => CreateDoubleTone("Trade", 510f, 720f, 0.2f, 0.14f));
            clips["transition"] = LoadOrFallback("M8/Audio/M8_Transition", () => CreateDoubleTone("Transition", 210f, 320f, 0.48f, 0.11f));
            clips["door"] = LoadOrFallback("M8/Audio/M8_Door", () => CreateNoise("Door", 0.24f, 0.08f));
            clips["dialogue"] = LoadOrFallback("M8/Audio/M8_Dialogue", () => CreateTone("Dialogue", 310f, 0.09f, 0.07f));
            clips["invalid"] = LoadOrFallback("M8/Audio/M8_Invalid", () => CreateDoubleTone("Invalid", 190f, 155f, 0.17f, 0.1f));
            clips["investigation"] = LoadOrFallback("M8/Audio/M8_Investigation", () => CreateDoubleTone("Investigation", 420f, 620f, 0.16f, 0.09f));
            clips["consequence"] = LoadOrFallback("M8/Audio/M8_Consequence", () => CreateDoubleTone("Consequence", 280f, 470f, 0.32f, 0.11f));
            footsteps = new[]
            {
                LoadOrFallback("M8/Audio/M8_Footstep_00", () => CreateNoise("Step00", 0.055f, 0.1f)),
                LoadOrFallback("M8/Audio/M8_Footstep_01", () => CreateNoise("Step01", 0.055f, 0.1f)),
                LoadOrFallback("M8/Audio/M8_Footstep_02", () => CreateNoise("Step02", 0.055f, 0.1f)),
                LoadOrFallback("M8/Audio/M8_Footstep_03", () => CreateNoise("Step03", 0.055f, 0.1f)),
                LoadOrFallback("M8/Audio/M8_Footstep_04", () => CreateNoise("Step04", 0.055f, 0.1f))
            };
            Debug.Log($"[M8_1_AUDIO] authored_cues={clips.Count} authored_footsteps={footsteps.Length} ambience=temporary_procedural music=temporary_procedural license=Kenney_CC0");
        }

        public void PlayUi() => ui.PlayOneShot(clips["ui"]);
        public void PlayPhone() => phone.PlayOneShot(clips["phone"]);
        public void PlayTrade() => gameplay.PlayOneShot(clips["trade"]);
        public void PlayTransition() => music.PlayOneShot(clips["transition"]);

        public void PlayCue(GameFeelAudioCue cue)
        {
            var key = cue switch
            {
                GameFeelAudioCue.PhoneClose => "phone_close",
                GameFeelAudioCue.Door => "door",
                GameFeelAudioCue.Dialogue => "dialogue",
                GameFeelAudioCue.Invalid => "invalid",
                GameFeelAudioCue.Investigation => "investigation",
                GameFeelAudioCue.Consequence => "consequence",
                _ => "ui"
            };
            (cue == GameFeelAudioCue.PhoneClose ? phone : cue == GameFeelAudioCue.Dialogue ? ui : gameplay).PlayOneShot(clips[key]);
        }

        public void SetStreetAmbience(bool active) => ambience.volume = active ? 0.13f : 0.035f;

        public void PlayFootstep(float intensity)
        {
            if (UnityEngine.Time.unscaledTime - lastFootstepAt < 0.12f) return;
            lastFootstepAt = UnityEngine.Time.unscaledTime;
            gameplay.PlayOneShot(footsteps[footstepIndex++ % footsteps.Length], Mathf.Lerp(0.25f, 0.65f, intensity));
        }

        private static AudioClip LoadOrFallback(string resourcePath, Func<AudioClip> fallback)
        {
            var authored = Resources.Load<AudioClip>(resourcePath);
            return authored != null ? authored : fallback();
        }

        private static AudioSource Bus(GameObject host, string busName, bool loop)
        {
            var bus = host.AddComponent<AudioSource>();
            bus.name = busName;
            bus.playOnAwake = false;
            bus.loop = loop;
            bus.spatialBlend = 0f;
            return bus;
        }

        private static AudioClip CreateTone(string name, float frequency, float duration, float volume)
        {
            const int rate = 44100;
            var count = Mathf.CeilToInt(duration * rate);
            var samples = new float[count];
            for (var index = 0; index < count; index++)
            {
                var envelope = 1f - index / (float)count;
                samples[index] = Mathf.Sin(index * Mathf.PI * 2f * frequency / rate) * volume * envelope;
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip CreateDoubleTone(string name, float first, float second, float duration, float volume)
        {
            const int rate = 44100;
            var count = Mathf.CeilToInt(duration * rate);
            var samples = new float[count];
            for (var index = 0; index < count; index++)
            {
                var t = index / (float)count;
                var frequency = t < 0.5f ? first : second;
                var envelope = Mathf.Sin(Mathf.PI * t);
                samples[index] = Mathf.Sin(index * Mathf.PI * 2f * frequency / rate) * volume * envelope;
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip CreateNoise(string name, float duration, float volume)
        {
            const int rate = 44100;
            var count = Mathf.CeilToInt(duration * rate);
            var samples = new float[count];
            var random = new System.Random(42);
            for (var index = 0; index < count; index++)
            {
                var envelope = 1f - index / (float)count;
                samples[index] = ((float)random.NextDouble() * 2f - 1f) * volume * envelope;
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip CreateAmbience(string name, float duration)
        {
            const int rate = 22050;
            var count = Mathf.CeilToInt(duration * rate);
            var samples = new float[count];
            var random = new System.Random(75);
            var filtered = 0f;
            for (var index = 0; index < count; index++)
            {
                var noise = (float)random.NextDouble() * 2f - 1f;
                filtered = Mathf.Lerp(filtered, noise, 0.012f);
                var hum = Mathf.Sin(index * Mathf.PI * 2f * 54f / rate) * 0.08f;
                var traffic = Mathf.Sin(index * Mathf.PI * 2f * 0.17f / rate) * filtered * 0.55f;
                samples[index] = (filtered * 0.22f + hum + traffic) * 0.42f;
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip CreateMusicBed(string name, float duration)
        {
            const int rate = 22050;
            var count = Mathf.CeilToInt(duration * rate);
            var samples = new float[count];
            var random = new System.Random(808);
            for (var index = 0; index < count; index++)
            {
                var time = index / (float)rate;
                var beat = time % 0.5f;
                var kickEnvelope = Mathf.Exp(-beat * 18f);
                var kick = Mathf.Sin(Mathf.PI * 2f * Mathf.Lerp(74f, 43f, Mathf.Clamp01(beat * 8f)) * time) * kickEnvelope * 0.18f;
                var bass = Mathf.Sin(Mathf.PI * 2f * (time % 4f < 2f ? 55f : 49f) * time) * 0.055f;
                var hatPhase = time % 0.25f;
                var hat = hatPhase < 0.025f ? ((float)random.NextDouble() * 2f - 1f) * Mathf.Exp(-hatPhase * 120f) * 0.025f : 0f;
                samples[index] = (kick + bass + hat) * 0.42f;
            }
            var clip = AudioClip.Create(name, count, 1, rate, false);
            clip.SetData(samples, 0);
            return clip;
        }
    }
}
