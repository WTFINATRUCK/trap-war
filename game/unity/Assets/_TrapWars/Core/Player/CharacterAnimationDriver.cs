using UnityEngine;
using TrapWars.Visuals;

namespace TrapWars.Player
{
    public sealed class CharacterAnimationDriver : MonoBehaviour
    {
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int GroundedHash = Animator.StringToHash("Grounded");
        private static readonly int SprintHash = Animator.StringToHash("Sprint");
        private static readonly int PhoneHash = Animator.StringToHash("PhoneOpen");
        private Animator? animator;
        private Transform? visual;
        private HumanoidGreyboxRig? rig;
        private ProductionCharacterPresenter? productionPresenter;
        private float visualBob;
        private float previousYaw;

        public void SetVisual(Transform placeholderVisual)
        {
            visual = placeholderVisual;
        }

        public void SetRig(HumanoidGreyboxRig humanoidRig)
        {
            rig = humanoidRig;
            visual = null;
        }

        public void SetProductionPresenter(ProductionCharacterPresenter presenter)
        {
            productionPresenter = presenter;
            animator = presenter.GetComponentInChildren<Animator>();
        }

        private void Awake()
        {
            animator = GetComponentInChildren<Animator>();
            rig = GetComponentInChildren<HumanoidGreyboxRig>();
            productionPresenter = GetComponent<ProductionCharacterPresenter>();
            previousYaw = transform.eulerAngles.y;
        }

        public void SetLocomotion(float normalizedSpeed, bool grounded, bool sprinting)
        {
            if (productionPresenter != null)
            {
                productionPresenter.SetLocomotion(normalizedSpeed, grounded, sprinting);
            }
            else if (animator != null)
            {
                animator.SetFloat(SpeedHash, normalizedSpeed, 0.12f, UnityEngine.Time.deltaTime);
                animator.SetBool(GroundedHash, grounded);
                animator.SetBool(SprintHash, sprinting);
            }
            var yaw = transform.eulerAngles.y;
            var turn = Mathf.Clamp(Mathf.DeltaAngle(previousYaw, yaw) / Mathf.Max(1f, 180f * UnityEngine.Time.deltaTime), -1f, 1f);
            previousYaw = yaw;
            rig?.SetLocomotion(normalizedSpeed, sprinting, turn);
            if (visual != null)
            {
                visualBob += UnityEngine.Time.deltaTime * Mathf.Lerp(2f, 11f, normalizedSpeed);
                visual.localPosition = Vector3.up * (Mathf.Sin(visualBob) * 0.025f * normalizedSpeed);
                visual.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(visualBob * 0.5f) * 1.5f * normalizedSpeed);
            }
        }

        public void SetPhoneOpen(bool open)
        {
            if (productionPresenter != null) productionPresenter.SetPhone(open);
            else if (animator != null) animator.SetBool(PhoneHash, open);
            rig?.SetMode(open ? HumanoidPresentationMode.Phone : HumanoidPresentationMode.Locomotion);
        }

        public void SetDialogue(bool active)
        {
            rig?.SetMode(active ? HumanoidPresentationMode.Dialogue : HumanoidPresentationMode.Locomotion);
            productionPresenter?.SetDialogue(active);
        }

        public void PulseInteract()
        {
            rig?.PulseInteract();
            productionPresenter?.PulseInteract();
        }
    }
}
