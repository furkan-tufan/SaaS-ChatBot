import React, { useState, useId } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";

type SummaryResponse = { summary: string };

export const SummarizerPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);

  /* ---------- Dahili FileDropZone ---------- */
  const FileDropZone: React.FC<{
    label: string;
    allowedExtensions?: string[];
  }> = ({ label, allowedExtensions = [] }) => {
    const uniqueId = useId();
    const [dragActive, setDragActive] = useState<boolean>(false);

    const isValidFileType = (filename: string): boolean => {
      if (allowedExtensions.length === 0) return true;
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      return allowedExtensions.includes(ext);
    };

    const handleFileChange = (
      e: React.ChangeEvent<HTMLInputElement>
    ): void => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile && isValidFileType(selectedFile.name)) {
        setFile(selectedFile);
      } else {
        alert(
          `Geçersiz dosya türü. Desteklenen türler: ${allowedExtensions
            .join(", ")
            .toUpperCase()}`
        );
      }
    };

    const handleRemoveFile = (): void => {
      setFile(null);
      setSummaryResult(null);
    };

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
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const droppedFile = e.dataTransfer.files?.[0];
          if (droppedFile && isValidFileType(droppedFile.name)) {
            setFile(droppedFile);
          } else {
            alert(
              `Geçersiz dosya türü. Desteklenen türler: ${allowedExtensions
                .join(", ")
                .toUpperCase()}`
            );
          }
        }}
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
              sx={{
                fontSize: { xs: "14px", md: "16px" },
              }}
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
              onClick={handleRemoveFile}
              startIcon={<HighlightOffIcon />}
              sx={{
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
              Kapat
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
              type="file"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <label htmlFor={`dropzone-file-input-${uniqueId}`}>
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadFileIcon />}
                sx={{
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
  /* ---------- /Dahili FileDropZone ---------- */

  const handleSummarize = async (): Promise<void> => {
    if (!file) {
      alert("Lütfen bir dosya seçin.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await fetch("/analyze", { method: "POST", body: formData });

      if (!response.ok) throw new Error("Sunucu hatası!");
      const data: SummaryResponse = await response.json();
      setSummaryResult(data);
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 150);
    } catch (error) {
      console.error("Özetleme hatası:", error);
      alert("Özet çıkarma başarısız oldu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{
        px: 1,
        py: 2,
        minHeight: { xs: "calc(100vh - 56px)", md: "auto" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            mb: 1,
            fontSize: { xs: "24px", md: "34px" },
          }}
        >
          Dosya Özet Çıkartma
        </Typography>
        <Box
          sx={{
            width: "60px",
            height: "4px",
            backgroundColor: "text.primary",
            margin: "0 auto",
            borderRadius: 2,
          }}
        />
      </Box>

      <Typography
        variant="body1"
        sx={{
          textAlign: "center",
          color: "text.secondary",
          mb: 2,
          fontSize: { xs: "14px", md: "16px" },
        }}
      >
        Belgenizin içeriğini otomatik olarak özetleyin. PDF, DOC, DOCX, JPG,
        JPEG veya PNG formatındaki bir dosya yükleyin.
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          flex: 1,
          minHeight: 0,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Sol taraf */}
        <FileDropZone
          label="Özetlenecek dosyayı bırakın veya yükleyin"
          allowedExtensions={["pdf", "doc", "docx", "jpg", "jpeg", "png"]}
        />

        {/* Sağ taraf */}
        <Card
          elevation={4}
          sx={{
            display: "flex",
            flexDirection: "column",
            width: { xs: "100%", md: "calc(50% - 8px)" },
            flex: { xs: 1, md: "unset" },
            minHeight: { xs: 0, md: "unset" },
            height: { xs: "auto", md: "65vh" },
            maxHeight: { xs: "calc(100vh - 240px)", md: "none" },
            borderRadius: 3,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            backgroundImage: "none",
            p: 3,
          }}
        >
          {!summaryResult ? (
            <Box
              sx={{ display: "flex", flexDirection: "column", mt: "auto" }}
            >
              <Button
                variant="contained"
                onClick={handleSummarize}
                disabled={!file || loading}
                sx={{
                  backgroundColor: "#3f51b5",
                  color: "#fff",
                  fontWeight: "bold",
                  px: 4,
                  py: 1.2,
                  mt: 2,
                  "&:hover": {
                    backgroundColor: "#303f9f",
                  },
                }}
              >
                {loading ? "Özetleniyor..." : "Özet Çıkart"}
              </Button>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  overflowY: "auto",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Özet:
                </Typography>

                <Box
                  sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    mb: 2,
                    pr: 1,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: "pre-wrap",
                      fontSize: { xs: "14px", md: "16px" },
                    }}
                  >
                    {summaryResult.summary}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Card>
      </Box>
    </Container>
  );
};

export default SummarizerPage;
