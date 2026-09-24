import React, { useState } from 'react';
import { Navbar } from '../../components/landing/Navbar';
import { Footer } from '../../components/landing/Footer';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-sky-500">Get in Touch</span>
          <h1 className="text-4xl font-black tracking-tight mt-1">Contact Us</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-3">We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <Mail className="w-5 h-5 text-sky-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Email</span>
                <span className="font-bold">support@finman.com</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <Phone className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Phone</span>
                <span className="font-bold">+91 (044) 2800-FINMAN</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <MapPin className="w-5 h-5 text-purple-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Location</span>
                <span className="font-bold">Tamil Nadu, India</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            {submitted ? (
              <div className="text-center py-8 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold">Message Sent!</h3>
                <p className="text-slate-500 mt-1">Thank you for reaching out. We will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your Name"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="demo@finman.com"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="General Inquiry"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Message</label>
                  <textarea
                    rows={3}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Your message here..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <Send className="w-3.5 h-3.5" /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};