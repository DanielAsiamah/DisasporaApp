'use strict';

function createBrowserLessonPlayer({ createAudio, resolveSource }) {
  let media = null;
  return {
    replace(source) {
      if (!source) {
        if (media) {
          media.pause();
          media.removeAttribute('src');
          media.load();
        }
        return;
      }
      if (!media) media = createAudio();
      media.src = resolveSource(source);
      media.load();
    },
    // Return the browser promise so the controller can handle interrupted playback.
    play() { return media?.play(); },
    pause() { media?.pause(); },
    set playbackRate(value) { if (media) media.playbackRate = value; },
    set shouldCorrectPitch(value) { if (media) media.preservesPitch = value; },
  };
}

module.exports = { createBrowserLessonPlayer };
