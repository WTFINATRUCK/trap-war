using System;

namespace TrapWars.Networking
{
    public static class CommandFactory
    {
        public static RunCommandRequestDto Buy(long version, string assetId, int quantity) => Create(version, "BuyAsset", new AssetQuantityPayloadDto { AssetId = assetId, Quantity = quantity });
        public static RunCommandRequestDto Sell(long version, string assetId, int quantity) => Create(version, "SellAsset", new AssetQuantityPayloadDto { AssetId = assetId, Quantity = quantity });
        public static RunCommandRequestDto Deposit(long version, string assetId, int quantity) => Create(version, "DepositStash", new AssetQuantityPayloadDto { AssetId = assetId, Quantity = quantity });
        public static RunCommandRequestDto Withdraw(long version, string locationId, string assetId, int quantity) => Create(version, "WithdrawStash", new WithdrawPayloadDto { LocationId = locationId, AssetId = assetId, Quantity = quantity });
        public static RunCommandRequestDto EndDay(long version) => Create(version, "EndDay", new EmptyPayloadDto());
        public static RunCommandRequestDto EndRun(long version) => Create(version, "EndRun", new EmptyPayloadDto());

        private static RunCommandRequestDto Create(long version, string type, object payload)
        {
            return new RunCommandRequestDto
            {
                CommandId = $"unity-{Guid.NewGuid():N}",
                ExpectedStateVersion = version,
                CommandType = type,
                Payload = payload
            };
        }
    }
}
