"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { LocaleLink } from "./locale-link";

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
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-8 md:px-8 md:pt-14 md:pb-10">
        {/* Two link columns, equal-weight on every viewport */}
        <div className="grid grid-cols-2 gap-8 md:max-w-md">
          <FooterColumn title={t("footer.product.title")} links={product} />
          <FooterColumn title={t("footer.legal.title")} links={legal} />
        </div>

        {/* Bottom credit line */}
        <div className="mt-10 border-t border-border pt-5 text-xs text-muted-foreground md:mt-12">
          {t("common.brand.copyright")} · {t("common.brand.allRightsReserved")}
        </div>
      </div>
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
