using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TrapWars.Interaction;
using TrapWars.Objectives;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.Visuals;
using UnityEngine;
using UnityEngine.TestTools;

namespace TrapWars.Tests.PlayMode
{
    public sealed class GreyboxFlowTests
    {
        private readonly List<GameObject> created = new();

        [TearDown]
        public void TearDown()
        {
            foreach (var item in created)
                if (item != null) Object.DestroyImmediate(item);
            created.Clear();
        }

        [Test]
        public void Objectives_AdvanceOnlyInExpectedOrder()
        {
            var analytics = new AnalyticsStub();
            var objectives = new ObjectiveDirector(analytics);

            objectives.AdvanceFrom(GreyboxObjective.LeaveSafehouse);
            Assert.That(objectives.Current, Is.EqualTo(GreyboxObjective.CheckWordOnTheStreet));

            objectives.AdvanceFrom(GreyboxObjective.CheckWordOnTheStreet);
            Assert.That(objectives.Current, Is.EqualTo(GreyboxObjective.LeaveSafehouse));
            Assert.That(analytics.Events, Has.Count.EqualTo(2));
            Assert.That(analytics.Events, Does.Contain("objective.step_completed"));
        }

        [Test]
        public void Objectives_ResumeAtDayTwoHookForAuthoritativeDayTwoRun()
        {
            var objectives = new ObjectiveDirector(new AnalyticsStub());

            objectives.ResumeFromAuthoritativeDay(2);

            Assert.That(objectives.Current, Is.EqualTo(GreyboxObjective.DayTwoHook));
            Assert.That(objectives.CurrentText, Is.EqualTo("Check the new notification"));
        }

        [Test]
        public void Objectives_IncludeInvestigationAndOpportunityReviewWithoutSkippingOrder()
        {
            var objectives = new ObjectiveDirector(new AnalyticsStub());
            objectives.AdvanceFrom(GreyboxObjective.CheckWordOnTheStreet);
            objectives.AdvanceFrom(GreyboxObjective.LeaveSafehouse);

            Assert.That(objectives.Current, Is.EqualTo(GreyboxObjective.InvestigateBlock));

            objectives.AdvanceFrom(GreyboxObjective.InvestigateBlock);
            objectives.AdvanceFrom(GreyboxObjective.MeetContact);

            Assert.That(objectives.Current, Is.EqualTo(GreyboxObjective.ReviewOpportunity));
            objectives.AdvanceFrom(GreyboxObjective.MakeYourMove);
            Assert.That(objectives.Current, Is.EqualTo(GreyboxObjective.ReviewOpportunity));
        }

        [UnityTest]
        public IEnumerator HumanoidRig_BuildsNamedReplaceableSkeletonAndPhoneState()
        {
            var root = Track(new GameObject("humanoid", typeof(HumanoidGreyboxRig)));
            var rig = root.GetComponent<HumanoidGreyboxRig>();
            rig.Build(new Color(0.4f, 0.25f, 0.18f), Color.black, Color.gray, Color.green);

            rig.SetMode(HumanoidPresentationMode.Phone);
            yield return null;

            Assert.That(root.transform.Find("HumanoidVisual/Hips/Chest/Neck/Head"), Is.Not.Null);
            var phone = root.transform.Find("HumanoidVisual/Hips/Chest/RightUpperArm/RightForearm/RightHand/PhoneProp");
            Assert.That(phone, Is.Not.Null);
            Assert.That(phone!.gameObject.activeSelf, Is.True);
        }

        [UnityTest]
        public IEnumerator InteractionScanner_SelectsNearestPhysicalInteractableAndInvokesIt()
        {
            var player = Track(new GameObject("player", typeof(PlayModeInputStub), typeof(InteractionScanner)));
            var input = player.GetComponent<PlayModeInputStub>();
            var prompt = new PromptStub();
            var scanner = player.GetComponent<InteractionScanner>();
            scanner.Configure(input, prompt);

            var near = CreateInteractable("near", new Vector3(0f, 1f, 1f));
            CreateInteractable("far", new Vector3(0f, 1f, 2f));
            Physics.SyncTransforms();
            input.InteractThisFrame = true;

            yield return null;

            Assert.That(scanner.Current, Is.SameAs(near));
            Assert.That(near.Interactions, Is.EqualTo(1));
            Assert.That(prompt.VisibleText, Does.Contain("Use near"));
        }

        [UnityTest]
        public IEnumerator M8ProductionCharacter_InstallsSkinnedHumanoidAndHidesFallback()
        {
            var root = Track(new GameObject("m8-character", typeof(HumanoidGreyboxRig), typeof(ProductionCharacterPresenter)));
            var fallback = root.GetComponent<HumanoidGreyboxRig>();
            fallback.Build(new Color(0.4f, 0.25f, 0.18f), Color.black, Color.gray, Color.green);
            var presenter = root.GetComponent<ProductionCharacterPresenter>();

            var installed = presenter.Configure("M8/Characters/Processed/PF_Hero_Humanoid_M8_1", "M8/Animation/AC_Hero_M8", fallback, CharacterPresentationRole.Hero);
            yield return null;

            Assert.That(installed, Is.True);
            Assert.That(presenter.Installed, Is.True);
            Assert.That(root.transform.Find("HumanoidVisual")!.gameObject.activeSelf, Is.False);
            Assert.That(root.GetComponentInChildren<SkinnedMeshRenderer>(), Is.Not.Null);
            Assert.That(root.GetComponentInChildren<LODGroup>(), Is.Not.Null);
            Assert.That(root.GetComponentInChildren<Animator>().isHuman, Is.True);
            Assert.That(root.GetComponentInChildren<ProductionCharacterIkDriver>(), Is.Not.Null);

            presenter.SetPhone(true);
            yield return null;
            var phone = root.GetComponentsInChildren<Transform>(true).FirstOrDefault(value => value.name == "PR_Phone_Hero");
            Assert.That(phone, Is.Not.Null);
            Assert.That(phone!.gameObject.activeSelf, Is.True);
        }

