import React, { useState, useRef, useMemo, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Loader2, ShieldCheck, Search, FolderUp, CheckCircle2, AlertOctagon, HelpCircle, Filter, X, Download, Moon, Sun, MonitorPlay, Folder } from 'lucide-react';
import VerificationResult from './components/VerificationResult';
import clsx from 'clsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function App() {
    const [files, setFiles] = useState([]);
    const [results, setResults] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [activeFilter, setActiveFilter] = useState('all');
    const [isDownloading, setIsDownloading] = useState(false);
    const [showUploadChoice, setShowUploadChoice] = useState(false);

    // Theme State
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(curr => curr === 'dark' ? 'light' : 'dark');
    };

    const stats = useMemo(() => {
        return results.reduce((acc, res) => {
            const status = res.data?.status || 'Error';
            acc.total++;
            if (['Genuine', 'Likely Genuine', 'Found'].includes(status)) acc.genuine++;
            else if (['TAMPERED', 'SUSPICIOUS'].includes(status)) acc.suspicious++;
            else acc.unverified++;
            return acc;
        }, { total: 0, genuine: 0, suspicious: 0, unverified: 0 });
    }, [results]);

    const filteredResults = useMemo(() => {
        if (activeFilter === 'all') return results;
        return results.filter(res => {
            const status = res.data?.status;
            if (activeFilter === 'genuine') return ['Genuine', 'Likely Genuine', 'Found', 'Verified'].includes(status);
            if (activeFilter === 'suspicious') return ['TAMPERED', 'SUSPICIOUS'].includes(status);
            if (activeFilter === 'unverified') return !['Genuine', 'Likely Genuine', 'Found', 'Verified', 'TAMPERED', 'SUSPICIOUS'].includes(status);
            return true;
        });
    }, [results, activeFilter]);


    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length > 0) handleFiles(Array.from(e.dataTransfer.files));
    };

    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) handleFiles(Array.from(e.target.files));
    };

    const handleFiles = (fileList) => {
        const validFiles = fileList.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');

        setFiles(prevFiles => {
            // Filter out duplicates based on file name and size
            const newFiles = validFiles.filter(newFile =>
                !prevFiles.some(existingFile =>
                    existingFile.name === newFile.name && existingFile.size === newFile.size
                )
            );
            return [...prevFiles, ...newFiles];
        });

        // Don't clear results immediately if adding to queue? 
        // Actually user might want to verify just the new ones or re - verify all.
        // For simplicity and UX consistency with "Queue", let's keep results but maybe mark them?
        // If we just append to files, the UI shows more files.
        // If user clicks "Verify", processBatch iterates over ALL 'files'.
        // We should reset results if we want to re - process everything, OR
        // smart processing(only process new ones).
        // For now, let's stick to the simplest interpretation: Add to input list. 
        // Resetting results is safer to avoid mismatch indices if not careful.
        // "select another file should add into queue" -> likely input queue.
        setResults([]);

        // Update progress total to reflect new combined count
        // Wait, we need the new length.
        setActiveFilter('all');
    };

    const processBatch = async () => {
        setIsProcessing(true);
        setResults([]);
        setProgress({ current: 0, total: files.length });
        let processedCount = 0;

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                // Updated to port 8001
                const response = await axios.post('http://localhost:8001/verify', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setResults(prev => [...prev, { file: file.name, data: response.data }]);
            } catch (error) {
                setResults(prev => [...prev, { file: file.name, data: { status: "Error", message: "Processing failed." } }]);
            }
            processedCount++;
            setProgress(prev => ({ ...prev, current: processedCount }));
        }
        setIsProcessing(false);
    };

    const handleDownload = async (category) => {
        setIsDownloading(true);
        const zip = new JSZip();

        const resultsToDownload = results.filter(res => {
            const status = res.data?.status;
            if (category === 'genuine') return ['Genuine', 'Likely Genuine', 'Found'].includes(status);
            if (category === 'suspicious') return ['TAMPERED', 'SUSPICIOUS'].includes(status);
            if (category === 'unverified') return !['Genuine', 'Likely Genuine', 'Found', 'TAMPERED', 'SUSPICIOUS'].includes(status);
            return true;
        });

        if (resultsToDownload.length === 0) {
            alert("No certificates found in this category.");
            setIsDownloading(false);
            return;
        }

        let count = 0;
        resultsToDownload.forEach(res => {
            const originalFile = files.find(f => f.name === res.file);
            if (originalFile) {
                zip.file(originalFile.name, originalFile);
                count++;
            }
        });

        if (count > 0) {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `certificates-${category}.zip`);
        }
        setIsDownloading(false);
    };

    const reset = () => {
        setFiles([]);
        setResults([]);
        setProgress({ current: 0, total: 0 });
        setActiveFilter('all');
    };

    return (
        // Update: dark:bg-black for true OLED black
        <div className="min-h-screen w-full transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-black dark:text-neutral-200 font-sans selection:bg-red-500/30">

            {/* Navbar */}
            {/* Update: dark:bg-black/90 for cinematic header */}
            <header className="fixed top-0 w-full z-50 border-b transition-colors duration-300 bg-white/80 border-slate-200 backdrop-blur-md dark:bg-black/80 dark:border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Brand Color: Red/Pink for Netflix vibes? Or stick to Professional Blue/Indigo? Let's keep Indigo but make it pop against black. */}
                        <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-500" />
                        <span className="font-bold text-xl tracking-tighter text-slate-900 dark:text-white">
                            CertVerify <span className="text-indigo-600 dark:text-indigo-500">Pro</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                            <span className="text-slate-600 dark:text-neutral-500">Status:</span>
                            {stats.genuine > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.genuine} Genuine</span>}
                            {stats.suspicious > 0 && <span className="text-red-600 dark:text-red-500 font-bold">{stats.suspicious} Suspicious</span>}
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-24">

                {/* Hero / Upload Section */}
                {!results.length && !isProcessing && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="max-w-3xl mx-auto mt-8 text-center"
                    >
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8 text-slate-900 dark:text-white">
                            Verify Authenticity <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-500">
                                with Precision.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 dark:text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                            The advanced platform for bulk certificate verification.
                            Trusted by professionals for detecting forgeries in seconds.
                        </p>

                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*,application/pdf"
                        />
                        <input
                            type="file"
                            webkitdirectory=""
                            directory=""
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            ref={folderInputRef}
                        />

                        <div
                            className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 p-16
                            ${dragActive
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                                    : 'border-slate-300 dark:border-neutral-800 hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center">
                                {!showUploadChoice ? (
                                    <div
                                        onClick={() => setShowUploadChoice(true)}
                                        className="cursor-pointer group flex flex-col items-center transition-transform hover:scale-105"
                                    >
                                        <div className="p-5 rounded-2xl mb-6 shadow-xl shadow-indigo-100 dark:shadow-none bg-white dark:bg-zinc-900">
                                            <UploadCloud className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Drop files or folders</h3>
                                        <p className="text-slate-500 dark:text-neutral-400 font-medium">Click to browse...</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-6 animate-in fade-in zoom-in duration-200">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setShowUploadChoice(false); }}
                                            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-2 ring-transparent hover:ring-indigo-500 transition-all hover:-translate-y-1"
                                        >
                                            <FileText className="w-8 h-8 text-indigo-600" />
                                            <span className="font-bold text-slate-700 dark:text-neutral-200">Select Files</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); setShowUploadChoice(false); }}
                                            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-2 ring-transparent hover:ring-indigo-500 transition-all hover:-translate-y-1"
                                        >
                                            <Folder className="w-8 h-8 text-amber-500" />
                                            <span className="font-bold text-slate-700 dark:text-neutral-200">Select Folder</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Processing State */}
                {(files.length > 0 && !results.length && !isProcessing) && (
                    <div className="max-w-2xl mx-auto mt-10 p-6 glass-panel flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                <FolderUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{files.length} Files Queued</h3>
                                <p className="text-slate-500 dark:text-neutral-400 text-sm">Ready for deep analysis</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={reset} className="px-4 py-2 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">Clear</button>
                            <button onClick={processBatch} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105">
                                <Search className="w-4 h-4" /> Verify Now
                            </button>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div className="max-w-xl mx-auto mt-24 text-center">
                        <Loader2 className="w-14 h-14 text-indigo-600 dark:text-indigo-500 animate-spin mx-auto mb-8" />
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Scanning...</h3>
                        <p className="text-slate-600 dark:text-neutral-400 mb-8 text-lg">Cross-referencing databases and cryptographic signatures.</p>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-indigo-600 dark:bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${(progress.current / progress.total) * 100}%` }} />
                        </div>
                        <p className="text-sm text-slate-400 dark:text-neutral-600 mt-4 font-mono">{progress.current} / {progress.total}</p>
                    </div>
                )}

                {/* Dashboard Results */}
                {results.length > 0 && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                        {/* Filters & Actions - Sticky Header */}
                        <div className="sticky top-24 z-40 py-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">

                            {/* Custom Tab Switcher */}
                            <div className="flex p-1.5 rounded-2xl bg-slate-200/50 dark:bg-zinc-900 backdrop-blur-sm">
                                {['all', 'genuine', 'suspicious', 'unverified'].map(filter => {
                                    let count = 0;
                                    if (filter === 'all') count = stats.total;
                                    if (filter === 'genuine') count = stats.genuine;
                                    if (filter === 'suspicious') count = stats.suspicious;
                                    if (filter === 'unverified') count = stats.unverified;

                                    return (
                                        <button
                                            key={filter}
                                            onClick={() => setActiveFilter(filter)}
                                            className={clsx(
                                                "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize flex items-center gap-2",
                                                activeFilter === filter
                                                    ? "bg-white text-slate-900 shadow-md transform scale-100 dark:bg-neutral-800 dark:text-white"
                                                    : "text-slate-500 hover:text-slate-900 dark:text-neutral-500 dark:hover:text-neutral-300"
                                            )}
                                        >
                                            {filter}
                                            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold",
                                                activeFilter === filter ? "bg-slate-100 dark:bg-neutral-700" : "bg-slate-200/50 dark:bg-neutral-800"
                                            )}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleDownload(activeFilter)}
                                    disabled={isDownloading || filteredResults.length === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all border disabled:opacity-50
                                    bg-slate-900 text-white hover:bg-slate-800 border-slate-900 hover:shadow-lg
                                    dark:bg-white dark:text-black dark:border-white dark:hover:bg-neutral-200"
                                >
                                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Export {activeFilter === 'all' ? 'All' : activeFilter}
                                </button>

                                <button onClick={reset} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-neutral-400 dark:hover:bg-zinc-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Grid - Cinematic Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <AnimatePresence mode='popLayout'>
                                {filteredResults.map((res, idx) => (
                                    <motion.div
                                        key={idx}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <VerificationResult data={res.data} filename={res.file} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
