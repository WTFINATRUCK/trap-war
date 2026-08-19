using Newtonsoft.Json;
using UnityEngine;

namespace TrapWars.Services
{
    // M7 development resume only. Production must use platform-secure token storage.
    public sealed class DevProjectionPersistence : ISaveProjectionService
    {
        private const string Key = "trap_wars.m7.resume.v1";

        public LocalResumeRecord? Load()
        {
            var value = PlayerPrefs.GetString(Key, string.Empty);
            if (string.IsNullOrWhiteSpace(value)) return null;
            try
            {
                return JsonConvert.DeserializeObject<LocalResumeRecord>(value);
            }
            catch (JsonException)
            {
                Clear();
                return null;
            }
        }

        public void Save(LocalResumeRecord record)
        {
            PlayerPrefs.SetString(Key, JsonConvert.SerializeObject(record));
            PlayerPrefs.Save();
        }

        public void Clear()
        {
            PlayerPrefs.DeleteKey(Key);
            PlayerPrefs.Save();
        }
    }
}
