import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import SectionHeader from '../components/SectionHeader';
import './CharacterForm.css';

export default function CharacterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '',
    tiktok_id: '@',
    tiktok_display_name: '',
    purpose: 'メインアカウント',
    status: '運用中',
    start_date: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.getCharacter(id).then(data => {
        if (data && !data.error) {
          setForm({
            name: data.name,
            tiktok_id: data.tiktok_id,
            tiktok_display_name: data.tiktok_display_name || '',
            purpose: data.purpose || 'メインアカウント',
            status: data.status || '運用中',
            start_date: data.start_date || '',
            note: data.note || '',
          });
        }
      }).catch(err => setError(err.message));
    }
  }, [id, isEdit]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('キャラクター名は必須です');
      return;
    }
    if (!form.tiktok_id.startsWith('@') || form.tiktok_id.length < 2) {
      setError('TikTokアカウントIDは@で始めてください');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateCharacter(id, form);
        navigate(`/characters/${id}`);
      } else {
        const created = await api.createCharacter(form);
        navigate(`/characters/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="form-page">
      <Link to={isEdit ? `/characters/${id}` : '/'} className="back-link">
        ← {isEdit ? '詳細に戻る' : 'ダッシュボードに戻る'}
      </Link>

      <SectionHeader title={isEdit ? 'キャラクター編集' : 'キャラクター新規登録'} />

      <form onSubmit={handleSubmit} className="form-card">
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>キャラクター名 <span className="required">*</span></label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="例: とりぴー" />
        </div>

        <div className="form-group">
          <label>TikTokアカウントID <span className="required">*</span></label>
          <input type="text" name="tiktok_id" value={form.tiktok_id} onChange={handleChange} placeholder="@toripii_official" />
        </div>

        <div className="form-group">
          <label>TikTok表示名</label>
          <input type="text" name="tiktok_display_name" value={form.tiktok_display_name} onChange={handleChange} placeholder="例: とりぴー【公式】" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>アカウント用途</label>
            <select name="purpose" value={form.purpose} onChange={handleChange}>
              <option value="メインアカウント">メインアカウント</option>
              <option value="サブアカウント">サブアカウント</option>
              <option value="テストアカウント">テストアカウント</option>
              <option value="予備アカウント">予備アカウント</option>
            </select>
          </div>

          <div className="form-group">
            <label>ステータス</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="運用中">運用中</option>
              <option value="準備中">準備中</option>
              <option value="休止中">休止中</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>運用開始日</label>
          <input type="date" name="start_date" value={form.start_date} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>メモ</label>
          <textarea name="note" value={form.note} onChange={handleChange} rows={3} placeholder="メモを入力..." />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-pink" disabled={submitting}>
            {submitting ? '保存中...' : isEdit ? '更新する' : '登録する'}
          </button>
        </div>
      </form>
    </div>
  );
}
