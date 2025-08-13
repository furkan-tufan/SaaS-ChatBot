// src/pages/QAPage.tsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Container, Card } from "@mui/material";
import FileDropZone from "./components/FileDropZone";
import ChatBot from "./components/ChatBot";

type HashResponse = { hash: string };

export const QAPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem("qa_file_hash");
    setHash(null);
  }, []);

  useEffect(() => {
    const handleFileUpload = async (): Promise<void> => {
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/hash", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Sunucu hatası!");
        const data: HashResponse = await response.json();
        localStorage.setItem("qa_file_hash", data.hash);
        setHash(data.hash);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Dosya yüklenemedi...", error);
        setHash(null);
      }
    };

    if (file) {
      setHash(null); // yeni dosyada eski hash’i sıfırla
      void handleFileUpload();
    }
  }, [file]);

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
          Soru-Cevap
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
        Yüklediğiniz belgeye dayalı olarak sorular sorun.
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          flex: 1,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Sol: Dosya Yükleme */}
        <FileDropZone
          label="Soru sorulacak dosyayı yükleyin"
          file={file}
          setFile={setFile}
          removeButtonLabel="Konuşmayı Bitir"
          // Summarizer’da test ettiğin görsel formatları da eklendi:
          allowedExtensions={["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png"]}
          onFileRemove={async (): Promise<void> => {
            if (!hash) {
              setFile(null);
              return;
            }
            try {
              const response = await fetch("/qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  hash,
                  ended_button: true,
                }),
              });

              if (response.ok) {
                setFile(null);
                localStorage.removeItem("qa_file_hash");
                setHash(null);
                setTimeout(() => {
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  });
                }, 150);
              } else {
                // eslint-disable-next-line no-console
                console.error("Sunucu başarısız yanıt verdi:", response.status);
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error("Konuşma bitirme isteği başarısız:", err);
            }
          }}
        />

        {/* Sağ: Chatbot */}
        <Card
          elevation={4}
          sx={{
            width: { xs: "100%", md: "calc(50% - 8px)" },
            height: { xs: "auto", md: "65vh" },
            maxHeight: { xs: "calc(100vh - 240px)", md: "none" },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <ChatBot fileHash={hash} />
        </Card>
      </Box>
    </Container>
  );
};

export default QAPage;
