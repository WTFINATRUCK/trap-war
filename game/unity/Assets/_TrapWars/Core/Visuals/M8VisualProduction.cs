using System;
using System.Collections.Generic;
using System.Linq;
using TrapWars.Player;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.Profiling;

namespace TrapWars.Visuals
{
    public enum M8QualityTier
    {
        Low,
        Medium,
        High
    }

    public enum CharacterPresentationRole
    {
        Hero,
        Ray,
        Crowd
    }

    public sealed class ProductionCharacterPresenter : MonoBehaviour
    {
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int GroundedHash = Animator.StringToHash("Grounded");
        private static readonly int SprintHash = Animator.StringToHash("Sprint");
        private static readonly int PhoneHash = Animator.StringToHash("PhoneOpen");
        private static readonly int DialogueHash = Animator.StringToHash("Dialogue");
        private static readonly int InteractHash = Animator.StringToHash("Interact");

        private readonly List<(SkinnedMeshRenderer Renderer, int Index)> blinkShapes = new();
        private HumanoidGreyboxRig? fallback;
        private Animator? animator;
        private Transform? head;
        private Transform? attentionTarget;
        private Transform? phoneProp;
        private Transform? rightHandTarget;
        private Transform? leftHandTarget;
        private Transform? chest;
        private Transform? upperChest;
        private Transform? rightUpperArm;
        private Transform? leftUpperArm;
        private float nextBlink;
        private float blink;
        private float phoneBlend;
        private float interactionPulse;
        private bool phoneActive;
        private bool dialogueActive;
        private bool installed;

        public bool Installed => installed;
        public bool HasFacialBlendShapes => blinkShapes.Count > 0;
        public CharacterPresentationRole Role { get; private set; }

        public bool Configure(string modelResource, string controllerResource, HumanoidGreyboxRig fallbackRig, CharacterPresentationRole role)
        {
            fallback = fallbackRig;
            Role = role;
            var model = Resources.Load<GameObject>(modelResource);
            if (model == null)
            {
                Debug.LogWarning($"[M8_VISUAL] Missing production-candidate character resource: {modelResource}. Procedural fallback remains visible.");
                return false;
            }

            var instance = Instantiate(model, transform);
            instance.name = role == CharacterPresentationRole.Hero ? "SK_Hero_Runtime" : role == CharacterPresentationRole.Ray ? "SK_Ray_Runtime" : "SK_Crowd_Runtime";
            instance.transform.localPosition = Vector3.zero;
            instance.transform.localRotation = Quaternion.identity;
            FitToCharacterHeight(instance.transform, role == CharacterPresentationRole.Crowd ? 1.76f : 1.82f);
            M8AssetRuntime.UpgradeMaterials(instance);
            M8AssetRuntime.TuneCharacterMaterials(instance, role);

            animator = instance.GetComponentInChildren<Animator>(true);
            if (animator != null)
            {
                var controller = Resources.Load<RuntimeAnimatorController>(controllerResource);
                if (controller != null) animator.runtimeAnimatorController = controller;
                animator.applyRootMotion = false;
                if (animator.isHuman)
                {
                    head = animator.GetBoneTransform(HumanBodyBones.Head);
                    chest = animator.GetBoneTransform(HumanBodyBones.Chest);
                    upperChest = animator.GetBoneTransform(HumanBodyBones.UpperChest);
                    rightUpperArm = animator.GetBoneTransform(HumanBodyBones.RightUpperArm);
                    leftUpperArm = animator.GetBoneTransform(HumanBodyBones.LeftUpperArm);
                    BuildPerformanceRig(animator);
                    BuildIdentityAccessories(animator);
                }
            }

            foreach (var renderer in instance.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                for (var index = 0; index < renderer.sharedMesh.blendShapeCount; index++)
                {
                    var shape = renderer.sharedMesh.GetBlendShapeName(index);
                    if (shape.Contains("blink", StringComparison.OrdinalIgnoreCase)) blinkShapes.Add((renderer, index));
                }
            }

            var renderers = instance.GetComponentsInChildren<Renderer>(true);
            var lod = instance.GetComponent<LODGroup>();
            if (lod == null) lod = instance.AddComponent<LODGroup>();
            lod.SetLODs(new[] { new LOD(role == CharacterPresentationRole.Crowd ? 0.11f : 0.045f, renderers) });
            lod.fadeMode = LODFadeMode.CrossFade;
            lod.animateCrossFading = true;
            lod.RecalculateBounds();

            fallback.SetVisualVisible(false);
            installed = true;
            nextBlink = UnityEngine.Time.time + UnityEngine.Random.Range(1.2f, 3.4f);
            var facialMode = blinkShapes.Count > 0 ? "blend_shapes" : head != null ? "bounded_head_performance" : "none";
            Debug.Log($"[M8_VISUAL] character={role} model={modelResource} animator={animator != null} humanoid={animator?.isHuman == true} facial_mode={facialMode} facial_blend_shapes={blinkShapes.Count} phone_ik={rightHandTarget != null}");
            return true;
        }

