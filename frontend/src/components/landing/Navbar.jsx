import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sparkles, Menu, X, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { MagneticButton } from '../common/MagneticButton';

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', path: '/features' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'AI Finance', path: '/ai' },
    { name: 'Security', path: '/security' },
    { name: 'About Us', path: '/about' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-md shadow-slate-900/5 h-16'
          : 'bg-transparent border-b border-transparent h-20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Brand Logo - Explicit link back to home / */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none block group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
              FinMan
            </span>
            <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 tracking-wider uppercase">
              AI Finance Personal Assistant
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600 dark:text-slate-300">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `relative py-1.5 transition-colors hover:text-sky-500 dark:hover:text-sky-400 ${
                  isActive ? 'text-sky-500 dark:text-sky-400 font-extrabold' : ''
                }`
              }
            >
              {({ isActive }) => (
                <span className="relative inline-block group/link">
                  {link.name}
                  {/* Expanding Underline Effect */}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0 group-hover/link:w-full'
                    }`}
                  />
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Controls */}
        <div className="hidden lg:flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-500 px-3 py-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Login
          </Link>
          <MagneticButton strength={0.25}>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/40 transition-all active:scale-95"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </MagneticButton>
        </div>

        {/* Mobile Controls */}
        <div className="flex lg:hidden items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-500 transition-colors focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 px-6 py-6 space-y-4 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block text-sm font-bold p-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-500 dark:text-sky-400'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="text-center py-3 font-bold text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className="text-center py-3 font-bold text-xs bg-sky-500 text-white rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;