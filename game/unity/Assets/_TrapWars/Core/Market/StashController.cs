using System.Threading;
using TrapWars.Networking;
using TrapWars.Player;
using TrapWars.Services;
using TrapWars.State;
using TrapWars.UI;
using UnityEngine;
using UnityEngine.UI;

namespace TrapWars.Market
{
    public sealed class StashController : MonoBehaviour
    {
        private RectTransform root = null!;
        private Text detail = null!;
        private Button deposit = null!;
        private Button withdraw = null!;
        private ThirdPersonMotor motor = null!;
        private GameStateStore state = null!;
        private IGameRunService runs = null!;
        private GreyboxHud hud = null!;
        private bool pending;

        public void Configure(ThirdPersonMotor playerMotor, GameStateStore stateStore, IGameRunService runService, GreyboxHud greyboxHud)
        {
            motor = playerMotor; state = stateStore; runs = runService; hud = greyboxHud;
            Build();
            state.Changed += _ => Refresh();
        }

        private void Build()
        {
            var canvas = UiFactory.Canvas("Stash", transform, 35);
            root = UiFactory.PanelRect("StashDim", canvas.transform, new Color(0f, 0f, 0f, 0.62f), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var panel = UiFactory.PanelRect("StashPanel", root, UiFactory.Ink, new Vector2(0.25f, 0.23f), new Vector2(0.75f, 0.77f), Vector2.zero, Vector2.zero);
            var title = UiFactory.Text("Title", panel, "SAFEHOUSE STASH", 42, TextAnchor.MiddleLeft, UiFactory.Paper, FontStyle.Bold);
            UiFactory.SetRect(title.rectTransform, new Vector2(0.07f, 0.73f), new Vector2(0.93f, 0.94f), Vector2.zero, Vector2.zero);
            detail = UiFactory.Text("Detail", panel, string.Empty, 27, TextAnchor.UpperLeft, UiFactory.Paper);
            UiFactory.SetRect(detail.rectTransform, new Vector2(0.07f, 0.36f), new Vector2(0.93f, 0.72f), Vector2.zero, Vector2.zero);
            deposit = UiFactory.Button("Deposit", panel, "DEPOSIT 1 WEED", UiFactory.Green, () => Move(true));
            UiFactory.SetRect(deposit.GetComponent<RectTransform>(), new Vector2(0.07f, 0.19f), new Vector2(0.46f, 0.31f), Vector2.zero, Vector2.zero);
            withdraw = UiFactory.Button("Withdraw", panel, "WITHDRAW 1 WEED", UiFactory.Gold, () => Move(false));
            UiFactory.SetRect(withdraw.GetComponent<RectTransform>(), new Vector2(0.54f, 0.19f), new Vector2(0.93f, 0.31f), Vector2.zero, Vector2.zero);
            var close = UiFactory.Button("Close", panel, "CLOSE", UiFactory.Panel, Close);
            UiFactory.SetRect(close.GetComponent<RectTransform>(), new Vector2(0.65f, 0.05f), new Vector2(0.93f, 0.14f), Vector2.zero, Vector2.zero);
            root.gameObject.SetActive(false);
        }

        public void Open()
        {
            root.gameObject.SetActive(true);
            motor.InputEnabled = false;
            Refresh();
        }

        public void Close()
        {
            root.gameObject.SetActive(false);
            motor.InputEnabled = true;
        }

        private void Refresh()
        {
            if (state.Current == null || root == null) return;
            var run = state.Current;
            detail.text = $"LOCATION-BOUND STORAGE\n\nCarried weed   {run.Owned("weed")}\nStored here   {run.StashedHere("weed")}\n\nRemote retrieval is not available.";
            deposit.interactable = !pending && run.IsLegal("DepositStash", "weed");
            withdraw.interactable = !pending && run.IsLegal("WithdrawStash", "weed");
        }

        private async void Move(bool isDeposit)
        {
            if (pending || state.Current == null) return;
            var command = isDeposit
                ? CommandFactory.Deposit(state.Current.StateVersion, "weed", 1)
                : CommandFactory.Withdraw(state.Current.StateVersion, state.Current.LocationId, "weed", 1);
            pending = true;
            Refresh();
            var result = await runs.SubmitAsync(command, CancellationToken.None);
            pending = false;
            hud.Toast(result.IsSuccess ? "Stash updated by the server." : result.Error?.Message ?? "Stash command rejected.", result.IsSuccess ? UiFactory.Green : UiFactory.Red);
            Refresh();
        }
    }
}