        public void SetLocomotion(float normalizedSpeed, bool grounded, bool sprinting)
        {
            if (animator == null) return;
            animator.SetFloat(SpeedHash, normalizedSpeed, 0.1f, UnityEngine.Time.deltaTime);
            animator.SetBool(GroundedHash, grounded);
            animator.SetBool(SprintHash, sprinting);
        }

        public void SetPhone(bool active)
        {
            phoneActive = active;
            if (active && phoneProp != null) phoneProp.gameObject.SetActive(true);
            if (animator != null) animator.SetBool(PhoneHash, active);
        }

        public void SetDialogue(bool active, Transform? target = null)
        {
            dialogueActive = active;
            attentionTarget = active ? target : null;
            if (animator != null) animator.SetBool(DialogueHash, active);
        }

        public void PulseInteract()
        {
            interactionPulse = 1f;
            if (animator != null) animator.SetTrigger(InteractHash);
        }

        private void LateUpdate()
        {
            if (!installed) return;
            UpdateBlink();
            phoneBlend = Mathf.MoveTowards(phoneBlend, phoneActive ? 1f : 0f, UnityEngine.Time.deltaTime * (phoneActive ? 2.8f : 3.5f));
            if (!phoneActive && phoneBlend <= 0f && phoneProp != null) phoneProp.gameObject.SetActive(false);
            interactionPulse = Mathf.MoveTowards(interactionPulse, 0f, UnityEngine.Time.deltaTime * 1.7f);

            ApplyDialoguePerformance();
        }

        internal void ApplyAnimatorIk(Animator source, int layerIndex)
        {
            if (!installed || source != animator) return;
            var easedBlend = phoneBlend * phoneBlend * (3f - 2f * phoneBlend);
            var weight = easedBlend * 0.82f;
            source.SetIKPositionWeight(AvatarIKGoal.RightHand, weight);
            source.SetIKRotationWeight(AvatarIKGoal.RightHand, weight);
            source.SetIKPositionWeight(AvatarIKGoal.LeftHand, weight * 0.7f);
            source.SetIKRotationWeight(AvatarIKGoal.LeftHand, weight * 0.7f);
            if (rightHandTarget != null)
            {
                source.SetIKPosition(AvatarIKGoal.RightHand, rightHandTarget.position);
                source.SetIKRotation(AvatarIKGoal.RightHand, rightHandTarget.rotation);
            }
            if (leftHandTarget != null)
            {
                source.SetIKPosition(AvatarIKGoal.LeftHand, leftHandTarget.position);
                source.SetIKRotation(AvatarIKGoal.LeftHand, leftHandTarget.rotation);
            }
            if (phoneBlend > 0.01f && phoneProp != null)
            {
                source.SetLookAtWeight(easedBlend * 0.65f, 0.12f, 0.78f, 0.35f, 0.5f);
                source.SetLookAtPosition(phoneProp.position);
            }
        }

