import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const period = req.query.period || 'week';

    const { data: chars, error: charErr } = await supabase
      .from('characters')
      .select('*');
    if (charErr) throw charErr;

    const { data: records, error: recErr } = await supabase
      .from('follower_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (recErr) throw recErr;

    const recordsByChar = {};
    for (const r of records) {
      if (!recordsByChar[r.character_id]) recordsByChar[r.character_id] = [];
      recordsByChar[r.character_id].push(r);
    }

    const rankings = chars.map(c => {
      const charRecords = recordsByChar[c.id] || [];
      if (charRecords.length < 2) {
        return { ...c, gain: 0, gain_rate: 0 };
      }

      const latest = charRecords[0];
      let startRecord;

      if (period === 'week') {
        startRecord = charRecords[1];
      } else if (period === 'month') {
        startRecord = charRecords[4] || charRecords[charRecords.length - 1];
      } else {
        startRecord = charRecords[charRecords.length - 1];
      }

      const gain = latest.follower_count - startRecord.follower_count;
      const gainRate = startRecord.follower_count > 0
        ? ((gain / startRecord.follower_count) * 100).toFixed(1)
        : 0;

      return { ...c, gain, gain_rate: parseFloat(gainRate) };
    });

    rankings.sort((a, b) => b.gain - a.gain);
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
