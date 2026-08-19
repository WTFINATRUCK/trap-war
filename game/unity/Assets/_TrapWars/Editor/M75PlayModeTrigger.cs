using System.IO;
using UnityEditor;
using UnityEngine;

namespace TrapWars.EditorTools
{
    public static class M75PlayModeTrigger
    {
        private static bool enterPlayWhenReady;
        private static double requestedAt;

        [InitializeOnLoadMethod]
        private static void Initialize()
        {
            if (Application.isBatchMode) return;
            var trigger = Path.GetFullPath(Path.Combine(Application.dataPath, "../Temp/M75FreshPlay2.trigger"));
            if (!File.Exists(trigger)) return;
            File.Delete(trigger);
            PlayerPrefs.DeleteKey("trap_wars.m7.resume.v1");
            PlayerPrefs.Save();
            enterPlayWhenReady = true;
            requestedAt = EditorApplication.timeSinceStartup;
            EditorApplication.update -= EnterPlayMode;
            EditorApplication.update += EnterPlayMode;
        }

        private static void EnterPlayMode()
        {
            if (!enterPlayWhenReady) return;
            if (EditorApplication.isPlaying)
            {
                enterPlayWhenReady = false;
                EditorApplication.update -= EnterPlayMode;
                return;
            }
            if (EditorApplication.isCompiling || EditorApplication.isUpdating || EditorApplication.timeSinceStartup < requestedAt + 1d) return;
            enterPlayWhenReady = false;
            EditorApplication.update -= EnterPlayMode;
            Debug.Log("[M7_5_RUNTIME] entering fresh Play Mode from one-shot trigger");
            EditorApplication.isPlaying = true;
        }
    }
}