        private void ApplyDialoguePerformance()
        {
            if (head != null && attentionTarget != null)
            {
                var direction = attentionTarget.position + Vector3.up * 1.55f - head.position;
                if (direction.sqrMagnitude > 0.01f)
                {
                    var local = transform.InverseTransformDirection(direction.normalized);
                    var cycle = Mathf.Repeat(UnityEngine.Time.time + (Role == CharacterPresentationRole.Ray ? 0.6f : 0f), 6.5f);
                    var attention = cycle > 4.8f && cycle < 5.55f ? 0.38f : 1f;
                    var yaw = Mathf.Clamp(Mathf.Atan2(local.x, local.z) * Mathf.Rad2Deg, -28f, 28f) * attention;
                    var pitch = Mathf.Clamp(-Mathf.Asin(local.y) * Mathf.Rad2Deg, -12f, 18f) * attention;
                    var nod = dialogueActive ? Mathf.Sin(UnityEngine.Time.time * 2.2f) * 0.9f : 0f;
                    var breakAway = attention < 1f ? (Role == CharacterPresentationRole.Ray ? -7f : 5f) : 0f;
                    head.localRotation *= Quaternion.Euler(pitch + nod, yaw + breakAway, Role == CharacterPresentationRole.Ray ? Mathf.Sin(UnityEngine.Time.time * 0.7f) * 1.2f : 0f);
                }
            }

            if (Role == CharacterPresentationRole.Crowd) return;
            var dialogueWeight = dialogueActive ? 1f : 0f;
            var gesture = dialogueWeight * Mathf.SmoothStep(0f, 1f, Mathf.PingPong(UnityEngine.Time.time * 0.42f, 1f));
            var response = interactionPulse * Mathf.Sin((1f - interactionPulse) * Mathf.PI);
            if (Role == CharacterPresentationRole.Ray)
            {
                if (upperChest != null) upperChest.localRotation *= Quaternion.Euler(-1.5f * gesture, 2.2f * gesture, -1.5f * gesture);
                if (rightUpperArm != null) rightUpperArm.localRotation *= Quaternion.Euler(0f, -5.5f * gesture, -7f * gesture);
                if (leftUpperArm != null) leftUpperArm.localRotation *= Quaternion.Euler(0f, 3f * gesture, 3.5f * gesture);
            }
            else if (response > 0f && chest != null)
            {
                chest.localRotation *= Quaternion.Euler(-3f * response, 0f, 2f * response);
            }
        }

        private void BuildPerformanceRig(Animator source)
        {
            rightHandTarget = CreateTarget("IK_Phone_Right", new Vector3(0.2f, 1.34f, 0.28f), Quaternion.Euler(-20f, 165f, 82f));
            leftHandTarget = CreateTarget("IK_Phone_Left", new Vector3(-0.12f, 1.28f, 0.31f), Quaternion.Euler(-12f, 188f, -78f));
            var hand = source.GetBoneTransform(HumanBodyBones.RightHand);
            if (hand != null)
            {
                var phone = GameObject.CreatePrimitive(PrimitiveType.Cube);
                phone.name = "PR_Phone_Hero";
                phone.transform.SetParent(hand, false);
                phone.transform.localPosition = new Vector3(0.015f, 0.075f, 0.025f);
                phone.transform.localRotation = Quaternion.Euler(6f, 12f, 82f);
                phone.transform.localScale = new Vector3(0.075f, 0.14f, 0.018f);
                var collider = phone.GetComponent<Collider>();
                if (collider != null) Destroy(collider);
                phone.GetComponent<Renderer>().sharedMaterial = M8AssetRuntime.PhoneMaterial(false);
                var screen = GameObject.CreatePrimitive(PrimitiveType.Cube);
                screen.name = "PhoneScreen";
                screen.transform.SetParent(phone.transform, false);
                screen.transform.localPosition = new Vector3(0f, 0f, -0.54f);
                screen.transform.localScale = new Vector3(0.82f, 0.84f, 0.06f);
                var screenCollider = screen.GetComponent<Collider>();
                if (screenCollider != null) Destroy(screenCollider);
                screen.GetComponent<Renderer>().sharedMaterial = M8AssetRuntime.PhoneMaterial(true);
                phoneProp = phone.transform;
                phone.SetActive(false);
            }
            var driver = source.GetComponent<ProductionCharacterIkDriver>();
            if (driver == null) driver = source.gameObject.AddComponent<ProductionCharacterIkDriver>();
            driver.Configure(this);
        }

