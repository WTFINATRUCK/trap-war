import {
  BOT_LINK,
  CHANNEL_URL,
  COMMUNITY_URL,
  isLiveTelegramUrl,
} from "@/config/telegram";

/**
 * Public marketing homepage for trap-war.com (browser, not Telegram Mini App).
 * No local/dev instructions — Play opens the bot / Mini App.
 */
export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden />
      <div className="landing-glow" aria-hidden />
      <div className="landing-vignette" aria-hidden />

      <header className="landing-top">
        <span className="landing-mark">TRAP WAR</span>
        <a className="landing-top-link" href={CHANNEL_URL} target="_blank" rel="noreferrer">
          Channel
        </a>
      </header>

      <main className="landing-main">
        <p className="landing-eyebrow">30-DAY STREET EMPIRE · TELEGRAM</p>
        <h1 className="landing-title">TRAP WAR</h1>
        <p className="landing-tagline">
          Build your street empire. Buy low. Sell high.
          <br />
          Climb from <strong>Corner Boy</strong> to <strong>Trap God</strong>.
        </p>

        <div className="landing-cta">
          <a className="landing-btn primary" href={BOT_LINK}>
            Play Now
          </a>
          <a
            className="landing-btn secondary"
            href={CHANNEL_URL}
            target="_blank"
            rel="noreferrer"
          >
            Join Channel
          </a>
        </div>

        <p className="landing-hint">
          Opens in Telegram · free private beta · no real money
        </p>

        <ul className="landing-pillars">
          <li>
            <span className="lp-ico">🌆</span>
            <span>
              <strong>Cities & heat</strong>
              Move product across the map before the heat catches you.
            </span>
          </li>
          <li>
            <span className="lp-ico">💰</span>
            <span>
              <strong>Buy low · sell high</strong>
              Flip the market. Plant stashes. Own the block.
            </span>
          </li>
          <li>
            <span className="lp-ico">📈</span>
            <span>
              <strong>Rank up</strong>
              Corner Boy → Block Runner → Trap God. Everybody Eats.
            </span>
          </li>
        </ul>
      </main>

      <footer className="landing-foot">
        <a href={BOT_LINK}>@TrapWarAppBot</a>
        <span aria-hidden>·</span>
        <a href={CHANNEL_URL} target="_blank" rel="noreferrer">
          News
        </a>
        {isLiveTelegramUrl(COMMUNITY_URL) && (
          <>
            <span aria-hidden>·</span>
            <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">
              Community
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
