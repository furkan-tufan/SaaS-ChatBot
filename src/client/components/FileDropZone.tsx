// src/pages/components/FileDropZone.tsx
import React, { useId, useRef, useState } from "react";

type FileDropZoneProps = {
  label: string;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  onFileRemove?: () => void | Promise<void>;
  removeButtonLabel?: string;
  allowedExtensions?: string[];
};

const FileDropZone: React.FC<FileDropZoneProps> = ({
  label,
  file,
  setFile,
  onFileRemove,
  removeButtonLabel,
  allowedExtensions = [],
}) => {
  const uniqueId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const isValidFileType = (filename: string): boolean => {
    if (allowedExtensions.length === 0) return true;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return allowedExtensions.includes(ext);
  };

  const showInvalidAlert = () => {
    alert(
      `Geçersiz dosya türü. Desteklenen türler: ${allowedExtensions
        .join(", ")
        .toUpperCase()}`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFileType(selectedFile.name)) {
      setFile(selectedFile);
    } else {
      showInvalidAlert();
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (onFileRemove) void onFileRemove();
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDropHandler = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile && isValidFileType(droppedFile.name)) {
      setFile(droppedFile);
      if (inputRef.current) inputRef.current.value = "";
    } else {
      showInvalidAlert();
    }
  };

  const acceptAttr =
    allowedExtensions.length > 0
      ? allowedExtensions.map((ext) => `.${ext}`).join(",")
      : undefined;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={onDropHandler}
      className={[
        "w-full md:[width:calc(50%-8px)]",
        "h-52 md:h-[65vh]",
        "flex flex-col items-center justify-center",
        "rounded-2xl border-2 border-dashed transition",
        "bg-white/85 text-slate-600",
        "dark:bg-slate-800/60 dark:text-slate-300",
        "border-slate-300 hover:border-indigo-400",
        "dark:border-slate-600 dark:hover:border-indigo-400",
        dragActive ? "ring-2 ring-indigo-400" : "",
        "shadow-sm p-6",
      ].join(" ")}
    >
      {file ? (
        <>
          <div className="text-center">
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm md:text-base">
              {file.name}
            </div>
            <div className="mt-1 mb-3 text-xs md:text-sm text-slate-500 dark:text-slate-400">
              {Math.round(file.size / 1024)} KB
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600
                       px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200
                       hover:bg-slate-50 dark:hover:bg-slate-700 transition
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4Z" />
            </svg>
            {removeButtonLabel || "Kapat"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-center text-sm md:text-base text-slate-600 dark:text-slate-300">
            {label}
          </p>

          <input
            id={`dropzone-file-input-${uniqueId}`}
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor={`dropzone-file-input-${uniqueId}`}>
            <span
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl
                         border border-indigo-500 text-indigo-600 dark:text-indigo-400
                         px-4 py-2 text-sm font-semibold transition
                         hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M5 20h14a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2Zm7-16a1 1 0 0 0-1 1v7.59l-2.3-2.3a1 1 0 1 0-1.4 1.42l4 4a1 1 0 0 0 1.4 0l4-4a1 1 0 0 0-1.4-1.42L13 12.6V5a1 1 0 0 0-1-1Z" />
              </svg>
              Dosya Yükle
            </span>
          </label>
        </>
      )}
    </div>
  );
};

export default FileDropZone;
