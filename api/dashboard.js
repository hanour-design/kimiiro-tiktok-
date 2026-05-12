import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const { data: chars, error: charErr } = await supabase
      .from('characters')
      .select('*')
      .order('created_at');
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

    let totalFollowers = 0;
    let weeklyGain = 0;
    const activeAccounts = chars.filter(c => c.status === '運用中').length;

    const characters = chars.map(c => {
      const charRecords = recordsByChar[c.id] || [];
      const latest = charRecords[0];
      const prev = charRecords[1];
      const first = charRecords[charRecords.length - 1];

      const latestFollowers = latest ? latest.follower_count : 0;
      const prevFollowers = prev ? prev.follower_count : 0;
      const firstFollowers = first ? first.follower_count : 0;
      const change = latestFollowers - prevFollowers;
      const changeRate = prevFollowers > 0 ? ((change / prevFollowers) * 100).toFixed(1) : '0';

      totalFollowers += latestFollowers;
      if (latest && prev) weeklyGain += change;

      return {
        ...c,
        latest_followers: latestFollowers,
        prev_followers: prevFollowers,
        first_followers: firstFollowers,
        latest_record_date: latest ? latest.record_date : '',
        change,
        change_rate: changeRate,
        total_gained: latestFollowers - firstFollowers,
      };
    }).sort((a, b) => b.latest_followers - a.latest_followers);

    res.json({
      stats: {
        totalAccounts: chars.length,
        activeAccounts,
        totalFollowers,
        weeklyGain,
      },
      characters,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
