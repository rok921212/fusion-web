import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Empty, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { deleteMessage, setMessageRead } from "@/lib/actions/admin";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C, plain, type Message } from "@/lib/db/schema";
import { cn, formatDate } from "@/lib/utils";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireAdmin("messages.read");
  const db = await requestDb();
  const rows = (
    await db.collection(C.messages).find({}).sort({ createdAt: -1 }).limit(200).toArray()
  ).map((doc) => plain<Message>(doc));

  return (
    <>
      <PageHeader title="Messages" description="Sent through the contact form. The newest 200 are shown." />
      {rows.length === 0 ? (
        <Empty>Messages sent through the contact form will appear here.</Empty>
      ) : (
        <ul className="space-y-4">
          {rows.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-lg border border-line bg-white p-6",
                !message.read && "border-l-4 border-l-brand",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{message.subject || "No subject"}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {message.name} ·{" "}
                    <a href={`mailto:${message.email}`} className="text-brand hover:underline">
                      {message.email}
                    </a>{" "}
                    · {formatDate(message.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <form action={setMessageRead.bind(null, message.id, !message.read)}>
                    <Button type="submit" variant="outline" size="sm">
                      {message.read ? "Mark unread" : "Mark read"}
                    </Button>
                  </form>
                  <form action={deleteMessage.bind(null, message.id)}>
                    <ConfirmButton
                      message="Delete this message? This cannot be undone."
                      aria-label="Delete message"
                    >
                      <Trash2 />
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-ink-soft">{message.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
