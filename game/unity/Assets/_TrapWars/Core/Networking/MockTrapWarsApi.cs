using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace TrapWars.Networking
{
    public sealed class MockTrapWarsApi : ITrapWarsApi
    {
        private readonly Dictionary<string, RunEnvelopeDto> idempotentResponses = new();
        private readonly RunProjectionDto run = CreateRunProjection();

        public Task<ApiCallResult<GuestAuthResponseDto>> CreateGuestAsync(CancellationToken cancellationToken)
        {
            var value = new GuestAuthResponseDto
            {
                AccessToken = "mock-access-token-for-greybox-testing-only",
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(1).ToString("O"),
                Player = new PlayerIdentityDto { PlayerId = "00000000-0000-0000-0000-000000000001" }
            };
            return Task.FromResult(ApiCallResult<GuestAuthResponseDto>.Success(value, 201));
        }

        public Task<ApiCallResult<RunEnvelopeDto>> CreateRunAsync(string accessToken, string idempotencyKey, CancellationToken cancellationToken) =>
            Task.FromResult(ApiCallResult<RunEnvelopeDto>.Success(CloneEnvelope(), 201));

        public Task<ApiCallResult<RunEnvelopeDto>> LoadRunAsync(string accessToken, string runId, CancellationToken cancellationToken) =>
            Task.FromResult(ApiCallResult<RunEnvelopeDto>.Success(CloneEnvelope(), 200));

        public Task<ApiCallResult<RunEnvelopeDto>> SubmitCommandAsync(string accessToken, string runId, string idempotencyKey, RunCommandRequestDto command, CancellationToken cancellationToken)
        {
            if (idempotentResponses.TryGetValue(idempotencyKey, out var stored))
                return Task.FromResult(ApiCallResult<RunEnvelopeDto>.Success(stored, 200));
            if (command.ExpectedStateVersion != run.StateVersion)
            {
                var error = new ApiErrorDto { Code = "STATE_CONFLICT", Message = "Mock state version conflict." };
                return Task.FromResult(ApiCallResult<RunEnvelopeDto>.Failure(error, 409));
            }

            ApplyFixtureCommand(command);
            run.StateVersion += 1;
            var response = CloneEnvelope();
            response.Events.Add(new DomainEventDto { EventId = $"{command.CommandId}:0", CommandId = command.CommandId, Type = command.CommandType, OccurredDay = run.Day });
            idempotentResponses[idempotencyKey] = response;
            return Task.FromResult(ApiCallResult<RunEnvelopeDto>.Success(response, 200));
        }

        private void ApplyFixtureCommand(RunCommandRequestDto command)
        {
            if (command.CommandType == "BuyAsset" && command.Payload is AssetQuantityPayloadDto buy)
            {
                var price = run.Prices.GetValueOrDefault(buy.AssetId, 50);
                run.Cash -= price * buy.Quantity;
                run.Inventory[buy.AssetId] = run.Inventory.GetValueOrDefault(buy.AssetId) + buy.Quantity;
                run.ActionsRemaining -= 1;
            }
            else if (command.CommandType == "SellAsset" && command.Payload is AssetQuantityPayloadDto sell)
            {
                run.Inventory[sell.AssetId] = Math.Max(0, run.Inventory.GetValueOrDefault(sell.AssetId) - sell.Quantity);
                run.Cash += run.Prices.GetValueOrDefault(sell.AssetId, 50) * sell.Quantity;
                run.ActionsRemaining -= 1;
            }
            else if (command.CommandType == "EndDay")
            {
                run.Day += 1;
                run.ActionsRemaining = 3;
                run.Prices["weed"] += 18;
            }
            RefreshLegalActions();
        }

        private RunEnvelopeDto CloneEnvelope()
        {
            var json = Newtonsoft.Json.JsonConvert.SerializeObject(new RunEnvelopeDto { Run = run });
            return Newtonsoft.Json.JsonConvert.DeserializeObject<RunEnvelopeDto>(json)!;
        }

        private static RunProjectionDto CreateRunProjection()
        {
            var projection = new RunProjectionDto
            {
                RunId = "00000000-0000-0000-0000-000000000101",
                StateVersion = 1,
                Day = 1,
                ActionsRemaining = 3,
                LocationId = "compton",
                Cash = 500,
                ProtectedReserves = 40,
                InventoryCapacity = 100,
                Prices = new Dictionary<string, long> { ["weed"] = 62, ["coke"] = 170, ["molly"] = 112, ["meth"] = 320 },
                Inventory = new Dictionary<string, int> { ["weed"] = 0, ["coke"] = 0, ["molly"] = 0, ["meth"] = 0 },
                Stashes = new Dictionary<string, Dictionary<string, StashHoldingDto>> { ["compton"] = new() },
                Clients = new Dictionary<string, ClientProgressDto> { ["ray"] = new() }
            };
            projection.LegalActions.Add(new LegalActionDto { Type = "BuyAsset", AssetId = "weed" });
            projection.LegalActions.Add(new LegalActionDto { Type = "EndDay" });
            return projection;
        }

        private void RefreshLegalActions()
        {
            run.LegalActions.Clear();
            if (run.ActionsRemaining > 0)
            {
                run.LegalActions.Add(new LegalActionDto { Type = "BuyAsset", AssetId = "weed" });
                if (run.Inventory.GetValueOrDefault("weed") > 0) run.LegalActions.Add(new LegalActionDto { Type = "SellAsset", AssetId = "weed" });
            }
            run.LegalActions.Add(new LegalActionDto { Type = "EndDay" });
        }
    }
}
