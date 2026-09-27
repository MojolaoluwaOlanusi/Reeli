const SettingsPanel = ({ settings, onChange, onClose }) => {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <p className="eyebrow">Preferences</p>
            <h2>Reeli settings</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-form">
          <label>
            <span>Default region</span>
            <select value={settings.region} onChange={(event) => onChange('region', event.target.value)}>
              <option value="global">Global</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="eu">Europe</option>
              <option value="asia">Asia</option>
            </select>
          </label>

          <label>
            <span>Theme</span>
            <select value={settings.theme} onChange={(event) => onChange('theme', event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label>
            <span>Streaming preferences</span>
            <select value={settings.streaming} onChange={(event) => onChange('streaming', event.target.value)}>
              <option value="all">All platforms</option>
              <option value="sub">Subtitles first</option>
              <option value="free">Free options first</option>
              <option value="premium">Premium only</option>
            </select>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.saveHistory}
              onChange={(event) => onChange('saveHistory', event.target.checked)}
            />
            <span>Save search history</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.showGuides}
              onChange={(event) => onChange('showGuides', event.target.checked)}
            />
            <span>Show discovery guidance</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
