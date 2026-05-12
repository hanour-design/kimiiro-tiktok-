import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  try {
    const { character_id, limit } = req.query;
    if (!character_id) {
      return res.status(400).json({ error: 'character_id is required' });
    }

    let query = supabase
      .from('follower_records')
      .select('*')
      .eq('character_id', character_id)
      .order('record_date', { ascending: false });

    if (limit) {
      query = query.limit(Number(limit));
    }

    const { data: records, error } = await query;
    if (error) throw error;

    const result = records.map((r, i, arr) => {
      const prev = arr[i + 1];
      const change = prev ? r.follower_count - prev.follower_count : 0;
      const changeRate = prev && prev.follower_count > 0
        ? ((change / prev.follower_count) * 100).toFixed(1)
        : '0';
      return { ...r, change, change_rate: changeRate };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handlePost(req, res) {
  try {
    const data = req.body;
    if (!data.character_id || !data.record_date || data.follower_count === undefined) {
      return res.status(400).json({ error: 'character_id, record_date, follower_count は必須です' });
    }

    const count = Number(data.follower_count);
    if (isNaN(count) || count < 0) {
      return res.status(400).json({ error: 'フォロワー数は0以上の整数を入力してください' });
    }

    const { data: created, error } = await supabase
      .from('follower_records')
      .upsert(
        {
          character_id: data.character_id,
          record_date: data.record_date,
          follower_count: count,
          note: data.note || '',
        },
        { onConflict: 'character_id,record_date' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, id: created.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
