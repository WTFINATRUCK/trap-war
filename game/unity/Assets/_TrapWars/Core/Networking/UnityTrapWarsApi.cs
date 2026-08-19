using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using TrapWars.Config;
using UnityEngine.Networking;

namespace TrapWars.Networking
{
    public sealed class UnityTrapWarsApi : ITrapWarsApi
    {
        private readonly TrapWarsRuntimeConfig config;
        private readonly JsonSerializerSettings jsonSettings = new()
        {
            NullValueHandling = NullValueHandling.Ignore,
            MissingMemberHandling = MissingMemberHandling.Ignore
        };

        public UnityTrapWarsApi(TrapWarsRuntimeConfig config)
        {
            this.config = config;
        }

        public Task<ApiCallResult<GuestAuthResponseDto>> CreateGuestAsync(CancellationToken cancellationToken) =>
            SendAsync<GuestAuthResponseDto>("POST", "/api/v1/auth/guest", "{}", null, null, cancellationToken);

        public Task<ApiCallResult<RunEnvelopeDto>> CreateRunAsync(string accessToken, string idempotencyKey, CancellationToken cancellationToken) =>
            SendAsync<RunEnvelopeDto>("POST", "/api/v1/runs", "{}", accessToken, idempotencyKey, cancellationToken);

        public Task<ApiCallResult<RunEnvelopeDto>> LoadRunAsync(string accessToken, string runId, CancellationToken cancellationToken) =>
            SendAsync<RunEnvelopeDto>("GET", $"/api/v1/runs/{UnityWebRequest.EscapeURL(runId)}", null, accessToken, null, cancellationToken);

        public Task<ApiCallResult<RunEnvelopeDto>> SubmitCommandAsync(string accessToken, string runId, string idempotencyKey, RunCommandRequestDto command, CancellationToken cancellationToken)
        {
            var body = JsonConvert.SerializeObject(command, jsonSettings);
            return SendAsync<RunEnvelopeDto>("POST", $"/api/v1/runs/{UnityWebRequest.EscapeURL(runId)}/commands", body, accessToken, idempotencyKey, cancellationToken);
        }

        private async Task<ApiCallResult<T>> SendAsync<T>(string method, string path, string? body, string? accessToken, string? idempotencyKey, CancellationToken cancellationToken)
        {
            var attempts = method == "GET" || !string.IsNullOrWhiteSpace(idempotencyKey) ? config.TransportRetryCount + 1 : 1;
            ApiCallResult<T>? lastResult = null;
            for (var attempt = 0; attempt < attempts; attempt++)
            {
                lastResult = await SendOnceAsync<T>(method, path, body, accessToken, idempotencyKey, cancellationToken);
                if (lastResult.IsSuccess || !ShouldRetry(lastResult.StatusCode, lastResult.Error))
                {
                    return lastResult;
                }

                await Task.Delay(TimeSpan.FromMilliseconds(250 * (attempt + 1)), cancellationToken);
            }

            return lastResult!;
        }

        private async Task<ApiCallResult<T>> SendOnceAsync<T>(string method, string path, string? body, string? accessToken, string? idempotencyKey, CancellationToken cancellationToken)
        {
            using var request = new UnityWebRequest(config.ApiBaseUrl.TrimEnd('/') + path, method);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.timeout = config.RequestTimeoutSeconds;
            request.SetRequestHeader("Accept", "application/json");
            request.SetRequestHeader("X-Request-Id", $"unity-{Guid.NewGuid():N}");
            if (body != null)
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                request.SetRequestHeader("Content-Type", "application/json");
            }
            if (!string.IsNullOrWhiteSpace(accessToken)) request.SetRequestHeader("Authorization", $"Bearer {accessToken}");
            if (!string.IsNullOrWhiteSpace(idempotencyKey)) request.SetRequestHeader("Idempotency-Key", idempotencyKey);

            var operation = request.SendWebRequest();
            while (!operation.isDone)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    request.Abort();
                    cancellationToken.ThrowIfCancellationRequested();
                }
                await Task.Yield();
            }

            var responseBody = request.downloadHandler.text;
            if (request.result == UnityWebRequest.Result.Success)
            {
                var value = JsonConvert.DeserializeObject<T>(responseBody, jsonSettings);
                if (value == null)
                {
                    return ApiCallResult<T>.Failure(TransportError("INVALID_RESPONSE", "The server returned an unreadable response."), request.responseCode);
                }
                return ApiCallResult<T>.Success(value, request.responseCode);
            }

            if (!string.IsNullOrWhiteSpace(responseBody))
            {
                try
                {
                    var envelope = JsonConvert.DeserializeObject<ApiErrorEnvelopeDto>(responseBody, jsonSettings);
                    if (envelope?.Error != null && !string.IsNullOrWhiteSpace(envelope.Error.Code))
                    {
                        return ApiCallResult<T>.Failure(envelope.Error, request.responseCode);
                    }
                }
                catch (JsonException)
                {
                }
            }

            return ApiCallResult<T>.Failure(TransportError("CONNECTION_LOST", request.error ?? "The backend is unavailable."), request.responseCode);
        }

        private static bool ShouldRetry(long statusCode, ApiErrorDto? error) =>
            error?.Code == "CONNECTION_LOST" || statusCode == 0 || statusCode >= 500;

        private static ApiErrorDto TransportError(string code, string message) => new() { Code = code, Message = message };
    }
}
