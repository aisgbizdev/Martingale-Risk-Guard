import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Language = "id" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (id: string, en: string) => string;
  languageStorageAvailable: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id");
  const [isHydrated, setIsHydrated] = useState(false);
  const [languageStorageAvailable, setLanguageStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("language") as Language;
      if (stored === "id" || stored === "en") setLanguageState(stored);
    } catch { setLanguageStorageAvailable(false); }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      try { localStorage.setItem("language", language); }
      catch { setLanguageStorageAvailable(false); }
    }
  }, [language, isHydrated]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (id: string, en: string) => (language === "id" ? id : en);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageStorageAvailable }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
