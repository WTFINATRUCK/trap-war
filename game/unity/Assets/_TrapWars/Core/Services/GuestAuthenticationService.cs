using System;
using System.Threading;
using System.Threading.Tasks;
using TrapWars.Networking;

namespace TrapWars.Services
{
    public sealed class GuestAuthenticationService : IAuthenticationService
    {
        private readonly ITrapWarsApi api;
        private readonly ISaveProjectionService persistence;
        private AuthenticatedSession? current;

        public GuestAuthenticationService(ITrapWarsApi api, ISaveProjectionService persistence)
        {
            this.api = api;
            this.persistence = persistence;
        }

        public async Task<AuthenticatedSession> AuthenticateAsync(CancellationToken cancellationToken)
        {
            if (current != null) return current;
            var saved = persistence.Load();
            if (saved != null && DateTimeOffset.TryParse(saved.ExpiresAt, out var expiry) && expiry > DateTimeOffset.UtcNow.AddMinutes(1))
            {
                current = new AuthenticatedSession { AccessToken = saved.AccessToken, PlayerId = saved.PlayerId, ExpiresAt = saved.ExpiresAt };
                return current;
            }

            var result = await api.CreateGuestAsync(cancellationToken);
            if (!result.IsSuccess || result.Value == null)
            {
                throw new InvalidOperationException(result.Error?.Message ?? "Guest authentication failed.");
            }

            current = new AuthenticatedSession
            {
                AccessToken = result.Value.AccessToken,
                PlayerId = result.Value.Player.PlayerId,
                ExpiresAt = result.Value.ExpiresAt
            };
            persistence.Save(new LocalResumeRecord
            {
                AccessToken = current.AccessToken,
                PlayerId = current.PlayerId,
                ExpiresAt = current.ExpiresAt,
                RunId = saved?.RunId ?? string.Empty
            });
            return current;
        }

        public void Invalidate()
        {
            current = null;
            persistence.Clear();
        }
    }
}
