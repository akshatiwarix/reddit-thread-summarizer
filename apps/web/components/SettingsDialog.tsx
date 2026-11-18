import {
  modelForProvider,
  PROVIDERS,
  providerInfo,
  type ProviderId,
  type ProviderSettings,
} from "@rts/core";
import { useEffect, useId, useState, type FormEvent } from "react";

type Props = {
  open: boolean;
  initial: ProviderSettings;
  initialHistoryEnabled: boolean;
  onClose: () => void;
  onSave: (settings: ProviderSettings, historyEnabled: boolean) => void;
};

export function SettingsDialog({ open, initial, initialHistoryEnabled, onClose, onSave }: Props) {
  const titleId = useId();
  const [settings, setSettings] = useState(initial);
  const [historyEnabled, setHistoryEnabled] = useState(initialHistoryEnabled);
  const [showKey, setShowKey] = useState(false);
  const info = providerInfo(settings.provider);

  useEffect(() => {
    if (open) {
      setSettings(initial);
      setHistoryEnabled(initialHistoryEnabled);
    }
  }, [open, initial, initialHistoryEnabled]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function changeProvider(provider: ProviderId) {
    setSettings((current) => ({
      ...current,
      provider,
      model: modelForProvider(current.model, current.provider, provider),
    }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onSave({
      provider: settings.provider,
      model: settings.model.trim() || info.defaultModel,
      apiKey: settings.apiKey.trim(),
    }, historyEnabled);
    onClose();
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>API key</h2>
        <p className="hint">
          Stored in localStorage on this browser. The summary request goes straight to the provider. This site never
          receives the key.
        </p>
        <form onSubmit={onSubmit} className="settings">
          <label>
            Provider
            <select value={settings.provider} onChange={(event) => changeProvider(event.target.value as ProviderId)}>
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input
              list="web-model-choices"
              value={settings.model}
              required
              onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
            />
            <datalist id="web-model-choices">
              {info.models.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
          <label>
            API key
            <span className="key-row">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                autoComplete="off"
                spellCheck={false}
                placeholder={info.keyHint}
                onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))}
              />
              <button type="button" className="ghost" onClick={() => setShowKey((value) => !value)}>
                {showKey ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          <p className="hint">
            <a href={info.keyUrl} target="_blank" rel="noreferrer">
              Get a {info.label} key
            </a>
          </p>
          <label className="check">
            <input type="checkbox" checked={historyEnabled} onChange={(event) => setHistoryEnabled(event.target.checked)} />
            Save finished summaries to history in this browser
          </label>
          <div className="row">
            <button type="submit" className="primary">
              Save
            </button>
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
