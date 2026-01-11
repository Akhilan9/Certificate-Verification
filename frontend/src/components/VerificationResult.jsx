import React from 'react';
import { ExternalLink, BadgeCheck, AlertTriangle, XCircle, Info, Calendar, User, BookOpen, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const VerificationResult = ({ data, filename }) => {
    if (!data) return null;

    const isGenuine = ['Genuine', 'Likely Genuine', 'Found', 'Verified'].includes(data.status);
    const isSuspicious = ['TAMPERED', 'SUSPICIOUS'].includes(data.status);
    const isUnverified = !isGenuine && !isSuspicious;

    // Helper to format date if it's an ISO string or similar, otherwise pass through
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        // If it looks like a nice date already, keep it. 
        // If it's effectively a timestamp, maybe leave it or format it? 
        // User example showed ISO: 2025-04-28T17:30:49Z. Let's keep it simple or exact match user preference.
        return dateStr;
    };

    return (
        <div className={clsx(
            "relative group h-full flex flex-col justify-between p-8 rounded-3xl transition-all duration-300",
            // --- Light Mode ---
            "bg-white border-2 border-slate-100 hover:border-indigo-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1",
            // --- Dark Mode ---
            "dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none dark:hover:border-zinc-700",

            // Status Borders
            isGenuine ? "border-l-8 border-l-emerald-500" :
                isSuspicious ? "border-l-8 border-l-red-500" :
                    "border-l-8 border-l-amber-500"
        )}>

            <div className="flex flex-col gap-6">

                {/* 1. Status Message Header */}
                <div className="flex items-start gap-4">
                    <div className={clsx("mt-1 p-2 rounded-full shrink-0",
                        isGenuine ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" :
                            isSuspicious ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500" :
                                "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                    )}>
                        {isGenuine ? <BadgeCheck className="w-6 h-6" /> :
                            isSuspicious ? <AlertTriangle className="w-6 h-6" /> :
                                <Info className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className={clsx("font-bold text-lg leading-snug",
                            isGenuine ? "text-emerald-700 dark:text-emerald-400" :
                                isSuspicious ? "text-red-700 dark:text-red-400" :
                                    "text-amber-700 dark:text-amber-400"
                        )}>
                            {data.message}
                        </h3>
                        {/* Filename sub-label */}
                        <p className="text-xs text-slate-400 dark:text-neutral-500 font-mono mt-1">{filename}</p>
                    </div>
                </div>

                {/* 2. Main Details Block (The User's Request) */}
                {data.details && (
                    <div className="pl-0 mt-2 space-y-4">

                        {/* Name - Large & Bold */}
                        {data.details.name && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Name</h4>
                                <p className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {data.details.name}
                                </p>
                            </div>
                        )}

                        {/* Course - Medium */}
                        {data.details.course && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Course</h4>
                                <p className="text-lg font-semibold text-slate-700 dark:text-neutral-300">
                                    {data.details.course}
                                </p>
                            </div>
                        )}

                        {/* Date - Standard */}
                        {data.details.issued_on && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Issued On</h4>
                                <p className="text-base font-mono text-slate-500 dark:text-neutral-400">
                                    {formatDate(data.details.issued_on)}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Fallback if no details but we have status */}
                {!data.details && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800">
                        <p className="text-sm text-slate-500 dark:text-neutral-400 italic">
                            No specific details extracted. Status is based on file analysis.
                        </p>
                    </div>
                )}

            </div>

            {/* Footer / Links */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-neutral-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-600 uppercase tracking-widest">
                    {data.platform || 'Unknown Source'}
                </span>

                {data.verification_url ? (
                    <a
                        href={data.verification_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                        VERIFY ONLINE <ExternalLink className="w-3 h-3" />
                    </a>
                ) : (
                    <span className="text-xs text-slate-400 dark:text-neutral-600 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Digital Sig.
                    </span>
                )}
            </div>
        </div>
    );
};

export default VerificationResult;
