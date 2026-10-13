import { searchIcons } from "@/lib/brand-icons";
import { getCurrentAdmin } from "@/lib/dal";
import { can } from "@/lib/permissions";

// Icon search for the social-link picker in /admin. The full catalog stays on
// the server; the browser only receives the matches it asks for.
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (!can(admin.role, "content.edit")) {
    return Response.json({ error: "No access." }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(
    { icons: searchIcons(q) },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
