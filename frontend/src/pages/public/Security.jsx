import React, { useState } from 'react';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import InteractiveTiltCard from '../../components/common/InteractiveTiltCard';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  ShieldAlert, 
  FileCode, 
  CheckCircle2, 
  Zap, 
  Eye, 
  EyeOff 
} from 'lucide-react';

export const SecurityPage = () => {
  // Security Sandbox Layer Toggles
  const [layers, setLayers] = useState({
    e2e: true,
    zeroKnowledge: true,
    jwt: true,
    anomalyShield: true
  });

  const [isEncryptedView, setIsEncryptedView] = useState(true);

  const mockPlaintextData = {
    accountHolder: 'Priya Sharma',
    netLiquidity: '₹4,82,450.00',
    recentTransaction: 'Swiggy Gourmet - ₹450.00',
    taxSavingReserve: '₹55,000.00'
  };

  const mockEncryptedData = {
    accountHolder: '0x8F4A92B1C... (AES-256 Encrypted)',
    netLiquidity: '0x3E11C40D8... (Hashed Ciphertext)',
    recentTransaction: '0x992B014FF... (Zero Knowledge Scope)',
    taxSavingReserve: '0x00A182F3E... (Encrypted State)'
  };

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="py-16 px-6 max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-950 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
            Bank-Grade Zero Knowledge Architecture
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Security & Privacy Infrastructure.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
            Test the interactive security sandbox layers to see how financial data encrypts in real time.
          </p>
        </div>

        {/* SECTION 1: INTERACTIVE SECURITY VAULT SANDBOX */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          {/* Left Security Layer Toggles */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Defense Layers</h2>

            {[
              { key: 'e2e', title: 'End-to-End Session Encryption', sub: 'AES-256 & TLS 1.3 Transport Security', icon: Lock },
              { key: 'zeroKnowledge', title: 'Zero-Knowledge Record Scoping', sub: 'User-held encryption keys (Zero server exposure)', icon: Key },
              { key: 'jwt', title: 'JWT Stateless Tokens', sub: 'Short-lived RSA tokens with auto revocation', icon: ShieldCheck },
              { key: 'anomalyShield', title: 'Automated Anomaly Shield', sub: 'Real-time bot attack and fraud mitigation', icon: ShieldAlert }
            ].map((layer) => {
              const Icon = layer.icon;
              const active = layers[layer.key];
              return (
                <div
                  key={layer.key}
                  onClick={() => toggleLayer(layer.key)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    active
                      ? 'bg-white dark:bg-slate-900 border-sky-400 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      active ? 'bg-sky-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{layer.title}</h3>
                      <p className="text-[10px] text-slate-400">{layer.sub}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    active ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                  }`}>
                    {active ? 'PROTECTED' : 'DISABLED'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Real-Time Encryption Data Simulator Box */}
          <div className="lg:col-span-6">
            <InteractiveTiltCard className="p-8 bg-slate-900 text-white border-slate-800 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isEncryptedView ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    {isEncryptedView ? 'AES-256 Ciphertext Vault' : 'Decrypted Raw Statement'}
                  </span>
                </div>

                <button
                  onClick={() => setIsEncryptedView(!isEncryptedView)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all text-sky-300"
                >
                  {isEncryptedView ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isEncryptedView ? 'Decrypt Simulation' : 'Encrypt Ciphertext'}
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {Object.entries(isEncryptedView ? mockEncryptedData : mockPlaintextData).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 capitalize">{k}:</span>
                    <span className={`font-bold ${isEncryptedView ? 'text-sky-300' : 'text-emerald-400'}`}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800 text-xs flex items-center gap-2 text-sky-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Zero-Knowledge Status: <strong>100% Secure</strong>. Your cryptographic keys remain client-side.</span>
              </div>
            </InteractiveTiltCard>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SecurityPage;