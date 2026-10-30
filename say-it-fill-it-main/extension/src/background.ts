import { DEFAULT_SETTINGS } from "./shared/types";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["apiUrl", "speakingLanguage", "theme"], (res) => {
    chrome.storage.sync.set({
      apiUrl: res.apiUrl || DEFAULT_SETTINGS.apiUrl,
      speakingLanguage: res.speakingLanguage || DEFAULT_SETTINGS.speakingLanguage,
      theme: res.theme || DEFAULT_SETTINGS.theme,
    });
  });
});
