import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, UserPlus, LogIn, Lock, Mail, Loader2, ArrowRight, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const API_URL = 'http://localhost:8001';

const Auth = ({ onLogin, initialMode = true, onBack, theme, toggleTheme }) => {
    const [isLogin, setIsLogin] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Strong Validation
        if (!isLogin) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return setError('Please enter a valid email address.');
            if (password.length < 8) return setError('Password must be at least 8 characters long.');
            if (!/[A-Z]/.test(password)) return setError('Password must contain an uppercase letter.');
            if (!/[0-9]/.test(password)) return setError('Password must contain a number.');
        }

        setLoading(true);
        
        try {
            const endpoint = isLogin ? '/login' : '/register';
            const res = await axios.post(`${API_URL}${endpoint}`, { username: email, password });
            
            if (isLogin) {
                localStorage.setItem('certverify_user', res.data.username);
                localStorage.setItem('certverify_token', res.data.token);
                onLogin(res.data.username);
            } else {
                setIsLogin(true);
                setError('Registration successful. Please log in.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            // In a full implementation, you would send user.accessToken to the backend here.
            // For now, we trust Firebase auth on the frontend.
            localStorage.setItem('certverify_user', user.email);
            localStorage.setItem('certverify_token', await user.getIdToken());
            onLogin(user.email);
        } catch (error) {
            console.error("Google Sign In Error:", error);
            setError(error.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-black transition-colors duration-300 relative">
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                {onBack ? (
                    <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-neutral-500 dark:hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
                    </button>
                ) : <div />}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                    {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                </button>
            </div>
            
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-500" />
                        <span className="font-bold text-3xl tracking-tighter text-slate-900 dark:text-white">
                            CertVerify <span className="text-indigo-600 dark:text-indigo-500">Pro</span>
                        </span>
                    </div>
                </div>
                
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border-2 border-slate-100 dark:border-zinc-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                    
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 text-center">
                        {isLogin ? 'Welcome Back' : 'Create an Account'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-neutral-400 text-center mb-6">
                        {isLogin ? 'Securely access your verification dashboard.' : 'Start analyzing certificates in seconds.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-black/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="you@company.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-black/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <p className={clsx("text-sm text-center p-3 rounded-lg border", error.includes('successful') ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" : "text-red-500 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20")}>
                                        {error}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-zinc-800" /></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-zinc-900 text-slate-500">Or continue with</span></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-700 dark:text-neutral-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center w-full gap-1"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Auth;
