const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database setup
const db = new Database(path.join(__dirname, 'kimiiro.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tiktok_id TEXT NOT NULL UNIQUE,
    tiktok_display_name TEXT DEFAULT '',
    purpose TEXT DEFAULT 'メインアカウント',
    status TEXT DEFAULT '運用中',
    start_date TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    note TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS follower_records (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    record_date TEXT NOT NULL,
    follower_count INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, record_date)
  );
`);

// ─── Characters API ───

// GET all characters with latest follower data
app.get('/api/characters', (req, res) => {
  const { status } = req.query;

  let characters = db.prepare(`
    SELECT c.*,
      (SELECT follower_count FROM follower_records WHERE character_id = c.id ORDER BY record_date DESC LIMIT 1) as latest_followers,
      (SELECT record_date FROM follower_records WHERE character_id = c.id ORDER BY record_date DESC LIMIT 1) as latest_record_date,
      (SELECT follower_count FROM follower_records WHERE character_id = c.id ORDER BY record_date DESC LIMIT 1 OFFSET 1) as prev_followers,
      (SELECT MIN(follower_count) FROM follower_records WHERE character_id = c.id) as first_followers
    FROM characters c
    ${status && status !== 'all' ? "WHERE c.status = ?" : ""}
    ORDER BY latest_followers DESC NULLS LAST
  `).all(...(status && status !== 'all' ? [status] : []));

  characters = characters.map(c => ({
    ...c,
    latest_followers: c.latest_followers || 0,
    prev_followers: c.prev_followers || 0,
    first_followers: c.first_followers || 0,
    change: (c.latest_followers || 0) - (c.prev_followers || 0),
    change_rate: c.prev_followers ? (((c.latest_followers || 0) - c.prev_followers) / c.prev_followers * 100).toFixed(1) : 0,
    total_gained: (c.latest_followers || 0) - (c.first_followers || 0),
  }));

  res.json(characters);
});

// GET single character
app.get('/api/characters/:id', (req, res) => {
  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  res.json(character);
});

// POST create character
app.post('/api/characters', (req, res) => {
  const { name, tiktok_id, tiktok_display_name, purpose, status, start_date, note } = req.body;

  if (!name || !tiktok_id) {
    return res.status(400).json({ error: 'キャラクター名とTikTokアカウントIDは必須です' });
  }
  if (!tiktok_id.startsWith('@')) {
    return res.status(400).json({ error: 'TikTokアカウントIDは@で始めてください' });
  }

  const existing = db.prepare('SELECT id FROM characters WHERE tiktok_id = ?').get(tiktok_id);
  if (existing) {
    return res.status(400).json({ error: 'このTikTokアカウントIDは既に登録されています' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO characters (id, name, tiktok_id, tiktok_display_name, purpose, status, start_date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, tiktok_id, tiktok_display_name || '', purpose || 'メインアカウント', status || '運用中', start_date || '', note || '');

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
  res.status(201).json(character);
});

// PUT update character
app.put('/api/characters/:id', (req, res) => {
  const { name, tiktok_id, tiktok_display_name, purpose, status, start_date, note } = req.body;

  const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Character not found' });

  db.prepare(`
    UPDATE characters SET name = ?, tiktok_id = ?, tiktok_display_name = ?, purpose = ?, status = ?, start_date = ?, note = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    tiktok_id || existing.tiktok_id,
    tiktok_display_name ?? existing.tiktok_display_name,
    purpose || existing.purpose,
    status || existing.status,
    start_date || existing.start_date,
    note ?? existing.note,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE character
app.delete('/api/characters/:id', (req, res) => {
  db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Follower Records API ───

// GET records for a character
app.get('/api/characters/:id/records', (req, res) => {
  const { limit } = req.query;
  const query = limit
    ? 'SELECT * FROM follower_records WHERE character_id = ? ORDER BY record_date DESC LIMIT ?'
    : 'SELECT * FROM follower_records WHERE character_id = ? ORDER BY record_date DESC';

  const records = limit
    ? db.prepare(query).all(req.params.id, parseInt(limit))
    : db.prepare(query).all(req.params.id);

  // Add change data
  const withChanges = records.map((r, i) => {
    const prev = records[i + 1];
    return {
      ...r,
      change: prev ? r.follower_count - prev.follower_count : 0,
      change_rate: prev && prev.follower_count > 0
        ? ((r.follower_count - prev.follower_count) / prev.follower_count * 100).toFixed(1)
        : '0',
    };
  });

  res.json(withChanges);
});

// POST create/update follower record
app.post('/api/records', (req, res) => {
  const { character_id, record_date, follower_count, note } = req.body;

  if (!character_id || !record_date || follower_count === undefined) {
    return res.status(400).json({ error: 'character_id, record_date, follower_count は必須です' });
  }
  if (follower_count < 0 || !Number.isInteger(follower_count)) {
    return res.status(400).json({ error: 'フォロワー数は0以上の整数を入力してください' });
  }

  const existing = db.prepare('SELECT id FROM follower_records WHERE character_id = ? AND record_date = ?')
    .get(character_id, record_date);

  if (existing) {
    db.prepare('UPDATE follower_records SET follower_count = ?, note = ? WHERE id = ?')
      .run(follower_count, note || '', existing.id);
    const updated = db.prepare('SELECT * FROM follower_records WHERE id = ?').get(existing.id);
    return res.json(updated);
  }

  const id = uuidv4();
  db.prepare('INSERT INTO follower_records (id, character_id, record_date, follower_count, note) VALUES (?, ?, ?, ?, ?)')
    .run(id, character_id, record_date, follower_count, note || '');

  const record = db.prepare('SELECT * FROM follower_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

// ─── Stats API ───

app.get('/api/stats', (req, res) => {
  const totalAccounts = db.prepare('SELECT COUNT(*) as count FROM characters').get().count;
  const activeAccounts = db.prepare("SELECT COUNT(*) as count FROM characters WHERE status = '運用中'").get().count;

  const totalFollowers = db.prepare(`
    SELECT COALESCE(SUM(latest), 0) as total FROM (
      SELECT (SELECT follower_count FROM follower_records WHERE character_id = c.id ORDER BY record_date DESC LIMIT 1) as latest
      FROM characters c
    )
  `).get().total;

  const weeklyGain = db.prepare(`
    SELECT COALESCE(SUM(gain), 0) as total FROM (
      SELECT
        (SELECT follower_count FROM follower_records WHERE character_id = c.id ORDER BY record_date DESC LIMIT 1) -
        COALESCE((SELECT follower_count FROM follower_records WHERE character_id = c.id ORDER BY record_date DESC LIMIT 1 OFFSET 1), 0) as gain
      FROM characters c
    )
  `).get().total;

  res.json({ totalAccounts, activeAccounts, totalFollowers, weeklyGain });
});

// ─── Rankings API ───

app.get('/api/rankings', (req, res) => {
  const { period } = req.query; // week, month, all

  let characters = db.prepare('SELECT * FROM characters').all();

  const rankings = characters.map(c => {
    const records = db.prepare('SELECT * FROM follower_records WHERE character_id = ? ORDER BY record_date DESC')
      .all(c.id);

    if (records.length < 2) {
      return { ...c, gain: 0, gain_rate: 0 };
    }

    let startRecord;
    const latest = records[0];

    if (period === 'week') {
      startRecord = records[1];
    } else if (period === 'month') {
      startRecord = records.find((r, i) => i >= 4) || records[records.length - 1];
    } else {
      startRecord = records[records.length - 1];
    }

    const gain = latest.follower_count - startRecord.follower_count;
    const gain_rate = startRecord.follower_count > 0
      ? ((gain / startRecord.follower_count) * 100).toFixed(1)
      : 0;

    return { ...c, gain, gain_rate: parseFloat(gain_rate) };
  });

  rankings.sort((a, b) => b.gain - a.gain);
  res.json(rankings);
});

// ─── Export API ───

app.get('/api/export/csv', (req, res) => {
  const characters = db.prepare('SELECT * FROM characters').all();
  const records = db.prepare('SELECT * FROM follower_records ORDER BY record_date DESC').all();

  let csv = 'キャラクター名,TikTokID,記録日,フォロワー数,メモ\n';
  for (const record of records) {
    const char = characters.find(c => c.id === record.character_id);
    if (char) {
      csv += `${char.name},${char.tiktok_id},${record.record_date},${record.follower_count},${record.note}\n`;
    }
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=kimiiro-tiktok-data.csv');
  res.send('\uFEFF' + csv);
});

// ─── Seed sample data ───

app.post('/api/seed', (req, res) => {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM characters').get().count;
  if (existingCount > 0) {
    return res.json({ message: 'データは既に存在します' });
  }

  const characters = [
    { id: uuidv4(), name: 'とりぴー', tiktok_id: '@toripii_official', tiktok_display_name: 'とりぴー【公式】', purpose: 'メインアカウント', status: '運用中', start_date: '2024-11-01', note: 'メインIP' },
    { id: uuidv4(), name: '爆モテゴリラ', tiktok_id: '@bakumote_gorilla', tiktok_display_name: '爆モテゴリラ', purpose: 'メインアカウント', status: '運用中', start_date: '2024-12-01', note: 'セカンドIP' },
    { id: uuidv4(), name: 'とりぴーサブ', tiktok_id: '@toripii_sub', tiktok_display_name: 'とりぴーサブ', purpose: 'サブアカウント', status: '運用中', start_date: '2025-02-01', note: 'サブアカウント' },
    { id: uuidv4(), name: 'キミイロちゃん', tiktok_id: '@kimiiro_chan', tiktok_display_name: 'キミイロちゃん', purpose: 'メインアカウント', status: '準備中', start_date: '2026-01-15', note: '新規キャラクター' },
    { id: uuidv4(), name: 'モフモフ先生', tiktok_id: '@mofumofu_sensei', tiktok_display_name: 'モフモフ先生', purpose: 'メインアカウント', status: '運用中', start_date: '2025-04-01', note: '教育系コンテンツ' },
  ];

  const insertChar = db.prepare('INSERT INTO characters (id, name, tiktok_id, tiktok_display_name, purpose, status, start_date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertRecord = db.prepare('INSERT INTO follower_records (id, character_id, record_date, follower_count, note) VALUES (?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    for (const c of characters) {
      insertChar.run(c.id, c.name, c.tiktok_id, c.tiktok_display_name, c.purpose, c.status, c.start_date, c.note);
    }

    // Generate weekly sample data
    const generateWeeklyData = (charId, startDate, startFollowers, weeklyGrowthMin, weeklyGrowthMax, weeks) => {
      let followers = startFollowers;
      const start = new Date(startDate);
      for (let w = 0; w <= weeks; w++) {
        const date = new Date(start);
        date.setDate(date.getDate() + w * 7);
        const dateStr = date.toISOString().split('T')[0];
        insertRecord.run(uuidv4(), charId, dateStr, followers, '');
        followers += Math.floor(Math.random() * (weeklyGrowthMax - weeklyGrowthMin) + weeklyGrowthMin);
      }
    };

    // とりぴー: 2024-11-01 → ~45,200 over ~70 weeks
    generateWeeklyData(characters[0].id, '2024-11-01', 0, 500, 900, 70);
    // 爆モテゴリラ: 2024-12-01 → ~38,500 over ~65 weeks
    generateWeeklyData(characters[1].id, '2024-12-01', 0, 450, 800, 65);
    // とりぴーサブ: 2025-02-01 → ~12,800 over ~56 weeks
    generateWeeklyData(characters[2].id, '2025-02-01', 0, 150, 350, 56);
    // モフモフ先生: 2025-04-01 → ~8,000 over ~48 weeks
    generateWeeklyData(characters[4].id, '2025-04-01', 0, 100, 250, 48);
  });

  transaction();
  res.json({ message: 'サンプルデータを投入しました' });
});

// ─── Serve frontend static files ───

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`キミイロ TikTok Dashboard API running on http://localhost:${PORT}`);
});
