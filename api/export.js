import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { data: chars, error: charErr } = await supabase
      .from('characters')
      .select('id, name, tiktok_id');
    if (charErr) throw charErr;

    const { data: records, error: recErr } = await supabase
      .from('follower_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (recErr) throw recErr;

    const charMap = {};
    for (const c of chars) charMap[c.id] = c;

    let csv = 'キャラクター名,TikTokID,記録日,フォロワー数,メモ\n';
    for (const r of records) {
      const c = charMap[r.character_id];
      if (c) {
        csv += `${c.name},${c.tiktok_id},${r.record_date},${r.follower_count},${r.note || ''}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=kimiiro-tiktok-data.csv');
    res.send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
