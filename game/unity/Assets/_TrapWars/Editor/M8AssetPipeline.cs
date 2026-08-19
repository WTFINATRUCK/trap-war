using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace TrapWars.EditorTools
{
    public sealed class M8AssetPostprocessor : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            var isCharacter = assetPath.Contains("/_TrapWars/Resources/M8/Characters/", StringComparison.Ordinal);
            if (isCharacter
                || assetPath.Contains("/_TrapWars/Resources/M8/Animation/", StringComparison.Ordinal) && assetPath.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase))
            {
                var importer = (ModelImporter)assetImporter;
                importer.animationType = isCharacter ? ModelImporterAnimationType.Generic : ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                importer.importAnimation = true;
                importer.importBlendShapes = true;
                importer.importCameras = false;
                importer.importLights = false;
                importer.meshCompression = ModelImporterMeshCompression.Medium;
                importer.isReadable = false;
                importer.optimizeGameObjects = false;
                importer.resampleCurves = false;
            }
            else if (assetPath.Contains("/_TrapWars/Resources/M8/Environment/", StringComparison.Ordinal))
            {
                var importer = (ModelImporter)assetImporter;
                importer.animationType = ModelImporterAnimationType.None;
                importer.importAnimation = false;
                importer.importCameras = false;
                importer.importLights = false;
                importer.meshCompression = ModelImporterMeshCompression.Medium;
                importer.isReadable = false;
                importer.addCollider = false;
            }
        }

        private void OnPreprocessTexture()
        {
            if (!assetPath.Contains("/_TrapWars/Resources/M8/", StringComparison.Ordinal)) return;
            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = true;
            importer.mipmapEnabled = true;
            importer.streamingMipmaps = true;
            importer.maxTextureSize = assetPath.Contains("/Decals/", StringComparison.Ordinal) ? 2048 : 1024;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
        }
    }

    public static class M8AssetPipeline
    {
        private const string CharacterRoot = "Assets/_TrapWars/Resources/M8/Characters";
        private const string ProcessedCharacterRoot = "Assets/_TrapWars/Resources/M8/Characters/Processed";
        private const string ControllerRoot = "Assets/_TrapWars/Resources/M8/Animation";
        private const string AnimationSource = "Assets/_TrapWars/Resources/M8/Animation/AN_Quaternius_Human_M8.fbx";

        private sealed class CharacterSpec
        {
            public string Model = string.Empty;
            public string Controller = string.Empty;
            public string RuntimePrefab = string.Empty;
        }

        [MenuItem("Trap Wars/M8/Rebuild Production Assets")]
        public static void BuildAll()
        {
            Directory.CreateDirectory(ControllerRoot);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            ConfigureAnimationSource();
            var specs = new[]
            {
                new CharacterSpec { Model = "SK_Hero_Casual2", Controller = "AC_Hero_M8", RuntimePrefab = "PF_Hero_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Ray_Casual3", Controller = "AC_Ray_M8", RuntimePrefab = "PF_Ray_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Crowd_Female_A", Controller = "AC_Crowd_A_M8", RuntimePrefab = "PF_Crowd_A_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Crowd_Female_B", Controller = "AC_Crowd_B_M8", RuntimePrefab = "PF_Crowd_B_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Crowd_Female_C", Controller = "AC_Crowd_C_M8", RuntimePrefab = "PF_Crowd_C_Humanoid_M8_1" }
            };

            Directory.CreateDirectory(ProcessedCharacterRoot);
            foreach (var spec in specs)
                AssetDatabase.ImportAsset($"{CharacterRoot}/{spec.Model}.fbx", ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
            foreach (var spec in specs) BuildProcessedHumanoid(spec);
            foreach (var spec in specs) BuildController(spec);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            ValidateCharacterRigs(specs);
            ValidateAssets();
            Debug.Log("[M8_PIPELINE] Build complete. Runtime controllers and validation report are current.");
        }

        private static void ConfigureAnimationSource()
        {
            var importer = AssetImporter.GetAtPath(AnimationSource) as ModelImporter
                ?? throw new InvalidOperationException($"Missing animation source importer: {AnimationSource}");
            var clips = importer.defaultClipAnimations;
            foreach (var clip in clips)
            {
                var locomotion = clip.name.Contains("Idle", StringComparison.OrdinalIgnoreCase)
                    || clip.name.Contains("Walk", StringComparison.OrdinalIgnoreCase)
                    || clip.name.Contains("Run", StringComparison.OrdinalIgnoreCase);
                var sustainedPose = clip.name.Contains("Working", StringComparison.OrdinalIgnoreCase);
                clip.loopTime = locomotion || sustainedPose;
                clip.loopPose = locomotion || sustainedPose;
                clip.lockRootRotation = true;
                clip.lockRootHeightY = true;
                clip.lockRootPositionXZ = true;
                clip.keepOriginalOrientation = false;
                clip.keepOriginalPositionY = true;
                clip.keepOriginalPositionXZ = false;
                clip.heightFromFeet = true;
            }
            importer.clipAnimations = clips;
            importer.SaveAndReimport();
            Debug.Log($"[M8_PIPELINE] animation_source={AnimationSource} clips={clips.Length} locomotion_policy=controller-driven_in-place_looped");
        }

        private static void BuildProcessedHumanoid(CharacterSpec spec)
        {
            var sourcePath = $"{CharacterRoot}/{spec.Model}.fbx";
            var prefabPath = $"{ProcessedCharacterRoot}/{spec.RuntimePrefab}.prefab";
            var avatarPath = $"{ProcessedCharacterRoot}/AV_{spec.RuntimePrefab}.asset";
            var source = AssetDatabase.LoadAssetAtPath<GameObject>(sourcePath)
                ?? throw new InvalidOperationException($"Missing character source: {sourcePath}");
            var instance = UnityEngine.Object.Instantiate(source);
            instance.name = spec.RuntimePrefab;
            try
            {
                RenameRendererObjects(instance);
                Reparent(instance, "UpperLeg.L", "Hips");
                Reparent(instance, "UpperLeg.R", "Hips");
                Reparent(instance, "Foot.L", "LowerLeg.L");
                Reparent(instance, "Foot.R", "LowerLeg.R");

                var description = CharacterHumanDescription(instance);
                var generatedAvatar = AvatarBuilder.BuildHumanAvatar(instance, description);
                generatedAvatar.name = $"AV_{spec.RuntimePrefab}";
                if (!generatedAvatar.isValid || !generatedAvatar.isHuman)
                    throw new InvalidOperationException($"Unable to build Humanoid avatar for {spec.Model} after hierarchy repair.");

                AssetDatabase.DeleteAsset(avatarPath);
                AssetDatabase.CreateAsset(generatedAvatar, avatarPath);
                var animator = instance.GetComponentInChildren<Animator>(true) ?? instance.AddComponent<Animator>();
                animator.avatar = AssetDatabase.LoadAssetAtPath<Avatar>(avatarPath);
                animator.applyRootMotion = false;
                AssetDatabase.DeleteAsset(prefabPath);
                PrefabUtility.SaveAsPrefabAsset(instance, prefabPath);
                Debug.Log($"[M8_1_RIG] processed={prefabPath} avatar={avatarPath} humanoid={animator.avatar.isHuman}");
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(instance);
            }
        }

        private static void RenameRendererObjects(GameObject instance)
        {
            foreach (var renderer in instance.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (renderer.name == "Body") renderer.name = "BodyMesh";
        }

        private static void Reparent(GameObject instance, string childName, string parentName)
        {
            var transforms = instance.GetComponentsInChildren<Transform>(true);
            var child = transforms.Single(value => value.name == childName);
            var parent = transforms.Single(value => value.name == parentName);
            child.SetParent(parent, true);
        }

        private static HumanDescription CharacterHumanDescription(GameObject instance) => new()
        {
            human = CharacterHumanBones(),
            skeleton = instance.GetComponentsInChildren<Transform>(true).Select(value => new SkeletonBone
            {
                name = value.name,
                position = value.localPosition,
                rotation = value.localRotation,
                scale = value.localScale
            }).ToArray(),
            upperArmTwist = 0.5f,
            lowerArmTwist = 0.5f,
            upperLegTwist = 0.5f,
            lowerLegTwist = 0.5f,
            armStretch = 0.05f,
            legStretch = 0.05f,
            feetSpacing = 0f,
            hasTranslationDoF = false
        };

        private static HumanBone[] CharacterHumanBones() => new[]
        {
            Map("Hips", "Hips"), Map("Abdomen", "Spine"), Map("Torso", "Chest"), Map("Neck", "Neck"), Map("Head", "Head"),
            Map("Shoulder.L", "LeftShoulder"), Map("UpperArm.L", "LeftUpperArm"), Map("LowerArm.L", "LeftLowerArm"), Map("Fist.L", "LeftHand"),
            Map("Shoulder.R", "RightShoulder"), Map("UpperArm.R", "RightUpperArm"), Map("LowerArm.R", "RightLowerArm"), Map("Fist.R", "RightHand"),
            Map("UpperLeg.L", "LeftUpperLeg"), Map("LowerLeg.L", "LeftLowerLeg"), Map("Foot.L", "LeftFoot"),
            Map("UpperLeg.R", "RightUpperLeg"), Map("LowerLeg.R", "RightLowerLeg"), Map("Foot.R", "RightFoot")
        };

        private static HumanBone Map(string bone, string human) => new()
        {
            boneName = bone,
            humanName = human,
            limit = new HumanLimit { useDefaultValues = true }
        };

        [MenuItem("Trap Wars/M8/Build Development Player")]
        public static void BuildDevelopmentPlayer()
        {
            BuildAll();
            var output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../Builds/M8/TrapWarsM8.exe"));
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/SampleScene.unity" },
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.Development | BuildOptions.AllowDebugging
            });
            Debug.Log($"[M8_BUILD] result={report.summary.result} size_bytes={report.summary.totalSize} duration={report.summary.totalTime} output={output}");
            if (report.summary.result != BuildResult.Succeeded) throw new InvalidOperationException($"M8 development build failed: {report.summary.result}");
        }

        [MenuItem("Trap Wars/M8.2B/Build Clean Review Player")]
        public static void BuildM82BReviewPlayer()
        {
            BuildAll();
            var output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../Builds/M8_2B/TrapWarsM82B.exe"));
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/SampleScene.unity" },
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            });
            Debug.Log($"[M8_2B_BUILD] result={report.summary.result} size_bytes={report.summary.totalSize} duration={report.summary.totalTime} development=false debugging=false output={output}");
            if (report.summary.result != BuildResult.Succeeded) throw new InvalidOperationException($"M8.2B review build failed: {report.summary.result}");
        }

        [MenuItem("Trap Wars/M8.3/Build Clean Human Test Player")]
        public static void BuildM83HumanTestPlayer()
        {
            var repositoryRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "../../.."));
            var commit = Git(repositoryRoot, "rev-parse --short=12 HEAD");
            var branch = Git(repositoryRoot, "branch --show-current");
            var dirtyBeforeBuild = !string.IsNullOrWhiteSpace(Git(repositoryRoot, "status --porcelain"));
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            const string identityAsset = "Assets/_TrapWars/Resources/M8BuildIdentity.txt";
            var identityPath = Path.GetFullPath(identityAsset);
            var identity = $"milestone=M8.3 version={PlayerSettings.bundleVersion} commit={commit} branch={branch} dirty_before_build={dirtyBeforeBuild.ToString().ToLowerInvariant()}";
            File.WriteAllText(identityPath, identity);
            AssetDatabase.ImportAsset(identityAsset, ImportAssetOptions.ForceSynchronousImport);

            var output = Path.Combine(repositoryRoot, "Builds/M8_3/TrapWarsM83.exe");
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            BuildReport report;
            try
            {
                report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { "Assets/Scenes/SampleScene.unity" },
                    locationPathName = output,
                    target = BuildTarget.StandaloneWindows64,
                    options = BuildOptions.None
                });
            }
            finally
            {
                AssetDatabase.DeleteAsset(identityAsset);
                AssetDatabase.Refresh();
            }

            var evidenceDirectory = Path.Combine(repositoryRoot, "docs/evidence/m8_3");
            Directory.CreateDirectory(evidenceDirectory);
            File.WriteAllLines(Path.Combine(evidenceDirectory, "M8_3_BUILD_MANIFEST.txt"), new[]
            {
                "TRAP WARS M8.3 CLEAN HUMAN TEST BUILD",
                $"Generated UTC: {DateTime.UtcNow:O}",
                $"Unity: {Application.unityVersion}",
                $"Milestone: M8.3",
                $"Version: {PlayerSettings.bundleVersion}",
                $"Commit: {commit}",
                $"Branch: {branch}",
                $"Dirty before build: {dirtyBeforeBuild}",
                $"Development build: {report.summary.options.HasFlag(BuildOptions.Development)}",
                $"Debugging: {report.summary.options.HasFlag(BuildOptions.AllowDebugging)}",
                $"Result: {report.summary.result}",
                $"Size bytes: {report.summary.totalSize}",
                $"Duration: {report.summary.totalTime}",
                $"Output: {output}"
            });
            Debug.Log($"[M8_3_BUILD] result={report.summary.result} size_bytes={report.summary.totalSize} commit={commit} development=false debugging=false output={output}");
            if (report.summary.result != BuildResult.Succeeded) throw new InvalidOperationException($"M8.3 human test build failed: {report.summary.result}");
        }

        private static string Git(string repositoryRoot, string arguments)
        {
            var info = new System.Diagnostics.ProcessStartInfo("git", arguments)
            {
                WorkingDirectory = repositoryRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var process = System.Diagnostics.Process.Start(info) ?? throw new InvalidOperationException("Unable to start git for build identity.");
            var output = process.StandardOutput.ReadToEnd().Trim();
            var error = process.StandardError.ReadToEnd().Trim();
            process.WaitForExit();
            if (process.ExitCode != 0) throw new InvalidOperationException($"git {arguments} failed: {error}");
            return output;
        }

        private static void BuildController(CharacterSpec spec)
        {
            var modelPath = $"{CharacterRoot}/{spec.Model}.fbx";
            var controllerPath = $"{ControllerRoot}/{spec.Controller}.controller";
            var clips = AssetDatabase.LoadAllAssetsAtPath(AnimationSource).OfType<AnimationClip>().Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
            if (clips.Length == 0)
            {
                Debug.LogWarning($"[M8_PIPELINE] No authored clips found in {AnimationSource}; procedural fallback remains available.");
                return;
            }

            AssetDatabase.DeleteAsset(controllerPath);
            var controller = AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var layers = controller.layers;
            layers[0].iKPass = true;
            controller.layers = layers;
            controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            controller.AddParameter("Grounded", AnimatorControllerParameterType.Bool);
            controller.AddParameter("Sprint", AnimatorControllerParameterType.Bool);
            controller.AddParameter("PhoneOpen", AnimatorControllerParameterType.Bool);
            controller.AddParameter("Dialogue", AnimatorControllerParameterType.Bool);
            controller.AddParameter("Interact", AnimatorControllerParameterType.Trigger);

            var machine = controller.layers[0].stateMachine;
            foreach (var child in machine.states) machine.RemoveState(child.state);
            var idle = FindClip(clips, "idle") ?? clips[0];
            var walk = FindClip(clips, "walk") ?? idle;
            var run = FindClip(clips, "run") ?? FindClip(clips, "jog") ?? walk;
            var authoredWorking = FindClip(clips, "working");
            var authoredAction = FindClip(clips, "action.002") ?? FindClip(clips, "action.001");
            var phone = FindClip(clips, "phone") ?? FindClip(clips, "text") ?? authoredWorking ?? idle;
            var talk = FindClip(clips, "talk") ?? FindClip(clips, "wave") ?? authoredWorking ?? idle;
            var interact = FindClip(clips, "interact") ?? FindClip(clips, "pickup") ?? FindClip(clips, "wave") ?? authoredAction ?? idle;

            var blend = new BlendTree { name = $"BT_{spec.Model}_Locomotion", blendType = BlendTreeType.Simple1D, blendParameter = "Speed", useAutomaticThresholds = false };
            AssetDatabase.AddObjectToAsset(blend, controllerPath);
            blend.AddChild(idle, 0f);
            blend.AddChild(walk, 0.45f);
            blend.AddChild(run, 1f);
            var locomotion = machine.AddState("Locomotion");
            locomotion.motion = blend;
            machine.defaultState = locomotion;
            var phoneState = machine.AddState("Phone");
            phoneState.motion = phone;
            var dialogueState = machine.AddState("Dialogue");
            dialogueState.motion = talk;
            var interactState = machine.AddState("Interact");
            interactState.motion = interact;

            AddBoolTransition(machine, phoneState, "PhoneOpen", true);
            AddBoolTransition(phoneState, locomotion, "PhoneOpen", false);
            AddBoolTransition(machine, dialogueState, "Dialogue", true);
            AddBoolTransition(dialogueState, locomotion, "Dialogue", false);
            var interaction = machine.AddAnyStateTransition(interactState);
            interaction.hasExitTime = false;
            interaction.duration = 0.1f;
            interaction.AddCondition(AnimatorConditionMode.If, 0f, "Interact");
            var interactionReturn = interactState.AddTransition(locomotion);
            interactionReturn.hasExitTime = true;
            interactionReturn.exitTime = 0.8f;
            interactionReturn.duration = 0.14f;

            EditorUtility.SetDirty(controller);
            Debug.Log($"[M8_PIPELINE] model={spec.Model} clips={clips.Length} names={string.Join(",", clips.Select(clip => clip.name))} controller={controllerPath}");
        }

        private static AnimationClip? FindClip(IEnumerable<AnimationClip> clips, string token) =>
            clips.FirstOrDefault(clip => clip.name.Contains(token, StringComparison.OrdinalIgnoreCase));

        private static void AddBoolTransition(AnimatorStateMachine machine, AnimatorState destination, string parameter, bool value)
        {
            var transition = machine.AddAnyStateTransition(destination);
            transition.hasExitTime = false;
            transition.duration = 0.16f;
            transition.canTransitionToSelf = false;
            transition.AddCondition(value ? AnimatorConditionMode.If : AnimatorConditionMode.IfNot, 0f, parameter);
        }

        private static void AddBoolTransition(AnimatorState source, AnimatorState destination, string parameter, bool value)
        {
            var transition = source.AddTransition(destination);
            transition.hasExitTime = false;
            transition.duration = 0.16f;
            transition.AddCondition(value ? AnimatorConditionMode.If : AnimatorConditionMode.IfNot, 0f, parameter);
        }

        private static void ValidateAssets()
        {
            var lines = new List<string>
            {
                "M8 ASSET QA",
                $"Generated UTC: {DateTime.UtcNow:O}",
                "Unity: " + Application.unityVersion,
                string.Empty
            };
            foreach (var path in AssetDatabase.FindAssets(string.Empty, new[] { "Assets/_TrapWars/Resources/M8" }).Select(AssetDatabase.GUIDToAssetPath).Where(path => !AssetDatabase.IsValidFolder(path)).OrderBy(path => path))
            {
                var importer = AssetImporter.GetAtPath(path);
                var size = new FileInfo(Path.GetFullPath(path)).Length;
                var finding = "PASS";
                if (path.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase) && path.Contains("/Characters/", StringComparison.Ordinal))
                {
                    var model = importer as ModelImporter;
                    if (model == null || model.animationType != ModelImporterAnimationType.Generic) finding = "FAIL: raw vendor character must remain Generic source";
                }
                if (path.EndsWith(".prefab", StringComparison.OrdinalIgnoreCase) && path.Contains("/Characters/Processed/", StringComparison.Ordinal))
                {
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                    var animator = prefab == null ? null : prefab.GetComponentInChildren<Animator>(true);
                    if (animator?.avatar?.isValid != true || animator.avatar.isHuman != true) finding = "FAIL: processed runtime character is not Humanoid";
                }
                lines.Add($"{finding} | {size} bytes | {path}");
            }
            var reportPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/m8/M8_ASSET_QA.txt"));
            Directory.CreateDirectory(Path.GetDirectoryName(reportPath)!);
            File.WriteAllLines(reportPath, lines);
            Debug.Log($"[M8_PIPELINE] asset_qa={reportPath} assets={lines.Count - 4}");
        }

        [MenuItem("Trap Wars/M8.1/Validate Production Character Rigs")]
        public static void ValidateProductionCharacterRigs()
        {
            var specs = new[]
            {
                new CharacterSpec { Model = "SK_Hero_Casual2", Controller = "AC_Hero_M8", RuntimePrefab = "PF_Hero_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Ray_Casual3", Controller = "AC_Ray_M8", RuntimePrefab = "PF_Ray_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Crowd_Female_A", Controller = "AC_Crowd_A_M8", RuntimePrefab = "PF_Crowd_A_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Crowd_Female_B", Controller = "AC_Crowd_B_M8", RuntimePrefab = "PF_Crowd_B_Humanoid_M8_1" },
                new CharacterSpec { Model = "SK_Crowd_Female_C", Controller = "AC_Crowd_C_M8", RuntimePrefab = "PF_Crowd_C_Humanoid_M8_1" }
            };
            ValidateCharacterRigs(specs);
        }

        private static void ValidateCharacterRigs(IEnumerable<CharacterSpec> specs)
        {
            var lines = new List<string>
            {
                "M8.1 PRODUCTION CHARACTER RIG VALIDATION",
                $"Generated UTC: {DateTime.UtcNow:O}",
                $"Unity: {Application.unityVersion}",
                string.Empty
            };
            var failures = new List<string>();
            var source = AssetDatabase.LoadAssetAtPath<GameObject>(AnimationSource);
            var sourceAnimator = source == null ? null : source.GetComponentInChildren<Animator>(true);
            var sourceCompatible = sourceAnimator?.avatar?.isValid == true && sourceAnimator.avatar.isHuman;

            foreach (var spec in specs)
            {
                var path = $"{ProcessedCharacterRoot}/{spec.RuntimePrefab}.prefab";
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var animator = model == null ? null : model.GetComponentInChildren<Animator>(true);
                var avatarValid = animator?.avatar?.isValid == true;
                var humanoid = animator?.avatar?.isHuman == true;
                var required = new[] { HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Head, HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot };
                var missing = animator == null || !humanoid
                    ? required.Select(value => value.ToString()).ToArray()
                    : required.Where(value => animator.GetBoneTransform(value) == null).Select(value => value.ToString()).ToArray();
                var renderers = model?.GetComponentsInChildren<SkinnedMeshRenderer>(true) ?? Array.Empty<SkinnedMeshRenderer>();
                var meshHeight = renderers.Length == 0 ? 0f : renderers.Max(value => value.localBounds.size.y * Mathf.Abs(value.transform.lossyScale.y));
                var scaleValid = model != null && model.transform.localScale == Vector3.one && meshHeight > 0.5f && meshHeight < 5f;
                var root = model == null ? "MISSING" : string.Join(" > ", RootChain(renderers.FirstOrDefault()?.rootBone));
                var pass = avatarValid && humanoid && missing.Length == 0 && scaleValid && sourceCompatible;
                var line = $"{(pass ? "PASS" : "FAIL")} | model={spec.Model} runtime={spec.RuntimePrefab} avatar_valid={avatarValid} humanoid={humanoid} missing=[{string.Join(",", missing)}] source_humanoid={sourceCompatible} scale={model?.transform.localScale.ToString("F3") ?? "missing"} mesh_height={meshHeight:F3} root={root}";
                lines.Add(line);
                Debug.Log($"[M8_1_RIG] {line}");
                if (!pass) failures.Add(line);
            }

            var sourceBones = source == null ? Array.Empty<string>() : source.GetComponentsInChildren<Transform>(true).Select(item => item.name).ToArray();
            lines.Add(string.Empty);
            lines.Add($"ANIMATION SOURCE | avatar_valid={sourceAnimator?.avatar?.isValid == true} humanoid={sourceAnimator?.avatar?.isHuman == true} bones={string.Join(",", sourceBones)}");
            var reportPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/m8_1/M8_1_RIG_VALIDATION.txt"));
            Directory.CreateDirectory(Path.GetDirectoryName(reportPath)!);
            File.WriteAllLines(reportPath, lines);
            if (failures.Count > 0) throw new InvalidOperationException($"M8.1 production rig validation failed for {failures.Count} character asset(s). See {reportPath}");
        }

        private static IEnumerable<string> RootChain(Transform? bone)
        {
            var chain = new Stack<string>();
            while (bone != null)
            {
                chain.Push(bone.name);
                bone = bone.parent;
            }
            return chain;
        }
    }
}
