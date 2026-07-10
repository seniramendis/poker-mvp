import Link from 'next/link';
import Header from '../components/Header';

export const metadata = {
  title: 'Poker Lk Hub',
  description: 'Learn and play poker in Sri Lanka',
};

const STEPS = [
  {
    title: 'Sit down',
    body: 'Jump straight into a heads-up table against the dealer bot \u2014 no waiting on other players.',
  },
  {
    title: 'Play a hand',
    body: 'Fold, check, call, or raise using the same controls you\u2019ll find at a real cash table.',
  },
  {
    title: 'Track your bankroll',
    body: 'Your chip balance carries between hands in LKR, so you can see exactly how a session went.',
  },
];

const STAKES = [
  { label: 'Starting balance', value: '5,000 LKR' },
  { label: 'Table type', value: 'Heads-Up Hold\u2019em' },
  { label: 'Reset anytime', value: 'One tap' },
];

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[#06140e] text-white">
      <Header />

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #123a26 0%, #0a2417 45%, #06140e 80%)',
        }}
      >
        <p className="text-amber-200/70 text-xs sm:text-sm tracking-[0.35em] uppercase mb-4 fade-in">
          Heads-Up Texas Hold&apos;em
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto fade-in">
          Learn &amp; play poker,
          <br className="hidden sm:block" /> Sri Lankan style.
        </h1>
        <p className="mt-5 text-white/60 text-sm sm:text-base max-w-xl mx-auto fade-in">
          Practice your game against a dealer bot in LKR chips — free, fast, and
          built to feel like sitting down at a real table.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center fade-in">
          <Link
            href="/play"
            className="action-btn bg-gradient-to-b from-emerald-400 to-emerald-700 !text-sm sm:!text-base"
          >
            PLAY NOW
          </Link>
          <a
            href="#how-it-works"
            className="text-sm text-white/60 hover:text-amber-200 underline underline-offset-4 transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Decorative mini table */}
        <div className="mt-14 flex justify-center pointer-events-none select-none">
          <div
            className="poker-table-oval"
            style={{ width: 'min(70vw, 560px)', height: 'min(34vw, 260px)' }}
          >
            <div className="poker-table-gold">
              <div className="poker-table-felt">
                <div className="poker-table-felt-shine" />
                <div className="poker-table-felt-vignette" />
                <span className="poker-table-watermark">POKER LK HUB</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-16 sm:py-24 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">How it works</h2>
          <p className="text-white/50 text-sm text-center max-w-md mx-auto mb-12">
            Three steps between you and your next hand.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="felt-panel rounded-xl p-6 flex flex-col gap-3"
              >
                <span className="text-amber-300 font-mono text-sm">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-semibold tracking-wide">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Table stakes */}
      <section id="stakes" className="px-6 py-16 sm:py-24 border-t border-white/10 bg-black/20">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Table stakes</h2>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-12">
            Every session starts fresh, so you can experiment without any real risk.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {STAKES.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="text-amber-200 font-bold text-lg sm:text-xl">{s.value}</div>
                <div className="text-white/50 text-xs uppercase tracking-wide mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <Link
            href="/play"
            className="action-btn bg-gradient-to-b from-emerald-400 to-emerald-700 inline-flex mt-12"
          >
            PLAY NOW
          </Link>
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-white/10 text-center text-white/40 text-xs">
        Poker Lk Hub — a practice table. Play responsibly.
      </footer>
    </main>
  );
}
