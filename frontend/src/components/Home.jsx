import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, FileText, Cpu, ArrowRight, CheckCircle2, Lock, Sun, Moon } from 'lucide-react';

const Home = ({ onNavigate, theme, toggleTheme }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-300 font-sans selection:bg-indigo-500/30">
            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 border-b border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
                        <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tighter">
                            CertVerify <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Pro</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                        </button>
                        <button onClick={() => onNavigate('auth-login')} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                            Log In
                        </button>
                        <button onClick={() => onNavigate('auth-register')} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-black rounded-full hover:bg-slate-800 dark:hover:bg-neutral-200 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-32 pb-20 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob" />
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center mt-10 md:mt-20">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 mb-8 inline-block">
                            Military-Grade Forensic Engine
                        </span>
                        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
                            Detect Forgeries.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 dark:from-indigo-400 dark:via-purple-400 dark:to-emerald-400">
                                Instantly.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                            Upload certificates from Coursera, Udemy, Meta, and more. Our AI performs Error Level Analysis, Layout Audits, and Live URL cross-referencing to guarantee authenticity.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={() => onNavigate('auth-register')} className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] flex items-center justify-center gap-2 hover:-translate-y-1">
                                Start Verifying Now <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <div className="max-w-7xl mx-auto px-6 mt-32 relative z-10">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <Cpu className="w-6 h-6 text-indigo-500" />, title: "AI Forensics", desc: "Pixel-level Error Level Analysis (ELA) detects spliced text and cloned backgrounds instantly." },
                            { icon: <Search className="w-6 h-6 text-purple-500" />, title: "Live Cross-Check", desc: "Automatically scrapes and validates public verification URLs directly from the issuing platforms." },
                            { icon: <FileText className="w-6 h-6 text-emerald-500" />, title: "Coherence Engine", desc: "Natural Language Processing distinguishes real certificates from resumes and transcripts." }
                        ].map((feat, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.1 }} 
                                className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-colors shadow-xl shadow-slate-200/20 dark:shadow-none">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-black flex items-center justify-center mb-6">
                                    {feat.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                                <p className="text-slate-600 dark:text-neutral-400 leading-relaxed">{feat.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
