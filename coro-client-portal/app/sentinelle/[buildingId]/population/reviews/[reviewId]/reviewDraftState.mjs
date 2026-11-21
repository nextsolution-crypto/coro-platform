export function shouldReplaceDraft({ background, dirty }) {
  return !background || !dirty;
}
