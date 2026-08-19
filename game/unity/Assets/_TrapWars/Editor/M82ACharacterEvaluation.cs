#nullable enable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace TrapWars.EditorTools
{
    public sealed class M82ACharacterEvaluationWindow : EditorWindow
    {
        private GameObject? _hero;
        private GameObject? _ray;
        private RuntimeAnimatorController? _heroController;
        private RuntimeAnimatorController? _rayController;

        [MenuItem("Trap Wars/M8.2A/Character Evaluation")]
        public static void Open() => GetWindow<M82ACharacterEvaluationWindow>("M8.2A Character Evaluation");

        private void OnEnable()
        {
            _hero ??= AssetDatabase.LoadAssetAtPath<GameObject>(M82ACharacterEvaluation.BaselineHeroPath);
            _ray ??= AssetDatabase.LoadAssetAtPath<GameObject>(M82ACharacterEvaluation.BaselineRayPath);
            _heroController ??= AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>(M82ACharacterEvaluation.BaselineHeroControllerPath);
            _rayController ??= AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>(M82ACharacterEvaluation.BaselineRayControllerPath);
        }

        private void OnGUI()
        {
            EditorGUILayout.LabelField("Incoming evaluation package", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox("Assign vendor-delivered prefabs or FBX roots. The current M8.1 characters are loaded only as a known pipeline baseline.", MessageType.Info);
            _hero = (GameObject?)EditorGUILayout.ObjectField("Hero", _hero, typeof(GameObject), false);
            _ray = (GameObject?)EditorGUILayout.ObjectField("Ray", _ray, typeof(GameObject), false);
            _heroController = (RuntimeAnimatorController?)EditorGUILayout.ObjectField("Hero Controller", _heroController, typeof(RuntimeAnimatorController), false);
            _rayController = (RuntimeAnimatorController?)EditorGUILayout.ObjectField("Ray Controller", _rayController, typeof(RuntimeAnimatorController), false);

            EditorGUILayout.Space(8f);
            if (GUILayout.Button("Build / Refresh Evaluation Scene"))
                M82ACharacterEvaluation.BuildEvaluationScene(_hero, _ray, _heroController, _rayController);
            if (GUILayout.Button("Validate Character Package"))
                M82ACharacterEvaluation.ValidateCharacters(_hero, _ray);
            if (GUILayout.Button("Capture Standard Review Cameras"))
                M82ACharacterEvaluation.CaptureStandardReviewCameras();
        }
    }

    public static class M82ACharacterEvaluation
    {
        public const string BaselineHeroPath = "Assets/_TrapWars/Resources/M8/Characters/Processed/PF_Hero_Humanoid_M8_1.prefab";
        public const string BaselineRayPath = "Assets/_TrapWars/Resources/M8/Characters/Processed/PF_Ray_Humanoid_M8_1.prefab";
        public const string BaselineHeroControllerPath = "Assets/_TrapWars/Resources/M8/Animation/AC_Hero_M8.controller";
        public const string BaselineRayControllerPath = "Assets/_TrapWars/Resources/M8/Animation/AC_Ray_M8.controller";
        private const string ScenePath = "Assets/Scenes/M8_2A_CharacterEvaluation.unity";
        private const string ReportRelativePath = "../../../docs/evidence/m8_2a/M8_2A_CHARACTER_INTAKE.txt";
        private const string ScreenshotRelativePath = "../../../docs/evidence/m8_2a/screenshots";

        private static readonly HumanBodyBones[] RequiredBones =
        {
            HumanBodyBones.Hips,
            HumanBodyBones.Spine,
            HumanBodyBones.Head,
            HumanBodyBones.LeftUpperArm,
            HumanBodyBones.LeftLowerArm,
            HumanBodyBones.LeftHand,
            HumanBodyBones.RightUpperArm,
            HumanBodyBones.RightLowerArm,
            HumanBodyBones.RightHand,
            HumanBodyBones.LeftUpperLeg,
            HumanBodyBones.LeftLowerLeg,
            HumanBodyBones.LeftFoot,
            HumanBodyBones.RightUpperLeg,
            HumanBodyBones.RightLowerLeg,
            HumanBodyBones.RightFoot
        };

        [MenuItem("Trap Wars/M8.2A/Build Baseline Evaluation Scene")]
        public static void BuildBaselineEvaluationScene()
        {
            BuildEvaluationScene(
                AssetDatabase.LoadAssetAtPath<GameObject>(BaselineHeroPath),
                AssetDatabase.LoadAssetAtPath<GameObject>(BaselineRayPath),
                AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>(BaselineHeroControllerPath),
                AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>(BaselineRayControllerPath));
        }

        public static void BuildEvaluationScene(GameObject? hero, GameObject? ray, RuntimeAnimatorController? heroController, RuntimeAnimatorController? rayController)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "M8_2A_CharacterEvaluation";
            var root = new GameObject("M8_2A_CHARACTER_EVALUATION");
            CreateBay(root.transform, "Neutral", new Vector3(-6f, 0f, 0f), new Color(0.78f, 0.80f, 0.82f), new Color(0.42f, 0.45f, 0.48f), hero, ray, heroController, rayController);
            CreateBay(root.transform, "Day", Vector3.zero, new Color(1f, 0.86f, 0.68f), new Color(0.48f, 0.62f, 0.76f), hero, ray, heroController, rayController);
            CreateBay(root.transform, "Night", new Vector3(6f, 0f, 0f), new Color(0.30f, 0.46f, 0.72f), new Color(1f, 0.58f, 0.30f), hero, ray, heroController, rayController);
            CreateReviewCameras(root.transform);
            CreateMainCamera(root.transform);

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.16f, 0.17f, 0.19f);
            EditorSceneManager.SaveScene(scene, ScenePath);
            ValidateCharacters(hero, ray);
            Selection.activeGameObject = root;
            Debug.Log($"[M8_2A_EVAL] scene={ScenePath} hero={AssetName(hero)} ray={AssetName(ray)}");
        }

        public static void ValidateCharacters(GameObject? hero, GameObject? ray)
        {
            var lines = new List<string>
            {
                "M8.2A CHARACTER INTAKE VALIDATION",
                $"Generated UTC: {DateTime.UtcNow:O}",
                $"Unity: {Application.unityVersion}",
                "Purpose: technical intake only; owner visual approval remains mandatory.",
                string.Empty
            };
            lines.AddRange(Analyze("HERO", hero));
            lines.Add(string.Empty);
            lines.AddRange(Analyze("RAY", ray));
            lines.Add(string.Empty);
            lines.Add("REQUIRED VISUAL REVIEW: Hero front/three-quarter/side/day/night/phone; Ray front/three-quarter/day/night/dialogue.");
            lines.Add("REQUIRED MOTION TESTS: walk, stop, phone draw, Ray explaining gesture.");

            var reportPath = Path.GetFullPath(Path.Combine(Application.dataPath, ReportRelativePath));
            Directory.CreateDirectory(Path.GetDirectoryName(reportPath)!);
            File.WriteAllLines(reportPath, lines);
            Debug.Log($"[M8_2A_EVAL] report={reportPath}");
        }

        [MenuItem("Trap Wars/M8.2A/Capture Standard Review Cameras")]
        public static void CaptureStandardReviewCameras()
        {
            if (SceneManager.GetActiveScene().path != ScenePath)
                throw new InvalidOperationException($"Open {ScenePath} before capture.");

            var output = Path.GetFullPath(Path.Combine(Application.dataPath, ScreenshotRelativePath));
            Directory.CreateDirectory(output);
            var cameras = UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .Where(camera => camera.name.StartsWith("SHOT_", StringComparison.Ordinal))
                .OrderBy(camera => camera.name)
                .ToArray();
            if (cameras.Length != 11) throw new InvalidOperationException($"Expected 11 standardized review cameras, found {cameras.Length}.");
            foreach (var camera in cameras) Capture(camera, Path.Combine(output, camera.name + ".png"));
            AssetDatabase.Refresh();
            Debug.Log($"[M8_2A_EVAL] screenshots={cameras.Length} output={output}");
        }

        private static IEnumerable<string> Analyze(string role, GameObject? asset)
        {
            if (asset == null) return new[] { $"{role} | FAIL | asset_missing=true" };
            var instance = UnityEngine.Object.Instantiate(asset);
            instance.hideFlags = HideFlags.HideAndDontSave;
            try
            {
                var assetPath = AssetDatabase.GetAssetPath(asset);
                var importer = AssetImporter.GetAtPath(assetPath) as ModelImporter;
                var animator = instance.GetComponentInChildren<Animator>(true);
                var avatarValid = animator?.avatar?.isValid == true;
                var humanoid = animator?.avatar?.isHuman == true;
                var missing = animator == null || !humanoid
                    ? RequiredBones.Select(bone => bone.ToString()).ToArray()
                    : RequiredBones.Where(bone => animator.GetBoneTransform(bone) == null).Select(bone => bone.ToString()).ToArray();
                var skinned = instance.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                var filters = instance.GetComponentsInChildren<MeshFilter>(true);
                var meshes = skinned.Select(renderer => renderer.sharedMesh).Concat(filters.Select(filter => filter.sharedMesh)).Where(mesh => mesh != null).Distinct().ToArray();
                var triangles = meshes.Sum(TriangleCount);
                var renderers = instance.GetComponentsInChildren<Renderer>(true);
                var materials = renderers.SelectMany(renderer => renderer.sharedMaterials).Where(material => material != null).Distinct().ToArray();
                var textures = materials.SelectMany(MaterialTextures).Distinct().OrderBy(texture => texture.name).ToArray();
                var shapes = skinned.Where(renderer => renderer.sharedMesh != null)
                    .SelectMany(renderer => Enumerable.Range(0, renderer.sharedMesh.blendShapeCount).Select(index => renderer.sharedMesh.GetBlendShapeName(index)))
                    .Distinct().OrderBy(name => name).ToArray();
                var lods = instance.GetComponentsInChildren<LODGroup>(true);
                var bounds = CombinedBounds(renderers);
                var scale = instance.transform.localScale;
                var rootIssue = instance.transform.localPosition.sqrMagnitude > 0.0001f
                    || Quaternion.Angle(instance.transform.localRotation, Quaternion.identity) > 0.01f
                    || Mathf.Abs(scale.x - 1f) > 0.001f || Mathf.Abs(scale.y - 1f) > 0.001f || Mathf.Abs(scale.z - 1f) > 0.001f;
                var nonUniformScale = instance.GetComponentsInChildren<Transform>(true).Any(transform =>
                    Mathf.Abs(transform.localScale.x - transform.localScale.y) > 0.001f || Mathf.Abs(transform.localScale.y - transform.localScale.z) > 0.001f);
                var rigType = importer == null ? (humanoid ? "ProcessedPrefab/Humanoid" : "Prefab/Unknown") : importer.animationType.ToString();
                var textureSummary = textures.Length == 0 ? "none" : string.Join(",", textures.Select(texture => $"{texture.name}:{texture.width}x{texture.height}"));
                var geometryInBudget = triangles >= 45000 && triangles <= 80000;
                var renderersInBudget = skinned.Length >= 1 && skinned.Length <= 4;
                var materialsInBudget = materials.Length > 0 && materials.Length <= 12;
                var texturesInBudget = textures.Length > 0 && textures.All(texture => texture.width <= 2048 && texture.height <= 2048);
                var facialMinimum = shapes.Length >= 7;
                var authoredLods = lods.Any(group => group.lodCount >= 3);
                var heightInBudget = bounds.size.y >= 1.65f && bounds.size.y <= 1.95f;
                var automatedGate = avatarValid && humanoid && missing.Length == 0 && geometryInBudget && renderersInBudget
                    && materialsInBudget && texturesInBudget && facialMinimum && authoredLods && heightInBudget && !rootIssue && !nonUniformScale;

                return new[]
                {
                    $"{role} | automated_gate={(automatedGate ? "PASS" : "FAIL")} | asset={assetPath} name={asset.name}",
                    $"rig_type={rigType} avatar_valid={avatarValid} is_human={humanoid} missing_humanoid_bones=[{string.Join(",", missing)}]",
                    $"mesh_count={meshes.Length} skinned_renderer_count={skinned.Length} renderers_in_budget={renderersInBudget} triangles={triangles} geometry_in_budget={geometryInBudget} materials={materials.Length} materials_in_budget={materialsInBudget}",
                    $"texture_count={textures.Length} textures_in_budget={texturesInBudget} texture_sizes=[{textureSummary}]",
                    $"blend_shape_count={shapes.Length} facial_minimum_present={facialMinimum} blend_shape_names=[{string.Join(",", shapes)}]",
                    $"animator_present={animator != null} animator_compatibility={(humanoid ? "Humanoid-ready; verify four vendor test clips" : "FAIL/UNKNOWN")}",
                    $"lod_group_count={lods.Length} authored_lods_present={authoredLods} lod_levels=[{string.Join(",", lods.Select(group => group.lodCount))}]",
                    $"root_scale={scale:F3} mesh_height_m={bounds.size.y:F3} height_in_budget={heightInBudget} root_transform_problem={rootIssue} non_uniform_scale_present={nonUniformScale}"
                };
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(instance);
            }
        }

        private static void CreateBay(Transform parent, string name, Vector3 origin, Color keyColor, Color fillColor, GameObject? hero, GameObject? ray, RuntimeAnimatorController? heroController, RuntimeAnimatorController? rayController)
        {
            var bay = new GameObject($"BAY_{name}").transform;
            bay.SetParent(parent);
            bay.position = origin;
            CreatePrimitive(PrimitiveType.Cube, $"{name}_Floor", bay, new Vector3(0f, -0.1f, 1.2f), new Vector3(5f, 0.2f, 5.5f));
            CreatePrimitive(PrimitiveType.Cube, $"{name}_Backdrop", bay, new Vector3(0f, 2f, 3.85f), new Vector3(5f, 4f, 0.2f));
            CreateLabel(name.ToUpperInvariant(), bay, new Vector3(0f, 3.35f, 3.68f));
            Spawn("Hero", hero, heroController, bay, new Vector3(-1.15f, 0f, 1f));
            Spawn("Ray", ray, rayController, bay, new Vector3(1.15f, 0f, 1f));
            CreateSpot($"{name}_Key", bay, new Vector3(-1.8f, 3.2f, -1.2f), new Vector3(0f, 1.2f, 1f), keyColor, 900f, 55f);
            CreateSpot($"{name}_Fill", bay, new Vector3(2.2f, 2.1f, -0.2f), new Vector3(0f, 1.1f, 1f), fillColor, name == "Night" ? 700f : 500f, 65f);
        }

        private static void Spawn(string role, GameObject? asset, RuntimeAnimatorController? controller, Transform parent, Vector3 localPosition)
        {
            GameObject instance;
            if (asset == null)
            {
                instance = CreatePrimitive(PrimitiveType.Capsule, $"SLOT_{role}_MISSING", parent, localPosition + Vector3.up, new Vector3(0.7f, 1f, 0.7f));
            }
            else
            {
                instance = (GameObject)PrefabUtility.InstantiatePrefab(asset);
                instance.name = $"SLOT_{role}_{asset.name}";
                instance.transform.SetParent(parent);
                instance.transform.localPosition = localPosition;
                instance.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                var animator = instance.GetComponentInChildren<Animator>(true) ?? instance.AddComponent<Animator>();
                if (controller != null) animator.runtimeAnimatorController = controller;
            }
            CreateLabel(role, parent, localPosition + new Vector3(0f, 2.25f, 0f));
        }

        private static GameObject CreatePrimitive(PrimitiveType type, string name, Transform parent, Vector3 localPosition, Vector3 localScale)
        {
            var value = GameObject.CreatePrimitive(type);
            value.name = name;
            value.transform.SetParent(parent);
            value.transform.localPosition = localPosition;
            value.transform.localScale = localScale;
            return value;
        }

        private static void CreateLabel(string text, Transform parent, Vector3 localPosition)
        {
            var label = new GameObject("LABEL_" + text).AddComponent<TextMesh>();
            label.text = text;
            label.anchor = TextAnchor.MiddleCenter;
            label.alignment = TextAlignment.Center;
            label.characterSize = 0.14f;
            label.fontSize = 42;
            label.color = Color.white;
            label.transform.SetParent(parent);
            label.transform.localPosition = localPosition;
            label.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
        }

        private static void CreateSpot(string name, Transform parent, Vector3 localPosition, Vector3 localTarget, Color color, float intensity, float angle)
        {
            var light = new GameObject("LIGHT_" + name).AddComponent<Light>();
            light.type = LightType.Spot;
            light.color = color;
            light.intensity = intensity;
            light.range = 9f;
            light.spotAngle = angle;
            light.shadows = LightShadows.Soft;
            light.transform.SetParent(parent);
            light.transform.localPosition = localPosition;
            light.transform.rotation = Quaternion.LookRotation(parent.TransformPoint(localTarget) - light.transform.position);
        }

        private static void CreateMainCamera(Transform parent)
        {
            var camera = new GameObject("Main Camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.fieldOfView = 42f;
            camera.transform.SetParent(parent);
            camera.transform.position = new Vector3(0f, 4f, -13f);
            camera.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 1.4f, 1f) - camera.transform.position);
        }

        private static void CreateReviewCameras(Transform parent)
        {
            CreateShot(parent, "SHOT_01_Hero_Front", new Vector3(-7.15f, 1.45f, -2.7f), new Vector3(-7.15f, 1.35f, 1f));
            CreateShot(parent, "SHOT_02_Hero_ThreeQuarter", new Vector3(-9.5f, 1.6f, -1.3f), new Vector3(-7.15f, 1.35f, 1f));
            CreateShot(parent, "SHOT_03_Hero_Side", new Vector3(-10.4f, 1.45f, 1f), new Vector3(-7.15f, 1.35f, 1f));
            CreateShot(parent, "SHOT_04_Hero_Day", new Vector3(-1.15f, 1.45f, -2.7f), new Vector3(-1.15f, 1.35f, 1f));
            CreateShot(parent, "SHOT_05_Hero_Night", new Vector3(4.85f, 1.45f, -2.7f), new Vector3(4.85f, 1.35f, 1f));
            CreateShot(parent, "SHOT_06_Hero_Phone", new Vector3(-8.8f, 1.65f, -2.1f), new Vector3(-7.15f, 1.45f, 1f));
            CreateShot(parent, "SHOT_07_Ray_Front", new Vector3(-4.85f, 1.45f, -2.7f), new Vector3(-4.85f, 1.35f, 1f));
            CreateShot(parent, "SHOT_08_Ray_ThreeQuarter", new Vector3(-3f, 1.6f, -1.2f), new Vector3(-4.85f, 1.35f, 1f));
            CreateShot(parent, "SHOT_09_Ray_Day", new Vector3(1.15f, 1.45f, -2.7f), new Vector3(1.15f, 1.35f, 1f));
            CreateShot(parent, "SHOT_10_Ray_Night", new Vector3(7.15f, 1.45f, -2.7f), new Vector3(7.15f, 1.35f, 1f));
            CreateShot(parent, "SHOT_11_Ray_Dialogue", new Vector3(-3.2f, 1.7f, -1.9f), new Vector3(-4.85f, 1.45f, 1f));
        }

        private static void CreateShot(Transform parent, string name, Vector3 position, Vector3 target)
        {
            var camera = new GameObject(name).AddComponent<Camera>();
            camera.enabled = false;
            camera.fieldOfView = 32f;
            camera.nearClipPlane = 0.05f;
            camera.transform.SetParent(parent);
            camera.transform.position = position;
            camera.transform.rotation = Quaternion.LookRotation(target - position);
        }

        private static void Capture(Camera camera, string path)
        {
            var target = RenderTexture.GetTemporary(1280, 720, 24, RenderTextureFormat.ARGB32);
            var previous = RenderTexture.active;
            var texture = new Texture2D(1280, 720, TextureFormat.RGB24, false);
            try
            {
                camera.targetTexture = target;
                camera.Render();
                RenderTexture.active = target;
                texture.ReadPixels(new Rect(0f, 0f, 1280f, 720f), 0, 0);
                texture.Apply();
                File.WriteAllBytes(path, texture.EncodeToPNG());
            }
            finally
            {
                camera.targetTexture = null;
                RenderTexture.active = previous;
                RenderTexture.ReleaseTemporary(target);
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        private static IEnumerable<Texture> MaterialTextures(Material material)
        {
            foreach (var property in material.GetTexturePropertyNames())
            {
                var texture = material.GetTexture(property);
                if (texture != null) yield return texture;
            }
        }

        private static int TriangleCount(Mesh mesh)
        {
            var count = 0L;
            for (var subMesh = 0; subMesh < mesh.subMeshCount; subMesh++) count += (long)mesh.GetIndexCount(subMesh) / 3L;
            return count > int.MaxValue ? int.MaxValue : (int)count;
        }

        private static Bounds CombinedBounds(Renderer[] renderers)
        {
            if (renderers.Length == 0) return new Bounds(Vector3.zero, Vector3.zero);
            var bounds = renderers[0].bounds;
            foreach (var renderer in renderers.Skip(1)) bounds.Encapsulate(renderer.bounds);
            return bounds;
        }

        private static string AssetName(UnityEngine.Object? value) => value == null ? "missing" : value.name;
    }
}
