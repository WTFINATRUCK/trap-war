using UnityEngine;

namespace TrapWars.Player
{
    public enum CameraContext
    {
        Exploration,
        Phone,
        Dialogue,
        Market
    }

    public sealed class ThirdPersonCameraRig : MonoBehaviour
    {
        [SerializeField] private float distance = 4.05f;
        [SerializeField] private float shoulderOffset = 0.52f;
        [SerializeField] private float targetHeight = 1.48f;
        [SerializeField] private float followSharpness = 18f;
        [SerializeField] private float collisionRadius = 0.22f;
        private Transform target = null!;
        private IPlayerInputSource input = null!;
        private float sensitivity;
        private float yaw = 25f;
        private float pitch = 18f;
        private Vector3 smoothedPivot;
        private Camera view = null!;
        private CameraContext context;
        private float currentDistance;
        private float currentShoulder;
        private float currentHeight;
        private float timeSinceLook;

        public CameraContext Context => context;

        public void Configure(Transform followTarget, IPlayerInputSource inputSource, float lookSensitivity)
        {
            target = followTarget;
            input = inputSource;
            sensitivity = lookSensitivity;
            smoothedPivot = target.position + Vector3.up * targetHeight;
            view = GetComponent<Camera>();
            currentDistance = distance;
            currentShoulder = shoulderOffset;
            currentHeight = targetHeight;
        }

        public void SetContext(CameraContext value) => context = value;

        private void LateUpdate()
        {
            if (target == null || input == null) return;
            var look = input.Look;
            var mouse = UnityEngine.InputSystem.Mouse.current;
            var mouseScale = mouse != null && mouse.delta.ReadValue().sqrMagnitude > 0.0001f
                ? 0.08f
                : 5f * UnityEngine.Time.deltaTime;
            yaw += look.x * sensitivity * mouseScale;
            pitch = Mathf.Clamp(pitch - look.y * sensitivity * mouseScale, -8f, 68f);
            timeSinceLook = look.sqrMagnitude > 0.0001f ? 0f : timeSinceLook + UnityEngine.Time.deltaTime;
            if (context == CameraContext.Exploration && timeSinceLook > 2.8f && input.Move.y > 0.45f)
            {
                var targetYaw = target.eulerAngles.y;
                yaw = Mathf.LerpAngle(yaw, targetYaw, 1f - Mathf.Exp(-0.55f * UnityEngine.Time.deltaTime));
            }

            ContextValues(out var targetDistance, out var targetShoulder, out var height, out var fov);
            var contextBlend = 1f - Mathf.Exp(-7.5f * UnityEngine.Time.deltaTime);
            currentDistance = Mathf.Lerp(currentDistance, targetDistance, contextBlend);
            currentShoulder = Mathf.Lerp(currentShoulder, targetShoulder, contextBlend);
            currentHeight = Mathf.Lerp(currentHeight, height, contextBlend);
            if (view != null) view.fieldOfView = Mathf.Lerp(view.fieldOfView, fov, contextBlend);
            var desiredPivot = target.position + Vector3.up * currentHeight;
            smoothedPivot = Vector3.Lerp(smoothedPivot, desiredPivot, 1f - Mathf.Exp(-followSharpness * UnityEngine.Time.deltaTime));
            var rotation = Quaternion.Euler(pitch, yaw, 0f);
            var shoulder = rotation * Vector3.right * currentShoulder;
            var direction = rotation * Vector3.back;
            var allowedDistance = currentDistance;
            if (Physics.SphereCast(smoothedPivot + shoulder, collisionRadius, direction, out var hit, currentDistance, ~0, QueryTriggerInteraction.Ignore))
                allowedDistance = Mathf.Max(0.35f, hit.distance - collisionRadius);
            transform.SetPositionAndRotation(smoothedPivot + shoulder + direction * allowedDistance, rotation);
        }

        private void ContextValues(out float targetDistance, out float targetShoulder, out float height, out float fov)
        {
            switch (context)
            {
                case CameraContext.Phone:
                    targetDistance = 2.75f; targetShoulder = 0.92f; height = 1.55f; fov = 52f; return;
                case CameraContext.Dialogue:
                    targetDistance = 3.15f; targetShoulder = 0.22f; height = 1.58f; fov = 55f; return;
                case CameraContext.Market:
                    targetDistance = 3.35f; targetShoulder = 0.82f; height = 1.5f; fov = 56f; return;
                default:
                    targetDistance = distance; targetShoulder = shoulderOffset; height = targetHeight; fov = 60f; return;
            }
        }
    }
}
