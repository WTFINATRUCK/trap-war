import { useState } from "react";
import BaseOnboardingProof from "@/components/BaseOnboardingProof";
import "@/styles/play-demo.css";

export default function PlayDemoPage() {
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(0);
  const restart = () => { setStarted(false); setSession(value => value + 1); };
  return <main className="public-demo">
    <header><a href="/">TRAP WARS</a><span>PUBLIC DEMO</span></header>
    <section className="demo-stage">{started
      ? <iframe key={session} src={`/play/game/index.html?session=${session}`} title="Trap Wars playable demo" allow="fullscreen" />
      : <div className="demo-start"><img src="/investor/01-safehouse.png" alt="Trap Wars safehouse" /><div className="demo-shade" /><div className="demo-copy"><p>A PLAYABLE STREET-ECONOMY DEMO</p><h1>TRAP WARS</h1><button onClick={() => setStarted(true)}>PLAY DEMO</button><small>Desktop recommended. No wallet required.</small></div></div>}
    </section>
    <nav><a href="/">PROJECT OVERVIEW</a>{started && <button onClick={restart}>RESTART DEMO</button>}<button onClick={() => document.querySelector("iframe")?.requestFullscreen()}>FULLSCREEN</button></nav>
    <section className="demo-base"><div><p>OPTIONAL AFTER GAMEPLAY</p><h2>Carry proof of progress to Base Sepolia.</h2><span>The demo starts with the game. Wallet connection remains optional and does not affect your run.</span></div><BaseOnboardingProof /></section>
  </main>;
}
