using UnityEngine;

namespace TrapWars.Interaction
{
    public readonly struct InteractionContext
    {
        public readonly GameObject Player;
        public InteractionContext(GameObject player) => Player = player;
    }

    public interface IInteractable
    {
        string Prompt { get; }
        bool CanInteract { get; }
        Transform InteractionTransform { get; }
        void Interact(InteractionContext context);
    }

    public interface IInteractionPrompt
    {
        void Show(string prompt);
        void Hide();
    }

    public abstract class InteractableBehaviour : MonoBehaviour, IInteractable
    {
        [SerializeField] private string prompt = "Interact";
        public virtual string Prompt => prompt;
        public virtual bool CanInteract => enabled && gameObject.activeInHierarchy;
        public Transform InteractionTransform => transform;
        public abstract void Interact(InteractionContext context);
        public void SetPrompt(string value) => prompt = value;
    }
}
