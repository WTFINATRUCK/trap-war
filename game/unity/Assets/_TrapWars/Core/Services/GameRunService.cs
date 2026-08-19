using System;
using System.Threading;
using System.Threading.Tasks;
using TrapWars.Networking;
using TrapWars.State;

namespace TrapWars.Services
{
    public sealed class GameRunService : IGameRunService
    {
        private readonly ITrapWarsApi api;
        private readonly IAuthenticationService authentication;
        private readonly ISaveProjectionService persistence;
        private readonly GameStateStore state;
        private readonly NetworkStatus networkStatus;

        public GameRunService(ITrapWarsApi api, IAuthenticationService authentication, ISaveProjectionService persistence, GameStateStore state, NetworkStatus networkStatus)
        {
            this.api = api;
            this.authentication = authentication;
            this.persistence = persistence;
            this.state = state;
            this.networkStatus = networkStatus;
        }

        public async Task<ApiCallResult<RunEnvelopeDto>> LoadOrCreateAsync(CancellationToken cancellationToken)
        {
            var session = await authentication.AuthenticateAsync(cancellationToken);
            var saved = persistence.Load();
            if (!string.IsNullOrWhiteSpace(saved?.RunId))
            {
                var loaded = await ExecuteVisibleAsync(() => api.LoadRunAsync(session.AccessToken, saved.RunId, cancellationToken), "Loading your run...");
                if (loaded.IsSuccess)
                {
                    Apply(loaded.Value!);
                    return loaded;
                }
                if (loaded.StatusCode == 401)
                {
                    authentication.Invalidate();
                    session = await authentication.AuthenticateAsync(cancellationToken);
                }
                else if (loaded.Error?.Code != "RUN_NOT_FOUND")
                {
                    return loaded;
                }
            }

            var key = $"unity-create-{Guid.NewGuid():N}";
            var created = await ExecuteVisibleAsync(() => api.CreateRunAsync(session.AccessToken, key, cancellationToken), "Starting a new run...");
            if (created.IsSuccess)
            {
                Apply(created.Value!);
                SaveResume(session, created.Value!.Run.RunId);
            }
            return created;
        }

        public async Task<ApiCallResult<RunEnvelopeDto>> RefreshAsync(CancellationToken cancellationToken)
        {
            var session = await authentication.AuthenticateAsync(cancellationToken);
            var runId = state.Current?.RunId ?? persistence.Load()?.RunId;
            if (string.IsNullOrWhiteSpace(runId)) return await LoadOrCreateAsync(cancellationToken);
            var result = await ExecuteVisibleAsync(() => api.LoadRunAsync(session.AccessToken, runId, cancellationToken), "Refreshing server state...");
            if (result.IsSuccess) Apply(result.Value!);
            return result;
        }

        public async Task<ApiCallResult<RunEnvelopeDto>> SubmitAsync(RunCommandRequestDto command, CancellationToken cancellationToken)
        {
            var session = await authentication.AuthenticateAsync(cancellationToken);
            var runId = state.Current?.RunId;
            if (string.IsNullOrWhiteSpace(runId)) throw new InvalidOperationException("No authoritative run is loaded.");
            var idempotencyKey = $"idem-{command.CommandId}";
            var result = await ExecuteVisibleAsync(
                () => api.SubmitCommandAsync(session.AccessToken, runId, idempotencyKey, command, cancellationToken),
                "Waiting for the block...");
            if (result.IsSuccess)
            {
                Apply(result.Value!);
            }
            else if (result.Error?.Code == "STATE_CONFLICT" && result.Error.ReconciliationRun != null)
            {
                state.Replace(result.Error.ReconciliationRun);
            }
            return result;
        }

        private async Task<ApiCallResult<RunEnvelopeDto>> ExecuteVisibleAsync(Func<Task<ApiCallResult<RunEnvelopeDto>>> operation, string message)
        {
            networkStatus.SetBusy(true, message);
            try
            {
                return await operation();
            }
            finally
            {
                networkStatus.SetBusy(false);
            }
        }

        private void Apply(RunEnvelopeDto envelope)
        {
            state.Replace(envelope.Run);
        }

        private void SaveResume(AuthenticatedSession session, string runId)
        {
            persistence.Save(new LocalResumeRecord
            {
                AccessToken = session.AccessToken,
                PlayerId = session.PlayerId,
                ExpiresAt = session.ExpiresAt,
                RunId = runId
            });
        }
    }
}
