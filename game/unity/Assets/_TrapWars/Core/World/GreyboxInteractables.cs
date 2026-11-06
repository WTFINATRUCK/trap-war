using System.Collections;
using System.Collections.Generic;
using TrapWars.Dialogue;
using TrapWars.Interaction;
using TrapWars.Market;
using TrapWars.Objectives;
using TrapWars.Player;
using TrapWars.Phone;
using TrapWars.Services;
using TrapWars.UI;
using UnityEngine;

namespace TrapWars.World
{
    public sealed class PhoneInteractable : InteractableBehaviour
    {
        private TrapPhoneController phone = null!;
        public void Configure(TrapPhoneController controller) { phone = controller; SetPrompt("Open Trap Phone"); }
        public override void Interact(InteractionContext context) => phone.Open();
    }

    public sealed class MarketInteractable : InteractableBehaviour
    {
        private MarketController market = null!;
        private ObjectiveDirector objectives = null!;
        public override bool CanInteract => objectives != null && objectives.Current >= GreyboxObjective.ReviewOpportunity && base.CanInteract;
        public void Configure(MarketController controller, ObjectiveDirector director) { market = controller; objectives = director; SetPrompt("Check Market"); }
        public override void Interact(InteractionContext context) => market.Open();
    }

    public sealed class StashInteractable : InteractableBehaviour
    {
        private StashController stash = null!;
        private ObjectiveDirector objectives = null!;
        public override bool CanInteract => base.CanInteract && objectives != null && objectives.Current >= GreyboxObjective.EndTheDay;
        public void Configure(StashController controller, ObjectiveDirector director) { stash = controller; objectives = director; SetPrompt("Check Stash"); }
        public override void Interact(InteractionContext context) => stash.Open();
    }

    public sealed class SafehouseExitInteractable : InteractableBehaviour
    {
        private ObjectiveDirector objectives = null!;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;
        private GreyboxHud hud = null!;
        private Collider? doorway;
        private bool opened;
        public void Configure(ObjectiveDirector director, IAnalyticsService analyticsService, IAudioService audio, GreyboxHud greyboxHud) { objectives = director; analytics = analyticsService; audioService = audio; hud = greyboxHud; SetPrompt("Step outside"); }

        /// <summary>Solid blocker in the door opening; it stays closed until the player chooses to step outside.</summary>
        public void SetDoorway(Collider blocker) => doorway = blocker;
        public override bool CanInteract => !opened && objectives != null && objectives.Current >= GreyboxObjective.LeaveSafehouse && base.CanInteract;
        public override void Interact(InteractionContext context)
        {
            if (opened) return;
            opened = true;
            if (doorway != null) doorway.enabled = false;
            objectives.AdvanceFrom(GreyboxObjective.LeaveSafehouse);
            analytics.Track("safehouse.exited", new Dictionary<string, object> { ["exit_id"] = "safehouse_exit_01" });
            audioService.PlayCue(GameFeelAudioCue.Door);
            audioService.SetStreetAmbience(true);
            hud.Toast("Street noise rolls in. Read the block before you move.", UiFactory.Gold);
            PlacePlayerOutside(context.Player);
            StartCoroutine(OpenDoor());
        }

        private static void PlacePlayerOutside(GameObject player)
        {
            var controller = player.GetComponent<CharacterController>();
            if (controller != null) controller.enabled = false;
            player.transform.SetPositionAndRotation(new Vector3(0f, 0.1f, 14.5f), Quaternion.identity);
            if (controller != null) controller.enabled = true;
            Object.FindFirstObjectByType<ThirdPersonCameraRig>()?.SnapToYaw(0f);
        }

        private IEnumerator OpenDoor()
        {
            var start = transform.rotation;
            for (var elapsed = 0f; elapsed < 0.55f; elapsed += UnityEngine.Time.deltaTime)
            {
                transform.rotation = Quaternion.Slerp(start, start * Quaternion.Euler(0f, 92f, 0f), elapsed / 0.55f);
                yield return null;
            }
            GetComponent<Collider>().enabled = false;
        }
    }

    public sealed class NpcContactInteractable : InteractableBehaviour
    {
        private IDialogueService dialogue = null!;
        private DialogueSequence sequence = null!;
        private DialogueSequence? uninformedSequence;
        private ObjectiveDirector objectives = null!;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;
        private GreyboxHud hud = null!;
        private Transform? player;
        private bool talking;
        public override bool CanInteract => objectives != null && objectives.Current >= GreyboxObjective.InvestigateBlock && base.CanInteract;
        public void Configure(IDialogueService dialogueService, DialogueSequence content, ObjectiveDirector director, IAnalyticsService analyticsService, IAudioService audio, GreyboxHud greyboxHud)
        {
            dialogue = dialogueService; sequence = content; objectives = director; analytics = analyticsService; audioService = audio; hud = greyboxHud; SetPrompt("Talk to Ray");
        }
        /// <summary>Lines used when the player reaches Ray before inspecting the block.</summary>
        public void SetUninformedSequence(DialogueSequence content) => uninformedSequence = content;

        public override void Interact(InteractionContext context)
        {
            if (talking) return;
            player = context.Player.transform;
            var motor = context.Player.GetComponent<ThirdPersonMotor>();
            var animation = context.Player.GetComponent<CharacterAnimationDriver>();
            var camera = Object.FindFirstObjectByType<ThirdPersonCameraRig>();
            var presentation = GetComponent<NpcPresentationController>();
            var activeSequence = sequence;
            if (objectives.Current == GreyboxObjective.InvestigateBlock)
            {
                analytics.Track("world.location_dwell", new Dictionary<string, object> { ["location_id"] = "home_block", ["investigation_skipped"] = true });
                objectives.AdvanceFrom(GreyboxObjective.InvestigateBlock);
                hud.Toast("Ray noticed what you missed. Listen close.", UiFactory.Gold);
                if (uninformedSequence != null) activeSequence = uninformedSequence;
            }
            if (motor != null) motor.InputEnabled = false;
            animation?.SetDialogue(true);
            var toRay = Vector3.ProjectOnPlane(transform.position - player.position, Vector3.up);
            if (toRay.sqrMagnitude > 0.01f)
            {
                player.rotation = Quaternion.LookRotation(toRay.normalized, Vector3.up);
                camera?.FocusYaw(player.eulerAngles.y);
            }
            camera?.SetContext(CameraContext.Dialogue);
            presentation?.BeginConversation(context.Player.transform);
            audioService.PlayCue(GameFeelAudioCue.Dialogue);
            talking = true;
            analytics.Track("npc.interaction_started", new Dictionary<string, object> { ["npc_id"] = "contact_ray_01" });
            dialogue.Present(activeSequence, () =>
            {
                talking = false;
                if (motor != null) motor.InputEnabled = true;
                animation?.SetDialogue(false);
                camera?.SetContext(CameraContext.Exploration);
                presentation?.EndConversation();
                objectives.AdvanceFrom(GreyboxObjective.MeetContact);
                analytics.Track("npc.interaction_completed", new Dictionary<string, object> { ["npc_id"] = "contact_ray_01" });
            });
        }
        private void Update()
        {
            if (!talking || player == null || GetComponent<NpcPresentationController>() != null) return;
            var direction = Vector3.ProjectOnPlane(player.position - transform.position, Vector3.up);
            if (direction.sqrMagnitude > 0.01f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), 1f - Mathf.Exp(-7f * UnityEngine.Time.deltaTime));
        }
    }
}
