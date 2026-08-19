using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using TrapWars.Config;
using TrapWars.Services;
using TrapWars.State;
using UnityEngine;

namespace TrapWars.Analytics
{
    public sealed class BufferedAnalyticsService : IAnalyticsService
    {
        private const int Capacity = 256;
        private readonly Queue<AnalyticsObservation> queue = new();
        private readonly TrapWarsRuntimeConfig config;
        private readonly GameStateStore state;
        private long sequence;
        private readonly string sessionId = Guid.NewGuid().ToString("N");

        public BufferedAnalyticsService(TrapWarsRuntimeConfig config, GameStateStore state)
        {
            this.config = config;
            this.state = state;
        }

        public void Track(string eventName, IReadOnlyDictionary<string, object>? properties = null)
        {
            try
            {
                if (queue.Count >= Capacity) queue.Dequeue();
                queue.Enqueue(new AnalyticsObservation
                {
                    EventId = Guid.NewGuid().ToString("N"),
                    EventName = eventName,
                    OccurredAt = DateTimeOffset.UtcNow.ToString("O"),
                    SessionId = sessionId,
                    RunId = state.Current?.RunId ?? string.Empty,
                    SequenceNumber = ++sequence,
                    Source = "unity",
                    Authority = "client_observation",
                    Environment = config.Environment.ToString().ToLowerInvariant(),
                    BuildVersion = Application.version,
                    Platform = Application.platform.ToString().ToLowerInvariant(),
                    Properties = properties == null ? new Dictionary<string, object>() : new Dictionary<string, object>(properties)
                });
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"Analytics observation dropped: {exception.Message}");
            }
        }

        public Task FlushAsync(CancellationToken cancellationToken)
        {
            try
            {
                while (queue.Count > 0 && !cancellationToken.IsCancellationRequested)
                {
                    var observation = queue.Dequeue();
#if UNITY_EDITOR || DEVELOPMENT_BUILD
                    Debug.Log($"[analytics] {JsonConvert.SerializeObject(observation)}");
#endif
                }
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"Analytics flush failed without blocking gameplay: {exception.Message}");
            }
            return Task.CompletedTask;
        }

        [Serializable]
        private sealed class AnalyticsObservation
        {
            [JsonProperty("event_id")] public string EventId = string.Empty;
            [JsonProperty("event_name")] public string EventName = string.Empty;
            [JsonProperty("occurred_at")] public string OccurredAt = string.Empty;
            [JsonProperty("session_id")] public string SessionId = string.Empty;
            [JsonProperty("run_id")] public string RunId = string.Empty;
            [JsonProperty("sequence_number")] public long SequenceNumber;
            [JsonProperty("source")] public string Source = "unity";
            [JsonProperty("authority")] public string Authority = "client_observation";
            [JsonProperty("environment")] public string Environment = string.Empty;
            [JsonProperty("build_version")] public string BuildVersion = string.Empty;
            [JsonProperty("platform")] public string Platform = string.Empty;
            [JsonProperty("properties")] public Dictionary<string, object> Properties = new();
        }
    }
}
