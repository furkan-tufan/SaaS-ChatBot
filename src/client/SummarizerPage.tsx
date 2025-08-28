import React, { useEffect, useState } from "react";
import FileDropZone from "./components/FileDropZone";
import { useAuth } from "wasp/client/auth";
import { spendCredit } from "wasp/client/operations";

type SummaryResponse = { summary: string };

export const SummarizerPage: React.FC = () => {
  const { data: user } = useAuth();

  // UI'da anında güncellemek için lokal kredi state'i
  const [localCredits, setLocalCredits] = useState<number>(0);

  const [file, setFile] = useState<File | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Kullanıcı değiştikçe kredi state’ini senkronize et
  useEffect(() => {
    setLocalCredits(Number(user?.credits ?? 0));
  }, [user?.credits]);

  // Yeni dosya seçildiğinde eski özeti temizle
  useEffect(() => {
    setSummaryResult(null);
  }, [file]);

  const handleSummarize = async (): Promise<void> => {
    if (!file) {
      alert("Lütfen bir dosya seçin.");
      return;
    }
    if (localCredits <= 0) {
      alert("Krediniz bitti. Lütfen paket satın alın veya kredilerinizi yenileyin.");
      return;
    }

    // 1) Sunucuda KREDİ HARCA (auth otomatik, kontrol server'da)
    try {
      await spendCredit(); // krediniz yoksa HttpError(402) fırlatır
    } catch (e: any) {
      if (e?.status === 401) {
        alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }
      if (e?.status === 402) {
        setLocalCredits(0);
        alert("Krediniz bitti. Özetleme yapılamadı.");
        return;
      }
      console.error("Kredi hatası:", e);
      alert("Kredi kontrolü sırasında hata oluştu.");
      return;
    }

    // 2) Harcama başarılıysa analize gönder
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await fetch("/analyze", { method: "POST", body: formData });

      if (!response.ok) throw new Error("Sunucu hatası!");

      const data: SummaryResponse = await response.json();
      setSummaryResult(data);

      // UI’da 1 azalt (server zaten düşürdü)
      setLocalCredits((c) => Math.max(0, (c ?? 0) - 1));

    } catch (error) {
      console.error("Özetleme hatası:", error);
      alert("Özet çıkarma başarısız oldu!");
      // Gerekirse upstream hatasında krediyi geri yükle,
      // setLocalCredits((c) => c + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-4 mt-8 mb-4 min-h-[calc(100vh-56px)] flex flex-col" >
      {/* Başlık */}
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
          Dosya Özet Çıkartma
        </h1>
        <div className="w-14 h-1 bg-slate-900 dark:bg-slate-100 mx-auto rounded-md mt-3" />
      </div>

      {/* Açıklama */}
      <p className="text-center text-sm md:text-base text-slate-600 dark:text-slate-300 mb-3">
        Belgenizin içeriğini otomatik olarak özetleyin. PDF, DOC, DOCX, JPG, JPEG veya PNG formatındaki bir dosya yükleyin.
      </p>

      {/* Kredi Rozeti
      <div className="text-center mb-6">
        <span className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs md:text-sm text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-900/60">
          Kalan Kredi: <strong className="ml-1">{localCredits}</strong>
        </span>
      </div>
       */}

      {/* İki sütun */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 flex-1 min-h-0">
        {/* Sol: FileDropZone (harici component) */}
        <FileDropZone
          label="Özetlenecek dosyayı sürükleyin veya yükleyin"
          file={file}
          setFile={setFile}
          allowedExtensions={["pdf", "doc", "docx", "jpg", "jpeg", "png"]}
          onFileRemove={() => setSummaryResult(null)}
        />

        {/* Sağ: Özet veya Buton */}
        <div
          className="w-full md:[width:calc(50%-8px)] flex flex-col
                     rounded-2xl border bg-white/90 dark:bg-slate-900/70
                     border-slate-200 dark:border-slate-700 shadow-md p-6
                     h-auto md:h-[65vh] md:max-h-none max-h-[calc(100vh-240px)]"
        >
          {!summaryResult ? (
            <div className="mt-auto">
              <button
                type="button"
                onClick={handleSummarize}
                disabled={!file || loading}
                className="inline-flex items-center justify-center rounded-xl
                           bg-indigo-600 px-6 py-3 font-semibold text-white
                           hover:bg-indigo-700 transition
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                           disabled:opacity-50 disabled:pointer-events-none"
                aria-live="polite"
              >
                {loading ? "Özetleniyor..." : "Özet Çıkart"}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Özet:
              </h2>
              <div className="flex-1 min-height-0 overflow-y-auto pr-1">
                <p className="whitespace-pre-wrap text-sm md:text-base text-slate-700 dark:text-slate-200">
                  {summaryResult.summary}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummarizerPage;