        private void BuildIdentityAccessories(Animator source)
        {
            var headBone = source.GetBoneTransform(HumanBodyBones.Head);
            var chestBone = source.GetBoneTransform(HumanBodyBones.Chest);
            var hipsBone = source.GetBoneTransform(HumanBodyBones.Hips);
            if (headBone == null || chestBone == null || hipsBone == null) return;

            if (Role == CharacterPresentationRole.Hero)
            {
                Accessory("AC_Hero_CrossbodyBag", PrimitiveType.Cube, hipsBone, transform.right * 0.18f + transform.up * 0.22f + transform.forward * 0.12f, new Vector3(0.26f, 0.22f, 0.09f), Quaternion.Euler(0f, 0f, -8f), M8AssetRuntime.CharacterAccentMaterial("HeroBag", new Color(0.055f, 0.075f, 0.07f), 0.3f));
                CreateStrap("AC_Hero_CrossbodyStrap", new Vector3(-0.18f, 1.46f, 0.13f), new Vector3(0.22f, 0.91f, 0.14f), M8AssetRuntime.CharacterAccentMaterial("HeroStrap", new Color(0.08f, 0.12f, 0.1f), 0.2f));
            }
            else if (Role == CharacterPresentationRole.Ray)
            {
                Accessory("AC_Ray_WaistPouch", PrimitiveType.Cube, hipsBone, -transform.right * 0.19f + transform.up * 0.16f + transform.forward * 0.12f, new Vector3(0.27f, 0.16f, 0.09f), Quaternion.Euler(0f, 0f, 7f), M8AssetRuntime.CharacterAccentMaterial("RayPouch", new Color(0.15f, 0.10f, 0.065f), 0.34f));
                CreateStrap("AC_Ray_Chain", new Vector3(-0.105f, 1.48f, 0.15f), new Vector3(0.105f, 1.48f, 0.15f), M8AssetRuntime.CharacterAccentMaterial("RayChain", new Color(0.76f, 0.52f, 0.16f), 0.58f));
            }
        }

        private GameObject Accessory(string name, PrimitiveType type, Transform anchor, Vector3 worldOffset, Vector3 worldScale, Quaternion localRotation, Material material)
        {
            var item = GameObject.CreatePrimitive(type);
            item.name = name;
            item.transform.position = anchor.position + worldOffset;
            item.transform.rotation = transform.rotation * localRotation;
            item.transform.SetParent(anchor, true);
            var lossy = item.transform.parent.lossyScale;
            item.transform.localScale = new Vector3(worldScale.x / Mathf.Max(0.001f, Mathf.Abs(lossy.x)), worldScale.y / Mathf.Max(0.001f, Mathf.Abs(lossy.y)), worldScale.z / Mathf.Max(0.001f, Mathf.Abs(lossy.z)));
            var collider = item.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            item.GetComponent<Renderer>().sharedMaterial = material;
            return item;
        }

