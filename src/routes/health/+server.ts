import { json, type RequestHandler } from "@sveltejs/kit";

export const prerender = false;

export const GET: RequestHandler = () => {
  return json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
};
