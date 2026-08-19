using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using TrapWars.Analytics;
using TrapWars.Audio;
using TrapWars.Config;
using TrapWars.Interaction;
using TrapWars.Market;
using TrapWars.Networking;
using TrapWars.Objectives;
using TrapWars.Phone;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.State;
using TrapWars.Time;
using TrapWars.UI;
using TrapWars.World;
using TrapWars.Visuals;
using UnityEngine;

namespace TrapWars.Bootstrap
{
    public sealed class GameBootstrapper : MonoBehaviour
    {
        private CancellationTokenSource lifetime = null!;
        private PlayerInputReader? input;
        private IAnalyticsService? analytics;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Install()
        {
#if UNITY_EDITOR
            if (Application.isBatchMode) return;
#endif
            if (FindFirstObjectByType<GameBootstrapper>() != null) return;
            var root = new GameObject("TrapWars_Bootstrap");
            DontDestroyOnLoad(root);
            root.AddComponent<GameBootstrapper>();
        }

        private async void Start()
        {
            lifetime = new CancellationTokenSource();
            try
            {
                await BootAsync(lifetime.Token);
            }
            catch (OperationCanceledException)
            {
            }
            catch (Exception exception)
            {
                UnityEngine.Debug.LogException(exception);
                var failureHud = FindFirstObjectByType<GreyboxHud>();
                if (failureHud != null)
                {
                    failureHud.SetLoading(false);
                    failureHud.Toast($"Connection required: {exception.Message}", UiFactory.Red);
                }
            }
        }

        private async Task BootAsync(CancellationToken cancellationToken)
        {
            var bootTimer = Stopwatch.StartNew();
            var config = TrapWarsRuntimeConfig.LoadOrCreate();
            var accessibility = AccessibilitySettings.Load();
            UiFactory.ConfigureTextScale(accessibility.TextScale);
            var state = new GameStateStore();
            var persistence = new DevProjectionPersistence();
            var network = new NetworkStatus();
            ITrapWarsApi api = config.UseMockApi ? new MockTrapWarsApi() : new UnityTrapWarsApi(config);
            var authentication = new GuestAuthenticationService(api, persistence);
            var runService = new GameRunService(api, authentication, persistence, state, network);
            analytics = new BufferedAnalyticsService(config, state);
            var objectives = new ObjectiveDirector(analytics);
            var serviceHost = new GameObject("TrapWars_Services");
            DontDestroyOnLoad(serviceHost);
            serviceHost.AddComponent<M8RuntimeProfiler>();
            var audio = new ProceduralAudioService(serviceHost);
            audio.MasterVolume = accessibility.MasterVolume;

            var uiHost = new GameObject("TrapWars_UI");
            DontDestroyOnLoad(uiHost);
            var hud = uiHost.AddComponent<GreyboxHud>();
            hud.Configure(state, objectives, network);
            hud.SetLoading(true, "Authenticating and loading your run...");
            analytics.Track("session.started", new Dictionary<string, object> { ["entry_source"] = "m7_greybox", ["returning_player"] = persistence.Load() != null });

            var runResult = await runService.LoadOrCreateAsync(cancellationToken);
            if (!runResult.IsSuccess || state.Current == null)
                throw new InvalidOperationException(runResult.Error?.Message ?? "The authoritative run could not be loaded.");
            objectives.ResumeFromAuthoritativeDay(state.Current.Day);

            input = new PlayerInputReader();
            var world = GreyboxWorldBuilder.Build(input, audio, config.LookSensitivity * accessibility.LookSensitivityMultiplier);
            var dayNight = serviceHost.AddComponent<DayNightPresenter>();
            dayNight.Configure(world.Sun, audio);
            var education = uiHost.AddComponent<EducationRevealPresenter>();
            education.Build(analytics, audio);
            var dialogue = uiHost.AddComponent<DialoguePresenter>();
            dialogue.Build(analytics, audio);
            var phone = uiHost.AddComponent<TrapPhoneController>();
            phone.Configure(input, world.PlayerMotor, state, runService, analytics, audio, objectives, dayNight, education, hud);
            var market = uiHost.AddComponent<MarketController>();
            market.Configure(world.PlayerMotor, state, runService, analytics, audio, objectives, hud);
            var stash = uiHost.AddComponent<StashController>();
            stash.Configure(world.PlayerMotor, state, runService, hud);
            GreyboxWorldBuilder.WireInteractions(world, phone, market, stash, dialogue, objectives, analytics, audio, hud);
            world.InteractionScanner.Configure(input, hud);

#if UNITY_EDITOR || DEVELOPMENT_BUILD
            var devTools = uiHost.AddComponent<DevToolsOverlay>();
            devTools.Configure(config, state, runService, world.PlayerMotor, objectives, phone, world.InteractionScanner, world.TeleportPoints, hud);
#endif
            hud.SetLoading(false);
            hud.Toast(
                objectives.Current == GreyboxObjective.DayTwoHook
                    ? "Run restored. New Word is waiting."
                    : "Phone buzzing. Check Word on the Street.",
                UiFactory.Gold);
            audio.PlayPhone();
            analytics.Track("rumor.received", new Dictionary<string, object> { ["rumor_id"] = "m7_market_hub_chatter" });
            analytics.Track("player.spawned", new Dictionary<string, object> { ["location_id"] = "safehouse_01", ["spawn_id"] = "bed_spawn_01", ["load_duration_ms"] = bootTimer.ElapsedMilliseconds });
            analytics.Track("player.control_acquired", new Dictionary<string, object> { ["location_id"] = "safehouse_01", ["time_from_session_start_ms"] = bootTimer.ElapsedMilliseconds });
        }

        private async void OnDestroy()
        {
            if (lifetime == null) return;
            lifetime.Cancel();
            input?.Dispose();
            if (analytics != null)
            {
                try { await analytics.FlushAsync(CancellationToken.None); } catch { }
            }
            lifetime.Dispose();
        }
    }
}
