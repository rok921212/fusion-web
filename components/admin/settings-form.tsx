"use client";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { saveSettings } from "@/lib/actions/admin";
import type { SectionKey, SiteSettings } from "@/lib/site";
import { ImageField } from "./image-fields";

type TextKey = Exclude<keyof SiteSettings, SectionKey>;

type FieldDef = {
  name: TextKey;
  label: string;
  kind?: "textarea" | "long" | "url" | "email";
  help?: string;
};

const sections: { name: SectionKey; label: string }[] = [
  { name: "showLive", label: "Live now (Website Links → Live now)" },
  { name: "showServices", label: "What we do (Services)" },
  { name: "showVideos", label: "Latest videos" },
  { name: "showPortfolio", label: "Selected work (featured portfolio)" },
  { name: "showNews", label: "Latest news" },
  { name: "showPartners", label: "Partner logos" },
];

const groups: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Home page hero",
    fields: [
      {
        name: "heroPrefix",
        label: "Headline (fixed part)",
        help: "Shown first, in large letters. For example: FUSION",
      },
      {
        name: "heroWords",
        kind: "textarea",
        label: "Headline (rotating words)",
        help: "One per line, up to eight. The first shows straight away; every 3 seconds it is deleted and the next one is typed with a glowing effect.",
      },
      { name: "heroPrimaryLabel", label: "Main button label" },
      {
        name: "heroPrimaryHref",
        label: "Main button link",
        help: "A page on this site such as /portfolio, or a full https:// URL.",
      },
      { name: "heroSecondaryLabel", label: "Second button label" },
      { name: "heroSecondaryHref", label: "Second button link" },
    ],
  },
  {
    title: "Announcement banner",
    fields: [
      {
        name: "announcement",
        label: "Banner text",
        help: "Shown in a bar at the top of every page. Leave empty to hide it.",
      },
      {
        name: "announcementHref",
        label: "Banner link",
        help: "Optional. A page such as /news or a full https:// URL.",
      },
    ],
  },
  {
    title: "Brand and search",
    fields: [
      { name: "siteName", label: "Site name" },
      {
        name: "tagline",
        label: "Tagline",
        help: "Used in the browser tab title, search results, link previews and the About page.",
      },
      {
        name: "description",
        kind: "textarea",
        label: "Description",
        help: "Shown under the headline and in Google results. Aim for 150 to 160 characters.",
      },
      {
        name: "stats",
        kind: "textarea",
        label: "Key numbers",
        help: "Up to four, one per line, written as: value | label. Example: 12 | Tournament wins",
      },
      {
        name: "about",
        kind: "long",
        label: "About page",
        help: "Markdown is supported.",
      },
    ],
  },
  {
    title: "Contact details",
    fields: [
      { name: "email", label: "Email", kind: "email" },
      { name: "phone", label: "Phone", help: "Include the country code, e.g. +977 …" },
      {
        name: "whatsapp",
        label: "WhatsApp",
        help: "A phone number with country code, or a wa.me link.",
      },
      { name: "address", label: "Address", kind: "textarea" },
    ],
  },
];

export function SettingsForm({ values }: { values: SiteSettings }) {
  const [state, onSubmit, pending] = useFormAction(saveSettings, undefined);
  const errors = state?.errors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <fieldset className="rounded-lg border border-line bg-white p-6 sm:p-8">
        <legend className="heading-display float-left mb-2 w-full text-2xl">
          Home page sections
        </legend>
        <p className="clear-both mb-4 text-sm text-muted">
          Choose which sections appear on the home page. Empty sections are
          hidden automatically.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map(({ name, label }) => (
            <label key={name} className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name={name}
                defaultChecked={values[name]}
                className="size-4 accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {groups.map((group) => (
        <fieldset
          key={group.title}
          className="space-y-5 rounded-lg border border-line bg-white p-6 sm:p-8"
        >
          <legend className="heading-display float-left mb-5 w-full text-2xl">
            {group.title}
          </legend>
          {group.fields.map(({ name, label, kind, help }) => {
            const common = {
              id: name,
              name,
              defaultValue: values[name],
              "aria-invalid": !!errors[name],
              "aria-describedby": `${name}-error ${name}-help`,
            };
            return (
              <div key={name} className="clear-both">
                <Label htmlFor={name}>{label}</Label>
                {kind === "textarea" || kind === "long" ? (
                  <Textarea {...common} rows={kind === "long" ? 12 : 3} />
                ) : (
                  <Input
                    {...common}
                    type={kind ?? "text"}
                    placeholder={kind === "url" ? "https://" : undefined}
                  />
                )}
                <p id={`${name}-help`} className="mt-1.5 text-xs text-muted">
                  {help}
                </p>
                <FieldError id={`${name}-error`} message={errors[name]} />
              </div>
            );
          })}
        </fieldset>
      ))}

      <fieldset className="rounded-lg border border-line bg-white p-6 sm:p-8">
        <legend className="heading-display float-left mb-5 w-full text-2xl">
          Sharing image
        </legend>
        <div className="clear-both">
          <ImageField name="ogImage" defaultValue={values.ogImage} />
          <p className="mt-1.5 text-xs text-muted">
            Shown when the site is shared on social media. 1200 × 630 works best.
            A branded image is generated automatically when this is empty.
          </p>
          <FieldError id="ogImage-error" message={errors.ogImage} />
        </div>
      </fieldset>

      {/* Stays at the bottom of the screen on this long form, so Save is always in reach. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-4 border-t border-line bg-mist/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state?.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={state.ok ? "text-sm font-medium text-green-700" : "text-sm text-brand"}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
