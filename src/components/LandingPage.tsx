import { useEffect, useState } from "react";
import {
  BOT_LINK,
  CHANNEL_URL,
  COMMUNITY_URL,
  isLiveTelegramUrl,
} from "@/config/telegram";

type SectionId = "home" | "about" | "guide" | "play";

const NAV: { id: SectionId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "guide", label: "Guide" },
  { id: "play", label: "Play" },
];

/**
 * Full public website for trap-war.com (browser).
 * Telegram Mini App never hits this — only when there's no TG user.
 */
export default function LandingPage() {
  const [active, setActive] = useState<SectionId>("home");

  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id && ids.includes(visible.target.id as SectionId)) {
          setActive(visible.target.id as SectionId);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div className="site">
      <div className="site-bg" aria-hidden />
      <div className="site-glow" aria-hidden />

      <header className="site-header">
        <button type="button" className="site-logo" onClick={() => scrollTo("home")}>
          TRAP WAR
        </button>
        <nav className="site-nav" aria-label="Primary">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={active === n.id ? "active" : ""}
              onClick={() => scrollTo(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <a className="site-header-play" href={BOT_LINK}>
          Play
        </a>
      </header>

      {/* ── HOME ── */}
      <section id="home" className="site-hero">
        <p className="site-eyebrow">30-DAY STREET EMPIRE · TELEGRAM</p>
        <h1 className="site-title">TRAP WAR</h1>
        <p className="site-lead">
          Build your street empire across the city. Buy low. Travel. Sell high.
          Plant stashes. Manage heat. Climb from <strong>Corner Boy</strong> to{" "}
          <strong>Trap God</strong>.
        </p>
        <div className="site-cta-row">
          <a className="site-btn primary" href={BOT_LINK}>
            Play Now
          </a>
          <a className="site-btn secondary" href={CHANNEL_URL} target="_blank" rel="noreferrer">
            Join Channel
          </a>
        </div>
        <p className="site-fine">Free private beta · no real money · open in Telegram</p>

        <div className="site-stats">
          <div>
            <span className="ss-num">30</span>
            <span className="ss-lbl">Day runs</span>
          </div>
          <div>
            <span className="ss-num">6</span>
            <span className="ss-lbl">Cities</span>
          </div>
          <div>
            <span className="ss-num">6</span>
            <span className="ss-lbl">Ranks</span>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="site-section">
        <h2>What is Trap War?</h2>
        <p className="site-prose">
          Trap War is a <strong>street hustle strategy game</strong> you play inside Telegram.
          You get a short run — thirty days on the clock — and a bag of cash. Your job is simple to
          say and hard to master: read the streets, move product when the price is right, stay under
          the heat, and grow an empire one block at a time.
        </p>
        <p className="site-prose">
          Prices change by city. Travel to flip. Plant product on a block for yield and protection.
          Take client jobs. Watch for raids and robberies. Rank up when your stack, stash, and
          footprint on the map are big enough.
        </p>

        <div className="site-cards">
          <article>
            <h3>Street language</h3>
            <p>
              The game talks like the block — buys, sells, heat, stash — so the fantasy stays
              immersive while you learn the rhythm of risk and reward.
            </p>
          </article>
          <article>
            <h3>Real money concepts</h3>
            <p>
              Under the hood you practice the same ideas real markets use: buy low / sell high,
              diversification, reserves, risk management, and long-term growth — taught through play,
              not a lecture.
            </p>
          </article>
          <article>
            <h3>Everybody Eats</h3>
            <p>
              Invite your crew. Climb ranks together. Vault and pay-to-earn previews show where the
              game is headed — free beta first, always clear about what is and isn&apos;t real money.
            </p>
          </article>
        </div>
      </section>

      {/* ── GUIDE ── */}
      <section id="guide" className="site-section">
        <h2>How to play</h2>
        <p className="site-prose">
          New to the hustle? This is all you need to start a run and not get cooked on day one.
        </p>

        <div className="site-loop">
          <h3>Core loop</h3>
          <ol className="site-loop-steps">
            <li>
              <strong>Get Info</strong>
              <span>Phone → Market. See what&apos;s moving.</span>
            </li>
            <li>
              <strong>Buy Low</strong>
              <span>Cop product when a city is cheap.</span>
            </li>
            <li>
              <strong>Travel</strong>
              <span>Slide to a city that pays more.</span>
            </li>
            <li>
              <strong>Sell High</strong>
              <span>Cash out. Stack your bag.</span>
            </li>
            <li>
              <strong>Upgrade</strong>
              <span>Plant stashes. Gear up. Unlock blocks.</span>
            </li>
            <li>
              <strong>Dominate</strong>
              <span>Rank up. Survive 30 days. Trap God.</span>
            </li>
          </ol>
        </div>

        <div className="site-grid-2">
          <div className="site-panel">
            <h3>Basics</h3>
            <ul>
              <li>
                <strong>3 actions per day</strong> — buy, sell, plant, and travel count. The 4th
                move ends the day; prices and heat shift.
              </li>
              <li>
                <strong>Dock</strong> — Travel · Buy · Sell · Stash · Phone · Inventory.
              </li>
              <li>
                <strong>Start</strong> — Compton, California. New Run. Thirty days.
              </li>
            </ul>
          </div>
          <div className="site-panel">
            <h3>Systems</h3>
            <ul>
              <li>
                <strong>Stash</strong> — plant product on a block for yield + raid shield. Retrieve
                from the Stash button.
              </li>
              <li>
                <strong>Heat</strong> — rises with loud bags. Raids and robbers love heat.
              </li>
              <li>
                <strong>Energy</strong> — your actions left today. Spend them smart.
              </li>
              <li>
                <strong>Clients</strong> — Phone jobs unlock cities (Ms. Pearl, Uncle Ray,
                Dispatcher).
              </li>
            </ul>
          </div>
        </div>

        <div className="site-panel ranks">
          <h3>Ranking ladder</h3>
          <p className="site-prose tight">
            Climb by net worth, product diversity, and how many cities you plant. Each rank unlocks
            better bonuses.
          </p>
          <ol className="site-ranks">
            <li>Corner Boy</li>
            <li>Runner</li>
            <li>Hustler</li>
            <li>Kingpin</li>
            <li>Trap Lord</li>
            <li>Trap God</li>
          </ol>
        </div>

        <div className="site-panel">
          <h3>Cities</h3>
          <p className="site-prose tight">
            Compton · Inglewood · Long Beach · South Central · Watts · East LA — each block has its
            own price bias and street vibe. Travel is how you flip.
          </p>
        </div>
      </section>

      {/* ── PLAY ── */}
      <section id="play" className="site-section site-play">
        <h2>Play Trap War</h2>
        <p className="site-prose center">
          The full game runs as a <strong>Telegram Mini App</strong>. Open the bot, tap{" "}
          <strong>Play Trap War</strong>, and you&apos;re on the block.
        </p>
        <div className="site-play-card">
          <p className="site-play-kicker">Open in Telegram to play</p>
          <a className="site-btn primary large" href={BOT_LINK}>
            Open @TrapWarAppBot
          </a>
          <ol className="site-play-steps">
            <li>Tap Play Now / open the bot</li>
            <li>Press <strong>Play Trap War</strong> or send /play</li>
            <li>Hit New Run and start hustling</li>
          </ol>
          <div className="site-play-links">
            <a href={CHANNEL_URL} target="_blank" rel="noreferrer">
              Join the channel
            </a>
            {isLiveTelegramUrl(COMMUNITY_URL) && (
              <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">
                Community chat
              </a>
            )}
          </div>
        </div>
        <p className="site-fine">
          Private beta · progress can reset · vault / NFT / pay-to-earn are previews only
        </p>
      </section>

      <footer className="site-footer">
        <span className="site-logo muted">TRAP WAR</span>
        <div className="site-footer-links">
          <a href={BOT_LINK}>Bot</a>
          <a href={CHANNEL_URL} target="_blank" rel="noreferrer">
            Channel
          </a>
          <button type="button" onClick={() => scrollTo("guide")}>
            Guide
          </button>
        </div>
        <p className="site-fine">© {new Date().getFullYear()} Trap War · Street fiction · Play on Telegram</p>
      </footer>
    </div>
  );
}
