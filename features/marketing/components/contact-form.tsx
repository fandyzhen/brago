"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";

import { FormShell } from "@/features/forms/components/form-shell";
import {
  FormTextareaField,
  FormTextField,
} from "@/features/forms/components/form-text-field";
import { ContactInput, contactSchema } from "@/features/marketing/schemas";

export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      message: "",
    },
  });

  async function onSubmit(values: ContactInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, locale }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setSuccess(true);
      form.reset();
    } catch {
      setError(t("form.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="relative z-20 flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t("form.submitSuccess")}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("form.successHint")}
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-8 text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            {t("form.sendAnother")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <FormShell<ContactInput>
      form={form}
      title={t("title")}
      description={t("description")}
      onSubmit={onSubmit}
      submitText={t("form.submitButton")}
      submitLoadingText={t("form.submitting")}
      isLoading={isSubmitting}
      error={error}
      className="relative z-20"
      headerSlot={null}
      footer={null}
    >
      <FormTextField
        control={form.control}
        name="name"
        label={t("form.nameLabel")}
        placeholder={t("form.namePlaceholder")}
        autoComplete="name"
      />
      <FormTextField
        control={form.control}
        name="email"
        type="email"
        label={t("form.emailLabel")}
        placeholder={t("form.emailPlaceholder")}
        autoComplete="email"
      />
      <FormTextField
        control={form.control}
        name="company"
        label={t("form.companyLabel")}
        placeholder={t("form.companyPlaceholder")}
        autoComplete="organization"
      />
      <FormTextareaField
        control={form.control}
        name="message"
        label={t("form.messageLabel")}
        placeholder={t("form.messagePlaceholder")}
        rows={5}
      />
    </FormShell>
  );
}
