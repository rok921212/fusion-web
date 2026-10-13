import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/ui";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C } from "@/lib/db/schema";
import { defaultSettings, type SiteSettings } from "@/lib/site";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Home page & settings" };

export default async function SettingsPage() {
  await requireAdmin("settings.manage");
  // Read directly rather than through the cached getSettings(), so the form
  // always shows what is stored.
  const db = await requestDb();
  const row = await db
    .collection<{ _id: string } & Partial<SiteSettings>>(C.settings)
    .findOne({ _id: "site" });
  const values: SiteSettings = { ...defaultSettings };
  if (row) {
    for (const key of Object.keys(values) as (keyof SiteSettings)[]) {
      if (typeof row[key] === typeof values[key]) {
        (values as Record<string, unknown>)[key] = row[key];
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Home page & settings"
        description="Hero buttons, announcement banner, home page sections, contact details, social links and search settings."
      />
      <SettingsForm values={values} />
    </>
  );
}
