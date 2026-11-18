export default defineBackground(() => {
  if (!browser.sidePanel?.setPanelBehavior) return;
  void browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);
});
