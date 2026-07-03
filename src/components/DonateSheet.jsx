import React, { useState } from 'react';
import { X, Copy, Check, Heart } from 'lucide-react';

// ---------------------------------------------------------------------------
// Crypto addresses
// ---------------------------------------------------------------------------
const CRYPTO = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#f7931a',
    address: 'bc1qzs7afv6jwfu2a8djljsrjv5xsdkmeuq6evdtll',
    note: null,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627eea',
    address: '0x9217F7d3D8133898B1243A6F6081fCB8C3CE6f0E',
    note: null,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    color: '#26a17b',
    address: '0x9217F7d3D8133898B1243A6F6081fCB8C3CE6f0E',
    note: 'ERC20',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    color: '#9945ff',
    address: '21349oyah63hRDpLhgShueZ2spPAF8LVVDSZkNUPP9vp',
    note: 'no memo required',
  },
];

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------
const STR = {
  ru: {
    title: 'Поддержать проект',
    subtitle: 'FreqMap — бесплатный инструмент для FPV пилотов. Если он тебе полезен, можешь поддержать разработку криптовалютой.',
    copy: 'Копировать',
    copied: 'Скопировано',
    network: 'Сеть',
    tg: 'Написать автору',
    close: 'Закрыть',
    warning: 'Отправляй только указанную монету на каждый адрес. Другие активы будут безвозвратно утеряны.',
  },
  en: {
    title: 'Support the project',
    subtitle: 'FreqMap is a free tool for FPV pilots. If you find it useful, you can support development with crypto.',
    copy: 'Copy',
    copied: 'Copied',
    network: 'Network',
    tg: 'Message the author',
    close: 'Close',
    warning: 'Send only the listed coin to each address. Other assets will be permanently lost.',
  },
  pl: {
    title: 'Wesprzyj projekt',
    subtitle: 'FreqMap to darmowe narzędzie dla pilotów FPV. Jeśli jest dla Ciebie przydatne, możesz wesprzeć rozwój kryptowalutą.',
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    network: 'Sieć',
    tg: 'Napisz do autora',
    close: 'Zamknij',
    warning: 'Wysyłaj tylko wymienioną monetę na każdy adres. Inne aktywa zostaną trwale utracone.',
  },
};

// ---------------------------------------------------------------------------
// CryptoCard
// ---------------------------------------------------------------------------
function CryptoCard({ coin, s }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(coin.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="donate-card">
      <div className="donate-card__header">
        <div className="donate-card__coin-info">
          <span className="donate-card__symbol" style={{ color: coin.color }}>
            {coin.symbol}
          </span>
          <span className="donate-card__name">{coin.name}</span>
          {coin.note && (
            <span className="donate-card__note">{coin.note}</span>
          )}
        </div>
      </div>
      <div className="donate-card__address-row">
        <span className="donate-card__address">{coin.address}</span>
        <button
          className={`donate-card__copy${copied ? ' donate-card__copy--done' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? s.copied : s.copy}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span>{copied ? s.copied : s.copy}</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DonateSheet
// ---------------------------------------------------------------------------
export default function DonateSheet({ lang = 'en', onClose }) {
  const s = STR[lang] ?? STR.en;

  return (
    <div className="profile-sheet" role="dialog" aria-modal="true" aria-label={s.title}>
      {/* Backdrop */}
      <div className="profile-sheet__backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="profile-sheet__panel">
        {/* Header */}
        <div className="profile-sheet__header">
          <div className="donate-sheet__title-row">
            <Heart size={18} color="var(--danger)" fill="var(--danger)" />
            <h2 className="donate-sheet__title">{s.title}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label={s.close}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="profile-sheet__body">
          <p className="donate-sheet__subtitle">{s.subtitle}</p>

          {/* Warning */}
          <div className="donate-warning">
            <span className="donate-warning__icon">!</span>
            <span>{s.warning}</span>
          </div>

          {/* Crypto cards */}
          <div className="donate-cards">
            {CRYPTO.map((coin) => (
              <CryptoCard key={coin.symbol} coin={coin} s={s} />
            ))}
          </div>

          {/* Telegram */}
          <a
            href="https://t.me/arduinomini"
            target="_blank"
            rel="noopener noreferrer"
            className="donate-tg-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.88 13.47l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.952l-.565-.063z"/>
            </svg>
            {s.tg} · @arduinomini
          </a>
        </div>
      </div>
    </div>
  );
}
