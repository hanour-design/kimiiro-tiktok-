import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import SectionHeader from '../components/SectionHeader';
import './Rankings.css';

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, [period]);

  async function loadRankings() {
    setLoading(true);
    try {
      const data = await api.getRankings(period);
      setRankings(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const periodLabels = {
    week: '直近1週間',
    month: '直近1ヶ月',
    all: '全期間',
  };

  const medals = ['gold', 'silver', 'bronze'];

  return (
    <div className="rankings-page">
      <Link to="/" className="back-link">← ダッシュボードに戻る</Link>

      <SectionHeader
        title="成長率ランキング"
        action={
          <select value={period} onChange={e => setPeriod(e.target.value)} className="period-select">
            <option value="week">直近1週間</option>
            <option value="month">直近1ヶ月</option>
            <option value="all">全期間</option>
          </select>
        }
      />

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <div className="rankings-list">
          {rankings.filter(r => r.gain !== 0 || r.gain_rate !== 0).length === 0 ? (
            <div className="empty-state">ランキングデータがありません</div>
          ) : (
            rankings.filter(r => r.gain > 0).map((r, i) => (
              <div key={r.id} className={`ranking-item ${i < 3 ? `rank-${medals[i]}` : ''}`}>
                <div className="rank-number">
                  {i < 3 ? (
                    <span className={`rank-medal medal-${medals[i]}`}>{i + 1}</span>
                  ) : (
                    <span className="rank-num">{i + 1}</span>
                  )}
                </div>
                <div className="rank-info">
                  <Link to={`/characters/${r.id}`} className="rank-name">{r.name}</Link>
                  <div className="rank-tiktok">{r.tiktok_id}</div>
                </div>
                <div className="rank-stats">
                  <div className="rank-gain">+{r.gain.toLocaleString()}</div>
                  <div className="rank-rate">+{r.gain_rate}%</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="period-label">集計期間: {periodLabels[period]}</div>
    </div>
  );
}
