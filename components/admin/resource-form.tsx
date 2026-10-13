"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { saveRecord } from "@/lib/actions/admin";
import { iconNames, type Field, type ResourceKey } from "@/lib/admin/resources";
import type { IconData } from "@/components/site/icon-glyph";
import { IconPicker } from "./icon-picker";
import { GalleryField, ImageField } from "./image-fields";
import { YoutubeField } from "./youtube-field";

type Values = Record<string, unknown>;
type Option = { id: string; name: string };
type PickedIcon = { key: string; title: string; icon: IconData } | null;

function toDateInput(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : "";
}

function Control({
  field,
  value,
  invalid,
  partners,
  icon,
}: {
  field: Field;
  value: unknown;
  invalid: boolean;
  partners: Option[];
  icon: PickedIcon;
}) {
  const common = {
    id: field.name,
    name: field.name,
    "aria-invalid": invalid,
    "aria-describedby": `${field.name}-error ${field.name}-help`,
  };
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "textarea":
      return <Textarea {...common} rows={3} defaultValue={text} maxLength={field.max} />;
    case "markdown":
      return (
        <Textarea
          {...common}
          rows={14}
          defaultValue={text}
          className="font-mono text-[13px]"
        />
      );
    case "number":
      return (
        <Input
          {...common}
          type="number"
          defaultValue={typeof value === "number" ? value : 0}
          className="max-w-32"
        />
      );
    case "date":
      return (
        <Input
          {...common}
          type="date"
          defaultValue={toDateInput(value)}
          className="max-w-52"
        />
      );
    case "url":
      return (
        <Input {...common} type="url" placeholder="https://" defaultValue={text} />
      );
    case "slug":
      return (
        <Input
          {...common}
          defaultValue={text}
          placeholder="Generated from the title when left empty"
        />
      );
    case "icon":
      return (
        <Select {...common} defaultValue={text || iconNames[0]} className="max-w-52">
          {iconNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      );
    case "partner": {
      return (
        <Select {...common} defaultValue={text} className="max-w-sm">
          <option value="">No partner</option>
          {partners.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      );
    }
    case "select":
      return (
        <Select
          {...common}
          defaultValue={text || String(field.defaultValue ?? "")}
          className="max-w-sm"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case "brandicon":
      return <IconPicker name={field.name} initial={icon} />;
    case "youtube":
      return <YoutubeField {...common} defaultValue={text} />;
    case "image":
      return <ImageField name={field.name} defaultValue={text} />;
    case "gallery":
      return (
        <GalleryField
          name={field.name}
          defaultValue={Array.isArray(value) ? (value as string[]) : []}
        />
      );
    default:
      return (
        <Input {...common} defaultValue={text} required={field.required} maxLength={field.max} />
      );
  }
}

/**
 * The edit form for one content type. The fields come from the server page,
 * which always has the current definition, rather than from a lookup in the
 * browser bundle (an older bundle in an open tab may not know a newly added
 * content type).
 */
export function ResourceForm({
  resourceKey,
  fields,
  id,
  values,
  partners = [],
  icon = null,
  canPublish = true,
}: {
  resourceKey: ResourceKey;
  fields: Field[];
  id: string | null;
  values?: Values;
  partners?: Option[];
  icon?: PickedIcon;
  canPublish?: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(
    saveRecord.bind(null, resourceKey, id),
    undefined,
  );
  const errors = state?.errors ?? {};

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-lg border border-line bg-white p-6 sm:p-8"
    >
      {fields.map((field) => {
        const value = values?.[field.name];
        if (field.type === "checkbox") {
          const locked = field.name === "published" && !canPublish;
          const checked = locked
            ? value === true
            : typeof value === "boolean"
              ? value
              : field.defaultValue === true;
          return (
            <div key={field.name}>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={checked}
                  disabled={locked}
                  className="size-4 accent-brand"
                />
                {field.label}
              </label>
              {field.help && (
                <p className="ml-7 mt-1 text-xs text-muted">
                  {locked ? "Only an admin can publish or unpublish." : field.help}
                </p>
              )}
            </div>
          );
        }
        // Upload widgets and the icon picker label their own controls.
        const isUpload =
          field.type === "image" || field.type === "gallery" || field.type === "brandicon";
        return (
          <div key={field.name}>
            {isUpload ? (
              <p className="mb-1.5 text-sm font-medium">{field.label}</p>
            ) : (
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-brand"> *</span>}
              </Label>
            )}
            <Control
              field={field}
              value={value}
              invalid={!!errors[field.name]}
              partners={partners}
              icon={icon}
            />
            <p id={`${field.name}-help`} className="mt-1.5 text-xs text-muted">
              {field.type === "markdown"
                ? "Markdown is supported: # headings, **bold**, lists and links."
                : field.help}
            </p>
            <FieldError id={`${field.name}-error`} message={errors[field.name]} />
          </div>
        );
      })}

      {state?.message && (
        <p role="alert" className="text-sm text-brand">
          {state.message}
        </p>
      )}
      {/* Stays at the bottom of the screen on long forms, so Save is always in reach. */}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex gap-3 rounded-b-lg border-t border-line bg-white/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/admin/${resourceKey}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
