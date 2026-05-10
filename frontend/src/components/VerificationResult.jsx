import React, { useState } from 'react';
import { ExternalLink, BadgeCheck, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck, Activity, XCircle, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import clsx from 'clsx';

const ConfidenceGauge = ({ score }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor"
                    className="text-slate-200 dark:text-neutral-800" strokeWidth="6" />
                <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black" style={{ color }}>{score}</span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Score</span>
            </div>
        </div>
    );
};

const VerificationResult = ({ data, filename }) => {
    const [showBreakdown, setShowBreakdown] = useState(false);
    if (!data) return null;

    const isGenuine = ['Genuine', 'Likely Genuine', 'Found', 'Verified'].includes(data.status);
    const isSuspicious = ['TAMPERED', 'SUSPICIOUS'].includes(data.status);
    const isRejected = data.status === 'Rejected';
    const score = data.confidence_score ?? 0;
    const breakdown = data.analysis_breakdown || [];
    const method = data.method || 'Standard Analysis';

    const generateReport = () => {
        console.log("Generating report for:", filename, data);
        try {
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(22);
            doc.setTextColor(79, 70, 229); // Indigo
            doc.text('CertVerify Pro', 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('Forensic Verification & Audit Report', 14, 26);
            doc.line(14, 30, 196, 30);

            // Summary Info
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Certificate: ${filename}`, 14, 40);
            doc.text(`Platform: ${data.platform || 'Unknown'}`, 14, 47);
            doc.text(`Status: ${data.status}`, 14, 54);
            doc.text(`Confidence Score: ${score}%`, 14, 61);
            
            let currentY = 75;

            // Candidate Image (Base64)
            if (data.extracted_face) {
                try {
                    console.log("Adding image to PDF...");
                    // Try to detect format from base64 string
                    const format = data.extracted_face.includes('png') ? 'PNG' : 'JPEG';
                    doc.setFontSize(10);
                    doc.setTextColor(79, 70, 229);
                    doc.text('EXTRACTED CANDIDATE PHOTO', 14, currentY);
                    doc.addImage(data.extracted_face, format, 14, currentY + 5, 30, 30);
                    currentY += 45;
                } catch (imgErr) {
                    console.error("PDF Image Error:", imgErr);
                }
            }

            // Extracted Details
            if (data.details) {
                doc.setFontSize(10);
                doc.setTextColor(79, 70, 229);
                doc.text('OCR EXTRACTED DETAILS', 14, currentY);
                currentY += 7;
                
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                Object.entries(data.details).forEach(([k, v]) => {
                    if (v) {
                        const label = k.replace(/_/g, ' ').toUpperCase();
                        doc.text(`${label}: ${v}`, 14, currentY);
                        currentY += 8;
                    }
                });
                currentY += 5;
            }

            // Analysis Table
            if (breakdown.length > 0) {
                console.log("Adding table to PDF...");
                const tableData = breakdown.map(item => [
                    item.check.replace(/_/g, ' ').toUpperCase(),
                    item.impact > 0 ? `+${item.impact}` : item.impact,
                    item.detail || 'N/A'
                ]);
                
                autoTable(doc, {
                    startY: currentY,
                    head: [['SECURITY CHECK', 'IMPACT', 'FORENSIC DETAIL']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    margin: { top: 10 }
                });
            }

            console.log("Saving PDF...");
            doc.save(`${filename.split('.')[0]}_report.pdf`);
        } catch (error) {
            console.error("CRITICAL PDF ERROR:", error);
            alert(`PDF Export Failed: ${error.message}`);
        }
    };

    return (
        <div className={clsx(
            "relative group h-full flex flex-col justify-between p-6 rounded-3xl transition-all duration-300",
            "bg-white border-2 border-slate-100 hover:border-indigo-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1",
            "dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none dark:hover:border-zinc-700",
            isGenuine ? "border-l-8 border-l-emerald-500" :
                isSuspicious ? "border-l-8 border-l-red-500" :
                    isRejected ? "border-l-8 border-l-slate-400 dark:border-l-neutral-600 opacity-70" :
                        "border-l-8 border-l-amber-500"
        )}>
            <div className="flex flex-col gap-5">
                {/* Header row with status + gauge */}
                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={clsx("p-1.5 rounded-full shrink-0",
                                isGenuine ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                    isSuspicious ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500" :
                                        isRejected ? "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-500" :
                                            "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                            )}>
                                {isGenuine ? <BadgeCheck className="w-5 h-5" /> :
                                    isSuspicious ? <AlertTriangle className="w-5 h-5" /> :
                                        isRejected ? <XCircle className="w-5 h-5" /> :
                                            <Info className="w-5 h-5" />}
                            </div>
                            <span className={clsx("text-xs font-bold uppercase tracking-wider",
                                isGenuine ? "text-emerald-600 dark:text-emerald-400" :
                                    isSuspicious ? "text-red-600 dark:text-red-400" :
                                        isRejected ? "text-slate-500 dark:text-neutral-500" :
                                            "text-amber-600 dark:text-amber-400"
                            )}>{data.status}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-neutral-300 leading-snug mb-1">{data.message}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono truncate">{filename}</p>
                    </div>
                    <ConfidenceGauge score={score} />
                </div>

                {/* Details */}
                {data.details && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
                        {data.extracted_face && (
                            <div className="mb-2">
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5">Candidate Photo</h4>
                                <img src={data.extracted_face} alt="Candidate Face" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-900 shadow-md" />
                            </div>
                        )}
                        {data.details.name && (
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-0.5">Name</h4>
                                <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{data.details.name}</p>
                            </div>
                        )}
                        {data.details.course && (
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-0.5">Course</h4>
                                <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">{data.details.course}</p>
                            </div>
                        )}
                        {data.details.issued_on && (
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-0.5">Issued On</h4>
                                <p className="text-sm font-mono text-slate-500 dark:text-neutral-400">{data.details.issued_on}</p>
                            </div>
                        )}
                    </div>
                )}

                {!data.details && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800">
                        <p className="text-xs text-slate-500 dark:text-neutral-400 italic">No specific details extracted. Status is based on file analysis.</p>
                    </div>
                )}

                {/* Analysis Breakdown Toggle */}
                {breakdown.length > 0 && (
                    <div>
                        <button onClick={() => setShowBreakdown(!showBreakdown)}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors w-full">
                            <Activity className="w-3.5 h-3.5" />
                            Analysis Breakdown ({breakdown.length} checks)
                            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                        {showBreakdown && (
                            <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                {breakdown.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50 text-xs">
                                        <span className={clsx("font-bold min-w-[40px] text-right",
                                            item.impact > 0 ? "text-emerald-600 dark:text-emerald-400" :
                                                item.impact < 0 ? "text-red-500 dark:text-red-400" :
                                                    "text-slate-400 dark:text-neutral-500"
                                        )}>
                                            {item.impact > 0 ? `+${item.impact}` : item.impact}
                                        </span>
                                        <span className="font-semibold text-slate-600 dark:text-neutral-300 capitalize">{item.check.replace(/_/g, ' ')}</span>
                                        {item.detail && <span className="text-slate-400 dark:text-neutral-500 truncate ml-auto max-w-[50%]" title={item.detail}>— {item.detail}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-neutral-800 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-600 uppercase tracking-widest">{data.platform || 'Unknown'}</span>
                    <span className="text-[9px] text-slate-300 dark:text-neutral-700 font-medium">{method}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={generateReport} title="Download PDF Report"
                        className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors">
                        <FileDown className="w-4 h-4" />
                    </button>
                    {data.verification_url ? (
                        <a href={data.verification_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                            VERIFY ONLINE <ExternalLink className="w-3 h-3" />
                        </a>
                    ) : (
                        <span className="text-[10px] text-slate-400 dark:text-neutral-600 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Forensic Analysis
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerificationResult;
