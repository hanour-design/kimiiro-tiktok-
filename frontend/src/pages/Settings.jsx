import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGasUrl, setGasUrl, api } from '../api';
import SectionHeader from '../components/SectionHeader';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(getGasUrl());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  function handleSave() {
    setGasUrl(url.trim());
    setResult({ type: 'success', message: '保存しました' });
  }

  async function handleTest() {
    if (!url.trim()) {
      setResult({ type: 'error', message: 'URLを入力してください' });
      return;
    }
    setGasUrl(url.trim());
    setTesting(true);
    setResult(null);
    try {
      const stats = await api.getStats();
      setResult({
        type: 'success',
        message: `接続成功！ アカウント数: ${stats.totalAccounts}`,
      });
    } catch (err) {
      setResult({ type: 'error', message: `接続失敗: ${err.message}` });
    }
    setTesting(false);
  }

  async function handleSeed() {
    setTesting(true);
    try {
      const res = await api.seed();
      setResult({ type: 'success', message: res.message || 'サンプルデータを投入しました' });
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    }
    setTesting(false);
  }

  return (
    <div className="settings-page">
      <SectionHeader title="設定" />

      <div className="settings-card">
        <h3 className="settings-subtitle">Google Apps Script API URL</h3>
        <p className="settings-desc">
          Google Apps Scriptのデプロイ URL を入力してください。<br />
          形式: <code>https://script.google.com/macros/s/xxxxx/exec</code>
        </p>

        <div className="url-input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setResult(null); }}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="url-input"
          />
        </div>

        <div className="settings-actions">
          <button onClick={handleSave} className="btn btn-pink">保存</button>
          <button onClick={handleTest} className="btn btn-outline" disabled={testing}>
            {testing ? 'テスト中...' : '接続テスト'}
          </button>
          <button onClick={handleSeed} className="btn btn-outline" disabled={testing}>
            サンプルデータ投入
          </button>
        </div>

        {result && (
          <div className={`settings-result ${result.type}`}>
            {result.message}
          </div>
        )}

        <div className="setup-guide">
          <h3 className="settings-subtitle">セットアップ手順</h3>
          <ol>
            <li>
              <strong>Google スプレッドシート</strong>を新規作成
            </li>
            <li>
              シートを2つ作成: <code>Characters</code> と <code>Records</code>
            </li>
            <li>
              <strong>拡張機能</strong> → <strong>Apps Script</strong> を開く
            </li>
            <li>
              プロジェクトの <code>Code.gs</code> に
              <a href="https://github.com/hanour-design/kimiiro-tiktok-/blob/main/gas/Code.gs" target="_blank" rel="noreferrer">
                こちらのコード
              </a>
              を貼り付け
            </li>
            <li>
              <strong>デプロイ</strong> → <strong>新しいデプロイ</strong>
              <ul>
                <li>種類: ウェブアプリ</li>
                <li>実行ユーザー: 自分</li>
                <li>アクセス: 全員</li>
              </ul>
            </li>
            <li>デプロイ URL をこの設定画面に貼り付け</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
