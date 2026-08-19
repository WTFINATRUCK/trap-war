using System.Collections.Generic;
using TrapWars.Config;
using TrapWars.Dialogue;
using TrapWars.Interaction;
using TrapWars.Market;
using TrapWars.Objectives;
using TrapWars.Phone;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.UI;
using TrapWars.Visuals;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace TrapWars.World
{
    public sealed class GreyboxWorld
    {
        public ThirdPersonMotor PlayerMotor = null!;
        public InteractionScanner InteractionScanner = null!;
        public Light Sun = null!;
        public M8QualityController Quality = null!;
        public Dictionary<string, Transform> TeleportPoints = new();
        public PhoneInteractable Phone = null!;
        public SafehouseExitInteractable Exit = null!;
        public NpcContactInteractable Contact = null!;
        public MarketInteractable Market = null!;
        public StashInteractable Stash = null!;
        public List<WorldClueInteractable> Clues = new();
    }

    public static class GreyboxWorldBuilder
    {
        private static readonly Dictionary<string, Material> Materials = new();
        private static M8QualityController activeQuality = null!;

        public static GreyboxWorld Build(IPlayerInputSource input, IAudioService audio, float sensitivity)
        {
            ClearTemplateScene();
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.58f, 0.59f, 0.56f);
            var root = new GameObject("M8_HERO_BLOCK");
            activeQuality = root.AddComponent<M8QualityController>();
            BuildSafehouse(root.transform);
            BuildNeighborhood(root.transform);
            root.AddComponent<M8AtmosphereDirector>().Build(root.transform);
            var sun = CreateSun(root.transform);
            var player = CreatePlayer(root.transform, input, audio, sensitivity, out var scanner);
            var world = new GreyboxWorld
            {
                PlayerMotor = player,
                InteractionScanner = scanner,
                Sun = sun,
                Quality = activeQuality,
                Phone = CreateInteractable<PhoneInteractable>("phone_access_01", root.transform, new Vector3(-3.9f, 1.05f, 1.8f), new Vector3(0.38f, 0.7f, 0.16f), Color.black),
                Exit = CreateInteractable<SafehouseExitInteractable>("safehouse_exit_01", root.transform, new Vector3(0f, 1.5f, 9.7f), new Vector3(2.2f, 3f, 0.22f), new Color(0.12f, 0.28f, 0.21f)),
                Contact = CreateNpc(root.transform, new Vector3(-2.4f, 0f, 42f)),
                Market = CreateInteractable<MarketInteractable>("market_hub_01", root.transform, new Vector3(0f, 1.2f, 64f), new Vector3(4.5f, 2.4f, 1.1f), new Color(0.14f, 0.42f, 0.3f)),
                Stash = CreateInteractable<StashInteractable>("stash_01", root.transform, new Vector3(4.1f, 0.7f, 5.4f), new Vector3(1.6f, 1.4f, 0.8f), new Color(0.31f, 0.25f, 0.11f))
            };
            world.Clues.Add(CreateInteractable<WorldClueInteractable>("clue_delivery_board", root.transform, new Vector3(-7.15f, 1.05f, 24f), new Vector3(0.18f, 1.7f, 1.25f), new Color(0.74f, 0.58f, 0.2f)));
            world.Clues.Add(CreateInteractable<WorldClueInteractable>("clue_empty_crates", root.transform, new Vector3(7.25f, 0.55f, 33f), new Vector3(1.2f, 1.1f, 1.1f), new Color(0.25f, 0.18f, 0.11f)));
            world.Clues.Add(CreateInteractable<WorldClueInteractable>("clue_corner_activity", root.transform, new Vector3(-7.2f, 0.9f, 37f), new Vector3(0.2f, 1.5f, 1.5f), new Color(0.18f, 0.36f, 0.3f)));
            HideInteractionProxy(world.Exit.gameObject);
            HideInteractionProxy(world.Market.gameObject);
            world.TeleportPoints["Safehouse"] = Marker("dev_safehouse", new Vector3(0f, 0.1f, 1f), root.transform);
            world.TeleportPoints["Contact"] = Marker("dev_contact", new Vector3(0f, 0.1f, 38f), root.transform);
            world.TeleportPoints["Market"] = Marker("dev_market", new Vector3(0f, 0.1f, 59f), root.transform);
            activeQuality.Apply(activeQuality.Tier);
            return world;
        }

        public static void WireInteractions(GreyboxWorld world, TrapPhoneController phone, MarketController market, StashController stash, IDialogueService dialogue, ObjectiveDirector objectives, IAnalyticsService analytics, IAudioService audio, GreyboxHud hud)
        {
            world.Phone.Configure(phone);
            world.Exit.Configure(objectives, analytics, audio, hud);
            var sequence = ScriptableObject.CreateInstance<DialogueSequence>();
            sequence.Configure("ray.market_hub_intro",
                new DialogueLine("Ray", "I saw you reading the block. Good. A screen gives you numbers; the sidewalk tells you whether they mean anything."),
                new DialogueLine("You", "The delivery board is busy, but those empty crates say supply already moved."),
                new DialogueLine("Ray", "Exactly. Folks are paying up because they think the window is closing. That can help you, or trap you."),
                new DialogueLine("Ray", "Keep enough cash free to move if the price turns. Confidence is useful. An exit is better.", "What would you do?"),
                new DialogueLine("Ray", "I would check the quote, size the risk, and make my own call. This one is yours."));
            world.Contact.Configure(dialogue, sequence, objectives, analytics, audio, hud);
            world.Market.Configure(market, objectives);
            world.Stash.Configure(stash);
            world.Clues[0].Configure("delivery_board", "Inspect delivery board", "Three rush pickups were added this morning. Demand is real, but late.", objectives, analytics, audio, hud);
            world.Clues[1].Configure("empty_crates", "Inspect empty crates", "Fresh labels, empty crates. Inventory already moved through here.", objectives, analytics, audio, hud);
            world.Clues[2].Configure("corner_activity", "Watch the corner", "Buyers keep checking the hub, then checking who is watching them.", objectives, analytics, audio, hud);
        }

        private static void ClearTemplateScene()
        {
            foreach (var item in SceneManager.GetActiveScene().GetRootGameObjects())
            {
                if (item.name.StartsWith("TrapWars_")) continue;
                Object.Destroy(item);
            }
        }

        private static ThirdPersonMotor CreatePlayer(Transform parent, IPlayerInputSource input, IAudioService audio, float sensitivity, out InteractionScanner scanner)
        {
            var root = new GameObject("player_humanoid_01", typeof(CharacterController), typeof(ThirdPersonMotor), typeof(CharacterAnimationDriver), typeof(InteractionScanner), typeof(HumanoidGreyboxRig));
            root.transform.SetParent(parent);
            root.transform.position = new Vector3(0f, 0.1f, 1f);
            var controller = root.GetComponent<CharacterController>();
            controller.height = 1.85f; controller.radius = 0.34f; controller.center = new Vector3(0f, 0.93f, 0f); controller.stepOffset = 0.32f; controller.slopeLimit = 48f;
            var rig = root.GetComponent<HumanoidGreyboxRig>();
            rig.Build(new Color(0.45f, 0.28f, 0.19f), new Color(0.055f, 0.07f, 0.075f), new Color(0.11f, 0.13f, 0.14f), new Color(0.18f, 0.78f, 0.48f));
            var animation = root.GetComponent<CharacterAnimationDriver>();
            animation.SetRig(rig);
            var production = root.AddComponent<ProductionCharacterPresenter>();
            production.Configure("M8/Characters/Processed/PF_Hero_Humanoid_M8_1", "M8/Animation/AC_Hero_M8", rig, CharacterPresentationRole.Hero);
            animation.SetProductionPresenter(production);
            var characterFillObject = new GameObject("hero_character_fill", typeof(Light)); characterFillObject.transform.SetParent(root.transform); characterFillObject.transform.localPosition = new Vector3(0f, 1.65f, -0.65f);
            var characterFill = characterFillObject.GetComponent<Light>(); characterFill.type = LightType.Point; characterFill.range = 3.4f; characterFill.intensity = 0.8f; characterFill.color = new Color(0.82f, 0.88f, 1f); characterFill.shadows = LightShadows.None;
            var cameraObject = new GameObject("ThirdPersonCamera", typeof(Camera), typeof(AudioListener), typeof(ThirdPersonCameraRig));
            cameraObject.transform.SetParent(parent);
            var camera = cameraObject.GetComponent<Camera>();
            camera.fieldOfView = 60f; camera.nearClipPlane = 0.08f; camera.farClipPlane = 220f;
            var cameraData = cameraObject.GetComponent<UniversalAdditionalCameraData>();
            if (cameraData == null) cameraData = cameraObject.AddComponent<UniversalAdditionalCameraData>();
            cameraData.renderPostProcessing = true;
            var cameraRig = cameraObject.GetComponent<ThirdPersonCameraRig>();
            cameraRig.Configure(root.transform, input, sensitivity);
            var motor = root.GetComponent<ThirdPersonMotor>();
            motor.Configure(input, cameraObject.transform, audio);
            scanner = root.GetComponent<InteractionScanner>();
            return motor;
        }

        private static void BuildSafehouse(Transform root)
        {
            var safehouse = new GameObject("safehouse_01").transform; safehouse.SetParent(root);
            Primitive("floor", PrimitiveType.Cube, safehouse, new Vector3(0f, -0.18f, 3.5f), new Vector3(12f, 0.35f, 13f), M8AssetRuntime.TexturedMaterial("SafehouseConcrete", "M8/Environment/Textures/TX_URB_concrete", new Color(0.36f, 0.36f, 0.34f), new Vector2(4f, 4f), 0.12f));
            Primitive("back_wall", PrimitiveType.Cube, safehouse, new Vector3(0f, 2.2f, -3f), new Vector3(12f, 4.4f, 0.35f), Mat("plaster", new Color(0.48f, 0.49f, 0.46f)));
            Primitive("left_wall", PrimitiveType.Cube, safehouse, new Vector3(-6f, 2.2f, 3.5f), new Vector3(0.35f, 4.4f, 13f), Mat("plaster", new Color(0.48f, 0.49f, 0.46f)));
            Primitive("right_wall", PrimitiveType.Cube, safehouse, new Vector3(6f, 2.2f, 3.5f), new Vector3(0.35f, 4.4f, 13f), Mat("plaster", new Color(0.48f, 0.49f, 0.46f)));
            Primitive("front_left", PrimitiveType.Cube, safehouse, new Vector3(-4f, 2.2f, 10f), new Vector3(4f, 4.4f, 0.35f), Mat("plaster", new Color(0.42f, 0.43f, 0.4f)));
            Primitive("front_right", PrimitiveType.Cube, safehouse, new Vector3(4f, 2.2f, 10f), new Vector3(4f, 4.4f, 0.35f), Mat("plaster", new Color(0.42f, 0.43f, 0.4f)));
            Primitive("bed_frame", PrimitiveType.Cube, safehouse, new Vector3(-3.6f, 0.35f, -0.5f), new Vector3(3.1f, 0.45f, 5f), Mat("bed", new Color(0.13f, 0.17f, 0.17f)));
            Primitive("bed_sheet", PrimitiveType.Cube, safehouse, new Vector3(-3.6f, 0.62f, -0.5f), new Vector3(2.9f, 0.18f, 4.8f), Mat("sheet", new Color(0.29f, 0.46f, 0.38f)));
            Primitive("mirror", PrimitiveType.Cube, safehouse, new Vector3(5.75f, 1.8f, 0.6f), new Vector3(0.08f, 2.3f, 1.6f), Mat("mirror", new Color(0.42f, 0.52f, 0.56f), 0.72f));
            Primitive("phone_shelf", PrimitiveType.Cube, safehouse, new Vector3(-4.8f, 0.8f, 1.8f), new Vector3(1.4f, 0.12f, 1f), Mat("shelf", new Color(0.11f, 0.11f, 0.1f)));
            Primitive("rug", PrimitiveType.Cube, safehouse, new Vector3(0.4f, 0.02f, 3.7f), new Vector3(4.2f, 0.035f, 3.1f), Mat("rug", new Color(0.19f, 0.31f, 0.27f)));
            Primitive("desk", PrimitiveType.Cube, safehouse, new Vector3(3.9f, 0.78f, 7.8f), new Vector3(3f, 0.12f, 1.25f), Mat("wood", new Color(0.25f, 0.17f, 0.11f)));
            Primitive("desk_leg_l", PrimitiveType.Cube, safehouse, new Vector3(2.7f, 0.38f, 7.8f), new Vector3(0.12f, 0.75f, 0.95f), Mat("metal", new Color(0.12f, 0.13f, 0.13f)));
            Primitive("desk_leg_r", PrimitiveType.Cube, safehouse, new Vector3(5.1f, 0.38f, 7.8f), new Vector3(0.12f, 0.75f, 0.95f), Mat("metal", new Color(0.12f, 0.13f, 0.13f)));
            Primitive("monitor", PrimitiveType.Cube, safehouse, new Vector3(4.2f, 1.45f, 8.05f), new Vector3(1.5f, 0.9f, 0.12f), Mat("screen", new Color(0.08f, 0.16f, 0.15f), 0.7f));
            Primitive("cash_envelope", PrimitiveType.Cube, safehouse, new Vector3(3.1f, 0.88f, 7.45f), new Vector3(0.55f, 0.04f, 0.32f), Mat("envelope", new Color(0.72f, 0.62f, 0.38f)));
            Primitive("dresser", PrimitiveType.Cube, safehouse, new Vector3(-4.9f, 0.75f, 6.8f), new Vector3(1.7f, 1.5f, 1.2f), Mat("dresser", new Color(0.18f, 0.13f, 0.09f)));
            Primitive("charger_cable", PrimitiveType.Cylinder, safehouse, new Vector3(-4.2f, 0.9f, 2.05f), new Vector3(0.025f, 0.34f, 0.025f), Mat("cable", new Color(0.03f, 0.03f, 0.03f)));
            Primitive("wall_art_01", PrimitiveType.Cube, safehouse, new Vector3(-1.8f, 2.5f, -2.79f), new Vector3(2.2f, 1.25f, 0.06f), Mat("art_green", new Color(0.15f, 0.42f, 0.3f)));
            Primitive("wall_art_02", PrimitiveType.Cube, safehouse, new Vector3(1.1f, 2.25f, -2.78f), new Vector3(1.6f, 1.6f, 0.06f), Mat("art_gold", new Color(0.72f, 0.47f, 0.14f)));
            CreateWorldText("note", "MOVE SMART.\nKEEP AN EXIT.", safehouse, new Vector3(1.1f, 2.25f, -2.7f), Quaternion.identity, 0.075f, new Color(0.95f, 0.93f, 0.84f));
            M8AssetRuntime.Decal("safehouse_editorial_print", safehouse, new Vector3(-1.8f, 2.5f, -2.74f), Quaternion.identity, new Vector2(2.05f, 1.12f), 10);
            M8AssetRuntime.Place("M8/Environment/SM_URB_door_type_a", "SM_SafehouseDoorFrame", safehouse, new Vector3(0f, 0f, 9.78f), Quaternion.identity, 3.1f);
            M8AssetRuntime.Place("M8/Environment/SM_URB_pallet_small", "SM_DeskCrate", safehouse, new Vector3(4.9f, 0f, 6.7f), Quaternion.Euler(0f, 90f, 0f), 0.62f);
            var lamp = new GameObject("safehouse_light", typeof(Light)); lamp.transform.SetParent(safehouse); lamp.transform.position = new Vector3(0f, 3.4f, 3f);
            var light = lamp.GetComponent<Light>(); light.type = LightType.Point; light.range = 16f; light.intensity = 5f; light.color = new Color(1f, 0.76f, 0.52f);
            activeQuality.RegisterPractical(light);
            var deskLamp = new GameObject("safehouse_desk_fill", typeof(Light)); deskLamp.transform.SetParent(safehouse); deskLamp.transform.localPosition = new Vector3(4.1f, 2.25f, 6.6f);
            var deskLight = deskLamp.GetComponent<Light>(); deskLight.type = LightType.Spot; deskLight.range = 7f; deskLight.intensity = 3.2f; deskLight.spotAngle = 58f; deskLight.color = new Color(0.46f, 0.78f, 0.68f); deskLamp.transform.localRotation = Quaternion.Euler(48f, 180f, 0f);
            activeQuality.RegisterPractical(deskLight);
            BuildSafehousePolish(safehouse);
        }

        private static void BuildNeighborhood(Transform root)
        {
            var district = new GameObject("district_01").transform; district.SetParent(root);
            Primitive("street", PrimitiveType.Cube, district, new Vector3(0f, -0.22f, 42f), new Vector3(13f, 0.4f, 66f), M8AssetRuntime.TexturedMaterial("StreetAsphaltM82B", "M8/Environment/Textures/TX_URB_asphalt", new Color(0.38f, 0.375f, 0.35f), new Vector2(3f, 15f), 0.08f));
            Primitive("walk_left", PrimitiveType.Cube, district, new Vector3(-8f, 0f, 42f), new Vector3(3f, 0.34f, 66f), M8AssetRuntime.TexturedMaterial("SidewalkConcrete", "M8/Environment/Textures/TX_URB_concrete", new Color(0.55f, 0.54f, 0.5f), new Vector2(2f, 16f), 0.1f));
            Primitive("walk_right", PrimitiveType.Cube, district, new Vector3(8f, 0f, 42f), new Vector3(3f, 0.34f, 66f), M8AssetRuntime.TexturedMaterial("SidewalkConcrete", "M8/Environment/Textures/TX_URB_concrete", new Color(0.55f, 0.54f, 0.5f), new Vector2(2f, 16f), 0.1f));
            for (var index = 0; index < 8; index++)
            {
                var z = 16f + index * 8f;
                var height = 4.5f + index % 3 * 1.7f;
                Primitive($"block_left_{index:00}", PrimitiveType.Cube, district, new Vector3(-11f, height * 0.5f, z), new Vector3(5f, height, 6.2f), Mat(index % 2 == 0 ? "brick" : "paint", index % 2 == 0 ? new Color(0.34f, 0.18f, 0.14f) : new Color(0.2f, 0.28f, 0.28f)));
                Primitive($"block_right_{index:00}", PrimitiveType.Cube, district, new Vector3(11f, height * 0.5f, z + 2f), new Vector3(5f, height + 1f, 6.2f), Mat(index % 2 == 0 ? "paint" : "brick", index % 2 == 0 ? new Color(0.2f, 0.28f, 0.28f) : new Color(0.34f, 0.18f, 0.14f)));
                var leftFacade = M8AssetRuntime.Place(index % 2 == 0 ? "M8/Environment/SM_URB_wall_a_flat_window" : "M8/Environment/SM_URB_wall_b_window", $"SM_Facade_Left_{index:00}", district, new Vector3(-8.55f, 0.1f, z), Quaternion.Euler(0f, 90f, 0f), 3.1f);
                var rightFacade = M8AssetRuntime.Place(index % 2 == 0 ? "M8/Environment/SM_URB_wall_b_flat" : "M8/Environment/SM_URB_wall_a_flat_painted", $"SM_Facade_Right_{index:00}", district, new Vector3(8.55f, 0.1f, z + 2f), Quaternion.Euler(0f, -90f, 0f), 3.1f);
                if (leftFacade != null) activeQuality.Register(leftFacade, index > 4 ? M8QualityTier.High : M8QualityTier.Medium);
                if (rightFacade != null) activeQuality.Register(rightFacade, index > 4 ? M8QualityTier.High : M8QualityTier.Medium);
            }
            for (var index = 0; index < 5; index++)
            {
                var pole = Primitive($"street_light_{index:00}", PrimitiveType.Cylinder, district, new Vector3(index % 2 == 0 ? -6.8f : 6.8f, 2.3f, 21f + index * 11f), new Vector3(0.12f, 2.3f, 0.12f), Mat("metal", new Color(0.17f, 0.18f, 0.18f), 0.7f));
                var lamp = new GameObject("lamp", typeof(Light)); lamp.transform.SetParent(pole.transform); lamp.transform.localPosition = new Vector3(0f, 1f, 0f);
                var light = lamp.GetComponent<Light>(); light.type = LightType.Point; light.range = 8f; light.intensity = 2f; light.color = new Color(1f, 0.68f, 0.38f);
                activeQuality.RegisterPractical(light);
            }
            Primitive("market_canopy", PrimitiveType.Cube, district, new Vector3(0f, 3.1f, 64f), new Vector3(8f, 0.22f, 5f), Mat("market_green", new Color(0.13f, 0.5f, 0.32f)));
            Primitive("market_backdrop", PrimitiveType.Cube, district, new Vector3(0f, 2f, 67f), new Vector3(12f, 4f, 0.4f), Mat("market_wall", new Color(0.07f, 0.09f, 0.08f)));
            Primitive("route_branch", PrimitiveType.Cube, district, new Vector3(5.5f, -0.17f, 33f), new Vector3(10f, 0.3f, 4f), Mat("asphalt", new Color(0.105f, 0.115f, 0.12f)));
            BuildStreetMarkings(district);
            BuildStreetDressing(district);
            BuildAmbientLife(district);
            BuildStreetStory(district);
            BuildFacadeRhythm(district);
            BuildRayCornerPolish(district);
            BuildHubPolish(district);
        }

        private static Light CreateSun(Transform parent)
        {
            var item = new GameObject("district_sun", typeof(Light)); item.transform.SetParent(parent); item.transform.rotation = Quaternion.Euler(44f, -28f, 0f);
            var sun = item.GetComponent<Light>(); sun.type = LightType.Directional; sun.intensity = 1.48f; sun.color = new Color(1f, 0.91f, 0.82f); sun.shadows = LightShadows.Soft; sun.shadowStrength = 0.68f;
            RenderSettings.sun = sun;
            return sun;
        }

        private static NpcContactInteractable CreateNpc(Transform parent, Vector3 position)
        {
            var root = new GameObject("npc_contact_ray_01", typeof(CapsuleCollider), typeof(NpcContactInteractable), typeof(HumanoidGreyboxRig), typeof(NpcPresentationController)); root.transform.SetParent(parent); root.transform.localPosition = position;
            var rig = root.GetComponent<HumanoidGreyboxRig>();
            rig.Build(new Color(0.37f, 0.21f, 0.14f), new Color(0.17f, 0.11f, 0.2f), new Color(0.09f, 0.09f, 0.11f), new Color(0.94f, 0.68f, 0.18f));
            root.GetComponent<CapsuleCollider>().center = new Vector3(0f, 1.1f, 0f); root.GetComponent<CapsuleCollider>().height = 2.3f; root.GetComponent<CapsuleCollider>().radius = 0.48f;
            var awareness = root.AddComponent<SphereCollider>(); awareness.isTrigger = true; awareness.center = new Vector3(0f, 1f, 0f); awareness.radius = 4.5f;
            var production = root.AddComponent<ProductionCharacterPresenter>();
            production.Configure("M8/Characters/Processed/PF_Ray_Humanoid_M8_1", "M8/Animation/AC_Ray_M8", rig, CharacterPresentationRole.Ray);
            root.GetComponent<NpcPresentationController>().Configure(rig, production);
            var keyObject = new GameObject("ray_conversation_key", typeof(Light)); keyObject.transform.SetParent(parent); keyObject.transform.localPosition = position + new Vector3(1.6f, 2.7f, -1.4f);
            var key = keyObject.GetComponent<Light>(); key.type = LightType.Point; key.range = 6.5f; key.intensity = 2.1f; key.color = new Color(1f, 0.72f, 0.48f); key.shadows = LightShadows.None;
            activeQuality.RegisterPractical(key);
            return root.GetComponent<NpcContactInteractable>();
        }

        private static void BuildStreetMarkings(Transform district)
        {
            var lanePaint = Mat("lane_paint", new Color(0.76f, 0.66f, 0.32f), 0.08f);
            var crossingPaint = Mat("crossing_paint", new Color(0.72f, 0.72f, 0.67f), 0.06f);
            for (var index = 0; index < 7; index++)
            {
                Primitive($"lane_dash_{index:00}", PrimitiveType.Cube, district, new Vector3(0f, 0.005f, 17f + index * 9f), new Vector3(0.14f, 0.018f, 3.8f), lanePaint);
            }
            for (var index = 0; index < 6; index++)
            {
                Primitive($"hub_crossing_{index:00}", PrimitiveType.Cube, district, new Vector3(-4.5f + index * 1.8f, 0.008f, 58.4f), new Vector3(1.05f, 0.02f, 0.48f), crossingPaint);
            }
            Primitive("curb_edge_left", PrimitiveType.Cube, district, new Vector3(-6.55f, 0.12f, 42f), new Vector3(0.16f, 0.18f, 66f), Mat("curb_edge", new Color(0.46f, 0.45f, 0.4f), 0.12f));
            Primitive("curb_edge_right", PrimitiveType.Cube, district, new Vector3(6.55f, 0.12f, 42f), new Vector3(0.16f, 0.18f, 66f), Mat("curb_edge", new Color(0.46f, 0.45f, 0.4f), 0.12f));
        }

        private static void BuildStreetDressing(Transform district)
        {
            for (var index = 0; index < 5; index++)
            {
                var side = index % 2 == 0 ? -1f : 1f;
                var z = 19f + index * 10f;
                Primitive($"trash_{index:00}", PrimitiveType.Cylinder, district, new Vector3(side * 7.15f, 0.52f, z), new Vector3(0.38f, 0.52f, 0.38f), Mat("trash", new Color(0.12f, 0.18f, 0.15f)));
                Primitive($"hydrant_{index:00}", PrimitiveType.Cylinder, district, new Vector3(-side * 6.9f, 0.32f, z + 3f), new Vector3(0.18f, 0.32f, 0.18f), Mat("hydrant", new Color(0.65f, 0.16f, 0.1f)));
            }
            for (var step = 0; step < 3; step++)
                Primitive($"stoop_step_{step}", PrimitiveType.Cube, district, new Vector3(8.9f + step * 0.32f, 0.14f + step * 0.14f, 45f), new Vector3(0.7f, 0.28f + step * 0.02f, 3f), Mat("stoop", new Color(0.29f, 0.29f, 0.26f)));
            for (var index = 0; index < 10; index++)
                Primitive($"fence_post_{index:00}", PrimitiveType.Cube, district, new Vector3(-8.75f, 0.9f, 48f + index * 0.55f), new Vector3(0.08f, 1.8f, 0.08f), Mat("fence", new Color(0.18f, 0.19f, 0.18f), 0.65f));
            CreateCar("parked_car_a", district, new Vector3(-4.8f, 0.45f, 27f), new Color(0.18f, 0.29f, 0.31f));
            CreateCar("parked_car_b", district, new Vector3(4.8f, 0.45f, 48f), new Color(0.48f, 0.12f, 0.1f));
            CreateCar("parked_car_c", district, new Vector3(-4.8f, 0.45f, 57f), new Color(0.16f, 0.17f, 0.19f));
            Primitive("basketball_pole", PrimitiveType.Cylinder, district, new Vector3(8.1f, 2.1f, 22f), new Vector3(0.1f, 2.1f, 0.1f), Mat("metal", new Color(0.17f, 0.18f, 0.18f), 0.7f));
            Primitive("basketball_board", PrimitiveType.Cube, district, new Vector3(7.8f, 3.65f, 22f), new Vector3(0.12f, 1.15f, 1.8f), Mat("board", new Color(0.76f, 0.74f, 0.66f)));
            Primitive("basketball_rim", PrimitiveType.Cylinder, district, new Vector3(7.35f, 3.2f, 22f), new Vector3(0.3f, 0.04f, 0.3f), Mat("rim", new Color(0.78f, 0.22f, 0.08f)));
            CreateWorldText("store_sign", "MERCADO  /  OPEN LATE", district, new Vector3(8.45f, 3.25f, 61f), Quaternion.Euler(0f, 90f, 0f), 0.09f, new Color(0.94f, 0.68f, 0.18f));
            M8AssetRuntime.Place("M8/Environment/SM_URB_detail_bench", "SM_Bench_Production", district, new Vector3(-7.7f, 0.2f, 29f), Quaternion.Euler(0f, 90f, 0f), 0.85f);
            M8AssetRuntime.Place("M8/Environment/SM_URB_detail_dumpster_closed", "SM_Dumpster_Production", district, new Vector3(7.3f, 0.2f, 36f), Quaternion.Euler(0f, -90f, 0f), 1.25f);
            M8AssetRuntime.Place("M8/Environment/SM_URB_detail_awning_wide", "SM_MarketAwning", district, new Vector3(0f, 2.7f, 66.5f), Quaternion.Euler(0f, 180f, 0f), 1.35f);
            M8AssetRuntime.Place("M8/Environment/SM_URB_scaffolding_structure", "SM_Scaffolding", district, new Vector3(8.55f, 0.1f, 50f), Quaternion.Euler(0f, -90f, 0f), 4.2f);
            var hubLightObject = new GameObject("hub_focal_light", typeof(Light)); hubLightObject.transform.SetParent(district); hubLightObject.transform.localPosition = new Vector3(0f, 3.4f, 62.2f);
            var hubLight = hubLightObject.GetComponent<Light>(); hubLight.type = LightType.Spot; hubLight.range = 10f; hubLight.intensity = 4f; hubLight.spotAngle = 72f; hubLight.color = new Color(0.28f, 0.92f, 0.62f); hubLightObject.transform.localRotation = Quaternion.Euler(35f, 0f, 0f);
            activeQuality.RegisterPractical(hubLight);
        }

        private static void BuildAmbientLife(Transform district)
        {
            CreatePedestrian("ambient_maya", "M8/Characters/Processed/PF_Crowd_A_Humanoid_M8_1", "M8/Animation/AC_Crowd_A_M8", district, new Vector3(-7.4f, 0.1f, 18f), new Vector3(-7.4f, 0.1f, 35f), 1.3f, 0.15f, M8QualityTier.Low, new Color(0.42f, 0.18f, 0.12f), new Color(0.22f, 0.32f, 0.42f), new Color(0.9f, 0.55f, 0.2f));
            CreatePedestrian("ambient_dev", "M8/Characters/Processed/PF_Crowd_B_Humanoid_M8_1", "M8/Animation/AC_Crowd_B_M8", district, new Vector3(7.4f, 0.1f, 31f), new Vector3(7.4f, 0.1f, 53f), 1.65f, 0.55f, M8QualityTier.Low, new Color(0.34f, 0.2f, 0.13f), new Color(0.32f, 0.17f, 0.12f), new Color(0.2f, 0.72f, 0.46f));
            CreatePedestrian("ambient_lex", "M8/Characters/Processed/PF_Crowd_C_Humanoid_M8_1", "M8/Animation/AC_Crowd_C_M8", district, new Vector3(-7.1f, 0.1f, 46f), new Vector3(-7.1f, 0.1f, 61f), 1.1f, 0.8f, M8QualityTier.Medium, new Color(0.58f, 0.38f, 0.25f), new Color(0.16f, 0.16f, 0.19f), new Color(0.65f, 0.2f, 0.16f));
            var trafficA = CreateCar("traffic_a", district, new Vector3(-2.6f, 0.45f, 12f), new Color(0.12f, 0.2f, 0.31f));
            trafficA.AddComponent<AmbientVehicle>().Configure(new Vector3(-2.6f, 0.45f, 12f), new Vector3(-2.6f, 0.45f, 73f), 7.5f, 2f);
            var trafficB = CreateCar("traffic_b", district, new Vector3(2.6f, 0.45f, 73f), new Color(0.5f, 0.45f, 0.33f));
            trafficB.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
            trafficB.AddComponent<AmbientVehicle>().Configure(new Vector3(2.6f, 0.45f, 73f), new Vector3(2.6f, 0.45f, 12f), 6.4f, 7f);
        }

        private static void CreatePedestrian(string name, string modelResource, string controllerResource, Transform parent, Vector3 start, Vector3 end, float speed, float offset, M8QualityTier minimumQuality, Color skin, Color jacket, Color accent)
        {
            var root = new GameObject(name, typeof(HumanoidGreyboxRig), typeof(AmbientPedestrian));
            root.transform.SetParent(parent);
            var rig = root.GetComponent<HumanoidGreyboxRig>();
            rig.Build(skin, jacket, new Color(0.08f, 0.09f, 0.11f), accent);
            var production = root.AddComponent<ProductionCharacterPresenter>();
            production.Configure(modelResource, controllerResource, rig, CharacterPresentationRole.Crowd);
            root.GetComponent<AmbientPedestrian>().Configure(rig, production, start, end, speed, offset);
            activeQuality.Register(root, minimumQuality);
        }

        private static void BuildStreetStory(Transform district)
        {
            M8AssetRuntime.Decal("decal_delivery_01", district, new Vector3(-8.44f, 1.55f, 23.7f), Quaternion.Euler(0f, 90f, 0f), new Vector2(1.35f, 1.55f), 1);
            M8AssetRuntime.Decal("decal_store_01", district, new Vector3(8.44f, 1.65f, 31f), Quaternion.Euler(0f, -90f, 0f), new Vector2(1.55f, 1.8f), 4);
            M8AssetRuntime.Decal("decal_alley_01", district, new Vector3(-8.44f, 1.35f, 52f), Quaternion.Euler(0f, 90f, 0f), new Vector2(1.8f, 1.35f), 13);
            M8AssetRuntime.Decal("decal_market_01", district, new Vector3(3.1f, 1.55f, 66.77f), Quaternion.Euler(0f, 180f, 0f), new Vector2(1.3f, 1.3f), 8);
            M8AssetRuntime.Place("M8/Environment/SM_URB_detail_cables_type_a", "SM_UtilityCables_A", district, new Vector3(-8.5f, 3.8f, 35f), Quaternion.Euler(0f, 90f, 0f), 2.4f);
            M8AssetRuntime.Place("M8/Environment/SM_URB_pallet", "SM_DeliveryPallet_A", district, new Vector3(-7.1f, 0.2f, 25.2f), Quaternion.Euler(0f, 18f, 0f), 0.45f);
            M8AssetRuntime.Place("M8/Environment/SM_URB_pallet_small", "SM_DeliveryPallet_B", district, new Vector3(-6.8f, 0.2f, 25.9f), Quaternion.Euler(0f, -12f, 0f), 0.36f);
            var shrub = M8AssetRuntime.Place("M8/Environment/SM_URB_tree_shrub", "SM_Shrub_Corner", district, new Vector3(7.2f, 0.15f, 20f), Quaternion.identity, 0.75f);
            if (shrub != null) activeQuality.Register(shrub, M8QualityTier.High);
        }

        private static void BuildSafehousePolish(Transform safehouse)
        {
            var charcoal = Mat("m82b_charcoal", new Color(0.065f, 0.075f, 0.075f), 0.24f);
            var warmWood = Mat("m82b_warm_wood", new Color(0.29f, 0.19f, 0.115f), 0.32f);
            var linen = Mat("m82b_linen", new Color(0.71f, 0.69f, 0.61f), 0.08f);
            var emerald = Mat("m82b_emerald", new Color(0.08f, 0.34f, 0.24f), 0.22f);
            var brass = Mat("m82b_brass", new Color(0.62f, 0.42f, 0.12f), 0.7f);

            DecorativePrimitive("bed_headboard", PrimitiveType.Cube, safehouse, new Vector3(-3.6f, 1.15f, -2.7f), new Vector3(3.35f, 1.65f, 0.18f), charcoal);
            DecorativePrimitive("pillow_left", PrimitiveType.Cube, safehouse, new Vector3(-4.28f, 0.8f, -1.85f), new Vector3(1.05f, 0.22f, 0.72f), linen, Quaternion.Euler(4f, -6f, 0f));
            DecorativePrimitive("pillow_right", PrimitiveType.Cube, safehouse, new Vector3(-2.94f, 0.8f, -1.85f), new Vector3(1.05f, 0.22f, 0.72f), linen, Quaternion.Euler(3f, 8f, 0f));
            DecorativePrimitive("bed_throw", PrimitiveType.Cube, safehouse, new Vector3(-3.6f, 0.755f, 0.55f), new Vector3(2.96f, 0.055f, 1.1f), emerald, Quaternion.Euler(0f, 0f, -2f));

            DecorativePrimitive("window_recess", PrimitiveType.Cube, safehouse, new Vector3(3.75f, 2.45f, -2.79f), new Vector3(3.15f, 2.15f, 0.08f), charcoal);
            DecorativePrimitive("window_glow", PrimitiveType.Cube, safehouse, new Vector3(3.75f, 2.45f, -2.72f), new Vector3(2.75f, 1.75f, 0.035f), EmissiveMat("m82b_window", new Color(0.16f, 0.28f, 0.29f), 0.42f));
            DecorativePrimitive("window_mullion_v", PrimitiveType.Cube, safehouse, new Vector3(3.75f, 2.45f, -2.66f), new Vector3(0.075f, 1.8f, 0.045f), charcoal);
            DecorativePrimitive("window_mullion_h", PrimitiveType.Cube, safehouse, new Vector3(3.75f, 2.45f, -2.66f), new Vector3(2.8f, 0.075f, 0.045f), charcoal);

            DecorativePrimitive("desk_lamp_base", PrimitiveType.Cylinder, safehouse, new Vector3(5f, 0.94f, 7.72f), new Vector3(0.24f, 0.055f, 0.24f), brass);
            DecorativePrimitive("desk_lamp_stem", PrimitiveType.Cylinder, safehouse, new Vector3(5f, 1.25f, 7.72f), new Vector3(0.035f, 0.3f, 0.035f), brass);
            DecorativePrimitive("desk_lamp_shade", PrimitiveType.Cylinder, safehouse, new Vector3(5f, 1.58f, 7.72f), new Vector3(0.22f, 0.15f, 0.22f), charcoal);
            for (var index = 0; index < 4; index++)
                DecorativePrimitive($"desk_book_{index:00}", PrimitiveType.Cube, safehouse, new Vector3(2.92f, 0.91f + index * 0.055f, 7.85f), new Vector3(0.62f - index * 0.035f, 0.05f, 0.42f), index % 2 == 0 ? emerald : warmWood, Quaternion.Euler(0f, index % 2 == 0 ? 3f : -4f, 0f));
            DecorativePrimitive("sneaker_left", PrimitiveType.Cube, safehouse, new Vector3(-5.05f, 0.11f, 5.68f), new Vector3(0.35f, 0.17f, 0.72f), linen, Quaternion.Euler(0f, -12f, 0f));
            DecorativePrimitive("sneaker_right", PrimitiveType.Cube, safehouse, new Vector3(-4.55f, 0.11f, 5.78f), new Vector3(0.35f, 0.17f, 0.72f), linen, Quaternion.Euler(0f, 7f, 0f));
            M8AssetRuntime.Decal("safehouse_m82b_print", safehouse, new Vector3(-0.02f, 2.45f, -2.72f), Quaternion.identity, new Vector2(1.15f, 1.3f), 9, "M8/Decals/TX_Decal_ZeroBudgetEditorial_Atlas_D");
            CreateWorldText("safehouse_plan_label", "TODAY  /  CASH  /  EXIT", safehouse, new Vector3(4.16f, 1.22f, 7.85f), Quaternion.Euler(82f, 180f, 0f), 0.028f, new Color(0.84f, 0.8f, 0.62f));
        }

        private static void BuildFacadeRhythm(Transform district)
        {
            var trim = Mat("m82b_facade_trim", new Color(0.105f, 0.12f, 0.115f), 0.35f);
            var windowA = EmissiveMat("m82b_window_warm", new Color(0.29f, 0.22f, 0.12f), 0.28f);
            var windowB = EmissiveMat("m82b_window_cool", new Color(0.10f, 0.20f, 0.22f), 0.2f);
            for (var index = 0; index < 8; index++)
            {
                var z = 16f + index * 8f;
                DecorativePrimitive($"facade_trim_left_{index:00}", PrimitiveType.Cube, district, new Vector3(-8.48f, 3.55f, z), new Vector3(0.08f, 0.13f, 5.35f), trim);
                DecorativePrimitive($"facade_trim_right_{index:00}", PrimitiveType.Cube, district, new Vector3(8.48f, 3.75f, z + 2f), new Vector3(0.08f, 0.13f, 5.35f), trim);
                for (var slot = -1; slot <= 1; slot += 2)
                {
                    DecorativePrimitive($"lit_window_l_{index:00}_{slot}", PrimitiveType.Cube, district, new Vector3(-8.43f, 2.35f, z + slot * 1.65f), new Vector3(0.055f, 0.85f, 0.72f), (index + slot) % 3 == 0 ? windowA : windowB);
                    DecorativePrimitive($"lit_window_r_{index:00}_{slot}", PrimitiveType.Cube, district, new Vector3(8.43f, 2.55f, z + 2f + slot * 1.65f), new Vector3(0.055f, 0.85f, 0.72f), (index + slot) % 2 == 0 ? windowA : windowB);
                }
            }
        }

        private static void BuildRayCornerPolish(Transform district)
        {
            var dark = Mat("m82b_ray_dark", new Color(0.08f, 0.085f, 0.08f), 0.28f);
            var timber = Mat("m82b_ray_timber", new Color(0.31f, 0.20f, 0.11f), 0.24f);
            var gold = Mat("m82b_ray_gold", new Color(0.68f, 0.47f, 0.15f), 0.38f);
            DecorativePrimitive("ray_corner_rug", PrimitiveType.Cube, district, new Vector3(-3.1f, 0.018f, 42.05f), new Vector3(2.6f, 0.025f, 2.2f), dark, Quaternion.Euler(0f, -7f, 0f));
            DecorativePrimitive("ray_fold_table", PrimitiveType.Cube, district, new Vector3(-5.35f, 0.78f, 42.75f), new Vector3(1.55f, 0.08f, 0.78f), timber);
            DecorativePrimitive("ray_table_leg_l", PrimitiveType.Cube, district, new Vector3(-5.88f, 0.39f, 42.75f), new Vector3(0.07f, 0.75f, 0.56f), dark);
            DecorativePrimitive("ray_table_leg_r", PrimitiveType.Cube, district, new Vector3(-4.82f, 0.39f, 42.75f), new Vector3(0.07f, 0.75f, 0.56f), dark);
            DecorativePrimitive("ray_ledger", PrimitiveType.Cube, district, new Vector3(-5.42f, 0.86f, 42.72f), new Vector3(0.52f, 0.035f, 0.38f), gold, Quaternion.Euler(0f, 14f, 0f));
            DecorativePrimitive("ray_stool", PrimitiveType.Cylinder, district, new Vector3(-5.55f, 0.42f, 41.4f), new Vector3(0.32f, 0.42f, 0.32f), dark);
            M8AssetRuntime.Decal("ray_corner_editorial", district, new Vector3(-8.42f, 1.72f, 42.1f), Quaternion.Euler(0f, 90f, 0f), new Vector2(1.45f, 1.7f), 5, "M8/Decals/TX_Decal_ZeroBudgetEditorial_Atlas_D");
            CreateWorldText("ray_corner_label", "READ THE BLOCK", district, new Vector3(-8.35f, 2.9f, 42.1f), Quaternion.Euler(0f, -90f, 0f), 0.052f, new Color(0.88f, 0.72f, 0.32f));
        }

        private static void BuildHubPolish(Transform district)
        {
            var charcoal = Mat("m82b_hub_charcoal", new Color(0.045f, 0.055f, 0.052f), 0.3f);
            var green = Mat("m82b_hub_green", new Color(0.07f, 0.36f, 0.235f), 0.27f);
            var timber = Mat("m82b_hub_timber", new Color(0.32f, 0.20f, 0.105f), 0.25f);
            var gold = EmissiveMat("m82b_hub_gold", new Color(0.72f, 0.47f, 0.10f), 0.34f);

            DecorativePrimitive("hub_canopy_fascia", PrimitiveType.Cube, district, new Vector3(0f, 3.18f, 62.15f), new Vector3(8.4f, 0.42f, 0.28f), green);
            DecorativePrimitive("hub_column_l", PrimitiveType.Cube, district, new Vector3(-3.75f, 1.58f, 63.7f), new Vector3(0.24f, 3.15f, 0.24f), charcoal);
            DecorativePrimitive("hub_column_r", PrimitiveType.Cube, district, new Vector3(3.75f, 1.58f, 63.7f), new Vector3(0.24f, 3.15f, 0.24f), charcoal);
            DecorativePrimitive("hub_counter", PrimitiveType.Cube, district, new Vector3(0f, 0.82f, 65.3f), new Vector3(6.8f, 1.18f, 0.72f), timber);
            DecorativePrimitive("hub_counter_top", PrimitiveType.Cube, district, new Vector3(0f, 1.44f, 65.22f), new Vector3(7.15f, 0.12f, 0.92f), charcoal);
            for (var index = -2; index <= 2; index++)
                DecorativePrimitive($"hub_counter_slat_{index + 2:00}", PrimitiveType.Cube, district, new Vector3(index * 1.18f, 0.82f, 64.91f), new Vector3(0.075f, 1.02f, 0.07f), gold);
            DecorativePrimitive("hub_sign_backer", PrimitiveType.Cube, district, new Vector3(0f, 2.35f, 66.72f), new Vector3(3.9f, 0.82f, 0.12f), charcoal);
            CreateWorldText("hub_sign_m82b", "THE HUB  /  OPEN LATE", district, new Vector3(0f, 2.35f, 66.57f), Quaternion.identity, 0.068f, new Color(0.94f, 0.78f, 0.34f));
            for (var side = -1; side <= 1; side += 2)
            {
                DecorativePrimitive($"hub_planter_{side}", PrimitiveType.Cube, district, new Vector3(side * 4.35f, 0.38f, 62.8f), new Vector3(0.82f, 0.62f, 0.82f), charcoal);
                DecorativePrimitive($"hub_plant_{side}", PrimitiveType.Sphere, district, new Vector3(side * 4.35f, 0.92f, 62.8f), new Vector3(0.72f, 0.78f, 0.72f), green);
                DecorativePrimitive($"hub_pendant_{side}", PrimitiveType.Sphere, district, new Vector3(side * 2.35f, 2.72f, 63.35f), new Vector3(0.22f, 0.16f, 0.22f), gold);
            }
            M8AssetRuntime.Decal("hub_editorial_left", district, new Vector3(-4.2f, 1.75f, 66.76f), Quaternion.Euler(0f, 180f, 0f), new Vector2(1.55f, 1.55f), 3, "M8/Decals/TX_Decal_ZeroBudgetEditorial_Atlas_D");
            M8AssetRuntime.Decal("hub_editorial_right", district, new Vector3(4.2f, 1.75f, 66.76f), Quaternion.Euler(0f, 180f, 0f), new Vector2(1.55f, 1.55f), 11, "M8/Decals/TX_Decal_ZeroBudgetEditorial_Atlas_D");
        }

        private static GameObject CreateCar(string name, Transform parent, Vector3 position, Color color)
        {
            var root = new GameObject(name); root.transform.SetParent(parent); root.transform.localPosition = position;
            Primitive("body", PrimitiveType.Cube, root.transform, Vector3.zero, new Vector3(1.75f, 0.55f, 3.7f), Mat($"{name}_body", color, 0.55f));
            Primitive("cabin", PrimitiveType.Cube, root.transform, new Vector3(0f, 0.48f, -0.15f), new Vector3(1.48f, 0.55f, 1.9f), Mat("car_glass", new Color(0.08f, 0.12f, 0.14f), 0.82f));
            foreach (var x in new[] { -0.9f, 0.9f }) foreach (var z in new[] { -1.25f, 1.25f })
                Primitive($"wheel_{x}_{z}", PrimitiveType.Cylinder, root.transform, new Vector3(x, -0.22f, z), new Vector3(0.27f, 0.13f, 0.27f), Mat("rubber", new Color(0.025f, 0.025f, 0.025f)), Quaternion.Euler(0f, 0f, 90f));
            return root;
        }

        private static void HideInteractionProxy(GameObject proxy)
        {
            var renderer = proxy.GetComponent<Renderer>();
            if (renderer != null) renderer.enabled = false;
        }

        private static void CreateWorldText(string name, string value, Transform parent, Vector3 position, Quaternion rotation, float characterSize, Color color)
        {
            var item = new GameObject(name, typeof(TextMesh)); item.transform.SetParent(parent); item.transform.localPosition = position; item.transform.localRotation = rotation;
            var text = item.GetComponent<TextMesh>(); text.text = value; text.fontSize = 64; text.characterSize = characterSize; text.anchor = TextAnchor.MiddleCenter; text.alignment = TextAlignment.Center; text.color = color;
        }

        private static T CreateInteractable<T>(string name, Transform parent, Vector3 position, Vector3 scale, Color color) where T : InteractableBehaviour
        {
            var item = Primitive(name, PrimitiveType.Cube, parent, position, scale, Mat(name, color));
            return item.AddComponent<T>();
        }

        private static GameObject Primitive(string name, PrimitiveType type, Transform? parent, Vector3 position, Vector3 scale, Material material)
        {
            var item = GameObject.CreatePrimitive(type); item.name = name; if (parent != null) item.transform.SetParent(parent); item.transform.localPosition = position; item.transform.localScale = scale; item.GetComponent<Renderer>().sharedMaterial = material; return item;
        }

        private static GameObject Primitive(string name, PrimitiveType type, Transform? parent, Vector3 position, Vector3 scale, Material material, Quaternion rotation)
        {
            var item = Primitive(name, type, parent, position, scale, material);
            item.transform.localRotation = rotation;
            return item;
        }

        private static GameObject DecorativePrimitive(string name, PrimitiveType type, Transform parent, Vector3 position, Vector3 scale, Material material, Quaternion? rotation = null)
        {
            var item = Primitive(name, type, parent, position, scale, material, rotation ?? Quaternion.identity);
            var collider = item.GetComponent<Collider>();
            if (collider != null) Object.Destroy(collider);
            return item;
        }

        private static Material Mat(string key, Color color, float smoothness = 0.25f)
        {
            if (Materials.TryGetValue(key, out var material)) return material;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            material = new Material(shader) { name = $"M7_{key}", color = color };
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            Materials[key] = material;
            return material;
        }

        private static Material EmissiveMat(string key, Color color, float intensity)
        {
            if (Materials.TryGetValue(key, out var material)) return material;
            material = Mat(key, color, 0.34f);
            if (material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * intensity);
            }
            return material;
        }

        private static Transform Marker(string name, Vector3 position, Transform parent)
        {
            var marker = new GameObject(name).transform; marker.SetParent(parent); marker.position = position; return marker;
        }
    }
}
