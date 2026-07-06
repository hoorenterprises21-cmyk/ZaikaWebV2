import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

const DEFAULT_NUMBER = '917678311885';
const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || DEFAULT_NUMBER;

interface Props { context?: 'general' | 'support'; orderText?: string; }

export default function WhatsAppButton({ context = 'general', orderText }: Props) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(WA_NUMBER);

  useEffect(() => {
    // Try to get number from settings API, fallback to env
    fetch(`${API_BASE_URL}/settings.php`)
      .then(r => r.json())
      .then(d => { if (d?.settings?.whatsapp_number) setNumber(d.settings.whatsapp_number); })
      .catch(() => {});
  }, []);

  const text = orderText || (context === 'support'
    ? 'Hi Zaika Lounge! I need help with my order.'
    : 'Hi Zaika Lounge! I would like to place an order. 🍽️');

  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="fade-in w-72 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/8">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#128C7E] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                <WhatsAppIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Zaika Lounge</p>
                <p className="text-[10px] text-white/80">Typically replies instantly</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>
          {/* Chat bubble */}
          <div className="bg-[#e5ddd5] p-4">
            <div className="max-w-xs rounded-2xl rounded-tl-none bg-white px-4 py-3 shadow-sm">
              <p className="text-xs leading-relaxed text-neutral-800">
                👋 Hello! Welcome to <strong>Zaika Lounge</strong>.<br /><br />
                Chat with us to place an order, ask about our menu, or get support. We're happy to help!
              </p>
              <p className="mt-1.5 text-right text-[10px] text-neutral-400">11:00 AM</p>
            </div>
          </div>
          {/* CTA */}
          <div className="bg-white p-3">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition hover:bg-[#20b95a]"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Start Chat
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Chat on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-green-500/30 transition-all hover:scale-110 active:scale-95"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </button>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37s-1.05 1.03-1.05 2.5 1.08 2.9 1.23 3.1c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/>
      <path d="M12.02 2C6.49 2 2 6.49 2 12.02c0 1.77.46 3.46 1.34 4.95L2 22l5.16-1.35a9.93 9.93 0 0 0 4.86 1.27h.01c5.52 0 10.02-4.49 10.02-10.02C22.05 6.49 17.55 2 12.02 2zm0 18.15c-1.53 0-3.04-.41-4.34-1.19l-.31-.18-3.21.84.86-3.13-.2-.32a8.13 8.13 0 0 1-1.25-4.34c0-4.51 3.67-8.18 8.18-8.18 2.18 0 4.24.85 5.78 2.39a8.12 8.12 0 0 1 2.39 5.79c0 4.51-3.67 8.18-8.18 8.18z"/>
    </svg>
  );
}
