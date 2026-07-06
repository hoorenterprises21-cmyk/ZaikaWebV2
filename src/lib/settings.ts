import { Settings, PaymentMethodOption } from '../types';
import { api } from './api';

let settingsCache: Settings | null = null;
let methodsCache: PaymentMethodOption[] | null = null;

// Default settings used when API/DB is not connected
const DEFAULT_SETTINGS: Settings = {
  restaurant_name: 'Zaika Lounge',
  restaurant_tagline: 'Authentic Flavours, Modern Comfort',
  logo_url: '',
  primary_color: '#ea580c',
  contact_email: 'zaikalounge@gmail.com',
  contact_phone: '+91 7678311885',
  whatsapp_number: '917678311885',
  address: '334, Delhi Haridwar Road, Rampur Tiraha, Muzaffarnagar, Uttar Pradesh 251002',
  default_delivery_charge: '40.00',
  free_delivery_threshold: '499.00',
  tax_percent: '5.00',
  currency_code: 'INR',
  currency_symbol: '₹',
  min_order_value: '99.00',
  enable_razorpay: '0',
  razorpay_key_id: '',
  enable_upi: '1',
  upi_id: 'zaikalounge@upi',
  upi_payee_name: 'Zaika Lounge',
  enable_stripe: '0',
  enable_cod: '1',
  enable_whatsapp_order: '1',
  facebook_url: '',
  instagram_url: '',
  twitter_url: '',
  opening_hours: '11:00 AM - 11:00 PM',
  footer_text: '© 2026 Zaika Lounge. All rights reserved.',
  restaurant_is_closed: '0',
  restaurant_closed_message: 'We are closed for the day. We will be back tomorrow with fresh flavours and warm hospitality.',
};

function parseTimeValue(token: string): number | null {
  const match = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const suffix = match[3]?.toLowerCase();

  if (suffix === 'pm' && hours < 12) hours += 12;
  if (suffix === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function parseOpeningHours(value: string): { start: number; end: number } | null {
  if (!value) return null;
  const cleaned = value.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const [startPart, endPart] = cleaned.split('-');
  if (!startPart || !endPart) return null;

  const start = parseTimeValue(startPart.replace(/(?:\s*[·,].*)$/, '').trim());
  const end = parseTimeValue(endPart.replace(/(?:\s*[·,].*)$/, '').trim());
  if (start === null || end === null) return null;

  return { start, end };
}

export function getRestaurantStatus(settings: Settings, now = new Date()) {
  const closed = settings.restaurant_is_closed === '1';
  if (closed) {
    return {
      isOpen: false,
      label: 'Closed',
      message: settings.restaurant_closed_message || 'We are closed for the day. We will be back tomorrow with fresh flavours and warm hospitality.',
    };
  }

  const hours = parseOpeningHours(settings.opening_hours || '');
  if (!hours) {
    return {
      isOpen: true,
      label: 'Open now',
      message: 'We are currently open and ready to serve you.',
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = hours.start <= hours.end
    ? currentMinutes >= hours.start && currentMinutes < hours.end
    : currentMinutes >= hours.start || currentMinutes < hours.end;

  return {
    isOpen,
    label: isOpen ? 'Open now' : 'Closed',
    message: isOpen
      ? 'We are currently open and ready to serve you.'
      : settings.restaurant_closed_message || 'We are closed for the day. We will be back tomorrow with fresh flavours and warm hospitality.',
  };
}

export async function fetchSettings(force = false): Promise<Settings> {
  if (settingsCache && !force) return settingsCache;
  try {
    const { data } = await api.get('/settings.php');
    settingsCache = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
  } catch {
    settingsCache = DEFAULT_SETTINGS;
  }
  return settingsCache!;
}

export async function fetchPaymentMethods(force = false): Promise<PaymentMethodOption[]> {
  if (methodsCache && !force) return methodsCache;
  try {
    const { data } = await api.get('/payments.php?action=methods');
    methodsCache = data.methods;
  } catch {
    methodsCache = [
      { key: 'cod', label: 'Cash on Delivery', enabled: true, description: 'Pay with cash when your order arrives.' },
      { key: 'upi', label: 'UPI', enabled: true, upi_id: 'zaikalounge@upi', payee_name: 'Zaika Lounge', description: 'Pay via any UPI app.' },
      { key: 'whatsapp', label: 'Order via WhatsApp', enabled: true, description: 'Send your order as a WhatsApp message.' },
    ];
  }
  return methodsCache!;
}

export const CURRENCY = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';

export function money(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  const formatted = isNaN(n) ? '0.00' : n.toFixed(2);
  return `${CURRENCY}${formatted}`;
}

export function effectivePrice(p: {
  price: number | string;
  discount_price?: number | string | null;
}): number {
  const base = parseFloat(String(p.price));
  const discount = p.discount_price ? parseFloat(String(p.discount_price)) : 0;
  return discount > 0 && discount < base ? discount : base;
}
