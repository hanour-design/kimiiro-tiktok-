import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import './Dashboard.css';

function formatNumber(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatChange(change, rate) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toLocaleString()} (${sign}${rate}%)`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [filter, setFilter] = useState('運用中');
  const [sortBy, setSortBy] = useState('followers');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, charsData] = await Promise.all([
        api.getStats(),
        api.getCharacters(filter === 'all' ? 'all' : filter),
      ]);
      setStats(statsData);
      setCharacters(charsData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await api.seed();
      await loadData();
    } catch (err) {
      console.error(err);
    }
    setSeeding(false);
  }

  const sorted = [...characters].sort((a, b) => {
    if (sortBy === 'followers') return (b.latest_followers || 0) - (a.latest_followers || 0);
    if (sortBy === 'rate') return parseFloat(b.change_rate || 0) - parseFloat(a.change_rate || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ja');
    return 0;
  });

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="dashboard">
      {stats && stats.totalAccounts === 0 && (
        <div className="seed-banner">
          <p>データがありません。サンプルデータを投入しますか？</p>
          <button onClick={handleSeed} disabled={seeding} className="btn btn-pink">
            {seeding ? '投入中...' : 'サンプルデータを投入'}
          </button>
        </div>
      )}

      {stats && (
        <div className="kpi-grid">
          <KpiCard label="総アカウント数" value={stats.totalAccounts} />
          <KpiCard label="運用中" value={stats.activeAccounts} />
          <KpiCard label="総フォロワー" value={formatNumber(stats.totalFollowers)} />
          <KpiCard
            label="週間獲得"
            value={`${stats.weeklyGain >= 0 ? '+' : ''}${formatNumber(stats.weeklyGain)}`}
            sub="前週比"
          />
        </div>
      )}

      <div className="section-gap" />

      <SectionHeader
        title="アカウント一覧"
        action={
          <div className="header-actions">
            <Link to="/characters/new">+ 新規登録</Link>
            <a href={api.exportCsv()} target="_blank" rel="noreferrer">CSV出力</a>
          </div>
        }
      />

      <div className="filter-bar">
        <div className="filter-group">
          <label>ステータス:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">すべて</option>
            <option value="運用中">運用中</option>
            <option value="準備中">準備中</option>
            <option value="休止中">休止中</option>
          </select>
        </div>
        <div className="filter-group">
          <label>並び替え:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="followers">フォロワー数</option>
            <option value="rate">増減率</option>
            <option value="name">キャラクター名</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>該当するアカウントがありません</p>
        </div>
      ) : (
        <div className="char-table-wrapper">
          <table className="char-table">
            <thead>
              <tr>
                <th>キャラクター</th>
                <th>TikTok ID</th>
                <th className="num">フォロワー</th>
                <th className="num">前週比</th>
                <th>ステータス</th>
                <th className="num">累計獲得</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/characters/${c.id}`} className="char-name-link">
                      {c.name}
                    </Link>
                  </td>
                  <td className="tiktok-id">{c.tiktok_id}</td>
                  <td className="num">{(c.latest_followers || 0).toLocaleString()}</td>
                  <td className={`num ${c.change > 0 ? 'positive' : c.change < 0 ? 'negative' : ''}`}>
                    {c.latest_followers > 0 ? formatChange(c.change, c.change_rate) : '-'}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="num">{c.total_gained > 0 ? `+${c.total_gained.toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