        private void CreateStrap(string name, Vector3 localStart, Vector3 localEnd, Material material)
        {
            var strap = new GameObject(name, typeof(LineRenderer));
            strap.transform.SetParent(transform, false);
            var line = strap.GetComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.positionCount = 3;
            line.SetPositions(new[] { localStart, Vector3.Lerp(localStart, localEnd, 0.5f) + Vector3.forward * 0.035f, localEnd });
            line.startWidth = Role == CharacterPresentationRole.Ray ? 0.018f : 0.034f;
            line.endWidth = line.startWidth;
            line.numCornerVertices = 3;
            line.sharedMaterial = material;
        }

        private Transform CreateTarget(string name, Vector3 localPosition, Quaternion localRotation)
        {
            var target = new GameObject(name).transform;
            target.SetParent(transform, false);
            target.localPosition = localPosition;
            target.localRotation = localRotation;
            return target;
        }

        private void UpdateBlink()
        {
            if (blinkShapes.Count == 0) return;
            if (UnityEngine.Time.time >= nextBlink && blink <= 0f)
            {
                blink = 1f;
                nextBlink = UnityEngine.Time.time + UnityEngine.Random.Range(2.1f, 5.2f);
            }
            var weight = blink > 0f ? Mathf.Sin((1f - blink) * Mathf.PI) * 100f : 0f;
            foreach (var (renderer, index) in blinkShapes)
                if (renderer != null) renderer.SetBlendShapeWeight(index, weight);
            blink = Mathf.MoveTowards(blink, 0f, UnityEngine.Time.deltaTime * 7f);
        }

