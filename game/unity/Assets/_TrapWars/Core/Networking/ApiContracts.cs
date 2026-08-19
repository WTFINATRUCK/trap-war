using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace TrapWars.Networking
{
    [Serializable]
    public sealed class GuestAuthResponseDto
    {
        [JsonProperty("accessToken")] public string AccessToken = string.Empty;
        [JsonProperty("expiresAt")] public string ExpiresAt = string.Empty;
        [JsonProperty("player")] public PlayerIdentityDto Player = new();
    }

    [Serializable]
    public sealed class PlayerIdentityDto
    {
        [JsonProperty("playerId")] public string PlayerId = string.Empty;
    }

    [Serializable]
    public sealed class RunEnvelopeDto
    {
        [JsonProperty("run")] public RunProjectionDto Run = new();
        [JsonProperty("events")] public List<DomainEventDto> Events = new();
    }

    [Serializable]
    public sealed class RunProjectionDto
    {
        [JsonProperty("runId")] public string RunId = string.Empty;
        [JsonProperty("status")] public string Status = "active";
        [JsonProperty("stateVersion")] public long StateVersion;
        [JsonProperty("versions")] public EconomyVersionsDto Versions = new();
        [JsonProperty("day")] public int Day;
        [JsonProperty("actionsRemaining")] public int ActionsRemaining;
        [JsonProperty("locationId")] public string LocationId = string.Empty;
        [JsonProperty("cash")] public long Cash;
        [JsonProperty("protectedReserves")] public long ProtectedReserves;
        [JsonProperty("liabilities")] public long Liabilities;
        [JsonProperty("inventoryCapacity")] public int InventoryCapacity;
        [JsonProperty("inventory")] public Dictionary<string, int> Inventory = new();
        [JsonProperty("stashes")] public Dictionary<string, Dictionary<string, StashHoldingDto>> Stashes = new();
        [JsonProperty("gear")] public Dictionary<string, GearHoldingDto> Gear = new();
        [JsonProperty("prices")] public Dictionary<string, long> Prices = new();
        [JsonProperty("rankId")] public string RankId = string.Empty;
        [JsonProperty("reputation")] public int Reputation;
        [JsonProperty("unlockedLocationIds")] public List<string> UnlockedLocationIds = new();
        [JsonProperty("clients")] public Dictionary<string, ClientProgressDto> Clients = new();
        [JsonProperty("forecasts")] public List<ForecastDto> Forecasts = new();
        [JsonProperty("stats")] public EconomyStatsDto Stats = new();
        [JsonProperty("completionReason")] public string CompletionReason = string.Empty;
        [JsonProperty("legalActions")] public List<LegalActionDto> LegalActions = new();
    }

    [Serializable]
    public sealed class EconomyVersionsDto
    {
        [JsonProperty("economyVersion")] public string EconomyVersion = string.Empty;
        [JsonProperty("contentVersion")] public string ContentVersion = string.Empty;
        [JsonProperty("balanceVersion")] public string BalanceVersion = string.Empty;
        [JsonProperty("randomStrategyVersion")] public string RandomStrategyVersion = string.Empty;
    }

    [Serializable]
    public sealed class StashHoldingDto
    {
        [JsonProperty("quantity")] public int Quantity;
        [JsonProperty("depositedDay")] public int DepositedDay;
        [JsonProperty("shieldDaysRemaining")] public int ShieldDaysRemaining;
    }

    [Serializable]
    public sealed class GearHoldingDto
    {
        [JsonProperty("quantity")] public int Quantity;
        [JsonProperty("conditionBps")] public int ConditionBps;
        [JsonProperty("usesRemaining")] public int? UsesRemaining;
    }

    [Serializable]
    public sealed class ClientProgressDto
    {
        [JsonProperty("accepted")] public bool Accepted;
        [JsonProperty("completed")] public bool Completed;
        [JsonProperty("progress")] public Dictionary<string, int> Progress = new();
    }

    [Serializable]
    public sealed class ForecastDto
    {
        [JsonProperty("forecastId")] public string ForecastId = string.Empty;
        [JsonProperty("generatedDay")] public int GeneratedDay;
        [JsonProperty("expiresDay")] public int ExpiresDay;
        [JsonProperty("horizonDays")] public int HorizonDays;
        [JsonProperty("assetId")] public string AssetId = string.Empty;
        [JsonProperty("locationId")] public string LocationId = string.Empty;
        [JsonProperty("predictedPrice")] public long PredictedPrice;
        [JsonProperty("direction")] public string Direction = string.Empty;
        [JsonProperty("magnitudeBand")] public string MagnitudeBand = string.Empty;
        [JsonProperty("sourceType")] public string SourceType = string.Empty;
        [JsonProperty("confidenceBps")] public int ConfidenceBps;
    }

    [Serializable]
    public sealed class EconomyStatsDto
    {
        [JsonProperty("actionsUsed")] public int ActionsUsed;
        [JsonProperty("yieldAccrued")] public long YieldAccrued;
        [JsonProperty("raidsTriggered")] public int RaidsTriggered;
        [JsonProperty("robberiesTriggered")] public int RobberiesTriggered;
        [JsonProperty("daysCompleted")] public int DaysCompleted;
    }

    [Serializable]
    public sealed class LegalActionDto
    {
        [JsonProperty("type")] public string Type = string.Empty;
        [JsonProperty("assetId")] public string AssetId = string.Empty;
        [JsonProperty("locationId")] public string LocationId = string.Empty;
        [JsonProperty("clientId")] public string ClientId = string.Empty;
        [JsonProperty("modes")] public List<string> Modes = new();
    }

    [Serializable]
    public sealed class DomainEventDto
    {
        [JsonProperty("eventId")] public string EventId = string.Empty;
        [JsonProperty("commandId")] public string CommandId = string.Empty;
        [JsonProperty("sequence")] public long Sequence;
        [JsonProperty("occurredDay")] public int OccurredDay;
        [JsonProperty("type")] public string Type = string.Empty;
        [JsonExtensionData] public IDictionary<string, JToken> Payload = new Dictionary<string, JToken>();
    }

    [Serializable]
    public sealed class RunCommandRequestDto
    {
        [JsonProperty("commandId")] public string CommandId = string.Empty;
        [JsonProperty("expectedStateVersion")] public long ExpectedStateVersion;
        [JsonProperty("commandType")] public string CommandType = string.Empty;
        [JsonProperty("payload")] public object Payload = new EmptyPayloadDto();
    }

    [Serializable] public sealed class EmptyPayloadDto { }
    [Serializable] public sealed class AssetQuantityPayloadDto { [JsonProperty("assetId")] public string AssetId = string.Empty; [JsonProperty("quantity")] public int Quantity; }
    [Serializable] public sealed class WithdrawPayloadDto { [JsonProperty("locationId")] public string LocationId = string.Empty; [JsonProperty("assetId")] public string AssetId = string.Empty; [JsonProperty("quantity")] public int Quantity; }
    [Serializable] public sealed class TravelPayloadDto { [JsonProperty("destinationLocationId")] public string DestinationLocationId = string.Empty; [JsonProperty("mode")] public string Mode = "walk"; }
    [Serializable] public sealed class ClientPayloadDto { [JsonProperty("clientId")] public string ClientId = string.Empty; }
    [Serializable] public sealed class PlugPayloadDto { [JsonProperty("assetId")] public string AssetId = string.Empty; [JsonProperty("locationId")] public string LocationId = string.Empty; }

    [Serializable]
    public sealed class ApiErrorEnvelopeDto
    {
        [JsonProperty("error")] public ApiErrorDto Error = new();
    }

    [Serializable]
    public sealed class ApiErrorDto
    {
        [JsonProperty("code")] public string Code = string.Empty;
        [JsonProperty("message")] public string Message = string.Empty;
        [JsonProperty("requestId")] public string RequestId = string.Empty;
        [JsonProperty("details")] public JObject? Details;

        public RunProjectionDto? ReconciliationRun => Details?["run"]?.ToObject<RunProjectionDto>();
        public string ReasonCode => Details?["reasonCode"]?.Value<string>() ?? string.Empty;
        public int RetryAfterMs => Details?["retryAfterMs"]?.Value<int>() ?? 0;
    }

    public sealed class ApiCallResult<T>
    {
        public bool IsSuccess { get; private set; }
        public long StatusCode { get; private set; }
        public T? Value { get; private set; }
        public ApiErrorDto? Error { get; private set; }

        public static ApiCallResult<T> Success(T value, long statusCode) => new() { IsSuccess = true, Value = value, StatusCode = statusCode };
        public static ApiCallResult<T> Failure(ApiErrorDto error, long statusCode) => new() { Error = error, StatusCode = statusCode };
    }
}
