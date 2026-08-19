using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using TrapWars.Networking;
using TrapWars.State;

namespace TrapWars.Services
{
    public sealed class AuthenticatedSession
    {
        public string AccessToken { get; set; } = string.Empty;
        public string PlayerId { get; set; } = string.Empty;
        public string ExpiresAt { get; set; } = string.Empty;
    }

    public sealed class LocalResumeRecord
    {
        public string AccessToken { get; set; } = string.Empty;
        public string PlayerId { get; set; } = string.Empty;
        public string ExpiresAt { get; set; } = string.Empty;
        public string RunId { get; set; } = string.Empty;
    }

    public interface IAuthenticationService
    {
        Task<AuthenticatedSession> AuthenticateAsync(CancellationToken cancellationToken);
        void Invalidate();
    }

    public interface IGameRunService
    {
        Task<ApiCallResult<RunEnvelopeDto>> LoadOrCreateAsync(CancellationToken cancellationToken);
        Task<ApiCallResult<RunEnvelopeDto>> RefreshAsync(CancellationToken cancellationToken);
        Task<ApiCallResult<RunEnvelopeDto>> SubmitAsync(RunCommandRequestDto command, CancellationToken cancellationToken);
    }

    public interface ISaveProjectionService
    {
        LocalResumeRecord? Load();
        void Save(LocalResumeRecord record);
        void Clear();
    }

    public interface IAnalyticsService
    {
        void Track(string eventName, IReadOnlyDictionary<string, object>? properties = null);
        Task FlushAsync(CancellationToken cancellationToken);
    }

    public enum GameFeelAudioCue
    {
        PhoneClose,
        Door,
        Dialogue,
        Invalid,
        Investigation,
        Consequence
    }

    public interface IAudioService
    {
        float MasterVolume { get; set; }
        void PlayUi();
        void PlayPhone();
        void PlayTrade();
        void PlayTransition();
        void PlayFootstep(float intensity);
        void PlayCue(GameFeelAudioCue cue);
        void SetStreetAmbience(bool active);
    }

    public interface IDialogueService
    {
        bool IsOpen { get; }
        void Present(Dialogue.DialogueSequence sequence, Action? completed = null);
        void Advance(int choiceIndex = -1);
        void Close();
    }

    public sealed class NetworkStatus
    {
        public bool CommandInProgress { get; private set; }
        public string Message { get; private set; } = string.Empty;
        public event Action? Changed;

        public void SetBusy(bool busy, string message = "")
        {
            CommandInProgress = busy;
            Message = message;
            Changed?.Invoke();
        }
    }
}