        private static void FitToCharacterHeight(Transform instance, float targetHeight)
        {
            var renderers = instance.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0) return;
            var bounds = renderers[0].bounds;
            foreach (var renderer in renderers.Skip(1)) bounds.Encapsulate(renderer.bounds);
            if (bounds.size.y < 0.01f) return;
            instance.localScale *= targetHeight / bounds.size.y;
            bounds = instance.GetComponentsInChildren<Renderer>(true)[0].bounds;
            foreach (var renderer in instance.GetComponentsInChildren<Renderer>(true).Skip(1)) bounds.Encapsulate(renderer.bounds);
            instance.position += Vector3.up * (instance.parent.position.y - bounds.min.y);
        }
    }

    public sealed class ProductionCharacterIkDriver : MonoBehaviour
    {
        private ProductionCharacterPresenter? presenter;

        public void Configure(ProductionCharacterPresenter value) => presenter = value;

        private void OnAnimatorIK(int layerIndex) => presenter?.ApplyAnimatorIk(GetComponent<Animator>(), layerIndex);
    }

    public sealed class M8QualityController : MonoBehaviour
    {
        private readonly List<(GameObject Item, M8QualityTier Minimum)> scalableItems = new();
        private readonly List<Light> practicalLights = new();

        public M8QualityTier Tier { get; private set; } = M8QualityTier.High;

        public void Register(GameObject item, M8QualityTier minimum) => scalableItems.Add((item, minimum));
        public void RegisterPractical(Light light) => practicalLights.Add(light);

        public void Apply(M8QualityTier tier)
        {
            Tier = tier;
            QualitySettings.lodBias = tier switch { M8QualityTier.Low => 0.65f, M8QualityTier.Medium => 1f, _ => 1.5f };
            QualitySettings.shadowDistance = tier switch { M8QualityTier.Low => 22f, M8QualityTier.Medium => 36f, _ => 50f };
            QualitySettings.shadowCascades = tier == M8QualityTier.Low ? 1 : tier == M8QualityTier.Medium ? 2 : 4;
            foreach (var (item, minimum) in scalableItems)
                if (item != null) item.SetActive((int)tier >= (int)minimum);
            for (var index = 0; index < practicalLights.Count; index++)
            {
                var light = practicalLights[index];
                if (light != null) light.shadows = tier == M8QualityTier.High && index < 2 && light.type != LightType.Point ? LightShadows.Soft : LightShadows.None;
            }
            Debug.Log($"[M8_QUALITY] tier={tier} population={scalableItems.Count(value => value.Item.activeSelf)} lod_bias={QualitySettings.lodBias:F2} shadow_distance={QualitySettings.shadowDistance:F0}");
        }

        private void Awake()
        {
            var saved = PlayerPrefs.GetInt("trapwars.visual.quality", 2);
            Tier = (M8QualityTier)Mathf.Clamp(saved, 0, 2);
        }
    }

    public static class M8AssetRuntime
    {
        private static readonly Dictionary<string, Material> RuntimeMaterials = new();

        public static GameObject? Place(string resourcePath, string name, Transform parent, Vector3 position, Quaternion rotation, float targetHeight = 0f)
        {
            var source = Resources.Load<GameObject>(resourcePath);
            if (source == null)
            {
                Debug.LogWarning($"[M8_VISUAL] Missing environment resource: {resourcePath}");
                return null;
            }
            var item = UnityEngine.Object.Instantiate(source, parent);
            item.name = name;
            item.transform.localPosition = position;
            item.transform.localRotation = rotation;
            if (targetHeight > 0f) FitToHeight(item, targetHeight);
            UpgradeMaterials(item);
            var renderers = item.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length > 0)
            {
                var lod = item.GetComponent<LODGroup>();
                if (lod == null) lod = item.AddComponent<LODGroup>();
                lod.SetLODs(new[] { new LOD(0.06f, renderers) });
                lod.fadeMode = LODFadeMode.CrossFade;
                lod.animateCrossFading = true;
                lod.RecalculateBounds();
            }
            return item;
        }

        public static void UpgradeMaterials(GameObject root)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                var upgraded = new Material[renderer.sharedMaterials.Length];
                for (var index = 0; index < upgraded.Length; index++)
                {
                    var source = renderer.sharedMaterials[index];
                    var key = source == null ? "default" : $"{source.name}_{source.GetInstanceID()}";
                    if (!RuntimeMaterials.TryGetValue(key, out var material))
                    {
                        material = new Material(shader) { name = $"M8_{source?.name ?? "Default"}" };
                        var color = source != null && source.HasProperty("_Color") ? source.color : new Color(0.55f, 0.55f, 0.52f);
                        var texture = source != null && source.HasProperty("_MainTex") ? source.mainTexture : null;
                        material.color = color;
                        if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
                        if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.28f);
                        RuntimeMaterials[key] = material;
                    }
                    upgraded[index] = material;
                }
                renderer.sharedMaterials = upgraded;
            }
        }

        public static void TuneCharacterMaterials(GameObject root, CharacterPresentationRole role)
        {
            foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                var tuned = new Material[renderer.sharedMaterials.Length];
                for (var index = 0; index < tuned.Length; index++)
                {
                    var source = renderer.sharedMaterials[index];
                    if (source == null) continue;
                    var material = new Material(source) { name = $"M8_1_{role}_{source.name}" };
                    var lower = source.name.ToLowerInvariant();
                    if (material.HasProperty("_Smoothness"))
                    {
                        var smoothness = lower.Contains("skin") || lower.Contains("face") ? 0.34f : lower.Contains("shoe") ? 0.5f : 0.26f;
                        material.SetFloat("_Smoothness", smoothness);
                    }
                    if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", lower.Contains("metal") ? 0.55f : 0f);
                    tuned[index] = material;
                }
                renderer.sharedMaterials = tuned;
            }
        }

        public static Material PhoneMaterial(bool screen)
        {
            var key = screen ? "M8_1_PhoneScreen" : "M8_1_PhoneBody";
            if (RuntimeMaterials.TryGetValue(key, out var found)) return found;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader) { name = key, color = screen ? new Color(0.05f, 0.58f, 0.42f) : new Color(0.025f, 0.03f, 0.035f) };
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", screen ? 0.72f : 0.38f);
            if (screen && material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", new Color(0.02f, 0.38f, 0.22f) * 1.5f);
            }
            RuntimeMaterials[key] = material;
            return material;
        }

        public static Material CharacterAccentMaterial(string key, Color color, float smoothness)
        {
            var materialKey = $"M8_2B_{key}";
            if (RuntimeMaterials.TryGetValue(materialKey, out var found)) return found;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader) { name = materialKey, color = color };
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", key.Contains("Chain", StringComparison.OrdinalIgnoreCase) ? 0.68f : 0f);
            RuntimeMaterials[materialKey] = material;
            return material;
        }

        public static Material TexturedMaterial(string key, string textureResource, Color tint, Vector2 tiling, float smoothness)
        {
            if (RuntimeMaterials.TryGetValue(key, out var found)) return found;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader) { name = $"M8_{key}", color = tint, mainTextureScale = tiling };
            var texture = Resources.Load<Texture2D>(textureResource);
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
            else material.mainTexture = texture;
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            RuntimeMaterials[key] = material;
            return material;
        }

        public static GameObject Decal(string name, Transform parent, Vector3 position, Quaternion rotation, Vector2 size, int atlasIndex)
            => Decal(name, parent, position, rotation, size, atlasIndex, "M8/Decals/TX_Decal_StreetEditorial_Atlas_D");

        public static GameObject Decal(string name, Transform parent, Vector3 position, Quaternion rotation, Vector2 size, int atlasIndex, string atlasResource)
        {
            var item = GameObject.CreatePrimitive(PrimitiveType.Quad);
            item.name = name;
            item.transform.SetParent(parent);
            item.transform.localPosition = position;
            item.transform.localRotation = rotation;
            item.transform.localScale = new Vector3(size.x, size.y, 1f);
            var collider = item.GetComponent<Collider>();
            if (collider != null) UnityEngine.Object.Destroy(collider);
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader) { name = $"M8_Decal_{atlasIndex:00}" };
            var texture = Resources.Load<Texture2D>(atlasResource);
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
            else material.mainTexture = texture;
            var tile = new Vector2(0.25f, 0.25f);
            var column = atlasIndex % 4;
            var row = 3 - atlasIndex / 4;
            material.mainTextureScale = tile;
            material.mainTextureOffset = new Vector2(column * tile.x, row * tile.y);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.05f);
            item.GetComponent<Renderer>().sharedMaterial = material;
            return item;
        }

        public static long TriangleCount(Mesh? mesh)
        {
            if (mesh == null) return 0L;
            long indices = 0;
            for (var subMesh = 0; subMesh < mesh.subMeshCount; subMesh++) indices += (long)mesh.GetIndexCount(subMesh);
            return indices / 3L;
        }

        private static void FitToHeight(GameObject item, float targetHeight)
        {
            var renderers = item.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0) return;
            var bounds = renderers[0].bounds;
            foreach (var renderer in renderers.Skip(1)) bounds.Encapsulate(renderer.bounds);
            if (bounds.size.y > 0.001f) item.transform.localScale *= targetHeight / bounds.size.y;
        }
    }

    public sealed class M8AtmosphereDirector : MonoBehaviour
    {
        public void Build(Transform parent)
        {
            var volumeObject = new GameObject("M8_GlobalVolume", typeof(Volume));
            volumeObject.transform.SetParent(parent);
            var volume = volumeObject.GetComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 10f;
            volume.profile = ScriptableObject.CreateInstance<VolumeProfile>();
            var tone = volume.profile.Add<Tonemapping>();
            tone.mode.Override(TonemappingMode.ACES);
            var color = volume.profile.Add<ColorAdjustments>();
            color.postExposure.Override(0.82f);
            color.contrast.Override(2f);
            color.saturation.Override(0f);
            var bloom = volume.profile.Add<Bloom>();
            bloom.intensity.Override(0.16f);
            bloom.threshold.Override(1.15f);
            bloom.scatter.Override(0.55f);
            var vignette = volume.profile.Add<Vignette>();
            vignette.intensity.Override(0.12f);
            vignette.smoothness.Override(0.32f);

            var dustObject = new GameObject("VFX_AmbientDust", typeof(ParticleSystem));
            dustObject.transform.SetParent(parent);
            dustObject.transform.localPosition = new Vector3(0f, 2f, 39f);
            var particles = dustObject.GetComponent<ParticleSystem>();
            var main = particles.main;
            main.loop = true;
            main.startLifetime = 9f;
            main.startSpeed = 0.12f;
            main.startSize = 0.035f;
            main.startColor = new Color(0.78f, 0.72f, 0.58f, 0.22f);
            main.maxParticles = 90;
            var emission = particles.emission;
            emission.rateOverTime = 6f;
            var shape = particles.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(17f, 4f, 58f);
            var noise = particles.noise;
            noise.enabled = true;
            noise.strength = 0.18f;
            noise.frequency = 0.12f;
            var renderer = particles.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            var particleShader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            if (particleShader != null)
            {
                var particleMaterial = new Material(particleShader) { color = new Color(0.78f, 0.72f, 0.58f, 0.18f), renderQueue = (int)RenderQueue.Transparent };
                if (particleMaterial.HasProperty("_Surface")) particleMaterial.SetFloat("_Surface", 1f);
                if (particleMaterial.HasProperty("_ZWrite")) particleMaterial.SetFloat("_ZWrite", 0f);
                particleMaterial.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                renderer.sharedMaterial = particleMaterial;
            }
        }
    }

    public sealed class M8RuntimeProfiler : MonoBehaviour
    {
        private readonly List<float> frameTimes = new(3600);
        private float startedAt;
        private long startAllocated;
        private int startCollections;
        private bool captured;

        private void Start()
        {
            startedAt = UnityEngine.Time.unscaledTime;
            startAllocated = Profiler.GetTotalAllocatedMemoryLong();
            startCollections = GC.CollectionCount(0) + GC.CollectionCount(1) + GC.CollectionCount(2);
        }

        private void Update()
        {
            if (captured) return;
            var elapsed = UnityEngine.Time.unscaledTime - startedAt;
            if (elapsed > 3f) frameTimes.Add(UnityEngine.Time.unscaledDeltaTime * 1000f);
            if (elapsed < 23f) return;
            captured = true;
            var sorted = frameTimes.OrderBy(value => value).ToArray();
            var average = sorted.Length == 0 ? 0f : sorted.Average();
            var p95 = sorted.Length == 0 ? 0f : sorted[Mathf.Clamp(Mathf.CeilToInt(sorted.Length * 0.95f) - 1, 0, sorted.Length - 1)];
            var maximum = sorted.Length == 0 ? 0f : sorted[^1];
            var triangles = FindObjectsByType<MeshFilter>(FindObjectsSortMode.None).Sum(mesh => M8AssetRuntime.TriangleCount(mesh.sharedMesh))
                + FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None).Sum(mesh => M8AssetRuntime.TriangleCount(mesh.sharedMesh));
            var collections = GC.CollectionCount(0) + GC.CollectionCount(1) + GC.CollectionCount(2) - startCollections;
            Debug.Log($"[M8_PLAYER_PROFILE] sample_s=20 fps={(average > 0f ? 1000f / average : 0f):F1} avg_ms={average:F2} p95_ms={p95:F2} max_ms={maximum:F2} triangles={triangles} renderers={FindObjectsByType<Renderer>(FindObjectsSortMode.None).Length} skinned={FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None).Length} allocated_mb={Profiler.GetTotalAllocatedMemoryLong() / (1024f * 1024f):F1} managed_mb={GC.GetTotalMemory(false) / (1024f * 1024f):F1} allocated_growth_mb={(Profiler.GetTotalAllocatedMemoryLong() - startAllocated) / (1024f * 1024f):F1} gc_collections={collections}");
            if (Environment.GetCommandLineArgs().Contains("-m8Profile")) Application.Quit();
        }
    }
}
