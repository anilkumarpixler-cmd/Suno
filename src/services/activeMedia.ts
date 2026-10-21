/** One sound at a time in Suno (story, voice preview, recording): whoever starts stops the previous one. */
let activeStop: (() => void) | null = null;

/** `stop` must be a stable function: the same one is passed to `releaseMedia`. */
export const claimMedia = (stop: () => void) => {
  const previous = activeStop;
  activeStop = stop;
  if (previous && previous !== stop) previous();
};

export const releaseMedia = (stop: () => void) => {
  if (activeStop === stop) activeStop = null;
};
