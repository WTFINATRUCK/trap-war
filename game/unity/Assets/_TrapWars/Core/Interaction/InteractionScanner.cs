using TrapWars.Player;
using UnityEngine;

namespace TrapWars.Interaction
{
    public sealed class InteractionScanner : MonoBehaviour
    {
        [SerializeField] private float radius = 2.25f;
        [SerializeField] private float forwardBias = 0.7f;
        private readonly Collider[] hits = new Collider[24];
        private IPlayerInputSource input = null!;
        private IInteractionPrompt prompt = null!;
        private IInteractable? current;

        public IInteractable? Current => current;

        public void Configure(IPlayerInputSource inputSource, IInteractionPrompt interactionPrompt)
        {
            input = inputSource;
            prompt = interactionPrompt;
        }

        private void Update()
        {
            if (input == null || prompt == null) return;
            var motor = GetComponent<ThirdPersonMotor>();
            if (motor != null && !motor.InputEnabled)
            {
                prompt.Hide();
                current = null;
                return;
            }
            current = FindNearest();
            if (current == null) prompt.Hide(); else prompt.Show($"E  {current.Prompt}");
            if (current != null && input.InteractPressed)
                current.Interact(new InteractionContext(gameObject));
        }

        private IInteractable? FindNearest()
        {
            var center = transform.position + transform.forward * forwardBias + Vector3.up;
            var count = Physics.OverlapSphereNonAlloc(center, radius, hits, ~0, QueryTriggerInteraction.Collide);
            IInteractable? nearest = null;
            var bestScore = float.MaxValue;
            for (var index = 0; index < count; index++)
            {
                var candidate = FindInteractable(hits[index]);
                if (candidate == null || !candidate.CanInteract) continue;
                var offset = candidate.InteractionTransform.position - transform.position;
                var score = offset.sqrMagnitude - Mathf.Max(0f, Vector3.Dot(transform.forward, offset.normalized));
                if (score >= bestScore) continue;
                bestScore = score;
                nearest = candidate;
            }
            return nearest;
        }

        private static IInteractable? FindInteractable(Collider source)
        {
            foreach (var behaviour in source.GetComponentsInParent<MonoBehaviour>())
                if (behaviour is IInteractable interactable) return interactable;
            return null;
        }
    }
}
