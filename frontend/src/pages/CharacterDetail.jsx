import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import './CharacterDetail.css';

export default function CharacterDetail() {
  const { id } = useParams();
  const [character, setCharacter] = useState(null);
  const [records, setRecords] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [charData, recordsData] = await Promise.all([
        api.getCharacter(id),
        api.getRecords(id),
      ]);
      setCharacter(charData);
      setRecords(recordsData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  if (loading) return <div className="loading">読み込み中...</div>;
  if (!character) return <div className="loading">キャラクターが見つかりません</div>;

  const latest = records[0];
  const prev = records[1];
  const first = records[records.length - 1];

  const change = latest && prev ? latest.follower_count - prev.follower_count : 0;
  const changeRate = prev && prev.follower_count > 0
    ? ((change / prev.follower_count) * 100).toFixed(1)
    : '0';
  const totalGained = latest && first ? latest.follower_count - first.follower_count : 0;

  // Filter records by period for chart
  const now = new Date();
  const filteredRecords = [...records].reverse().filter(r => {
    if (period === 'all') return true;
    const date = new Date(r.record_date);
    const months = period === '1m' ? 1 : period === '3m' ? 3 : 6;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return date >= cutoff;
  });

  const chartData = filteredRecords.map(r => ({
    date: r.record_date.slice(5),
    followers: r.follower_count,
  }));

  const displayRecords = showAll ? records : records.slice(0, 10);

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">← ダッシュボードに戻る</Link>

      <div className="detail-header">
        <div className="detail-title-row">
          <h1 className="detail-name">{character.name}</h1>
          <StatusBadge status={character.status} />
        </div>
        <div className="detail-tiktok-id">{character.tiktok_id}</div>
        {character.tiktok_display_name && (
          <div className="detail-display-name">{character.tiktok_display_name}</div>
        )}
      </div>

      <div className="detail-stats">
        <div className="stat-item">
          <div className="stat-value">{latest ? latest.follower_count.toLocaleString() : '0'}</div>
          <div className="stat-label">現在のフォロワー</div>
        </div>
        <div className="stat-item">
          <div className={`stat-value ${change > 0 ? 'positive' : change < 0 ? 'negative' : ''}`}>
            {change >= 0 ? '+' : ''}{change.toLocaleString()} ({change >= 0 ? '+' : ''}{changeRate}%)
          </div>
          <div className="stat-label">前週比</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{character.start_date || '-'}</div>
          <div className="stat-label">運用開始</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">+{totalGained.toLocaleString()}</div>
          <div className="stat-label">累計獲得</div>
        </div>
      </div>

      <div className="detail-actions">
        <Link to={`/records/new/${id}`} className="btn btn-pink">フォロワー数を記録</Link>
        <Link to={`/characters/${id}/edit`} className="btn btn-outline">編集</Link>
      </div>

      {chartData.length > 1 && (
        <>
          <SectionHeader
            title="フォロワー推移"
            action={
              <select value={period} onChange={e => setPeriod(e.target.value)} className="period-select">
                <option value="all">全期間</option>
                <option value="1m">直近1ヶ月</option>
                <option value="3m">直近3ヶ月</option>
                <option value="6m">直近6ヶ月</option>
              </select>
            }
          />
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: '#555' }} />
                <YAxis fontSize={11} tick={{ fill: '#555' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip
                  formatter={(value) => [value.toLocaleString(), 'フォロワー']}
                  labelFormatter={(label) => `日付: ${label}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <Line type="monotone" dataKey="followers" stroke="#E64A78" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#E64A78' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="section-gap" />

      <SectionHeader title="週次記録履歴" />
      <div className="records-list">
        {displayRecords.length === 0 ? (
          <div className="empty-state">記録がありません</div>
        ) : (
          <>
            <table className="records-table">
              <thead>
                <tr>
                  <th>記録日</th>
                  <th className="num">フォロワー数</th>
                  <th className="num">前回比</th>
                  <th>メモ</th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.map(r => (
                  <tr key={r.id}>
                    <td>{r.record_date}</td>
                    <td className="num">{r.follower_count.toLocaleString()}</td>
                    <td className={`num ${r.change > 0 ? 'positive' : r.change < 0 ? 'negative' : ''}`}>
                      {r.change !== 0 ? `${r.change >= 0 ? '+' : ''}${r.change.toLocaleString()} (${r.change >= 0 ? '+' : ''}${r.change_rate}%)` : '-'}
                    </td>
                    <td className="memo">{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!showAll && records.length > 10 && (
              <button onClick={() => setShowAll(true)} className="show-more-btn">
                もっと見る（残り{records.length - 10}件）
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
