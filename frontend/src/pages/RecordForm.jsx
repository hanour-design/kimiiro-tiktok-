import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import SectionHeader from '../components/SectionHeader';
import './CharacterForm.css';

export default function RecordForm() {
  const { characterId } = useParams();
  const navigate = useNavigate();

  const [characters, setCharacters] = useState([]);
  const [form, setForm] = useState({
    character_id: characterId || '',
    record_date: new Date().toISOString().split('T')[0],
    follower_count: '',
    note: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCharacters('all').then(setCharacters);
  }, []);

  useEffect(() => {
    if (characterId) {
      setForm(f => ({ ...f, character_id: characterId }));
    }
  }, [characterId]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.character_id) {
      setError('キャラクターを選択してください');
      return;
    }
    const count = parseInt(form.follower_count, 10);
    if (isNaN(count) || count < 0) {
      setError('フォロワー数は0以上の整数を入力してください');
      return;
    }

    setSubmitting(true);
    try {
      await api.createRecord({
        ...form,
        follower_count: count,
      });
      setSuccess('記録しました');
      setTimeout(() => {
        if (characterId) {
          navigate(`/characters/${characterId}`);
        } else {
          setForm(f => ({ ...f, follower_count: '', note: '' }));
          setSuccess('');
        }
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  const selectedChar = characters.find(c => c.id === form.character_id);

  return (
    <div className="form-page">
      <Link to={characterId ? `/characters/${characterId}` : '/'} className="back-link">
        ← {characterId ? '詳細に戻る' : 'ダッシュボードに戻る'}
      </Link>

      <SectionHeader title="週次フォロワー数記録" />

      <form onSubmit={handleSubmit} className="form-card">
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="form-group">
          <label>キャラクター <span className="required">*</span></label>
          <select name="character_id" value={form.character_id} onChange={handleChange}>
            <option value="">選択してください</option>
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.tiktok_id})</option>
            ))}
          </select>
        </div>

        {selectedChar && selectedChar.latest_followers > 0 && (
          <div className="current-info">
            現在のフォロワー数: <strong>{selectedChar.latest_followers.toLocaleString()}</strong>
            {selectedChar.latest_record_date && (
              <span className="info-sub"> ({selectedChar.latest_record_date} 時点)</span>
            )}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>記録日 <span className="required">*</span></label>
            <input type="date" name="record_date" value={form.record_date} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>フォロワー数 <span className="required">*</span></label>
            <input
              type="number"
              name="follower_count"
              value={form.follower_count}
              onChange={handleChange}
              placeholder="例: 45200"
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label>メモ</label>
          <textarea name="note" value={form.note} onChange={handleChange} rows={2} placeholder="バズ動画の影響など..." />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-pink" disabled={submitting}>
            {submitting ? '記録中...' : '記録する'}
          </button>
        </div>
      </form>
    </div>
  );
}
