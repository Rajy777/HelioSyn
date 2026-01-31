
import React, { useCallback } from 'react';
import { UploadCloud, CheckCircle, FileType } from 'lucide-react';

interface FileUploadProps {
    label: string;
    accept?: string;
    onFileSelect: (file: File) => void;
    selectedFile?: File | null;
}

const FileUpload = ({ label, accept = ".csv", onFileSelect, selectedFile }: FileUploadProps) => {
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
            <div
                className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 group
          ${selectedFile
                        ? 'border-cyan-500/50 bg-cyan-500/5'
                        : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                <input
                    type="file"
                    accept={accept}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleChange}
                />

                <div className="flex flex-col items-center justify-center text-center gap-3">
                    {selectedFile ? (
                        <>
                            <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-200">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-slate-800 rounded-full text-slate-500 group-hover:text-slate-300 transition-colors">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Click or drag CSV</p>
                                <p className="text-xs text-slate-600">Supports .csv files</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileUpload;
