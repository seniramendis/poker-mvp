'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Table Stakes', href: '/#stakes' },
];

const GAMES = [
  { label: 'Poker', blurb: 'Heads-up Texas Hold\u2019em', href: '/play' },
  { label: 'Omee', blurb: 'Sri Lanka\u2019s trick-taking classic', href: '/omee' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [mobileGamesOpen, setMobileGamesOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setGamesOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 safe-top safe-x bg-[#06140e]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-3 sm:py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <span className="chip-disc-static" aria-hidden="true" />
          <span className="text-white font-extrabold tracking-widest text-base sm:text-lg group-hover:text-amber-200 transition-colors">
            POKER LK HUB
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 hover:text-amber-200 tracking-wide transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {/* Games dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setGamesOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={gamesOpen}
              className="flex items-center gap-1 text-sm text-white/70 hover:text-amber-200 tracking-wide transition-colors"
            >
              Games
              <span className={`inline-block transition-transform text-[10px] ${gamesOpen ? 'rotate-180' : ''}`}>
                &#9660;
              </span>
            </button>

            {gamesOpen && (
              <div className="nav-dropdown-panel absolute top-full right-0 mt-3 w-56 rounded-xl border border-white/10 bg-[#0a2417]/95 backdrop-blur-md shadow-xl overflow-hidden">
                {GAMES.map((game) => (
                  <Link
                    key={game.href}
                    href={game.href}
                    onClick={() => setGamesOpen(false)}
                    className="block px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="text-sm font-semibold text-white tracking-wide">{game.label}</div>
                    <div className="text-xs text-white/50 mt-0.5">{game.blurb}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/play"
            className="hidden sm:inline-flex action-btn bg-gradient-to-b from-emerald-400 to-emerald-700 !text-xs sm:!text-sm !py-2 !px-5"
          >
            PLAY NOW
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="md:hidden flex flex-col justify-center gap-1.5 w-9 h-9 items-center"
          >
            <span className={`block h-0.5 w-6 bg-white transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-6 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-white transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <nav className="md:hidden safe-x pb-4 flex flex-col gap-3 border-t border-white/10 bg-[#06140e]/95">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm text-white/80 hover:text-amber-200 pt-3 tracking-wide"
            >
              {link.label}
            </Link>
          ))}

          {/* Games section (mobile) */}
          <div className="pt-3">
            <button
              onClick={() => setMobileGamesOpen((v) => !v)}
              aria-expanded={mobileGamesOpen}
              className="w-full flex items-center justify-between text-sm text-white/80 hover:text-amber-200 tracking-wide"
            >
              Games
              <span className={`inline-block transition-transform text-[10px] ${mobileGamesOpen ? 'rotate-180' : ''}`}>
                &#9660;
              </span>
            </button>
            {mobileGamesOpen && (
              <div className="mt-2 flex flex-col gap-2 pl-3 border-l border-white/10">
                {GAMES.map((game) => (
                  <Link
                    key={game.href}
                    href={game.href}
                    onClick={() => {
                      setOpen(false);
                      setMobileGamesOpen(false);
                    }}
                    className="text-sm text-white/70 hover:text-amber-200"
                  >
                    {game.label}
                    <span className="block text-xs text-white/40">{game.blurb}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/play"
            onClick={() => setOpen(false)}
            className="action-btn bg-gradient-to-b from-emerald-400 to-emerald-700 !text-sm text-center mt-1"
          >
            PLAY NOW
          </Link>
        </nav>
      )}
    </header>
  );
}
