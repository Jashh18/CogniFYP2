import { useState, useRef } from 'react';
import { documentAPI } from '../lib/api';
import './FileUpload.css';

interface FileUploadProps {
    onUploadComplete: (document: { id: string; filename: string; chunk_count: number }) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    }

    async function handleFile(file: File) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Only PDF files are supported.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setError('File size must be under 50 MB.');
            return;
        }

        setError('');
        setUploading(true);
        setProgress(0);
        setStatus('Uploading PDF...');

        // Simulate progress stages
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev < 30) {
                    setStatus('Uploading PDF...');
                    return prev + 2;
                }
                if (prev < 55) {
                    setStatus('Extracting text...');
                    return prev + 1;
                }
                if (prev < 75) {
                    setStatus('Generating embeddings...');
                    return prev + 0.5;
                }
                if (prev < 90) {
                    setStatus('Storing in vector database...');
                    return prev + 0.3;
                }
                if (prev < 99) {
                    setStatus('Finalizing... (keep this tab open)');
                    return prev + 0.1;
                }
                return 99;
            });
        }, 200);

        const slowWarningTimeout = setTimeout(() => {
            setStatus('Still processing on server... this can take a few minutes for some PDFs.');
        }, 60_000);

        try {
            const res = await documentAPI.upload(file);
            clearInterval(progressInterval);
            clearTimeout(slowWarningTimeout);
            setProgress(100);
            setStatus('Complete!');
            setTimeout(() => {
                setUploading(false);
                onUploadComplete(res.data.document);
            }, 600);
        } catch (err: unknown) {
            clearInterval(progressInterval);
            clearTimeout(slowWarningTimeout);
            setUploading(false);
            setProgress(0);
            const errorMsg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error || errorMsg
            );
        }
    }

    return (
        <div className="file-upload-wrapper">
            <div
                className={`file-upload-zone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                id="file-upload-zone"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="file-input-hidden"
                    id="file-input"
                />

                {uploading ? (
                    <div className="upload-progress">
                        <div className="progress-circle">
                            <svg viewBox="0 0 100 100" className="progress-svg">
                                <circle cx="50" cy="50" r="42" className="progress-bg" />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    className="progress-fill"
                                    style={{
                                        strokeDasharray: `${2 * Math.PI * 42}`,
                                        strokeDashoffset: `${2 * Math.PI * 42 * (1 - progress / 100)}`,
                                    }}
                                />
                            </svg>
                            <span className="progress-text">{Math.round(progress)}%</span>
                        </div>
                        <p className="upload-status">{status}</p>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <h3>Upload your PDF</h3>
                        {/* <p>Drag & drop or click to browse</p>
                        <span className="upload-hint">PDF files only, max 50 MB</span> */}
                    </div>
                )}
            </div>

            {error && (
                <div className="upload-error animate-fade-in" id="upload-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
}
