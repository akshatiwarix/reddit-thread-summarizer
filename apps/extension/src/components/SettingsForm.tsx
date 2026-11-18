import { PROVIDERS, modelForProvider, providerInfo, type ProviderId, type ProviderSettings } from "@rts/core";
import { useState, type FormEvent } from "react";

type Props = {
  initial: ProviderSettings;
  onSave: (settings: ProviderSettings) => Promise<void>;
};

export function SettingsForm({ initial, onSave }: Props) {
  const [settings, setSettings] = useState(initial);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const info = providerInfo(settings.provider);

  function changeProvider(provider: ProviderId) {
    setSaved(false);
    setSettings((current) => ({
      ...current,
      provider,
      model: modelForProvider(current.model, current.provider, provider),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(settings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings" onSubmit={(event) => void onSubmit(event)}>
      <label>
        Provider
        <select
          value={settings.provider}
          onChange={(event) => changeProvider(event.target.value as ProviderId)}
        >
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
          list="model-choices"
          value={settings.model}
          onChange={(event) => {
            setSaved(false);
            setSettings((current) => ({ ...current, model: event.target.value }));
          }}
          required
        />
        <datalist id="model-choices">
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
            onChange={(event) => {
              setSaved(false);
              setSettings((current) => ({ ...current, apiKey: event.target.value }));
            }}
          />
          <button type="button" className="ghost" onClick={() => setShowKey((value) => !value)}>
            {showKey ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      <p className="hint">
        The key stays in chrome.storage.local on this device. Requests go to {info.label} only.{" "}
        <a href={info.keyUrl} target="_blank" rel="noreferrer">
          Get a key
        </a>
      </p>
      <div className="row">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved ? <span className="saved">Saved</span> : null}
      </div>
    </form>
  );
}
