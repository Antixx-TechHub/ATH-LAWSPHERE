"use client";

import Link from "next/link";
import Image from "next/image";

const quickLinks = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
];

const socialLinks = [
  {
    label: "Website",
    href: "https://antixxtechhub.com/",
    icon: (
      <svg className="h-4 w-4" fill="#0EA5E9" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/antixx-techhub/posts/?feedView=all",
    icon: (
      <svg className="h-4 w-4" fill="#0A66C2" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Twitter",
    href: "https://twitter.com/antixx_techhub",
    icon: (
      <svg className="h-4 w-4" fill="#000000" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com/antixx.techhub",
    icon: (
      <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 text-neutral-600 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-700">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Links - Horizontal */}
          <div className="flex items-center gap-5">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-all hover:scale-110"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Logo - Left, Powered By & Copyright - Center */}
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Image
              src="/company_logo.svg"
              alt="Antixx TechHub"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          {/* Center: Powered By & Copyright */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              powered by <span className="font-bold text-[#1A365D] dark:text-cyan-400">Antixx TechHub Pvt. Ltd.</span>
            </p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
              © 2014-2025 Antixx TechHub Pvt. Ltd. – All Rights Reserved.
            </p>
          </div>
          {/* Spacer to balance the layout */}
          <div className="w-[120px] flex-shrink-0"></div>
        </div>
      </div>
    </footer>
  );
}
