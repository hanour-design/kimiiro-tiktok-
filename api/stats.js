import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { data: chars, error: charErr } = await supabase
      .from('characters')
      .select('id, status');
    if (charErr) throw charErr;

    const { data: records, error: recErr } = await supabase
      .from('follower_records')
      .select('character_id, record_date, follower_count')
      .order('record_date', { ascending: false });
    if (recErr) throw recErr;

    const recordsByChar = {};
    for (const r of records) {
      if (!recordsByChar[r.character_id]) recordsByChar[r.character_id] = [];
      recordsByChar[r.character_id].push(r);
    }

    let totalFollowers = 0;
    let weeklyGain = 0;
    const activeAccounts = chars.filter(c => c.status === '運用中').length;

    for (const c of chars) {
      const charRecords = recordsByChar[c.id] || [];
      const latest = charRecords[0];
      const prev = charRecords[1];
      totalFollowers += latest ? latest.follower_count : 0;
      if (latest && prev) {
        weeklyGain += latest.follower_count - prev.follower_count;
      }
    }

    res.json({
      totalAccounts: chars.length,
      activeAccounts,
      totalFollowers,
      weeklyGain,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
