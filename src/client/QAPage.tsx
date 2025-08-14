// src/pages/QAPage.tsx
import React, { useEffect, useState } from "react";
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
    <div className="max-w-6xl mx-auto px-3 md:px-4 mt-8 mb-4 min-h-[calc(100vh-56px)] flex flex-col" >
      {/* Başlık */}
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
          Soru-Cevap
        </h1>
        <div className="w-14 h-1 bg-slate-900 dark:bg-slate-100 mx-auto rounded-md mt-3" />
      </div>

      {/* Açıklama */}
      <p className="text-center text-sm md:text-base text-slate-600 dark:text-slate-300 mb-6">
        Yüklediğiniz belgeye dayalı olarak sorular sorun.
      </p>

      {/* İki sütun */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 flex-1 min-h-0">
        {/* Sol: Dosya Yükleme */}
        <FileDropZone
          label="Soru sorulacak dosyayı yükleyin"
          file={file}
          setFile={setFile}
          removeButtonLabel="Konuşmayı Bitir"
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
                body: JSON.stringify({ hash, ended_button: true }),
              });

              if (response.ok) {
                setFile(null);
                localStorage.removeItem("qa_file_hash");
                setHash(null);
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
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

        {/* Sağ: Chatbot paneli */}
        <div
          className="w-full md:[width:calc(50%-8px)] flex flex-col
                     rounded-2xl border bg-white/90 dark:bg-slate-900/70
                     border-slate-200 dark:border-slate-700 shadow-md
                     h-auto md:h-[65vh] md:max-h-none max-h-[calc(100vh-240px)]"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatBot fileHash={hash} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QAPage;
