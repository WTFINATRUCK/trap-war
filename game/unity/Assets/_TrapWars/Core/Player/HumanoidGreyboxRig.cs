using UnityEngine;

namespace TrapWars.Player
{
    public enum HumanoidPresentationMode
    {
        Locomotion,
        Phone,
        Dialogue,
        Interact
    }

    public sealed class HumanoidGreyboxRig : MonoBehaviour
    {
        private Transform visualRoot = null!;
        private Transform hips = null!;
        private Transform chest = null!;
        private Transform head = null!;
        private Transform leftUpperArm = null!;
        private Transform rightUpperArm = null!;
        private Transform leftForearm = null!;
        private Transform rightForearm = null!;
        private Transform leftThigh = null!;
        private Transform rightThigh = null!;
        private Transform leftCalf = null!;
        private Transform rightCalf = null!;
        private GameObject phone = null!;
        private float targetSpeed;
        private float displayedSpeed;
        private float turnAmount;
        private float phase;
        private float stopPulse;
        private float gesturePulse;
        private bool sprinting;
        private bool built;

        public HumanoidPresentationMode Mode { get; private set; }
        public bool IsBuilt => built;

        public void SetVisualVisible(bool visible)
        {
            if (visualRoot != null) visualRoot.gameObject.SetActive(visible);
        }

        public void Build(Color skin, Color jacket, Color trousers, Color accent)
        {
            if (built) return;
            built = true;
            visualRoot = Joint("HumanoidVisual", transform, new Vector3(0f, 0.02f, 0f));
            hips = Joint("Hips", visualRoot, new Vector3(0f, 0.93f, 0f));
            chest = Joint("Chest", hips, new Vector3(0f, 0.42f, 0f));
            Part("Torso", PrimitiveType.Cube, chest, new Vector3(0f, 0.02f, 0f), new Vector3(0.58f, 0.66f, 0.3f), jacket);
            Part("JacketStripe", PrimitiveType.Cube, chest, new Vector3(0f, 0.04f, 0.164f), new Vector3(0.42f, 0.08f, 0.025f), accent);
            var neck = Joint("Neck", chest, new Vector3(0f, 0.43f, 0f));
            head = Joint("Head", neck, new Vector3(0f, 0.17f, 0f));
            Part("HeadMesh", PrimitiveType.Sphere, head, Vector3.zero, new Vector3(0.34f, 0.4f, 0.34f), skin);
            Part("Hair", PrimitiveType.Sphere, head, new Vector3(0f, 0.14f, -0.015f), new Vector3(0.35f, 0.18f, 0.35f), new Color(0.035f, 0.03f, 0.025f));

            leftUpperArm = Limb("LeftUpperArm", chest, new Vector3(-0.38f, 0.28f, 0f), 0.38f, 0.105f, jacket);
            rightUpperArm = Limb("RightUpperArm", chest, new Vector3(0.38f, 0.28f, 0f), 0.38f, 0.105f, jacket);
            leftForearm = Limb("LeftForearm", leftUpperArm, new Vector3(0f, -0.38f, 0f), 0.36f, 0.09f, skin);
            rightForearm = Limb("RightForearm", rightUpperArm, new Vector3(0f, -0.38f, 0f), 0.36f, 0.09f, skin);
            Part("LeftHand", PrimitiveType.Sphere, leftForearm, new Vector3(0f, -0.39f, 0f), Vector3.one * 0.15f, skin);
            var rightHand = Part("RightHand", PrimitiveType.Sphere, rightForearm, new Vector3(0f, -0.39f, 0f), Vector3.one * 0.15f, skin).transform;

            leftThigh = Limb("LeftThigh", hips, new Vector3(-0.17f, -0.02f, 0f), 0.46f, 0.135f, trousers);
            rightThigh = Limb("RightThigh", hips, new Vector3(0.17f, -0.02f, 0f), 0.46f, 0.135f, trousers);
            leftCalf = Limb("LeftCalf", leftThigh, new Vector3(0f, -0.46f, 0f), 0.43f, 0.115f, trousers * 0.82f);
            rightCalf = Limb("RightCalf", rightThigh, new Vector3(0f, -0.46f, 0f), 0.43f, 0.115f, trousers * 0.82f);
            Part("LeftShoe", PrimitiveType.Cube, leftCalf, new Vector3(0f, -0.45f, 0.08f), new Vector3(0.22f, 0.12f, 0.38f), new Color(0.035f, 0.04f, 0.04f));
            Part("RightShoe", PrimitiveType.Cube, rightCalf, new Vector3(0f, -0.45f, 0.08f), new Vector3(0.22f, 0.12f, 0.38f), new Color(0.035f, 0.04f, 0.04f));

            phone = Part("PhoneProp", PrimitiveType.Cube, rightHand, new Vector3(0f, -0.01f, 0.12f), new Vector3(0.12f, 0.22f, 0.035f), new Color(0.025f, 0.03f, 0.03f));
            phone.SetActive(false);
        }

