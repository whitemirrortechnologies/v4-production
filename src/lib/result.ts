/** What a server action returns to the client: a message to toast, or an error. */
export type Result = { ok?: string; error?: string } | void | undefined;
