/**
 * SettingsPanel - Comprehensive settings management with tabbed interface
 */

import { useState } from 'react';
import { useSettings, type AppSettings } from '../../contexts/SettingsContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SettingsPanelProps {
  onClose: () => void;
}

type TabType = 'general' | 'live2d' | 'audio' | 'advanced';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateLive2DSettings, updateAudioSettings, updateGeneralSettings, updateAdvancedSettings, resetSettings, exportSettings, importSettings } = useSettings();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [showExport, setShowExport] = useState(false);

  const tabs: Array<{ key: TabType; label: string; icon: string }> = [
    { key: 'general', label: t.general, icon: '⚙' },
    { key: 'live2d', label: t.live2d, icon: '◆' },
    { key: 'audio', label: t.audio, icon: '♪' },
    { key: 'advanced', label: t.advanced, icon: '⋮' },
  ];

  const handleExport = () => {
    const data = exportSettings();
    setExportData(data);
    setShowExport(true);
  };

  const handleImport = () => {
    if (importData.trim()) {
      if (importSettings(importData)) {
        alert('Settings imported successfully!');
        setImportData('');
      } else {
        alert('Failed to import settings. Invalid JSON format.');
      }
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      resetSettings();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportData);
    alert('Settings copied to clipboard!');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">{t.settings}</h2>
          <button className="settings-close-button" onClick={onClose} aria-label="Close settings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3 className="section-title">{t.general}</h3>

              {/* Theme */}
              <div className="setting-item">
                <label className="setting-label">{t.theme}</label>
                <select
                  className="setting-select"
                  value={settings.general.theme}
                  onChange={(e) => updateGeneralSettings({ theme: e.target.value as any })}
                >
                  <option value="light">{t.light}</option>
                  <option value="dark">{t.dark}</option>
                </select>
              </div>

              {/* Language */}
              <div className="setting-item">
                <label className="setting-label">{t.language}</label>
                <select
                  className="setting-select"
                  value={settings.general.language}
                  onChange={(e) => {
                    const newLang = e.target.value as 'en' | 'zh' | 'ja';
                    updateGeneralSettings({ language: newLang });
                    setLanguage(newLang);
                  }}
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>

              {/* Auto Scroll Chat */}
              <div className="setting-item">
                <label className="setting-label">{t.autoScrollChat}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.general.autoScrollChat}
                    onChange={(e) => updateGeneralSettings({ autoScrollChat: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'live2d' && (
            <div className="settings-section">
              <h3 className="section-title">{t.live2d}</h3>

              {/* Model Scale */}
              <div className="setting-item">
                <label className="setting-label">{t.modelScale}: {t.modelScaleValue(settings.live2d.modelScale.toFixed(1))}</label>
                <input
                  type="range"
                  className="setting-slider"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.live2d.modelScale}
                  onChange={(e) => updateLive2DSettings({ modelScale: parseFloat(e.target.value) })}
                />
              </div>

              {/* Position X */}
              <div className="setting-item">
                <label className="setting-label">{t.positionX}: {Math.round(settings.live2d.positionX * 100)}%</label>
                <input
                  type="range"
                  className="setting-slider"
                  min="-50"
                  max="50"
                  step="1"
                  value={settings.live2d.positionX * 100}
                  onChange={(e) => updateLive2DSettings({ positionX: parseFloat(e.target.value) / 100 })}
                />
              </div>

              {/* Position Y */}
              <div className="setting-item">
                <label className="setting-label">{t.positionY}: {Math.round(settings.live2d.positionY * 100)}%</label>
                <input
                  type="range"
                  className="setting-slider"
                  min="-50"
                  max="50"
                  step="1"
                  value={settings.live2d.positionY * 100}
                  onChange={(e) => updateLive2DSettings({ positionY: parseFloat(e.target.value) / 100 })}
                />
              </div>

              {/* Idle Motion */}
              <div className="setting-item">
                <label className="setting-label">{t.idleMotion}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.live2d.idleMotion}
                    onChange={(e) => updateLive2DSettings({ idleMotion: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Breathing Animation */}
              <div className="setting-item">
                <label className="setting-label">{t.breathingAnimation}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.live2d.breathingAnimation}
                    onChange={(e) => updateLive2DSettings({ breathingAnimation: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="settings-section">
              <h3 className="section-title">{t.audio}</h3>

              {/* TTS Volume */}
              <div className="setting-item">
                <label className="setting-label">{t.ttsVolume}: {t.volumeValue(Math.round(settings.audio.ttsVolume * 100))}</label>
                <input
                  type="range"
                  className="setting-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.audio.ttsVolume}
                  onChange={(e) => updateAudioSettings({ ttsVolume: parseFloat(e.target.value) })}
                />
              </div>

              {/* Mic Sensitivity */}
              <div className="setting-item">
                <label className="setting-label">{t.micSensitivity}: {t.volumeValue(Math.round(settings.audio.micSensitivity * 100))}</label>
                <input
                  type="range"
                  className="setting-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.audio.micSensitivity}
                  onChange={(e) => updateAudioSettings({ micSensitivity: parseFloat(e.target.value) })}
                />
              </div>

              {/* Lip Sync */}
              <div className="setting-item">
                <label className="setting-label">{t.lipSync}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.audio.lipSync}
                    onChange={(e) => updateAudioSettings({ lipSync: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Enable Audio */}
              <div className="setting-item">
                <label className="setting-label">{t.enableAudio}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.audio.enableAudio}
                    onChange={(e) => updateAudioSettings({ enableAudio: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="settings-section">
              <h3 className="section-title">{t.advanced}</h3>

              {/* Debug Mode */}
              <div className="setting-item">
                <label className="setting-label">{t.debugMode}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.advanced.debugMode}
                    onChange={(e) => updateAdvancedSettings({ debugMode: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Show Thoughts */}
              <div className="setting-item">
                <label className="setting-label">{t.showAIThoughts}</label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings.advanced.showThoughts}
                    onChange={(e) => updateAdvancedSettings({ showThoughts: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Data Management */}
              <div className="setting-group">
                <h4 className="group-title">{t.dataManagement}</h4>

                {/* Export */}
                <div className="setting-item">
                  <button className="setting-button" onClick={handleExport}>
                    {t.exportSettings}
                  </button>
                </div>

                {/* Import */}
                {showExport && (
                  <div className="setting-item">
                    <textarea
                      className="setting-textarea"
                      value={exportData}
                      readOnly
                      rows={5}
                    />
                    <button className="setting-button secondary" onClick={copyToClipboard}>
                      {t.copyToClipboard}
                    </button>
                  </div>
                )}

                <div className="setting-item">
                  <textarea
                    className="setting-textarea"
                    placeholder="Paste settings JSON here to import..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={5}
                  />
                  <button className="setting-button secondary" onClick={handleImport}>
                    {t.importSettings}
                  </button>
                </div>

                {/* Reset */}
                <div className="setting-item">
                  <button className="setting-button danger" onClick={handleReset}>
                    {t.resetToDefaults}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
