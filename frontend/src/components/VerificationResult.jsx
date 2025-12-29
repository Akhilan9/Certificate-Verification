import React from 'react';
import { ExternalLink, BadgeCheck, AlertTriangle, XCircle, Info, Calendar, User, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const VerificationResult = ({ data, filename }) => {
    if (!data) return null;

    const isGenuine = ['Genuine', 'Likely Genuine', 'Found', 'Verified'].includes(data.status);
    const isSuspicious = ['TAMPERED', 'SUSPICIOUS'].includes(data.status);
    const isUnverified = !isGenuine && !isSuspicious;

    return (
        <div className={clsx(
            "relative group h-full flex flex-col justify-between p-7 rounded-3xl transition-all duration-300",

            // --- Light Mode ---
            // Clean, rounded, soft shadows
            "bg-white border-2 border-slate-100 hover:border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1",

            isGenuine && "border-b-4 border-b-emerald-500",
            isSuspicious && "border-b-4 border-b-red-500",
            isUnverified && "border-b-4 border-b-amber-500",

            // --- Dark Mode (Cinematic) ---
            // Dark Zinc (almost black) surface, subtle borders, high contrast text
            "dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none dark:hover:bg-zinc-800/80 dark:hover:border-zinc-700",

            // Remove standard bottom border in dark mode for a cleaner 'card' look, or keep it?
            // Let's use left borders for dark mode 'Netflix' indicator feel
            "dark:border-b-0 dark:border-l-4",
            isGenuine && "dark:border-l-emerald-500",
            isSuspicious && "dark:border-l-red-600",
            isUnverified && "dark:border-l-amber-500"
        )}>

            <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-4">
                        {/* Icon Container */}
                        <div className={clsx("p-2.5 rounded-full shrink-0",
                            isGenuine ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                isSuspicious ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500" :
                                    "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        )}>
                            {isGenuine ? <BadgeCheck className="w-6 h-6" /> :
                                isSuspicious ? <AlertTriangle className="w-6 h-6" /> :
                                    <Info className="w-6 h-6" />}
                        </div>

                        <div>
                            <h3 className={clsx("font-bold text-lg leading-tight",
                                isGenuine ? "text-emerald-800 dark:text-emerald-400" :
                                    isSuspicious ? "text-red-700 dark:text-red-500" :
                                        "text-amber-700 dark:text-amber-400"
                            )}>
                                {data.status === 'Found' ? 'Verified' : data.status}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-neutral-500 font-medium mt-1 truncate max-w-[150px] uppercase tracking-wide" title={filename}>
                                {filename}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Detailed Message */}
                <p className="text-slate-600 dark:text-neutral-300 text-sm mb-6 leading-relaxed">
                    {data.message || "Analysis complete."}
                </p>

                {/* Extracted Details Table */}
                {data.details && (
                    <div className="space-y-3 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-black/40">
                        {data.details.name && (
                            <div className="flex items-center gap-3 text-sm">
                                <User className="w-4 h-4 text-slate-400 dark:text-neutral-600" />
                                <span className="text-slate-700 dark:text-neutral-200 font-semibold">{data.details.name}</span>
                            </div>
                        )}
                        {data.details.course && (
                            <div className="flex items-center gap-3 text-sm">
                                <BookOpen className="w-4 h-4 text-slate-400 dark:text-neutral-600" />
                                <span className="text-slate-700 dark:text-neutral-200 font-medium line-clamp-2" title={data.details.course}>{data.details.course}</span>
                            </div>
                        )}
                        {data.details.issued_on && (
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-slate-400 dark:text-neutral-600" />
                                <span className="text-slate-500 dark:text-neutral-400 font-mono text-xs">{data.details.issued_on}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action / Platform Tag */}
            <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-600 uppercase tracking-widest">
                    {data.platform || 'Unknown Source'}
                </span>

                {data.verification_url && (
                    <a
                        href={data.verification_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-white transition-colors"
                    >
                        VERIFY <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
        </div>
    );
};

export default VerificationResult;
