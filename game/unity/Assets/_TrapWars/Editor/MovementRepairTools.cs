using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace TrapWars.EditorTools
{
    public static class MovementRepairTools
    {
        private const string AnimationSource = "Assets/_TrapWars/Resources/M8/Animation/AN_Quaternius_Human_M8.fbx";
        private const string HeroPrefab = "Assets/_TrapWars/Resources/M8/Characters/Processed/PF_Hero_Humanoid_M8_1.prefab";

        [MenuItem("Trap Wars/Repair/Audit Character Motion")]
        public static void AuditCharacterMotion()
        {
            var reportPath = Path.GetFullPath(Path.Combine(Application.dataPath, "../../../docs/evidence/dev_environment/CHARACTER_MOTION_AUDIT.txt"));
            Directory.CreateDirectory(Path.GetDirectoryName(reportPath)!);

            var sourceImporter = AssetImporter.GetAtPath(AnimationSource) as ModelImporter;
            var clips = AssetDatabase.LoadAllAssetsAtPath(AnimationSource)
                .OfType<AnimationClip>()
                .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal))
                .OrderBy(clip => clip.name)
                .ToArray();
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(HeroPrefab);
            var animator = prefab == null ? null : prefab.GetComponentInChildren<Animator>(true);

            using var writer = new StreamWriter(reportPath, false);
            writer.WriteLine("TRAP WARS CHARACTER MOTION AUDIT");
            writer.WriteLine($"Generated UTC: {DateTime.UtcNow:O}");
            writer.WriteLine($"Unity: {Application.unityVersion}");
            writer.WriteLine();
            writer.WriteLine("LOCOMOTION AUTHORITY");
            writer.WriteLine("translation=CharacterController via ThirdPersonMotor");
            writer.WriteLine($"animator_apply_root_motion={animator?.applyRootMotion}");
            writer.WriteLine("locomotion_policy=controller-driven/in-place");
            writer.WriteLine("phone_policy=in-place");
            writer.WriteLine("dialogue_policy=in-place");
            writer.WriteLine("interaction_policy=in-place");
            writer.WriteLine();
            writer.WriteLine("PHYSICS");
            writer.WriteLine($"rigidbodies={prefab?.GetComponentsInChildren<Rigidbody>(true).Length ?? 0}");
            writer.WriteLine($"character_joints={prefab?.GetComponentsInChildren<CharacterJoint>(true).Length ?? 0}");
            writer.WriteLine($"configurable_joints={prefab?.GetComponentsInChildren<ConfigurableJoint>(true).Length ?? 0}");
            writer.WriteLine($"hinge_joints={prefab?.GetComponentsInChildren<HingeJoint>(true).Length ?? 0}");
            writer.WriteLine($"bone_colliders={prefab?.GetComponentsInChildren<Collider>(true).Length ?? 0}");
            writer.WriteLine();
            writer.WriteLine("AVATAR");
            writer.WriteLine($"valid={animator?.avatar?.isValid == true}");
            writer.WriteLine($"humanoid={animator?.avatar?.isHuman == true}");
            if (animator?.avatar?.isHuman == true)
            {
                foreach (HumanBodyBones bone in Enum.GetValues(typeof(HumanBodyBones)))
                {
                    if (bone == HumanBodyBones.LastBone) continue;
                    writer.WriteLine($"bone.{bone}={(animator.GetBoneTransform(bone) == null ? "MISSING" : "mapped")}");
                }
            }
            writer.WriteLine();
            writer.WriteLine("ANIMATION SOURCE");
            writer.WriteLine($"importer_animation_type={sourceImporter?.animationType}");
            writer.WriteLine($"importer_avatar_setup={sourceImporter?.avatarSetup}");
            writer.WriteLine($"clip_count={clips.Length}");
            foreach (var clip in clips)
            {
                var settings = AnimationUtility.GetAnimationClipSettings(clip);
                writer.WriteLine($"clip={clip.name} length={clip.length:F3} fps={clip.frameRate:F1} loop={settings.loopTime} loop_blend={settings.loopBlend} keep_y={settings.keepOriginalPositionY} keep_xz={settings.keepOriginalPositionXZ} keep_orientation={settings.keepOriginalOrientation} height_from_feet={settings.heightFromFeet} average_speed={clip.averageSpeed:F3} apparent_speed={clip.apparentSpeed:F3} human_motion={clip.humanMotion}");
            }
            writer.WriteLine();
            writer.WriteLine("CONTROLLER");
            writer.WriteLine($"controller={animator?.runtimeAnimatorController?.name ?? "MISSING"}");
            writer.WriteLine($"layer_count={animator?.layerCount ?? 0}");

            Debug.Log($"[MOVEMENT_AUDIT] report={reportPath} clips={clips.Length} rigidbodies={prefab?.GetComponentsInChildren<Rigidbody>(true).Length ?? 0} joints={(prefab?.GetComponentsInChildren<Joint>(true).Length ?? 0)} humanoid={animator?.avatar?.isHuman == true} root_motion={animator?.applyRootMotion}");
        }
    }
}
