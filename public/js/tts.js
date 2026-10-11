window.TTS = (function () {
  const supported = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  let voice = null;

  function pickVoice() {
    if (!supported) return;
    const list = window.speechSynthesis.getVoices() || [];
    voice = list.find(function (v) { return /en[-_]US/i.test(v.lang); })
      || list.find(function (v) { return /^en/i.test(v.lang); })
      || null;
  }
  if (supported) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice; // Chrome 首次 getVoices() 为空
  }

  function speak(text) {
    if (!supported) { if (window.App) window.App.toast('当前浏览器不支持语音朗读'); return; }
    try {
      document.querySelectorAll('audio').forEach(function (audio) { if (!audio.paused) audio.pause(); });
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(String(text));
      u.lang = 'en-US';
      u.rate = window.Store.settings().rate;
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 忽略 */ }
  }

  return { speak: speak, supported: supported };
})();
