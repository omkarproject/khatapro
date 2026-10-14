'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Globe2,
  Coins,
  Sparkles,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_CURRENCIES,
  getActiveLanguage,
  setActiveLanguage,
  getActiveCurrency,
  setActiveCurrency,
  LanguageOption,
  CurrencyOption,
} from '@/lib/i18n';
import { useApp } from '@/context/AppContext';

interface CurrencyLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'language' | 'currency';
}

export default function CurrencyLanguageModal({
  isOpen,
  onClose,
  defaultTab = 'language',
}: CurrencyLanguageModalProps) {
  const { addToast, currentUser, profile, setProfile } = useApp();
  const [activeTab, setActiveTab] = useState<'language' | 'currency'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(() => getActiveLanguage());
  const [selectedCurr, setSelectedCurr] = useState<CurrencyOption>(() => getActiveCurrency());

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSearchQuery('');
      setSelectedLang(getActiveLanguage());
      setSelectedCurr(getActiveCurrency());
    }
  }, [isOpen, defaultTab]);

  // Filtered Languages
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.searchTerms.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered Currencies
  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.searchTerms.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectLanguage = (lang: LanguageOption) => {
    setSelectedLang(lang);
    setActiveLanguage(lang.code);

    // Update profile in state
    if (profile) {
      setProfile({
        ...profile,
        language: lang.code,
      });
    }

    addToast(
      'Language Updated',
      `Interface language set to ${lang.nativeName} (${lang.name}).`,
      'success'
    );
  };

  const handleSelectCurrency = (curr: CurrencyOption) => {
    setSelectedCurr(curr);
    setActiveCurrency(curr.code);

    // Update profile in state
    if (profile) {
      setProfile({
        ...profile,
        currency: curr.code,
        currencySymbol: curr.symbol,
      });
    }

    addToast(
      'Currency Updated',
      `Default monetary unit set to ${curr.name} (${curr.symbol}). All ledgers and reports will format accordingly.`,
      'success'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-md">
              {activeTab === 'language' ? <Globe2 className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {activeTab === 'language' ? 'Select Preferred Language' : 'Select Business Currency'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'language'
                  ? 'Choose your native or regional Indian language'
                  : 'Choose between Rupee (₹), Dollar ($), Euro (€), or global currencies'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-3 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('language');
              setSearchQuery('');
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'language'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>Language ({selectedLang.nativeName})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('currency');
              setSearchQuery('');
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'currency'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Currency ({selectedCurr.symbol} {selectedCurr.code})</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'language'
                  ? 'Search language (e.g. Hindi, Gujarati, Marathi, Tamil...)'
                  : 'Search currency (e.g. Rupee, Dollar, Euro, Dirham...)'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Options List Container */}
        <div className="p-4 pt-1 flex-1 overflow-y-auto space-y-2">
          
          {/* TAB 1: LANGUAGES */}
          {activeTab === 'language' && (
            <>
              {filteredLanguages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No languages matching "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredLanguages.map((lang) => {
                    const isSelected = selectedLang.code === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLanguage(lang)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {lang.nativeName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="font-medium">{lang.name}</span>
                            <span>&bull;</span>
                            <span className="truncate">{lang.region}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: CURRENCIES */}
          {activeTab === 'currency' && (
            <>
              {filteredCurrencies.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No currencies matching "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredCurrencies.map((curr) => {
                    const isSelected = selectedCurr.code === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => handleSelectCurrency(curr)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{curr.flag}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {curr.symbol} {curr.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {curr.name}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Changes apply immediately across all modules.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
