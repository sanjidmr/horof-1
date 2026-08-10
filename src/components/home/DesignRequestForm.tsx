'use client';

import { useRef, useState, useTransition, useCallback } from 'react';
import { Upload, X, Check, File, Loader2, AlertCircle } from 'lucide-react';
import { submitDesignRequest } from '@/lib/actions/design-requests';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf', '.ai', '.psd', '.eps', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.7z', '.rar', '.tif', '.tiff', '.bmp', '.ico'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface FileEntry {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export function DesignRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newEntries: FileEntry[] = [];
    const existingNames = new Set(files.map((f) => f.file.name));

    for (const file of Array.from(incoming)) {
      if (existingNames.has(file.name)) {
        toast.error(`${file.name} is already added`);
        continue;
      }

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) {
        toast.error(`${file.name}: Unsupported file type`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: Exceeds 50MB limit`);
        continue;
      }

      newEntries.push({ id: crypto.randomUUID(), file, status: 'pending' });
    }

    if (newEntries.length > 0) setFiles((prev) => [...prev, ...newEntries]);
  }, [files]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    if (e.currentTarget === dropZoneRef.current) setIsDragOver(false);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    e.target.value = '';
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);

    const fullName = fd.get('full_name') as string;
    const phoneNumber = fd.get('phone_number') as string;
    const email = fd.get('email') as string;
    const description = fd.get('description') as string;

    if (!fullName?.trim() || !phoneNumber?.trim() || !email?.trim() || !description?.trim()) {
      setErrorMsg('All required fields must be filled');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    if (files.length === 0) {
      setErrorMsg('Please upload at least one design file');
      return;
    }

    setFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading' as const })));

    files.forEach((entry, i) => fd.append(`file_${i}`, entry.file));

    startTransition(async () => {
      const result = await submitDesignRequest(fd);

      if (result.success) {
        setSuccessMsg('Your design request has been submitted successfully! Our team will review it and get back to you soon.');
        setFiles([]);
        form.reset();

        if (result.uploadErrors && result.uploadErrors.length > 0) {
          result.uploadErrors.forEach((err) => toast.error(err));
        }
      } else {
        setFiles((prev) => prev.map((f) => ({ ...f, status: 'error' as const, error: result.error })));
        setErrorMsg(result.error ?? 'Something went wrong. Please try again.');
      }
    });
  }

  function getFilePreview(file: File): string | null {
    if (file.type.startsWith('image/')) return URL.createObjectURL(file);
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#1a4731] p-2.5 rounded-xl">
          <Upload className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-display">Request Your Own Design</h2>
          <p className="text-xs text-slate-500">Fill in the details and upload your reference files</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-5 flex items-start gap-3 bg-[#D8F3DC] border border-[#95D5B2] rounded-xl px-4 py-3 transition-all">
          <Check className="w-5 h-5 text-[#1a4731] mt-0.5 shrink-0" />
          <p className="text-sm text-[#1a4731] font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 transition-all">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="full_name" className="text-xs font-bold text-slate-600 block mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="Enter your full name"
              className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#1a4731] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="phone_number" className="text-xs font-bold text-slate-600 block mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              required
              placeholder="Enter your phone number"
              className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#1a4731] transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="email" className="text-xs font-bold text-slate-600 block mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#1a4731] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="product_name" className="text-xs font-bold text-slate-600 block mb-1">Product Name</label>
            <input
              id="product_name"
              name="product_name"
              type="text"
              placeholder="e.g. Wooden Jewelry Box"
              className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#1a4731] transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="priority" className="text-xs font-bold text-slate-600 block mb-1">Priority</label>
          <select
            id="priority"
            name="priority"
            className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[#1a4731] transition-colors bg-white"
            defaultValue="normal"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="text-xs font-bold text-slate-600 block mb-1">
            Design Description / Requirements <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            placeholder="Describe your design idea, dimensions, materials, colors, and any other requirements..."
            className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#1a4731] transition-colors resize-y"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-2">Upload Reference Files</label>
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all',
              isDragOver
                ? 'border-[#1a4731] bg-[#1a4731]/5'
                : 'border-slate-200 hover:border-[#1a4731]/40 hover:bg-slate-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className={cn('w-8 h-8 mx-auto mb-2 transition-colors', isDragOver ? 'text-[#1a4731]' : 'text-slate-300')} />
            <p className="text-sm text-slate-600 font-medium">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF, AI, PSD, SVG, ZIP, DOCX, XLSX (max 50MB each)</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {files.map((entry) => {
                const preview = getFilePreview(entry.file);
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'relative group rounded-xl border overflow-hidden transition-all',
                      entry.status === 'error' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                    )}
                  >
                    {preview ? (
                      <div className="aspect-square relative">
                        <img src={preview} alt={entry.file.name} className="w-full h-full object-cover" />
                        {entry.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square flex flex-col items-center justify-center p-2">
                        <File className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-500 text-center leading-tight">
                          {entry.file.name.includes('.') ? entry.file.name.split('.').pop()?.toUpperCase() : 'FILE'}
                        </span>
                      </div>
                    )}
                    <div className="p-1.5">
                      <p className="text-[10px] text-slate-600 truncate">{entry.file.name}</p>
                      <p className="text-[9px] text-slate-400">
                        {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(entry.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {entry.status === 'error' && entry.error && (
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center p-2">
                        <p className="text-[10px] text-red-600 text-center font-medium">{entry.error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#1a4731] text-white h-12 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a4731]/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Submit Request
            </>
          )}
        </button>
      </form>
    </div>
  );
}
