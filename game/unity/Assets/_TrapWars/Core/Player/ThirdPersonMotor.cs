using TrapWars.Services;
using UnityEngine;

namespace TrapWars.Player
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class ThirdPersonMotor : MonoBehaviour
    {
        [SerializeField] private float walkSpeed = 2.15f;
        [SerializeField] private float jogSpeed = 4.05f;
        [SerializeField] private float sprintSpeed = 5.8f;
        [SerializeField] private float acceleration = 19f;
        [SerializeField] private float deceleration = 28f;
        [SerializeField] private float turnSharpness = 12.5f;
        [SerializeField] private float gravity = -24f;

        private CharacterController controller = null!;
        private IPlayerInputSource input = null!;
        private Transform cameraTransform = null!;
        private CharacterAnimationDriver animationDriver = null!;
        private IAudioService? audioService;
        private Vector3 planarVelocity;
        private float verticalVelocity;
        private float footstepDistance;
        private Vector3 lastGroundedPosition;
        private bool hasGroundedPosition;
        private const float FallRecoveryHeight = -8f;

        public bool InputEnabled { get; set; } = true;
        public float NormalizedSpeed => planarVelocity.magnitude / sprintSpeed;
        public float CurrentSpeed => planarVelocity.magnitude;

        public void Configure(IPlayerInputSource inputSource, Transform viewTransform, IAudioService audio)
        {
            input = inputSource;
            cameraTransform = viewTransform;
            audioService = audio;
        }

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            animationDriver = GetComponent<CharacterAnimationDriver>() ?? gameObject.AddComponent<CharacterAnimationDriver>();
        }

        private void Update()
        {
            if (input == null || cameraTransform == null) return;
            var moveInput = InputEnabled ? Vector2.ClampMagnitude(input.Move, 1f) : Vector2.zero;
            var forward = Vector3.ProjectOnPlane(cameraTransform.forward, Vector3.up).normalized;
            var right = Vector3.ProjectOnPlane(cameraTransform.right, Vector3.up).normalized;
            var desiredDirection = (forward * moveInput.y + right * moveInput.x).normalized;
            var targetSpeed = moveInput.magnitude < 0.45f ? walkSpeed : input.SprintHeld ? sprintSpeed : jogSpeed;
            var targetVelocity = desiredDirection * (moveInput.sqrMagnitude > 0.001f ? targetSpeed : 0f);
            var changingDirection = planarVelocity.sqrMagnitude > 0.1f && targetVelocity.sqrMagnitude > 0.1f && Vector3.Dot(planarVelocity.normalized, targetVelocity.normalized) < 0.25f;
            var rate = changingDirection ? deceleration * 1.2f : targetVelocity.sqrMagnitude > planarVelocity.sqrMagnitude ? acceleration : deceleration;
            planarVelocity = Vector3.MoveTowards(planarVelocity, targetVelocity, rate * UnityEngine.Time.deltaTime);

            if (desiredDirection.sqrMagnitude > 0.001f)
            {
                var targetRotation = Quaternion.LookRotation(desiredDirection, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, 1f - Mathf.Exp(-turnSharpness * UnityEngine.Time.deltaTime));
            }

            if (controller.isGrounded && verticalVelocity < 0f) verticalVelocity = -2f;
            verticalVelocity += gravity * UnityEngine.Time.deltaTime;
            var motion = planarVelocity + Vector3.up * verticalVelocity;
            controller.Move(motion * UnityEngine.Time.deltaTime);
            if (controller.isGrounded)
            {
                lastGroundedPosition = transform.position;
                hasGroundedPosition = true;
            }
            else if (transform.position.y < FallRecoveryHeight)
            {
                RecoverFromFall();
                return;
            }
            animationDriver.SetLocomotion(NormalizedSpeed, controller.isGrounded, input.SprintHeld);
            TickFootsteps(planarVelocity.magnitude * UnityEngine.Time.deltaTime);
        }

        /// <summary>Safety net: if the player ever drops out of the world, put them back where they last stood.</summary>
        private void RecoverFromFall()
        {
            controller.enabled = false;
            transform.position = hasGroundedPosition ? lastGroundedPosition + Vector3.up * 0.25f : new Vector3(0f, 0.1f, 1f);
            controller.enabled = true;
            planarVelocity = Vector3.zero;
            verticalVelocity = 0f;
        }

        private void TickFootsteps(float distance)
        {
            if (!controller.isGrounded || distance <= 0.001f) return;
            footstepDistance += distance;
            var stride = planarVelocity.magnitude > jogSpeed ? 1.65f : 1.25f;
            if (footstepDistance < stride) return;
            footstepDistance = 0f;
            audioService?.PlayFootstep(Mathf.InverseLerp(walkSpeed, sprintSpeed, planarVelocity.magnitude));
        }
    }
}
