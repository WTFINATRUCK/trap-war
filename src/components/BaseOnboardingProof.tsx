import { useState } from "react";

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type EthereumWindow = Window & { ethereum?: Provider };

const BASE_SEPOLIA = { chainId: "0x14a34", chainName: "Base Sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia.base.org"], blockExplorerUrls: ["https://sepolia.basescan.org"] };

export default function BaseOnboardingProof() {
  const [status, setStatus] = useState("Optional proof is ready");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    const provider = (window as EthereumWindow).ethereum;
    if (!provider) { setStatus("Install a compatible wallet to run the live proof"); return; }
    setBusy(true);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA.chainId }] }); }
      catch { await provider.request({ method: "wallet_addEthereumChain", params: [BASE_SEPOLIA] }); }
      const address = accounts[0];
      const message = `Trap Wars Base Sepolia identity proof\nDomain: trap-war.com\nPurpose: optional demo identity link\nIssued: ${new Date().toISOString()}`;
      await provider.request({ method: "personal_sign", params: [message, address] });
      setAccount(address);
      setStatus("Identity proof signed locally on Base Sepolia");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Proof cancelled; gameplay remains available");
    } finally { setBusy(false); }
  };

  return <aside className="base-proof"><div className="base-proof-head"><span>BASE SEPOLIA</span><b>84532</b></div><h3>Optional identity proof</h3><p>Connect after the lesson. Switch to Base Sepolia and sign a valueless identity message. Nothing is sent or stored by this page.</p><button onClick={connect} disabled={busy}>{busy ? "CHECK WALLET" : account ? "PROOF COMPLETE" : "TRY BASE PROOF"}</button><output>{account ? `${account.slice(0, 6)}...${account.slice(-4)} · ` : ""}{status}</output><small>Skip anytime. No transaction, asset, fee, or reward.</small></aside>;
}