        public void SetLocomotion(float normalizedSpeed, bool isSprinting, float normalizedTurn)
        {
            if (targetSpeed > 0.18f && normalizedSpeed < 0.05f) stopPulse = 1f;
            targetSpeed = Mathf.Clamp01(normalizedSpeed);
            sprinting = isSprinting;
            turnAmount = Mathf.Clamp(normalizedTurn, -1f, 1f);
        }

        public void SetMode(HumanoidPresentationMode value)
        {
            Mode = value;
            if (phone != null) phone.SetActive(value == HumanoidPresentationMode.Phone);
            if (value == HumanoidPresentationMode.Interact) gesturePulse = 1f;
        }

        public void PulseInteract()
        {
            gesturePulse = 1f;
            SetMode(HumanoidPresentationMode.Interact);
        }

        private void Update()
        {
            if (!built) return;
            var dt = UnityEngine.Time.deltaTime;
            displayedSpeed = Mathf.MoveTowards(displayedSpeed, targetSpeed, dt * (targetSpeed > displayedSpeed ? 4.8f : 7.5f));
            phase += dt * Mathf.Lerp(1.25f, sprinting ? 11.5f : 8.4f, displayedSpeed);
            stopPulse = Mathf.MoveTowards(stopPulse, 0f, dt * 3.2f);
            gesturePulse = Mathf.MoveTowards(gesturePulse, 0f, dt * 1.15f);
            if (Mode == HumanoidPresentationMode.Interact && gesturePulse <= 0.01f) Mode = HumanoidPresentationMode.Locomotion;
            Animate(dt);
        }

