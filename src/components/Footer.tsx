import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Instagram, Facebook, Twitter, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { fetchSettings, getRestaurantStatus } from '../lib/settings';
import type { Settings } from '../types';

export default function Footer() {
  const [clickCount, setClickCount] = useState(0);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (clickCount >= 5) { setShowAdminLink(true); setClickCount(0); }
  }, [clickCount]);

  useEffect(() => {
    let active = true;
    const syncSettings = () => {
      fetchSettings(true)
        .then((data) => { if (active) setSettings(data); })
        .catch(() => undefined);
    };
    syncSettings();
    const timer = window.setInterval(syncSettings, 30000);
    const clock = window.setInterval(() => setNow(Date.now()), 60000);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(clock); };
  }, []);

  const handleCopyrightClick = () => setClickCount(c => c + 1);
  const restaurantName = settings.restaurant_name || 'Zaika Lounge';
  const restaurantTagline = settings.restaurant_tagline || 'Authentic Indian Cuisine';
  const restaurantAddress = settings.address || '334, Delhi Haridwar Road, Rampur Tiraha, Muzaffarnagar, Uttar Pradesh 251002';
  const restaurantPhone = settings.contact_phone || '+91 7678311885';
  const restaurantEmail = settings.contact_email || 'zaikalounge@gmail.com';
  const restaurantHours = settings.opening_hours || '11:00 AM - 11:00 PM';
  const footerText = settings.footer_text || `© ${new Date().getFullYear()} ${restaurantName}. All rights reserved.`;
  const restaurantStatus = getRestaurantStatus(settings, new Date(now));
  const socialLinks = [
    { href: settings.instagram_url || '#', Icon: Instagram, label: 'Instagram' },
    { href: settings.facebook_url || '#', Icon: Facebook, label: 'Facebook' },
    { href: settings.twitter_url || '#', Icon: Twitter, label: 'Twitter' },
  ].filter((item) => item.href && item.href !== '#');

  return (
    <footer className="mt-16 bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-6">
        {/* Top grid */}
        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-brand-500 text-white font-black text-lg shadow-sm">
                {settings.logo_url ? <img src={settings.logo_url} alt={restaurantName} className="h-full w-full object-cover" /> : restaurantName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-black text-white">{restaurantName}</div>
                <div className="text-xs text-neutral-500">{restaurantTagline}</div>
              </div>
            </div>
            <div className={`mt-3 inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${restaurantStatus.isOpen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              <span className={`h-2 w-2 rounded-full ${restaurantStatus.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {restaurantStatus.label}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              {settings.restaurant_tagline || 'Experience the rich flavours of North India — from aromatic biryanis to succulent kebabs, crafted with passion in Muzaffarnagar.'}
            </p>
            {/* Social */}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socialLinks.map(({ href, Icon, label }) => (
                  <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full bg-neutral-800 text-neutral-400 transition-colors hover:bg-brand-500 hover:text-white">
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-200">Quick Links</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: '/', label: 'Home' },
                { to: '/menu', label: 'Our Menu' },
                { to: '/menu?category=2', label: 'Biryani' },
                { to: '/menu?category=5', label: 'Kebabs' },
                { to: '/menu?category=3', label: 'Curries' },
              ].map(({ to, label }) => (
                <li key={to}><Link to={to} className="transition-colors hover:text-brand-400">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-200">Account</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: '/login', label: 'Sign In / Register' },
                { to: '/orders', label: 'My Orders' },
                { to: '/wishlist', label: 'Wishlist' },
                { to: '/addresses', label: 'Saved Addresses' },
                { to: '/account', label: 'My Profile' },
              ].map(({ to, label }) => (
                <li key={to}><Link to={to} className="transition-colors hover:text-brand-400">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-200">Visit Us</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-400" />
                <span className="text-neutral-400 leading-relaxed">
                  {restaurantAddress.split('\n').map((line, index) => (
                    <span key={index} className="block">{line}</span>
                  ))}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={15} className="shrink-0 text-brand-400" />
                <a href={`tel:${restaurantPhone.replace(/[^0-9+]/g, '')}`} className="transition-colors hover:text-brand-400">{restaurantPhone}</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={15} className="shrink-0 text-brand-400" />
                <a href={`mailto:${restaurantEmail}`} className="transition-colors hover:text-brand-400">{restaurantEmail}</a>
              </li>
              <li className="flex items-center gap-3">
                <Clock size={15} className="shrink-0 text-brand-400" />
                <span className="text-neutral-400">{restaurantHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-neutral-800" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-3 pt-5 text-xs text-neutral-600 sm:flex-row">
          <button onClick={handleCopyrightClick} className="cursor-default select-none">
            {footerText}
          </button>

          <div className="flex items-center gap-4">
            <span>Made with ♥ in India</span>
            {showAdminLink && (
              <Link
                to="/admin/login"
                className="rounded-md bg-neutral-800 px-3 py-1 text-xs text-neutral-400 transition hover:text-brand-400"
                onClick={() => setShowAdminLink(false)}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
