// src/components/FileDropZone.tsx
import React, { useId, useRef, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";

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
      // aynı dosyayı tekrar seçebilmek için input’u temizle
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
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={onDropHandler}
      sx={{
        p: 2,
        width: { xs: "100%", md: "calc(50% - 8px)" },
        height: { xs: 200, md: "65vh" },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        border: "2px dashed",
        borderColor: dragActive ? "primary.main" : "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
        color: "text.secondary",
        transition: "all 0.3s ease",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      {file ? (
        <>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            color="text.primary"
            textAlign="center"
            sx={{ fontSize: { xs: "14px", md: "16px" } }}
          >
            {file.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 1, mb: 2 }}
          >
            {Math.round(file.size / 1024)} KB
          </Typography>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleRemoveFile}
            startIcon={<HighlightOffIcon />}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textTransform: "none",
              lineHeight: 1,
              minHeight: "unset",
              py: 1,
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "#3f51b5",
                color: "#fff",
                borderColor: "#3f51b5",
              },
            }}
          >
            {removeButtonLabel || "Kapat"}
          </Button>
        </>
      ) : (
        <>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            textAlign="center"
            sx={{ mb: 2 }}
          >
            {label}
          </Typography>

          <input
            id={`dropzone-file-input-${uniqueId}`}
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <label htmlFor={`dropzone-file-input-${uniqueId}`}>
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFileIcon />}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textTransform: "none",
                lineHeight: 1,
                minHeight: "unset",
                py: 1,
                color: "primary.main",
                borderColor: "primary.main",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "#3f51b5",
                  color: "#fff",
                  borderColor: "#3f51b5",
                },
              }}
            >
              Dosya Yükle
            </Button>
          </label>
        </>
      )}
    </Box>
  );
};

export default FileDropZone;
