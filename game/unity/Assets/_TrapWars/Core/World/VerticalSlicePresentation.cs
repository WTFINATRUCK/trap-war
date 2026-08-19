using System.Collections.Generic;
using TrapWars.Interaction;
using TrapWars.Objectives;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.UI;
using TrapWars.Visuals;
using UnityEngine;

namespace TrapWars.World
{
    public sealed class WorldClueInteractable : InteractableBehaviour
    {
        private ObjectiveDirector objectives = null!;
        private IAnalyticsService analytics = null!;
        private IAudioService audioService = null!;
        private GreyboxHud hud = null!;
        private string clueId = string.Empty;
        private string observation = string.Empty;
        private bool observed;

        public void Configure(string id, string promptText, string observationText, ObjectiveDirector director, IAnalyticsService analyticsService, IAudioService audio, GreyboxHud greyboxHud)
        {
            clueId = id;
            observation = observationText;
            objectives = director;
            analytics = analyticsService;
            audioService = audio;
            hud = greyboxHud;
            SetPrompt(promptText);
        }

        public override void Interact(InteractionContext context)
        {
            context.Player.GetComponent<CharacterAnimationDriver>()?.PulseInteract();
            audioService.PlayCue(GameFeelAudioCue.Investigation);
            hud.Toast(observation, UiFactory.Gold);
            analytics.Track("world.optional_interaction", new Dictionary<string, object> { ["interaction_id"] = clueId, ["first_time"] = !observed });
            observed = true;
            if (objectives.Current == GreyboxObjective.InvestigateBlock)
                objectives.AdvanceFrom(GreyboxObjective.InvestigateBlock);
        }
    }

    public sealed class NpcPresentationController : MonoBehaviour
    {
        private HumanoidGreyboxRig rig = null!;
        private ProductionCharacterPresenter? productionPresenter;
        private Transform? attentionTarget;
        private Quaternion idleRotation;
        private bool conversing;
        private float nextGlance;

        public void Configure(HumanoidGreyboxRig humanoidRig)
        {
            rig = humanoidRig;
            idleRotation = transform.rotation;
            nextGlance = UnityEngine.Time.time + 1.5f;
        }

        public void Configure(HumanoidGreyboxRig humanoidRig, ProductionCharacterPresenter presenter)
        {
            Configure(humanoidRig);
            productionPresenter = presenter;
        }

        public void BeginConversation(Transform player)
        {
            attentionTarget = player;
            conversing = true;
            rig.SetMode(HumanoidPresentationMode.Dialogue);
            productionPresenter?.SetDialogue(true, player);
        }

        public void EndConversation()
        {
            attentionTarget = null;
            conversing = false;
            rig.SetMode(HumanoidPresentationMode.Locomotion);
            productionPresenter?.SetDialogue(false);
        }

        private void Update()
        {
            if (rig == null) return;
            if (attentionTarget != null)
            {
                var direction = Vector3.ProjectOnPlane(attentionTarget.position - transform.position, Vector3.up);
                if (direction.sqrMagnitude > 0.01f)
                {
                    var desired = Quaternion.LookRotation(direction);
                    transform.rotation = Quaternion.Slerp(transform.rotation, desired, 1f - Mathf.Exp(-(conversing ? 4.5f : 2.2f) * UnityEngine.Time.deltaTime));
                }
                return;
            }

            if (UnityEngine.Time.time >= nextGlance)
            {
                nextGlance = UnityEngine.Time.time + 3.5f + Mathf.Abs(Mathf.Sin(transform.position.z)) * 2.5f;
                idleRotation = Quaternion.Euler(0f, transform.eulerAngles.y + Random.Range(-22f, 22f), 0f);
            }
            transform.rotation = Quaternion.Slerp(transform.rotation, idleRotation, 1f - Mathf.Exp(-0.7f * UnityEngine.Time.deltaTime));
            rig.SetLocomotion(0f, false, 0f);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.GetComponent<ThirdPersonMotor>() == null || conversing) return;
            attentionTarget = other.transform;
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.transform != attentionTarget || conversing) return;
            attentionTarget = null;
        }
    }

    public sealed class AmbientPedestrian : MonoBehaviour
    {
        private HumanoidGreyboxRig rig = null!;
        private ProductionCharacterPresenter? productionPresenter;
        private Vector3 pointA;
        private Vector3 pointB;
        private Vector3 target;
        private float speed;
        private float pauseUntil;

        public void Configure(HumanoidGreyboxRig humanoidRig, Vector3 a, Vector3 b, float movementSpeed, float initialOffset)
        {
            rig = humanoidRig;
            pointA = a;
            pointB = b;
            speed = movementSpeed;
            target = initialOffset < 0.5f ? pointB : pointA;
            transform.position = Vector3.Lerp(pointA, pointB, initialOffset);
        }

        public void Configure(HumanoidGreyboxRig humanoidRig, ProductionCharacterPresenter presenter, Vector3 a, Vector3 b, float movementSpeed, float initialOffset)
        {
            Configure(humanoidRig, a, b, movementSpeed, initialOffset);
            productionPresenter = presenter;
        }

        private void Update()
        {
            if (rig == null || UnityEngine.Time.time < pauseUntil)
            {
                rig?.SetLocomotion(0f, false, 0f);
                productionPresenter?.SetLocomotion(0f, true, false);
                return;
            }
            var delta = target - transform.position;
            if (delta.sqrMagnitude < 0.12f)
            {
                target = target == pointA ? pointB : pointA;
                pauseUntil = UnityEngine.Time.time + 1.2f + Mathf.Abs(Mathf.Sin(transform.position.x * 1.7f));
                rig.SetLocomotion(0f, false, 0f);
                productionPresenter?.SetLocomotion(0f, true, false);
                return;
            }
            var direction = delta.normalized;
            transform.position += direction * speed * UnityEngine.Time.deltaTime;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), 1f - Mathf.Exp(-6f * UnityEngine.Time.deltaTime));
            rig.SetLocomotion(Mathf.InverseLerp(0f, 4.05f, speed), false, 0f);
            productionPresenter?.SetLocomotion(Mathf.InverseLerp(0f, 4.05f, speed), true, false);
        }
    }

    public sealed class AmbientVehicle : MonoBehaviour
    {
        private Vector3 start;
        private Vector3 end;
        private float speed;
        private float delay;

        public void Configure(Vector3 from, Vector3 to, float movementSpeed, float startDelay)
        {
            start = from;
            end = to;
            speed = movementSpeed;
            delay = startDelay;
            transform.position = start;
            transform.rotation = Quaternion.LookRotation((end - start).normalized);
        }

        private void Update()
        {
            if (delay > 0f)
            {
                delay -= UnityEngine.Time.deltaTime;
                return;
            }
            transform.position = Vector3.MoveTowards(transform.position, end, speed * UnityEngine.Time.deltaTime);
            if ((transform.position - end).sqrMagnitude > 0.02f) return;
            transform.position = start;
            delay = 4f + Mathf.Abs(Mathf.Sin(UnityEngine.Time.time)) * 3f;
        }
    }

    public sealed class SubtleWorldMotion : MonoBehaviour
    {
        private Vector3 basePosition;
        private float phase;
        private float amplitude;

        public void Configure(float motionPhase, float motionAmplitude)
        {
            basePosition = transform.localPosition;
            phase = motionPhase;
            amplitude = motionAmplitude;
        }

        private void Update()
        {
            transform.localPosition = basePosition + Vector3.up * (Mathf.Sin(UnityEngine.Time.time * 1.2f + phase) * amplitude);
        }
    }
}
