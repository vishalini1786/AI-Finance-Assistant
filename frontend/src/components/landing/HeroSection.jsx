import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Bot, ShieldCheck, Zap, TrendingUp, PieChart, Activity, Info } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';
import DeviceMockup from '../common/DeviceMockup';

export const HeroSection = () => {
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [activeCardTooltip, setActiveCardTooltip] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e) => {
    if (isMobile || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    
    // Smooth requestAnimationFrame update or state update
    requestAnimationFrame(() => {
      setMousePos({ x, y });
    });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Parallax shifts by depth
  const bgTransform = `translate3d(${mousePos.x * -12}px, ${mousePos.y * -12}px, 0px)`;
  const shapeTransform = `translate3d(${mousePos.x * 18}px, ${mousePos.y * 18}px, 0px)`;
  const mockupTransform = `perspective(1000px) rotateX(${mousePos.y * -4}deg) rotateY(${mousePos.x * 4}deg) translate3d(${mousePos.x * 8}px, ${mousePos.y * 8}px, 0px)`;

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative pt-8 pb-20 px-6 overflow-hidden transition-all"
    >
      {/* Background Radial Aura (Depth Level 1) */}
      <div
        style={{ transform: bgTransform, transition: 'transform 0.2s ease-out' }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-sky-400/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none z-0"
      />

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 space-y-8">
        {/* Status Badges (Depth Level 2) */}
        <div
          style={{ transform: shapeTransform, transition: 'transform 0.25s ease-out' }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100/90 dark:bg-sky-950/80 border border-sky-300/60 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-xs font-extrabold shadow-sm hover:scale-105 transition-transform cursor-pointer">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Autonomous AI Money Manager
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Bank-Grade Zero Knowledge
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white max-w-5xl leading-[1.08]">
          Your Money. <br />
          Your Intelligence. <br />
          <span className="bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
            Your Future.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-medium leading-relaxed">
          Track your finances, understand your spending, predict future expenses and make smarter financial decisions with AI.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <MagneticButton strength={0.3}>
            <Link
              to="/register"
              className="px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm shadow-xl shadow-sky-500/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </MagneticButton>

          <MagneticButton strength={0.2}>
            <Link
              to="/ai"
              className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-400 text-slate-800 dark:text-slate-200 font-extrabold text-sm shadow-md flex items-center gap-2 transition-all"
            >
              <Bot className="w-4 h-4 text-sky-500" /> Try AI Studio Simulator
            </Link>
          </MagneticButton>
        </div>

        {/* Interactive Device Mockup Stage with Floating Cards */}
        <div className="w-full pt-8 relative max-w-5xl">
          {/* Floating Card 1: Monthly Spending (Top Left) */}
          <div
            onMouseEnter={() => setActiveCardTooltip('spending')}
            onMouseLeave={() => setActiveCardTooltip(null)}
            style={{
              transform: `translate3d(${mousePos.x * -25}px, ${mousePos.y * -20}px, 0px)`,
              transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className="hidden lg:flex absolute top-12 -left-8 z-30 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl hover:shadow-2xl hover:border-sky-400 text-left items-center gap-3.5 transition-all duration-300 group cursor-pointer animate-float-slow"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Spending</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">₹28,450.00</span>
              <span className="text-[10px] font-extrabold text-emerald-500 block">-8% vs last month</span>
            </div>
            {activeCardTooltip === 'spending' && (
              <div className="absolute -top-12 left-0 right-0 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg font-medium animate-in fade-in">
                Real-time categorized outgoing expenditure tracker.
              </div>
            )}
          </div>

          {/* Floating Card 2: Budget Health (Top Right) */}
          <div
            onMouseEnter={() => setActiveCardTooltip('budget')}
            onMouseLeave={() => setActiveCardTooltip(null)}
            style={{
              transform: `translate3d(${mousePos.x * 25}px, ${mousePos.y * -22}px, 0px)`,
              transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className="hidden lg:flex absolute top-16 -right-6 z-30 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl hover:shadow-2xl hover:border-emerald-400 text-left items-center gap-3.5 transition-all duration-300 group cursor-pointer animate-float-reverse"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Health</span>
              <span className="text-sm font-black text-emerald-500">92% Safe Buffer</span>
              <span className="text-[10px] text-slate-400 block">₹14,200 runway remaining</span>
            </div>
            {activeCardTooltip === 'budget' && (
              <div className="absolute -top-12 left-0 right-0 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg font-medium animate-in fade-in">
                Safety margin remaining across active monthly budgets.
              </div>
            )}
          </div>

          {/* Floating Card 3: AI Insight (Bottom Left) */}
          <div
            onMouseEnter={() => setActiveCardTooltip('ai')}
            onMouseLeave={() => setActiveCardTooltip(null)}
            style={{
              transform: `translate3d(${mousePos.x * -20}px, ${mousePos.y * 22}px, 0px)`,
              transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className="hidden lg:flex absolute bottom-12 -left-10 z-30 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-purple-200 dark:border-purple-900/50 shadow-xl hover:shadow-2xl hover:border-purple-400 text-left items-center gap-3.5 transition-all duration-300 group cursor-pointer animate-float-reverse"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">AI Insight</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Save ₹1,800 on dining out</span>
              <span className="text-[10px] text-purple-400 block">Swiggy limit active</span>
            </div>
            {activeCardTooltip === 'ai' && (
              <div className="absolute -bottom-12 left-0 right-0 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg font-medium animate-in fade-in">
                Personalized neural financial advice derived from spending trends.
              </div>
            )}
          </div>

          {/* Floating Card 4: Expense Prediction (Bottom Right) */}
          <div
            onMouseEnter={() => setActiveCardTooltip('predict')}
            onMouseLeave={() => setActiveCardTooltip(null)}
            style={{
              transform: `translate3d(${mousePos.x * 22}px, ${mousePos.y * 20}px, 0px)`,
              transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className="hidden lg:flex absolute bottom-16 -right-8 z-30 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-indigo-200 dark:border-indigo-900/50 shadow-xl hover:shadow-2xl hover:border-indigo-400 text-left items-center gap-3.5 transition-all duration-300 group cursor-pointer animate-float-slow"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expense Prediction</span>
              <span className="text-sm font-black text-indigo-500">₹31,200 Est.</span>
              <span className="text-[10px] text-slate-400 block">Next Month Forecast</span>
            </div>
            {activeCardTooltip === 'predict' && (
              <div className="absolute -bottom-12 left-0 right-0 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg font-medium animate-in fade-in">
                Machine learning forecast based on recurring obligations.
              </div>
            )}
          </div>

          {/* Interactive Mockup Container with Parallax 3D Tilt */}
          <div
            style={{
              transform: isMobile ? 'none' : mockupTransform,
              transition: isMobile ? 'none' : 'transform 0.2s ease-out',
            }}
            className="w-full transition-all duration-300"
          >
            <DeviceMockup defaultMode="desktop" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;