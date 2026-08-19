using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using TrapWars.Config;
using TrapWars.Networking;
using TrapWars.Services;
using TrapWars.State;
using UnityEngine;

namespace TrapWars.Tests.EditMode
{
    public sealed class AuthoritativeRuntimeTests
    {
        [Test]
        public void ProjectionDto_DeserializesM6ShapeAndMapsDetachedCollections()
        {
            const string json = "{\"runId\":\"run-1\",\"status\":\"active\",\"stateVersion\":7,\"day\":2,\"actionsRemaining\":3,\"locationId\":\"compton\",\"cash\":880,\"protectedReserves\":40,\"inventoryCapacity\":100,\"inventory\":{\"weed\":2},\"stashes\":{\"compton\":{\"weed\":{\"quantity\":4,\"depositedDay\":1,\"shieldDaysRemaining\":1}}},\"prices\":{\"weed\":71},\"legalActions\":[{\"type\":\"SellAsset\",\"assetId\":\"weed\"}]}";

            var dto = JsonConvert.DeserializeObject<RunProjectionDto>(json)!;
            var model = RunProjectionMapper.Map(dto);
            dto.Inventory["weed"] = 99;

            Assert.That(model.RunId, Is.EqualTo("run-1"));
            Assert.That(model.StateVersion, Is.EqualTo(7));
            Assert.That(model.Owned("weed"), Is.EqualTo(2));
            Assert.That(model.StashedHere("weed"), Is.EqualTo(4));
            Assert.That(model.IsLegal("SellAsset", "weed"), Is.True);
        }

        [Test]
        public void CommandFactory_UsesExpectedVersionAndUniqueClientCommandIds()
        {
            var first = CommandFactory.Buy(12, "weed", 1);
            var second = CommandFactory.Buy(12, "weed", 1);

            Assert.That(first.ExpectedStateVersion, Is.EqualTo(12));
            Assert.That(first.CommandType, Is.EqualTo("BuyAsset"));
            Assert.That(first.CommandId, Does.StartWith("unity-"));
            Assert.That(second.CommandId, Is.Not.EqualTo(first.CommandId));
        }

        [Test]
        public void RuntimeConfiguration_SelectsEnvironmentWithoutHardcodedGameplayUrls()
        {
            var config = ScriptableObject.CreateInstance<TrapWarsRuntimeConfig>();
            try
            {
                config.ConfigureForTests(ApiEnvironment.Local, "http://127.0.0.1:9999", true);
                Assert.That(config.ApiBaseUrl, Is.EqualTo("http://127.0.0.1:9999"));
                Assert.That(config.UseMockApi, Is.True);
            }
            finally
            {
                Object.DestroyImmediate(config);
            }
        }

        [Test]
        public async Task MockApi_ReplaysSameCommittedResponseForIdempotencyKey()
        {
            var api = new MockTrapWarsApi();
            var command = CommandFactory.Buy(1, "weed", 1);
            var first = await api.SubmitCommandAsync("token", "run", "same-key", command, CancellationToken.None);
            var replay = await api.SubmitCommandAsync("token", "run", "same-key", command, CancellationToken.None);

            Assert.That(first.IsSuccess, Is.True);
            Assert.That(replay.IsSuccess, Is.True);
            Assert.That(replay.Value!.Run.StateVersion, Is.EqualTo(first.Value!.Run.StateVersion));
            Assert.That(replay.Value.Run.Cash, Is.EqualTo(first.Value.Run.Cash));
            Assert.That(replay.Value.Events[0].EventId, Is.EqualTo(first.Value.Events[0].EventId));
        }

        [Test]
        public async Task GameRunService_ReplacesLocalProjectionFromStateConflict()
        {
            var initial = Projection(version: 2, cash: 500);
            var authoritative = Projection(version: 4, cash: 372);
            var state = new GameStateStore();
            state.Replace(initial);
            var api = new ConflictApi(authoritative);
            var service = new GameRunService(api, new AuthenticationStub(), new SaveStub(), state, new NetworkStatus());

            var result = await service.SubmitAsync(CommandFactory.Buy(2, "weed", 1), CancellationToken.None);

            Assert.That(result.IsSuccess, Is.False);
            Assert.That(result.Error!.Code, Is.EqualTo("STATE_CONFLICT"));
            Assert.That(state.Current!.StateVersion, Is.EqualTo(4));
            Assert.That(state.Current.Cash, Is.EqualTo(372));
        }

        private static RunProjectionDto Projection(long version, long cash) => new()
        {
            RunId = "run-1",
            StateVersion = version,
            Day = 1,
            ActionsRemaining = 3,
            LocationId = "compton",
            Cash = cash,
            InventoryCapacity = 100,
            Inventory = new Dictionary<string, int> { ["weed"] = 0 },
            Prices = new Dictionary<string, long> { ["weed"] = 62 }
        };

        private sealed class ConflictApi : ITrapWarsApi
        {
            private readonly RunProjectionDto authoritative;
            public ConflictApi(RunProjectionDto authoritative) => this.authoritative = authoritative;
            public Task<ApiCallResult<GuestAuthResponseDto>> CreateGuestAsync(CancellationToken cancellationToken) => throw new System.NotSupportedException();
            public Task<ApiCallResult<RunEnvelopeDto>> CreateRunAsync(string accessToken, string idempotencyKey, CancellationToken cancellationToken) => throw new System.NotSupportedException();
            public Task<ApiCallResult<RunEnvelopeDto>> LoadRunAsync(string accessToken, string runId, CancellationToken cancellationToken) => throw new System.NotSupportedException();
            public Task<ApiCallResult<RunEnvelopeDto>> SubmitCommandAsync(string accessToken, string runId, string idempotencyKey, RunCommandRequestDto command, CancellationToken cancellationToken)
            {
                var error = new ApiErrorDto
                {
                    Code = "STATE_CONFLICT",
                    Message = "stale",
                    Details = new JObject { ["run"] = JObject.FromObject(authoritative) }
                };
                return Task.FromResult(ApiCallResult<RunEnvelopeDto>.Failure(error, 409));
            }
        }

        private sealed class AuthenticationStub : IAuthenticationService
        {
            public Task<AuthenticatedSession> AuthenticateAsync(CancellationToken cancellationToken) =>
                Task.FromResult(new AuthenticatedSession { AccessToken = "token", PlayerId = "player" });
            public void Invalidate() { }
        }

        private sealed class SaveStub : ISaveProjectionService
        {
            public LocalResumeRecord? Load() => null;
            public void Save(LocalResumeRecord record) { }
            public void Clear() { }
        }
    }
}
