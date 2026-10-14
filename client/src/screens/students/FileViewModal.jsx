// import React from 'react';
// import { X, Download, FileText } from 'lucide-react';
// import { Button } from "@/components/ui/button";

// const FileViewModal = ({ isOpen, onClose, fileUrl, fileName }) => {
//     if (!isOpen || !fileUrl) return null;

//     const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
//     const isPDF = /\.pdf$/i.test(fileUrl);

//     return (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
//             <div className="relative bg-white rounded-lg shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
//                 {/* Header */}
//                 <div className="flex items-center justify-between p-4 border-b bg-white">
//                     <h3 className="text-lg font-semibold text-gray-900 truncate">
//                         Viewing: {fileName}
//                     </h3>
//                     <div className="flex items-center gap-2">
//                         <Button
//                             variant="outline"
//                             size="sm"
//                             asChild
//                         >
//                             <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
//                                 <Download className="h-4 w-4" />
//                                 <span className="hidden sm:inline">Download</span>
//                             </a>
//                         </Button>
//                         <Button 
//                             variant="ghost" 
//                             size="icon"
//                             onClick={onClose}
//                             className="h-8 w-8 rounded-full"
//                         >
//                             <X className="h-5 w-5" />
//                         </Button>
//                     </div>
//                 </div>

//                 {/* Content Area */}
//                 <div className="flex-1 overflow-auto p-4 bg-slate-100 flex justify-center items-center">
//                     {isImage ? (
//                         <img 
//                             src={fileUrl} 
//                             alt={fileName} 
//                             className="max-w-full max-h-full object-contain bg-white shadow-lg rounded" 
//                         />
//                     ) : isPDF ? (
//                         <iframe 
//                             src={fileUrl} 
//                             className="w-full h-full border-none bg-white shadow-lg rounded"
//                             title="PDF Preview"
//                         />
//                     ) : (
//                         <div className="text-center bg-white p-12 rounded-xl shadow-xl border border-slate-200">
//                             <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
//                                 <FileText className="h-8 w-8" />
//                             </div>
//                             <h4 className="text-xl font-medium text-slate-900 mb-2">No Preview Available</h4>
//                             <p className="text-slate-500 mb-6">We can't display a preview for this file type.</p>
//                             <Button asChild>
//                                 <a href={fileUrl} download={fileName} className="flex items-center gap-2">
//                                     <Download className="h-4 w-4" />
//                                     Download to View
//                                 </a>
//                             </Button>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default FileViewModal;











import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";

const FileViewModal = ({ isOpen, onClose, fileUrl, fileName }) => {
    // 1. Strict guard: prevents rendering if no URL or if URL is just the site root/empty
    if (!isOpen || !fileUrl || fileUrl === window.location.origin + '/') return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
    const isPDF = /\.pdf$/i.test(fileUrl);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
            
            {/* Modal Container */}
            <div className="relative bg-white sm:rounded-xl shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col overflow-hidden">
                
                {/* Slim Header: Focused on the file */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <FileText size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate uppercase tracking-tight">
                                {fileName || "Document Preview"}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium leading-none">
                                {isPDF ? 'Adobe PDF Document' : isImage ? 'Image File' : 'Attachment'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Open in New Tab - Often safer for PDFs */}
                        <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-slate-500 hover:text-blue-600">
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                <span className="text-xs font-bold">Open Full</span>
                            </a>
                        </Button>

                        <Button variant="outline" size="sm" asChild className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
                            <a href={fileUrl} download={fileName} className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                <span className="text-xs font-bold">Download</span>
                            </a>
                        </Button>

                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden bg-slate-100/50 relative flex items-center justify-center p-4 sm:p-8">
                    
                    {isImage ? (
                        <div className="relative group max-w-full max-h-full">
                            <img 
                                src={fileUrl} 
                                alt={fileName} 
                                crossOrigin="anonymous"
                                className="max-w-full max-h-full object-contain bg-white shadow-2xl rounded-lg border border-white" 
                            />
                        </div>
                    ) : isPDF ? (
                        /* Embedded PDF Viewer with a subtle border frame */
                        <div className="w-full h-full bg-slate-200 rounded-lg overflow-hidden shadow-inner border border-slate-300">
                            <iframe 
                                src={`${fileUrl}#toolbar=0&navpanes=0`} 
                                className="w-full h-full border-none"
                                title="Document Preview"
                                // Safety to prevent accidental recursive loading
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        /* Fallback for unknown types */
                        <div className="text-center max-w-md bg-white p-10 rounded-2xl shadow-xl border border-slate-200 animate-in zoom-in-95">
                            <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
                                <FileText className="h-8 w-8" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">No Preview Available</h4>
                            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                                This file type cannot be previewed directly in the browser. Please download it to view the contents.
                            </p>
                            <Button asChild className="w-full bg-slate-900 hover:bg-black py-6 rounded-xl font-bold">
                                <a href={fileUrl} download={fileName} className="flex items-center justify-center gap-2">
                                    <Download className="h-5 w-5" />
                                    Download Document
                                </a>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Bottom Footer Tip (Mobile Friendly) */}
                <div className="px-6 py-3 bg-white border-t flex justify-center sm:justify-start">
                   <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                       Secure Document Viewer • Read Only Mode
                   </p>
                </div>
            </div>
        </div>
    );
};

export default FileViewModal;