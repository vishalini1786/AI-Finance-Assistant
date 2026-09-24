import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-3 text-white group w-fit">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight group-hover:text-sky-400 transition-colors">FinMan</span>
          </Link>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Your Money. Your Goals. One Intelligent Financial Assistant. Built for comprehensive personal financial intelligence.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Product</h4>
          <ul className="space-y-2.5 font-medium">
            <li>
              <Link to="/features" className="hover:text-sky-400 transition-colors inline-block hover:translate-x-1">
                Features & Modules
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-sky-400 transition-colors inline-block hover:translate-x-1">
                How It Works
              </Link>
            </li>
            <li>
              <Link to="/ai" className="hover:text-sky-400 transition-colors inline-block hover:translate-x-1">
                AI Finance Studio
              </Link>
            </li>
            <li>
              <Link to="/security" className="hover:text-sky-400 transition-colors inline-block hover:translate-x-1">
                Zero-Knowledge Security
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Company</h4>
          <ul className="space-y-2.5 font-medium">
            <li>
              <Link to="/about" className="hover:text-sky-400 transition-colors inline-block hover:translate-x-1">
                About FinMan
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-sky-400 transition-colors inline-block hover:translate-x-1">
                Contact & Support
              </Link>
            </li>
            <li>
              <span className="text-slate-500 cursor-not-allowed">Privacy Policy</span>
            </li>
            <li>
              <span className="text-slate-500 cursor-not-allowed">Terms of Service</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Security Notice</h4>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4" /> Bank-Grade Zero-Knowledge
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Your financial records are designed to be encrypted and accessible only to your authenticated session.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10 mt-10 border-t border-slate-800 flex flex-wrap justify-between items-center text-slate-500 text-[11px] gap-4">
        <span>© 2026 FinMan AI Personal Finance Assistant. All rights reserved.</span>
        <span className="text-slate-600">Built with React, Vite & Tailwind CSS</span>
      </div>
    </footer>
  );
};

export default Footer;