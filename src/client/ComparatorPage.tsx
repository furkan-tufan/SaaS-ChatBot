import React, { useEffect, useState } from "react";
import FileDropZone from "./components/FileDropZone";
import { useAuth } from "wasp/client/auth";
import { spendCredit } from "wasp/client/operations";

/* ---------- Types ---------- */
type CompareDiffResult = string[];

type LLMOnlyItem = { section: string; describe_diff: string };
type LLMOnlyResult = { result: LLMOnlyItem[] };

type LLMDiffItem = { section: string; diff_summary: string; old: string; new: string };
type LLMDiffResult = { result: LLMDiffItem[] };

type DiffUnion = CompareDiffResult | LLMOnlyResult | LLMDiffResult;
type ApiResponse = { differences: DiffUnion };

export const ComparatorPage: React.FC = () => {
  const { data: user } = useAuth();

  const [localCredits, setLocalCredits] = useState<number>(0);
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const [diffResult, setDiffResult] = useState<DiffUnion | null>(null);
  const [isLLMResult, setIsLLMResult] = useState<boolean>(false);
  const [isLLMDiffResult, setIsLLMDiffResult] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setLocalCredits(Number(user?.credits ?? 0));
  }, [user?.credits]);

  // Dosya değişince eski sonuçları temizle
  useEffect(() => {
    setDiffResult(null);
  }, [file1, file2]);

  const beforeCallSpendCredit = async (): Promise<boolean> => {
    if (localCredits <= 0) {
      alert("Krediniz bitti. Lütfen paket satın alın veya kredilerinizi yenileyin");
      return false;
    }
    try {
      await spendCredit(); // sunucuda atomik düşer; yetki yoksa 401, kredi yoksa 402 fırlatır
      setLocalCredits((c) => Math.max(0, (c ?? 0) - 1)); // UI’da anında 1 azalt
      return true;
    } catch (e: any) {
      if (e?.status === 401) {
        alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        return false;
      }
      if (e?.status === 402) {
        setLocalCredits(0);
        alert("Krediniz bitti. Lütfen paket satın alın veya kredilerinizi yenileyin");
        return false;
      }
      console.error("Kredi hatası:", e);
      alert("Kredi kontrolü sırasında bir hata oluştu.");
      return false;
    }
  };

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    if (!(await beforeCallSpendCredit())) return;

    setIsLLMResult(false);
    setIsLLMDiffResult(false);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file1_content", file1);
    formData.append("file2_content", file2);
    formData.append("file1_name", file1.name);
    formData.append("file2_name", file2.name);

    try {
      const response = await fetch("/compare", { method: "POST", body: formData });

      if (!response.ok) throw new Error("Sunucu hatası!");
      const data: ApiResponse = await response.json();
      setDiffResult(data.differences);
    } catch (error) {
      console.error("Karşılaştırma hatası:", error);
      setDiffResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareWithLLM = async () => {
    if (!file1 || !file2) return;
    if (!(await beforeCallSpendCredit())) return;

    setIsLLMResult(true);
    setIsLLMDiffResult(false);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file1_content", file1);
    formData.append("file2_content", file2);
    formData.append("file1_name", file1.name);
    formData.append("file2_name", file2.name);

    try {
      const response = await fetch("/compare_llm", { method: "POST", body: formData });

      if (!response.ok) throw new Error("Sunucu hatası!");
      const data: ApiResponse = await response.json();
      setDiffResult(data.differences);
    } catch (error) {
      console.error("LLM karşılaştırma hatası:", error);
      setDiffResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareWithLLMDiff = async () => {
    if (!file1 || !file2) return;
    if (!(await beforeCallSpendCredit())) return;

    setIsLLMDiffResult(true);
    setIsLLMResult(false);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file1_content", file1);
    formData.append("file2_content", file2);
    formData.append("file1_name", file1.name);
    formData.append("file2_name", file2.name);

    try {
      const response = await fetch("/compare_llm_diff", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Sunucu hatası!");
      const data: ApiResponse = await response.json();
      setDiffResult(data.differences);
    } catch (error) {
      console.error("LLM + Karşılaştırma hatası:", error);
      setDiffResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-4 pt-7 pb-4 min-h-[calc(100vh-84px)] flex flex-col" >
      {/* Başlık */}
      <div className="text-center mb-2 md:mb-4">
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
          Dosya Karşılaştırma
        </h1>
        <div className="w-14 h-1 bg-slate-900 dark:bg-slate-100 mx-auto rounded-md mt-3" />
      </div>

      {/* Açıklama */}
      <p className="text-center text-sm md:text-base text-slate-600 dark:text-slate-300 mb-4 md:mb-6">
        Yalnızca PDF, DOC, DOCX, JPG, JPEG veya PNG dosyaları desteklenir. Yüklediğiniz iki dosyanın formatı aynı olmalıdır.
      </p>

      {/* Kredi Rozeti 
      <div className="text-center mb-4">
        <span className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs md:text-sm text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-900/60">
          Kalan Kredi: <strong className="ml-1">{localCredits}</strong>
        </span>
      </div>
      */}

      {/* Dosya Yükleme Alanları */}
      <div className="flex gap-2 flex-wrap">
        <FileDropZone
          label="İlk dosyayı sürükleyin veya yükleyin"
          file={file1}
          setFile={setFile1}
          allowedExtensions={["pdf", "doc", "docx", "jpg", "jpeg", "png"]}
        />
        <FileDropZone
          label="İkinci dosyayı sürükleyin veya yükleyin"
          file={file2}
          setFile={setFile2}
          allowedExtensions={["pdf", "doc", "docx", "jpg", "jpeg", "png"]}
        />
      </div>

      {/* Alt Butonlar */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleCompare}
          disabled={!file1 || !file2 || isLoading}
          className="inline-flex items-center justify-center rounded-xl
                     bg-indigo-600 px-4 md:px-6 py-2.5 text-sm md:text-base font-semibold text-white
                     hover:bg-indigo-700 transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                     disabled:opacity-50 disabled:pointer-events-none"
        >
          Dosyaları Karşılaştır
        </button>
        <button
          type="button"
          onClick={handleCompareWithLLM}
          disabled={!file1 || !file2 || isLoading}
          className="inline-flex items-center justify-center rounded-xl
                     bg-cyan-500 px-4 md:px-6 py-2.5 text-sm md:text-base font-semibold text-slate-900
                     hover:bg-cyan-600 transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                     disabled:opacity-50 disabled:pointer-events-none"
        >
          LLM Sonucu
        </button>
        <button
          type="button"
          onClick={handleCompareWithLLMDiff}
          disabled={!file1 || !file2 || isLoading}
          className="inline-flex items-center justify-center rounded-xl
                     bg-green-600 px-4 md:px-6 py-2.5 text-sm md:text-base font-semibold text-white
                     hover:bg-green-700 transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600
                     disabled:opacity-50 disabled:pointer-events-none"
        >
          LLM + Karşılaştırma
        </button>
      </div>

      {/* Sonuç Paneli */}
      {diffResult && (
        <div
          className="mt-6 rounded-2xl border bg-white/90 dark:bg-slate-900/70
                     border-slate-200 dark:border-slate-700 shadow-md p-6"
        >
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {isLLMDiffResult ? "LLM + Karşılaştırma Sonucu" : isLLMResult ? "LLM Sonucu" : "Karşılaştırma Sonucu"}
          </h2>

          {isLoading ? (
            <div className="text-center py-6">
              <div className="mx-auto h-6 w-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
            </div>
          ) : isLLMDiffResult ? (
            (() => {
              const res = diffResult as LLMDiffResult | null;
              if (!res?.result) return <p className="text-slate-500">LLM + Karşılaştırma sonucu alınamadı.</p>;

              return (
                <div>
                  {res.result.map((item, index) => (
                    <div
                      key={index}
                      className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700
                                 bg-white/90 dark:bg-slate-900/60 p-4"
                    >
                      <div className="text-base md:text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                        {item.section}
                      </div>

                      <p className="mb-3 text-sm md:text-base text-slate-800 dark:text-slate-200">
                        {item.diff_summary}
                      </p>

                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Eski Metin:</div>
                          <pre
                            className="whitespace-pre-wrap text-sm font-mono rounded-lg p-2
                                       bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200"
                          >
                            {item.old}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Yeni Metin:</div>
                          <pre
                            className="whitespace-pre-wrap text-sm font-mono rounded-lg p-2
                                       bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200"
                          >
                            {item.new}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : isLLMResult ? (
            (() => {
              const res = diffResult as LLMOnlyResult | null;
              if (!res?.result) return <p className="text-slate-500">LLM sonucu alınamadı.</p>;

              return (
                <div>
                  {res.result.map((item, index) => (
                    <div
                      key={index}
                      className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700
                                 bg-white/90 dark:bg-slate-900/60 p-4"
                    >
                      <div className="text-base md:text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                        {item.section}
                      </div>
                      <p className="text-sm md:text-base text-slate-800 dark:text-slate-200">{item.describe_diff}</p>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            // Basit metin diff'i
            <div>
              {(diffResult as CompareDiffResult).map((line, index) => {
                let wrapperClass =
                  "flex items-center rounded-md mb-1 px-2 py-1 text-sm md:text-base font-mono whitespace-pre-wrap";
                let icon: React.ReactNode = null;
                let text = line;
                let extraClass = "text-slate-800 dark:text-slate-200";

                if (line.startsWith("+++")) {
                  extraClass = "bg-green-50 text-slate-900 dark:bg-green-900/30 dark:text-green-100";
                } else if (line.startsWith("---")) {
                  extraClass = "bg-red-50 text-slate-900 dark:bg-red-900/30 dark:text-red-100";
                } else if (line.startsWith("+") && !line.startsWith("+++")) {
                  extraClass = "bg-green-50 text-slate-900 dark:bg-green-900/30 dark:text-green-100";
                  text = line.substring(1);
                  icon = (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 mr-1.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" className="text-green-600 dark:text-green-400" />
                      <path d="M8 12h8M12 8v8" className="text-green-600 dark:text-green-400" />
                    </svg>
                  );
                } else if (line.startsWith("-") && !line.startsWith("---")) {
                  extraClass = "bg-red-50 text-slate-900 dark:bg-red-900/30 dark:text-red-100";
                  text = line.substring(1);
                  icon = (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 mr-1.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" className="text-red-600 dark:text-red-400" />
                      <path d="M8 12h8" className="text-red-600 dark:text-red-400" />
                    </svg>
                  );
                }

                return (
                  <div key={index} className={`${wrapperClass} ${extraClass}`}>
                    {icon}
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
};

export default ComparatorPage;

/* ---------- Ek Component: ScrollToTopButton (aynı dosyada) ---------- */
const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Yukarı çık"
      className={[
        "fixed bottom-8 right-8 z-[1000]",
        "h-12 w-12 rounded-full shadow-lg",
        "bg-indigo-600 text-white hover:bg-indigo-700",
        "flex items-center justify-center",
        "transition-opacity",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 4l-7 7h4v9h6v-9h4z" />
      </svg>
    </button>
  );
};
