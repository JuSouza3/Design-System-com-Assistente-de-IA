import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/custom/base/select"

const LanguageSelector = () => {
  const { t } = useTranslation()
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    const saved = localStorage.getItem("language");
    if (saved) {
      setLanguage(saved);
      i18n.changeLanguage(saved);
    }
  }, []);

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  return (
    <div className="mb-4">
      <label htmlFor="language-select" className="block text-sm font-medium text-foreground">
       {t('Selecione o Idioma')}
      </label>

      <Select
        value={language}
        onValueChange={(value) => changeLanguage(value)}
      >
        <SelectTrigger id="language-select" className="w-full mt-1" size='sm'>
          <SelectValue placeholder="Selecione o Idioma" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="es">{t('Español')}</SelectItem>
          <SelectItem value="en">{t('Inglês')}</SelectItem>
          <SelectItem value="pt">{t('Português')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
