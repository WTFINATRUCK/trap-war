using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace TrapWars.Player
{
    public interface IPlayerInputSource
    {
        Vector2 Move { get; }
        Vector2 Look { get; }
        bool SprintHeld { get; }
        bool InteractPressed { get; }
        bool PhonePressed { get; }
        bool BackPressed { get; }
        bool ConfirmPressed { get; }
    }

    public sealed class PlayerInputReader : IPlayerInputSource, IDisposable
    {
        private readonly InputAction move = new("Move", InputActionType.Value);
        private readonly InputAction look = new("Look", InputActionType.Value);
        private readonly InputAction sprint = new("Sprint", InputActionType.Button);
        private readonly InputAction interact = new("Interact", InputActionType.Button);
        private readonly InputAction phone = new("Phone", InputActionType.Button);
        private readonly InputAction back = new("Back", InputActionType.Button);
        private readonly InputAction confirm = new("Confirm", InputActionType.Button);

        public Vector2 Move => move.ReadValue<Vector2>();
        public Vector2 Look => look.ReadValue<Vector2>();
        public bool SprintHeld => sprint.IsPressed();
        public bool InteractPressed => interact.WasPressedThisFrame();
        public bool PhonePressed => phone.WasPressedThisFrame();
        public bool BackPressed => back.WasPressedThisFrame();
        public bool ConfirmPressed => confirm.WasPressedThisFrame();

        public PlayerInputReader()
        {
            move.AddCompositeBinding("2DVector").With("Up", "<Keyboard>/w").With("Down", "<Keyboard>/s").With("Left", "<Keyboard>/a").With("Right", "<Keyboard>/d");
            move.AddBinding("<Gamepad>/leftStick");
            look.AddBinding("<Mouse>/delta");
            look.AddBinding("<Gamepad>/rightStick").WithProcessor("scaleVector2(x=12,y=12)");
            sprint.AddBinding("<Keyboard>/leftShift");
            sprint.AddBinding("<Gamepad>/leftStickPress");
            interact.AddBinding("<Keyboard>/e");
            interact.AddBinding("<Gamepad>/buttonSouth");
            phone.AddBinding("<Keyboard>/tab");
            phone.AddBinding("<Gamepad>/buttonNorth");
            back.AddBinding("<Keyboard>/escape");
            back.AddBinding("<Gamepad>/buttonEast");
            confirm.AddBinding("<Keyboard>/enter");
            confirm.AddBinding("<Gamepad>/buttonSouth");
            Enable(true);
        }

        private void Enable(bool enabled)
        {
            foreach (var action in new[] { move, look, sprint, interact, phone, back, confirm })
            {
                if (enabled) action.Enable(); else action.Disable();
            }
        }

        public void Dispose()
        {
            Enable(false);
            move.Dispose(); look.Dispose(); sprint.Dispose(); interact.Dispose(); phone.Dispose(); back.Dispose(); confirm.Dispose();
        }
    }
}
