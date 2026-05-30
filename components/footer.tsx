"use client";
import React from "react";
import { Logo } from "./Logo";
import { useTranslations } from "next-intl";
import { LocaleLink } from "./locale-link";
import { NewsletterInline } from "./newsletter-inline";

export const Footer = () => {
  const t = useTranslations();

  const product = [
    { name: t("navigation.main.industries"), href: "/industries" },
    { name: t("navigation.main.templates"), href: "/templates" },
    { name: t("navigation.main.pricing"), href: "/pricing" },
    { name: t("navigation.main.contact"), href: "/contact" },
  ];
  const legal = [
    { name: t("navigation.footer.legal.terms"), href: "/terms" },
    { name: t("navigation.footer.legal.privacy"), href: "/privacy" },
    { name: t("navigation.footer.legal.cookies"), href: "/cookies" },
    { name: t("navigation.footer.legal.refund"), href: "/refund" },
  ];

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-12 md:px-8 md:pt-20 md:pb-32">
        {/* Mobile: stacked. Desktop: brand left, link columns right. */}
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-16">
          {/* Brand block */}
          <div className="grid gap-4">
            <Logo />
            <div className="text-sm text-muted-foreground">
              <div>{t("common.brand.copyright")}</div>
              <div className="mt-0.5">{t("common.brand.allRightsReserved")}</div>
            </div>
            <div className="max-w-xs">
              <NewsletterInline />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-12">
            <FooterColumn title={t("footer.product.title")} links={product} />
            <FooterColumn title={t("footer.legal.title")} links={legal} />
            <div className="col-span-2 grid gap-3 md:col-span-1">
              <div className="text-xs font-bold uppercase tracking-wide text-foreground">
                {t("footer.social.title")}
              </div>
              <a
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                href="https://x.com/bragoapp"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter / X
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Giant brand wash — desktop only. On mobile it's distracting and adds dead space. */}
      <p className="hidden bg-gradient-to-b from-muted to-border bg-clip-text text-center text-9xl font-bold text-transparent md:block lg:text-[18rem]">
        BRAGO
      </p>
    </footer>
  );
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string }[];
}) {
  return (
    <div className="grid gap-3">
      <div className="text-xs font-bold uppercase tracking-wide text-foreground">
        {title}
      </div>
      {links.map((link) => (
        <LocaleLink
          key={link.name}
          href={link.href}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.name}
        </LocaleLink>
      ))}
    </div>
  );
}
