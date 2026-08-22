using System;
using UnityEngine;

namespace TrapWars.Config
{
    public enum ApiEnvironment
    {
        Local,
        Staging,
        Production
    }

    [CreateAssetMenu(menuName = "Trap Wars/Runtime Configuration", fileName = "TrapWarsRuntimeConfig")]
    public sealed class TrapWarsRuntimeConfig : ScriptableObject
    {
        [SerializeField] private ApiEnvironment environment = ApiEnvironment.Local;
        [SerializeField] private string localApiBaseUrl = "http://127.0.0.1:8787";
        [SerializeField] private string stagingApiBaseUrl = "https://staging-api.example.invalid";
        [SerializeField] private string productionApiBaseUrl = "https://api.example.invalid";
        [SerializeField] private bool useMockApi;
        [SerializeField, Min(3)] private int requestTimeoutSeconds = 15;
        [SerializeField, Range(0, 3)] private int transportRetryCount = 2;
        [SerializeField, Range(0.25f, 2f)] private float lookSensitivity = 0.8f;

        public ApiEnvironment Environment => environment;
        public bool UseMockApi => useMockApi;
        public int RequestTimeoutSeconds => requestTimeoutSeconds;
        public int TransportRetryCount => transportRetryCount;
        public float LookSensitivity => lookSensitivity;

        public string ApiBaseUrl => WebApiBaseUrl();

        private string WebApiBaseUrl()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            if (Uri.TryCreate(Application.absoluteURL, UriKind.Absolute, out var current))
                return current.GetLeftPart(UriPartial.Authority);
#endif
            return environment switch
        {
            ApiEnvironment.Local => localApiBaseUrl,
            ApiEnvironment.Staging => stagingApiBaseUrl,
            ApiEnvironment.Production => productionApiBaseUrl,
            _ => throw new ArgumentOutOfRangeException()
        };
        }

        public static TrapWarsRuntimeConfig LoadOrCreate()
        {
            var configured = Resources.Load<TrapWarsRuntimeConfig>("TrapWarsRuntimeConfig");
            if (configured != null)
            {
                return configured;
            }

            var fallback = CreateInstance<TrapWarsRuntimeConfig>();
            fallback.name = "Runtime Configuration (Defaults)";
            return fallback;
        }

#if UNITY_EDITOR
        public void ConfigureForTests(ApiEnvironment targetEnvironment, string localUrl, bool mock)
        {
            environment = targetEnvironment;
            localApiBaseUrl = localUrl;
            useMockApi = mock;
        }
#endif
    }
}
