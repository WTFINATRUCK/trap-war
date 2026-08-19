using System.Threading;
using System.Threading.Tasks;

namespace TrapWars.Networking
{
    public interface ITrapWarsApi
    {
        Task<ApiCallResult<GuestAuthResponseDto>> CreateGuestAsync(CancellationToken cancellationToken);
        Task<ApiCallResult<RunEnvelopeDto>> CreateRunAsync(string accessToken, string idempotencyKey, CancellationToken cancellationToken);
        Task<ApiCallResult<RunEnvelopeDto>> LoadRunAsync(string accessToken, string runId, CancellationToken cancellationToken);
        Task<ApiCallResult<RunEnvelopeDto>> SubmitCommandAsync(string accessToken, string runId, string idempotencyKey, RunCommandRequestDto command, CancellationToken cancellationToken);
    }
}
