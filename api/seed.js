import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { count } = await supabase.from('characters').select('*', { count: 'exact', head: true });
    if (count > 0) {
      return res.json({ message: 'データは既に存在します' });
    }

    const characters = [
      { name: 'とりぴー', tiktok_id: '@toripii_official', tiktok_display_name: 'とりぴー【公式】', purpose: 'メインアカウント', status: '運用中', start_date: '2024-11-01', note: 'メインIP' },
      { name: '爆モテゴリラ', tiktok_id: '@bakumote_gorilla', tiktok_display_name: '爆モテゴリラ', purpose: 'メインアカウント', status: '運用中', start_date: '2024-12-01', note: 'セカンドIP' },
      { name: 'とりぴーサブ', tiktok_id: '@toripii_sub', tiktok_display_name: 'とりぴーサブ', purpose: 'サブアカウント', status: '運用中', start_date: '2025-02-01', note: 'サブアカウント' },
      { name: 'キミイロちゃん', tiktok_id: '@kimiiro_chan', tiktok_display_name: 'キミイロちゃん', purpose: 'メインアカウント', status: '準備中', start_date: '2026-01-15', note: '新規キャラクター' },
      { name: 'モフモフ先生', tiktok_id: '@mofumofu_sensei', tiktok_display_name: 'モフモフ先生', purpose: 'メインアカウント', status: '運用中', start_date: '2025-04-01', note: '教育系コンテンツ' },
    ];

    const { data: insertedChars, error: charErr } = await supabase
      .from('characters')
      .insert(characters)
      .select();
    if (charErr) throw charErr;

    function generateWeeklyData(charId, startDate, startFollowers, minGrowth, maxGrowth, weeks) {
      const rows = [];
      let followers = startFollowers;
      const start = new Date(startDate);
      for (let w = 0; w <= weeks; w++) {
        const d = new Date(start);
        d.setDate(d.getDate() + w * 7);
        const dateStr = d.toISOString().split('T')[0];
        rows.push({
          character_id: charId,
          record_date: dateStr,
          follower_count: followers,
          note: '',
        });
        followers += Math.floor(Math.random() * (maxGrowth - minGrowth) + minGrowth);
      }
      return rows;
    }

    const allRecords = [
      ...generateWeeklyData(insertedChars[0].id, '2024-11-01', 0, 500, 900, 70),
      ...generateWeeklyData(insertedChars[1].id, '2024-12-01', 0, 450, 800, 65),
      ...generateWeeklyData(insertedChars[2].id, '2025-02-01', 0, 150, 350, 56),
      ...generateWeeklyData(insertedChars[4].id, '2025-04-01', 0, 100, 250, 48),
    ];

    const batchSize = 500;
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      const { error } = await supabase.from('follower_records').insert(batch);
      if (error) throw error;
    }

    res.json({ message: 'サンプルデータを投入しました' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