        [Test]
        public void M8HeroLocomotion_UsesLoopedInPlaceClipsWithoutRagdollPhysics()
        {
            var controller = Resources.Load<RuntimeAnimatorController>("M8/Animation/AC_Hero_M8");
            var prefab = Resources.Load<GameObject>("M8/Characters/Processed/PF_Hero_Humanoid_M8_1");

            Assert.That(controller, Is.Not.Null);
            Assert.That(prefab, Is.Not.Null);
            foreach (var token in new[] { "Idle", "Walk", "Run" })
            {
                var clip = controller!.animationClips.FirstOrDefault(value => value.name.Contains(token));
                Assert.That(clip, Is.Not.Null, token);
                Assert.That(clip!.isLooping, Is.True, $"{token} must not freeze in a stride pose.");
                Assert.That(clip.averageSpeed.sqrMagnitude, Is.LessThan(0.0001f), $"{token} must remain in place for CharacterController authority.");
            }
            Assert.That(prefab!.GetComponentsInChildren<Rigidbody>(true), Is.Empty);
            Assert.That(prefab.GetComponentsInChildren<Joint>(true), Is.Empty);
            Assert.That(prefab.GetComponentInChildren<Animator>(true)!.applyRootMotion, Is.False);
        }

        [Test]
        public void M8_1AuthoredAudio_AllRequiredCuesArePackaged()
        {
            var resources = new[]
            {
                "M8/Audio/M8_UI_Select", "M8/Audio/M8_Phone_Open", "M8/Audio/M8_Phone_Close",
                "M8/Audio/M8_Trade", "M8/Audio/M8_Transition", "M8/Audio/M8_Door",
                "M8/Audio/M8_Dialogue", "M8/Audio/M8_Invalid", "M8/Audio/M8_Investigation",
                "M8/Audio/M8_Consequence", "M8/Audio/M8_Footstep_00", "M8/Audio/M8_Footstep_01",
                "M8/Audio/M8_Footstep_02", "M8/Audio/M8_Footstep_03", "M8/Audio/M8_Footstep_04"
            };

            foreach (var resource in resources)
                Assert.That(Resources.Load<AudioClip>(resource), Is.Not.Null, resource);
        }

        [Test]
        public void M8QualityController_EnforcesPopulationTiersAndBudgets()
        {
            var root = Track(new GameObject("quality", typeof(M8QualityController)));
            var low = Track(new GameObject("low"));
            var high = Track(new GameObject("high"));
            var quality = root.GetComponent<M8QualityController>();
            quality.Register(low, M8QualityTier.Low);
            quality.Register(high, M8QualityTier.High);

            quality.Apply(M8QualityTier.Low);
            Assert.That(low.activeSelf, Is.True);
            Assert.That(high.activeSelf, Is.False);
            Assert.That(QualitySettings.shadowDistance, Is.EqualTo(22f));

            quality.Apply(M8QualityTier.High);
            Assert.That(high.activeSelf, Is.True);
            Assert.That(QualitySettings.lodBias, Is.EqualTo(1.5f));
        }

        private PlayModeTestInteractable CreateInteractable(string id, Vector3 position)
        {
            var item = Track(new GameObject(id, typeof(PlayModeTestInteractable), typeof(BoxCollider)));
            item.transform.position = position;
            var interactable = item.GetComponent<PlayModeTestInteractable>();
            interactable.SetPrompt($"Use {id}");
            return interactable;
        }

        private GameObject Track(GameObject item)
        {
            created.Add(item);
            return item;
        }

        private sealed class PromptStub : IInteractionPrompt
        {
            public string VisibleText = string.Empty;
            public void Show(string prompt) => VisibleText = prompt;
            public void Hide() => VisibleText = string.Empty;
        }

        private sealed class AnalyticsStub : IAnalyticsService
        {
            public readonly List<string> Events = new();
            public void Track(string eventName, IReadOnlyDictionary<string, object>? properties = null) => Events.Add(eventName);
            public System.Threading.Tasks.Task FlushAsync(System.Threading.CancellationToken cancellationToken) => System.Threading.Tasks.Task.CompletedTask;
        }
    }

    public sealed class PlayModeInputStub : MonoBehaviour, IPlayerInputSource
    {
        public bool InteractThisFrame;
        public Vector2 Move => Vector2.zero;
        public Vector2 Look => Vector2.zero;
        public bool SprintHeld => false;
        public bool InteractPressed { get { var value = InteractThisFrame; InteractThisFrame = false; return value; } }
        public bool PhonePressed => false;
        public bool BackPressed => false;
        public bool ConfirmPressed => false;
    }

    public sealed class PlayModeTestInteractable : InteractableBehaviour
    {
        public int Interactions { get; private set; }
        public override void Interact(InteractionContext context) => Interactions += 1;
    }
}
