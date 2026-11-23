import { Router } from "express";
import {
  GetEmailMessageParams,
  GetEmailMessageResponse,
  ListEmailMessagesQueryParams,
  ListEmailMessagesResponse,
  SendEmailBody,
  SendEmailResponse,
} from "@workspace/api-zod";
import { HttpError } from "../lib/errors";
import {
  buildRawEmail,
  extractBody,
  fetchInbox,
  getUncachableGmailClient,
  header,
  toEmailSummary,
} from "../lib/google-mail";

const router = Router();

router.get("/email/messages", async (req, res) => {
  const { maxResults } = ListEmailMessagesQueryParams.parse(req.query);
  const messages = await fetchInbox(maxResults);
  res.json(ListEmailMessagesResponse.parse(messages));
});

router.get("/email/messages/:messageId", async (req, res) => {
  const { messageId } = GetEmailMessageParams.parse(req.params);
  const gmail = await getUncachableGmailClient();
  const { data } = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  const summary = toEmailSummary(data);
  res.json(
    GetEmailMessageResponse.parse({
      ...summary,
      to: header(data.payload?.headers ?? undefined, "To"),
      body: extractBody(data.payload ?? undefined, summary.snippet),
    }),
  );
});

router.post("/email/send", async (req, res) => {
  const body = SendEmailBody.parse(req.body);
  const gmail = await getUncachableGmailClient();

  // When replying, thread the message properly using the original Message-ID.
  let inReplyTo: string | undefined;
  let references: string | undefined;
  if (body.inReplyTo) {
    const { data: original } = await gmail.users.messages.get({
      userId: "me",
      id: body.inReplyTo,
      format: "metadata",
      metadataHeaders: ["Message-ID", "References"],
    });
    const headers = original.payload?.headers ?? undefined;
    const messageIdHeader = header(headers, "Message-ID");
    if (messageIdHeader) {
      inReplyTo = messageIdHeader;
      references = [header(headers, "References"), messageIdHeader].filter(Boolean).join(" ");
    }
  }

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: buildRawEmail({ to: body.to, subject: body.subject, body: body.body, inReplyTo, references }),
      threadId: body.threadId,
    },
  });
  if (!data.id) throw new HttpError(502, "Gmail did not confirm the message", "upstream_error");
  res.json(SendEmailResponse.parse({ id: data.id, threadId: data.threadId ?? undefined }));
});

export default router;
