using System;
using System.Collections.Generic;
using System.Linq;
using TrapWars.Networking;

namespace TrapWars.State
{
    public sealed class RunPresentationModel
    {
        public string RunId { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public long StateVersion { get; set; }
        public int Day { get; set; }
        public int ActionsRemaining { get; set; }
        public string LocationId { get; set; } = string.Empty;
        public long Cash { get; set; }
        public long ProtectedReserves { get; set; }
        public int InventoryCapacity { get; set; }
        public IReadOnlyDictionary<string, int> Inventory { get; set; } = new Dictionary<string, int>();
        public IReadOnlyDictionary<string, IReadOnlyDictionary<string, StashHoldingDto>> Stashes { get; set; } = new Dictionary<string, IReadOnlyDictionary<string, StashHoldingDto>>();
        public IReadOnlyDictionary<string, long> Prices { get; set; } = new Dictionary<string, long>();
        public IReadOnlyDictionary<string, ClientProgressDto> Clients { get; set; } = new Dictionary<string, ClientProgressDto>();
        public IReadOnlyList<ForecastDto> Forecasts { get; set; } = Array.Empty<ForecastDto>();
        public IReadOnlyList<LegalActionDto> LegalActions { get; set; } = Array.Empty<LegalActionDto>();

        public bool IsLegal(string type, string? assetId = null)
        {
            return LegalActions.Any(action => action.Type == type && (assetId == null || action.AssetId == assetId));
        }

        public int Owned(string assetId) => Inventory.TryGetValue(assetId, out var quantity) ? quantity : 0;

        public int StashedHere(string assetId)
        {
            return Stashes.TryGetValue(LocationId, out var stash) && stash.TryGetValue(assetId, out var holding)
                ? holding.Quantity
                : 0;
        }
    }

    public static class RunProjectionMapper
    {
        public static RunPresentationModel Map(RunProjectionDto source)
        {
            var stashes = source.Stashes.ToDictionary(
                pair => pair.Key,
                pair => (IReadOnlyDictionary<string, StashHoldingDto>)new Dictionary<string, StashHoldingDto>(pair.Value));
            return new RunPresentationModel
            {
                RunId = source.RunId,
                Status = source.Status,
                StateVersion = source.StateVersion,
                Day = source.Day,
                ActionsRemaining = source.ActionsRemaining,
                LocationId = source.LocationId,
                Cash = source.Cash,
                ProtectedReserves = source.ProtectedReserves,
                InventoryCapacity = source.InventoryCapacity,
                Inventory = new Dictionary<string, int>(source.Inventory),
                Stashes = stashes,
                Prices = new Dictionary<string, long>(source.Prices),
                Clients = new Dictionary<string, ClientProgressDto>(source.Clients),
                Forecasts = source.Forecasts.ToArray(),
                LegalActions = source.LegalActions.ToArray()
            };
        }
    }

    public sealed class GameStateStore
    {
        public RunPresentationModel? Current { get; private set; }
        public event Action<RunPresentationModel>? Changed;

        public void Replace(RunProjectionDto projection)
        {
            Current = RunProjectionMapper.Map(projection);
            Changed?.Invoke(Current);
        }

        public void Clear()
        {
            Current = null;
        }
    }
}
