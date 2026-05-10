import React, { useState, useRef, useMemo, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Loader2, ShieldCheck, Search, FolderUp, X, Download, Moon, Sun, Folder, Wifi, WifiOff, Plus, History as HistoryIcon, LogOut } from 'lucide-react';
import VerificationResult from './components/VerificationResult';
import Auth from './components/Auth';
import Home from './components/Home';
import clsx from 'clsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = 'http://localhost:8001';

function App() {
    const [files, setFiles] = useState([]);
    const [results, setResults] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [activeFilter, setActiveFilter] = useState('all');
    const [isDownloading, setIsDownloading] = useState(false);
    const [showUploadChoice, setShowUploadChoice] = useState(false);
    const [backendStatus, setBackendStatus] = useState('checking');
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [currentView, setCurrentView] = useState('home');
    const [currentUser, setCurrentUser] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('certverify_user') || null;
        return null;
    });

    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('theme') || 'dark';
        return 'dark';
    });

    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const addFileInputRef = useRef(null);

    // Health check
    useEffect(() => {
        const checkHealth = async () => {
            try {
                await axios.get(`${API_URL}/health`, { timeout: 3000 });
                setBackendStatus('online');
            } catch {
                setBackendStatus('offline');
            }
        };
        checkHealth();
        const interval = setInterval(checkHealth, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(c => c === 'dark' ? 'light' : 'dark');

    const stats = useMemo(() => {
        return results.reduce((acc, res) => {
            const status = res.data?.status || 'Error';
            acc.total++;
            if (['Genuine', 'Likely Genuine', 'Found', 'Verified'].includes(status)) acc.genuine++;
            else if (['TAMPERED', 'SUSPICIOUS'].includes(status)) acc.suspicious++;
            else if (status === 'Rejected') acc.rejected++;
            else acc.unverified++;
            return acc;
        }, { total: 0, genuine: 0, suspicious: 0, unverified: 0, rejected: 0 });
    }, [results]);

    const avgConfidence = useMemo(() => {
        if (!results.length) return 0;
        const sum = results.reduce((s, r) => s + (r.data?.confidence_score || 0), 0);
        return Math.round(sum / results.length);
    }, [results]);

    const filteredResults = useMemo(() => {
        if (activeFilter === 'all') return results;
        return results.filter(res => {
            const status = res.data?.status;
            if (activeFilter === 'genuine') return ['Genuine', 'Likely Genuine', 'Found', 'Verified'].includes(status);
            if (activeFilter === 'suspicious') return ['TAMPERED', 'SUSPICIOUS'].includes(status);
            if (activeFilter === 'rejected') return status === 'Rejected';
            if (activeFilter === 'unverified') return !['Genuine', 'Likely Genuine', 'Found', 'Verified', 'TAMPERED', 'SUSPICIOUS', 'Rejected'].includes(status);
            return true;
        });
    }, [results, activeFilter]);

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files?.length > 0) handleFiles(Array.from(e.dataTransfer.files));
    };

    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) handleFiles(Array.from(e.target.files));
    };

    const handleAddMore = async (e) => {
        if (e.target.files?.length > 0) {
            const validFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
            const newFiles = validFiles.filter(nf => !files.some(ef => ef.name === nf.name && ef.size === nf.size));
            if (!newFiles.length) return;
            setFiles(prev => [...prev, ...newFiles]);
            setIsProcessing(true);
            setProgress({ current: 0, total: newFiles.length });
            let count = 0;
            for (const file of newFiles) {
                const formData = new FormData();
                formData.append('file', file);
                try {
                    const response = await axios.post(`${API_URL}/verify`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setResults(prev => [...prev, { file: file.name, data: response.data }]);
                } catch {
                    setResults(prev => [...prev, { file: file.name, data: { status: "Error", message: "Processing failed.", confidence_score: 0, analysis_breakdown: [] } }]);
                }
                count++;
                setProgress({ current: count, total: newFiles.length });
            }
            setIsProcessing(false);
        }
    };

    const handleFiles = (fileList) => {
        const validFiles = fileList.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
        setFiles(prev => {
            const newFiles = validFiles.filter(nf => !prev.some(ef => ef.name === nf.name && ef.size === nf.size));
            return [...prev, ...newFiles];
        });
        setResults([]);
        setActiveFilter('all');
    };

    const processBatch = async () => {
        setIsProcessing(true); setResults([]);
        setProgress({ current: 0, total: files.length });
        let count = 0;
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await axios.post(`${API_URL}/verify`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setResults(prev => [...prev, { file: file.name, data: response.data }]);
            } catch {
                setResults(prev => [...prev, { file: file.name, data: { status: "Error", message: "Processing failed. Is the backend running?", confidence_score: 0, analysis_breakdown: [] } }]);
            }
            count++;
            setProgress({ current: count, total: files.length });
        }
        setIsProcessing(false);
    };

    const handleDownload = async (category) => {
        setIsDownloading(true);
        const zip = new JSZip();
        const toDownload = results.filter(res => {
            const s = res.data?.status;
            if (category === 'genuine') return ['Genuine', 'Likely Genuine', 'Found'].includes(s);
            if (category === 'suspicious') return ['TAMPERED', 'SUSPICIOUS'].includes(s);
            if (category === 'unverified') return !['Genuine', 'Likely Genuine', 'Found', 'TAMPERED', 'SUSPICIOUS'].includes(s);
            return true;
        });
        if (!toDownload.length) { alert("No certificates in this category."); setIsDownloading(false); return; }
        toDownload.forEach(res => {
            const f = files.find(f => f.name === res.file);
            if (f) zip.file(f.name, f);
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `certificates-${category}.zip`);
        setIsDownloading(false);
    };

    const reset = () => { setFiles([]); setResults([]); setProgress({ current: 0, total: 0 }); setActiveFilter('all'); };

    const loadHistory = async () => {
        try {
            const res = await axios.get(`${API_URL}/history`);
            setHistoryData(res.data);
            setShowHistory(true);
        } catch (e) {
            alert('Failed to load history.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('certverify_user');
        localStorage.removeItem('certverify_token');
        setCurrentUser(null);
        setCurrentView('home');
        reset();
    };

    if (!currentUser) {
        if (currentView === 'home') {
            return <Home onNavigate={setCurrentView} theme={theme} toggleTheme={toggleTheme} />;
        }
        return <Auth onLogin={setCurrentUser} initialMode={currentView === 'auth-login'} onBack={() => setCurrentView('home')} theme={theme} toggleTheme={toggleTheme} />;
    }

    return (
        <div className="min-h-screen w-full transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-black dark:text-neutral-200 font-sans selection:bg-indigo-500/30">
            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 border-b transition-colors duration-300 bg-white/80 border-slate-200 backdrop-blur-md dark:bg-black/80 dark:border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button onClick={() => window.location.reload()} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                        <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-500" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">
                            CertVerify <span className="text-indigo-600 dark:text-indigo-500">Pro</span>
                        </span>
                    </button>
                    <div className="flex items-center gap-4">
                        {/* Dynamic stats in navbar */}
                        {stats.total > 0 && (
                            <div className="hidden md:flex items-center gap-3 text-xs font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">{stats.genuine} ✓</span>
                                {stats.suspicious > 0 && <span className="text-red-500">{stats.suspicious} ✗</span>}
                                <span className="text-slate-400 dark:text-neutral-500">Avg: {avgConfidence}%</span>
                            </div>
                        )}
                        {/* Backend status */}
                        <div className="flex items-center gap-1.5" title={`Backend: ${backendStatus}`}>
                            {backendStatus === 'online' ? (
                                <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><Wifi className="w-3.5 h-3.5 text-emerald-500" /></>
                            ) : backendStatus === 'offline' ? (
                                <><div className="w-2 h-2 rounded-full bg-red-500" /><WifiOff className="w-3.5 h-3.5 text-red-500" /></>
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            )}
                        </div>
                        <button onClick={loadHistory} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" title="View History">
                            <HistoryIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                            <LogOut className="w-3.5 h-3.5" /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-28 pb-24">
                {/* Hero */}
                {!results.length && !isProcessing && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto mt-4 text-center">
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
                            Verify Authenticity <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-500">with Precision.</span>
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Upload certificates from <span className="font-semibold text-slate-800 dark:text-neutral-200">Coursera, Udemy, Google, AWS, LinkedIn, HackerRank, NPTEL</span> and 15+ platforms. AI-powered forensic analysis detects forgeries — even without QR codes.
                        </p>

                        <input type="file" multiple onChange={handleFileChange} className="hidden" ref={fileInputRef} accept="image/*,application/pdf" />
                        <input type="file" webkitdirectory="" directory="" multiple onChange={handleFileChange} className="hidden" ref={folderInputRef} />

                        <div className={clsx("relative group rounded-3xl border-2 border-dashed transition-all duration-300 p-14",
                            dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-neutral-800 hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        )} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                            <div className="flex flex-col items-center">
                                {!showUploadChoice ? (
                                    <div onClick={() => setShowUploadChoice(true)} className="cursor-pointer flex flex-col items-center transition-transform hover:scale-105">
                                        <div className="p-4 rounded-2xl mb-4 shadow-xl shadow-indigo-100 dark:shadow-none bg-white dark:bg-zinc-900">
                                            <UploadCloud className="w-9 h-9 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Drop files or folders</h3>
                                        <p className="text-slate-500 dark:text-neutral-400 text-sm">Click to browse...</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-6">
                                        <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setShowUploadChoice(false); }}
                                            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-2 ring-transparent hover:ring-indigo-500 transition-all hover:-translate-y-1">
                                            <FileText className="w-7 h-7 text-indigo-600" /><span className="font-bold text-sm text-slate-700 dark:text-neutral-200">Files</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); setShowUploadChoice(false); }}
                                            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-2 ring-transparent hover:ring-indigo-500 transition-all hover:-translate-y-1">
                                            <Folder className="w-7 h-7 text-amber-500" /><span className="font-bold text-sm text-slate-700 dark:text-neutral-200">Folder</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Queue Ready */}
                {(files.length > 0 && !results.length && !isProcessing) && (
                    <div className="max-w-2xl mx-auto mt-8 p-5 glass-panel flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                <FolderUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white text-base">{files.length} Files Queued</h3>
                                <p className="text-slate-500 dark:text-neutral-400 text-xs">Ready for deep analysis</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={reset} className="px-3 py-2 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium">Clear</button>
                            <button onClick={processBatch} disabled={backendStatus !== 'online'}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105 text-sm">
                                <Search className="w-4 h-4" /> Verify Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing */}
                {isProcessing && (
                    <div className="max-w-xl mx-auto mt-20 text-center">
                        <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-500 animate-spin mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Analyzing Certificates...</h3>
                        <p className="text-slate-600 dark:text-neutral-400 mb-6">Running OCR, forensic analysis, and platform verification.</p>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-indigo-600 dark:bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${(progress.current / progress.total) * 100}%` }} />
                        </div>
                        <p className="text-sm text-slate-400 dark:text-neutral-600 mt-3 font-mono">{progress.current} / {progress.total}</p>
                    </div>
                )}

                {/* Results Dashboard */}
                {results.length > 0 && (
                    <div className="mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Filters */}
                        <div className="sticky top-20 z-40 py-3 mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="flex p-1 rounded-2xl bg-slate-200/50 dark:bg-zinc-900 backdrop-blur-sm">
                                {['all', 'genuine', 'suspicious', 'rejected', 'unverified'].map(filter => {
                                    let count = filter === 'all' ? stats.total : filter === 'genuine' ? stats.genuine : filter === 'suspicious' ? stats.suspicious : filter === 'rejected' ? stats.rejected : stats.unverified;
                                    return (
                                        <button key={filter} onClick={() => setActiveFilter(filter)}
                                            className={clsx("px-4 py-2 rounded-xl text-xs font-semibold transition-all capitalize flex items-center gap-1.5",
                                                activeFilter === filter ? "bg-white text-slate-900 shadow-md dark:bg-neutral-800 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-neutral-500 dark:hover:text-neutral-300"
                                            )}>
                                            {filter}
                                            <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px] font-bold", activeFilter === filter ? "bg-slate-100 dark:bg-neutral-700" : "bg-slate-200/50 dark:bg-neutral-800")}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Add More Files */}
                                <input type="file" multiple onChange={handleAddMore} className="hidden" ref={addFileInputRef} accept="image/*,application/pdf" />
                                <button onClick={() => addFileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-500/30 dark:hover:bg-indigo-500/10">
                                    <Plus className="w-3.5 h-3.5" /> Add More
                                </button>
                                <button onClick={() => handleDownload(activeFilter)} disabled={isDownloading || !filteredResults.length}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all border disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-800 border-slate-900 dark:bg-white dark:text-black dark:border-white dark:hover:bg-neutral-200">
                                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    Export
                                </button>
                                <button onClick={reset} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-neutral-400 dark:hover:bg-zinc-800 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            <AnimatePresence mode='popLayout'>
                                {filteredResults.map((res, idx) => (
                                    <motion.div key={res.file + idx} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                        <VerificationResult data={res.data} filename={res.file} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </main>

            {/* History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
                                <h2 className="text-xl font-bold flex items-center gap-2"><HistoryIcon className="w-5 h-5 text-indigo-500" /> Verification History</h2>
                                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {historyData.length === 0 ? (
                                    <p className="text-center text-slate-500 dark:text-neutral-500 py-10">No history found.</p>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                                        {historyData.map((h, i) => (
                                            <div key={i} className="py-4 flex flex-wrap gap-4 items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-900 dark:text-white truncate">{h.filename}</p>
                                                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">{h.timestamp} • {h.platform} • {h.method}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className={clsx("text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                                                            h.status.includes('Genuine') || h.status === 'Found' || h.status === 'Verified' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                                            h.status === 'Rejected' ? "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-neutral-400" :
                                                            h.status === 'TAMPERED' || h.status === 'SUSPICIOUS' ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
                                                            "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                                        )}>{h.status}</span>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-xs shadow-sm" style={{borderColor: h.confidence_score >= 70 ? '#10b981' : h.confidence_score >= 40 ? '#f59e0b' : '#ef4444'}}>
                                                        {h.confidence_score}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