        private void Animate(float dt)
        {
            var idleBreath = Mathf.Sin(UnityEngine.Time.time * 1.45f) * (1f - displayedSpeed);
            var idleShift = Mathf.Sin(UnityEngine.Time.time * 0.52f) * (1f - displayedSpeed);
            var stride = Mathf.Sin(phase) * Mathf.Lerp(4f, sprinting ? 45f : 34f, displayedSpeed);
            var strideBack = Mathf.Sin(phase + Mathf.PI) * Mathf.Lerp(4f, sprinting ? 45f : 34f, displayedSpeed);
            var kneeLiftLeft = Mathf.Max(0f, -Mathf.Sin(phase)) * displayedSpeed * (sprinting ? 38f : 24f);
            var kneeLiftRight = Mathf.Max(0f, Mathf.Sin(phase)) * displayedSpeed * (sprinting ? 38f : 24f);
            var bodyLean = displayedSpeed * (sprinting ? 10f : 4.5f) + stopPulse * -5f;
            var sharpness = 1f - Mathf.Exp(-12f * dt);

            hips.localPosition = Vector3.Lerp(hips.localPosition, new Vector3(idleShift * 0.018f, 0.93f + Mathf.Abs(Mathf.Sin(phase)) * 0.025f * displayedSpeed, 0f), sharpness);
            hips.localRotation = Smooth(hips.localRotation, Quaternion.Euler(bodyLean, turnAmount * 3f, -turnAmount * 5f + idleShift * 0.5f), sharpness);
            chest.localRotation = Smooth(chest.localRotation, Quaternion.Euler(idleBreath * 0.7f, -turnAmount * 4f, turnAmount * 4f), sharpness);
            head.localRotation = Smooth(head.localRotation, Quaternion.Euler(idleBreath * 0.45f, idleShift * 2.2f, -turnAmount * 2f), sharpness);

            var leftArm = -stride * 0.72f;
            var rightArm = -strideBack * 0.72f;
            var leftFore = displayedSpeed > 0.5f ? -18f : -6f;
            var rightFore = displayedSpeed > 0.5f ? -18f : -6f;
            if (Mode == HumanoidPresentationMode.Phone)
            {
                leftArm = -35f;
                rightArm = -68f;
                leftFore = -82f;
                rightFore = -104f;
                chest.localRotation = Smooth(chest.localRotation, Quaternion.Euler(4f, 8f, 0f), sharpness);
                head.localRotation = Smooth(head.localRotation, Quaternion.Euler(18f, 6f, 0f), sharpness);
            }
            else if (Mode == HumanoidPresentationMode.Dialogue)
            {
                var gesture = Mathf.Sin(UnityEngine.Time.time * 1.7f) * 7f;
                leftArm = -8f + gesture;
                rightArm = -20f - gesture;
                leftFore = -20f;
                rightFore = -48f;
            }
            else if (Mode == HumanoidPresentationMode.Interact)
            {
                var reach = Mathf.Sin((1f - gesturePulse) * Mathf.PI) * 42f;
                rightArm = -18f - reach;
                rightFore = -36f - reach;
            }

            leftUpperArm.localRotation = Smooth(leftUpperArm.localRotation, Quaternion.Euler(leftArm, 0f, 4f), sharpness);
            rightUpperArm.localRotation = Smooth(rightUpperArm.localRotation, Quaternion.Euler(rightArm, 0f, -4f), sharpness);
            leftForearm.localRotation = Smooth(leftForearm.localRotation, Quaternion.Euler(leftFore, 0f, 0f), sharpness);
            rightForearm.localRotation = Smooth(rightForearm.localRotation, Quaternion.Euler(rightFore, 0f, 0f), sharpness);
            leftThigh.localRotation = Smooth(leftThigh.localRotation, Quaternion.Euler(stride, 0f, 0f), sharpness);
            rightThigh.localRotation = Smooth(rightThigh.localRotation, Quaternion.Euler(strideBack, 0f, 0f), sharpness);
            leftCalf.localRotation = Smooth(leftCalf.localRotation, Quaternion.Euler(kneeLiftLeft, 0f, 0f), sharpness);
            rightCalf.localRotation = Smooth(rightCalf.localRotation, Quaternion.Euler(kneeLiftRight, 0f, 0f), sharpness);
        }

        private static Quaternion Smooth(Quaternion current, Quaternion target, float amount) => Quaternion.Slerp(current, target, amount);

        private static Transform Joint(string name, Transform parent, Vector3 localPosition)
        {
            var joint = new GameObject(name).transform;
            joint.SetParent(parent, false);
            joint.localPosition = localPosition;
            return joint;
        }

        private static Transform Limb(string name, Transform parent, Vector3 localPosition, float length, float radius, Color color)
        {
            var joint = Joint(name, parent, localPosition);
            Part($"{name}Mesh", PrimitiveType.Cylinder, joint, new Vector3(0f, -length * 0.5f, 0f), new Vector3(radius, length * 0.5f, radius), color);
            return joint;
        }

        private static GameObject Part(string name, PrimitiveType type, Transform parent, Vector3 localPosition, Vector3 scale, Color color)
        {
            var item = GameObject.CreatePrimitive(type);
            item.name = name;
            item.transform.SetParent(parent, false);
            item.transform.localPosition = localPosition;
            item.transform.localScale = scale;
            var collider = item.GetComponent<Collider>();
            if (collider != null) Object.Destroy(collider);
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader) { color = color };
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.2f);
            item.GetComponent<Renderer>().material = material;
            return item;
        }
    }
}
