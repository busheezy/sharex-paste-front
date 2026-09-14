import { fetchPaste } from "$lib/server/pastes";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, params }) => {
  const leftRequest = fetchPaste(params.left, fetch);
  const rightRequest = fetchPaste(params.right, fetch);
  const [leftPaste, rightPaste] = await Promise.all([leftRequest, rightRequest]);

  return {
    leftId: params.left,
    leftPaste,
    rightId: params.right,
    rightPaste,
  };
};
