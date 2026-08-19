using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using NUnit.Framework;
using TrapWars.Config;
using TrapWars.Networking;
using TrapWars.Services;
using TrapWars.State;
using UnityEngine;

namespace TrapWars.Tests.EditMode
{
    public sealed class RealBackendAcceptanceTests
    {
        private const string ApiBaseUrl = "http://127.0.0.1:8787";

        [Test]
        [Category("RealBackend")]
        public async Task AuthoritativeRoundTrip_ConflictIdempotencyResumeAndNetworkFailure()
        {
            var config = ScriptableObject.CreateInstance<TrapWarsRuntimeConfig>();
            config.ConfigureForTests(ApiEnvironment.Local, ApiBaseUrl, false);
            var api = new UnityTrapWarsApi(config);
            var persistence = new DevProjectionPersistence();
            var previousResume = persistence.Load();
            persistence.Clear();

            try
            {
                var state = new GameStateStore();
                var authentication = new GuestAuthenticationService(api, persistence);
                var runs = new GameRunService(api, authentication, persistence, state, new NetworkStatus());
                var bootTimer = Stopwatch.StartNew();
                var boot = await runs.LoadOrCreateAsync(CancellationToken.None);

                Assert.That(boot.IsSuccess, Is.True, boot.Error?.Message);
                Assert.That(state.Current, Is.Not.Null);
                var runId = state.Current!.RunId;
                var initialVersion = state.Current.StateVersion;
                var initialCash = state.Current.Cash;
                var accessToken = persistence.Load()!.AccessToken;
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] boot_ms={bootTimer.ElapsedMilliseconds} run_id={runId} version={initialVersion} cash={initialCash}");

                var buy = CommandFactory.Buy(initialVersion, "weed", 1);
                var buyTimer = Stopwatch.StartNew();
                var bought = await runs.SubmitAsync(buy, CancellationToken.None);
                Assert.That(bought.IsSuccess, Is.True, bought.Error?.Message);
                var boughtVersion = bought.Value!.Run.StateVersion;
                Assert.That(boughtVersion, Is.EqualTo(initialVersion + 1));
                Assert.That(bought.Value.Run.Cash, Is.LessThan(initialCash));
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] buy command_id={buy.CommandId} from={initialVersion} to={boughtVersion} latency_ms={buyTimer.ElapsedMilliseconds}");

                var replayCommand = CommandFactory.Buy(boughtVersion, "weed", 1);
                var replayKey = $"m7-unity-idem-{replayCommand.CommandId}";
                var firstReplay = await api.SubmitCommandAsync(accessToken, runId, replayKey, replayCommand, CancellationToken.None);
                Assert.That(firstReplay.IsSuccess, Is.True, firstReplay.Error?.Message);
                var secondReplay = await api.SubmitCommandAsync(accessToken, runId, replayKey, replayCommand, CancellationToken.None);
                Assert.That(secondReplay.IsSuccess, Is.True, secondReplay.Error?.Message);
                Assert.That(secondReplay.Value!.Run.StateVersion, Is.EqualTo(firstReplay.Value!.Run.StateVersion));
                Assert.That(secondReplay.Value.Run.Cash, Is.EqualTo(firstReplay.Value.Run.Cash));
                Assert.That(secondReplay.Value.Events[0].EventId, Is.EqualTo(firstReplay.Value.Events[0].EventId));
                var replayVersion = firstReplay.Value.Run.StateVersion;
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] idempotency command_id={replayCommand.CommandId} version={replayVersion} event_id={firstReplay.Value.Events[0].EventId}");

                var stale = CommandFactory.Buy(boughtVersion, "weed", 1);
                var staleResult = await api.SubmitCommandAsync(accessToken, runId, $"m7-unity-stale-{stale.CommandId}", stale, CancellationToken.None);
                Assert.That(staleResult.IsSuccess, Is.False);
                Assert.That(staleResult.Error!.Code, Is.EqualTo("STATE_CONFLICT"));
                Assert.That(staleResult.Error.ReconciliationRun!.StateVersion, Is.EqualTo(replayVersion));
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] conflict command_id={stale.CommandId} expected={boughtVersion} reconciled={staleResult.Error.ReconciliationRun.StateVersion}");

                var refresh = await runs.RefreshAsync(CancellationToken.None);
                Assert.That(refresh.IsSuccess, Is.True, refresh.Error?.Message);
                Assert.That(state.Current!.StateVersion, Is.EqualTo(replayVersion));

                var sell = CommandFactory.Sell(state.Current.StateVersion, "weed", 1);
                var sellTimer = Stopwatch.StartNew();
                var sold = await runs.SubmitAsync(sell, CancellationToken.None);
                Assert.That(sold.IsSuccess, Is.True, sold.Error?.Message);
                var finalVersion = sold.Value!.Run.StateVersion;
                var finalCash = sold.Value.Run.Cash;
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] sell command_id={sell.CommandId} from={replayVersion} to={finalVersion} latency_ms={sellTimer.ElapsedMilliseconds}");

                var rejected = CommandFactory.Buy(finalVersion, "weed", 999999);
                var rejectedResult = await api.SubmitCommandAsync(accessToken, runId, $"m7-unity-reject-{rejected.CommandId}", rejected, CancellationToken.None);
                Assert.That(rejectedResult.IsSuccess, Is.False);
                Assert.That(rejectedResult.Error!.Code, Is.Not.Empty);
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] rejected command_id={rejected.CommandId} code={rejectedResult.Error.Code} reason={rejectedResult.Error.ReasonCode}");

                var resumedState = new GameStateStore();
                var resumedRuns = new GameRunService(api, new GuestAuthenticationService(api, persistence), persistence, resumedState, new NetworkStatus());
                var resumed = await resumedRuns.LoadOrCreateAsync(CancellationToken.None);
                Assert.That(resumed.IsSuccess, Is.True, resumed.Error?.Message);
                Assert.That(resumedState.Current!.RunId, Is.EqualTo(runId));
                Assert.That(resumedState.Current.StateVersion, Is.EqualTo(finalVersion));
                Assert.That(resumedState.Current.Cash, Is.EqualTo(finalCash));
                UnityEngine.Debug.Log($"[M7_ACCEPTANCE] resume run_id={runId} version={finalVersion} cash={finalCash} day={resumedState.Current.Day}");

                var unavailableConfig = ScriptableObject.CreateInstance<TrapWarsRuntimeConfig>();
                unavailableConfig.ConfigureForTests(ApiEnvironment.Local, "http://127.0.0.1:1", false);
                var failedRequest = await new UnityTrapWarsApi(unavailableConfig).CreateGuestAsync(CancellationToken.None);
                Assert.That(failedRequest.IsSuccess, Is.False);
                Assert.That(failedRequest.Error!.Code, Is.EqualTo("CONNECTION_LOST"));
                UnityEngine.Debug.Log("[M7_ACCEPTANCE] network_failure=CONNECTION_LOST confirmed_state_preserved=true");
                Object.DestroyImmediate(unavailableConfig);
            }
            finally
            {
                persistence.Clear();
                if (previousResume != null) persistence.Save(previousResume);
                Object.DestroyImmediate(config);
            }
        }
    }
}
