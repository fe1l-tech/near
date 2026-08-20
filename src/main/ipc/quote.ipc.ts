import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

// 默认语录数据
const DEFAULT_QUOTES = [
  { text: 'The only way to do great work is to love what you do.', zh: '成就伟业的唯一途径是热爱你所做的事。', author: 'Steve Jobs', source: '', type: 'motivation' },
  { text: 'Stay hungry, stay foolish.', zh: '求知若饥，虚心若愚。', author: 'Steve Jobs', source: 'Stanford Commencement 2005', type: 'motivation' },
  { text: 'Think different.', zh: '不同凡想。', author: 'Apple Inc.', source: '', type: 'inspiration' },
  { text: 'Less is more.', zh: '少即是多。', author: 'Ludwig Mies van der Rohe', source: '', type: 'wisdom' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', zh: '种树最好的时间是二十年前，其次是现在。', author: 'Chinese Proverb', source: '', type: 'wisdom' },
  { text: 'It is not the mountain we conquer but ourselves.', zh: '我们征服的不是高山，而是自己。', author: 'Edmund Hillary', source: '', type: 'motivation' },
  { text: 'Everything you can imagine is real.', zh: '你能想象的一切都是真实的。', author: 'Pablo Picasso', source: '', type: 'inspiration' },
  { text: 'In the middle of difficulty lies opportunity.', zh: '困难之中蕴藏着机会。', author: 'Albert Einstein', source: '', type: 'wisdom' },
  { text: 'The journey of a thousand miles begins with a single step.', zh: '千里之行，始于足下。', author: 'Lao Tzu', source: '道德经', type: 'wisdom' },
  { text: 'Simplicity is the ultimate sophistication.', zh: '简约是最终的复杂。', author: 'Leonardo da Vinci', source: '', type: 'wisdom' },
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', zh: '代码就像幽默，如果需要解释，那就糟了。', author: 'Cory House', source: '', type: 'tech' },
  { text: 'First, solve the problem. Then, write the code.', zh: '先解决问题，再写代码。', author: 'John Johnson', source: '', type: 'tech' },
  { text: 'Talk is cheap. Show me the code.', zh: '空谈无用，给我看代码。', author: 'Linus Torvalds', source: '', type: 'tech' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', zh: '任何傻瓜都能写出计算机能理解的代码，好的程序员写出人类能理解的代码。', author: 'Martin Fowler', source: '', type: 'tech' },
  { text: 'The only limit to our realization of tomorrow is our doubts of today.', zh: '实现明天理想的唯一障碍是今天的疑虑。', author: 'Franklin D. Roosevelt', source: '', type: 'motivation' },
  { text: 'Do what you can, with what you have, where you are.', zh: '在你所在的地方，用你所拥有的，做你能做的。', author: 'Theodore Roosevelt', source: '', type: 'motivation' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', zh: '完美不是无可增添，而是无可删减。', author: 'Antoine de Saint-Exupéry', source: '', type: 'wisdom' },
  { text: 'Walking on water and developing software from a specification are easy if both are frozen.', zh: '在水上行走和按规格开发软件都很容易——前提是两者都冻结了。', author: 'Edward V. Berard', source: '', type: 'tech' },
  { text: 'Make it work, make it right, make it fast.', zh: '先让它工作，再让它正确，再让它快速。', author: 'Kent Beck', source: '', type: 'tech' },
  { text: 'The best error message is the one that never shows up.', zh: '最好的错误信息是从不出现的那个。', author: 'Thomas Fuchs', source: '', type: 'tech' },
]

export function registerQuoteIpc(): void {
  // 初始化默认语录（仅当表为空时）
  const db = getDatabase()
  const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM daily_quotes')
  countStmt.step()
  const count = (countStmt.getAsObject() as { cnt: number }).cnt
  countStmt.free()

  if (count === 0) {
    for (const q of DEFAULT_QUOTES) {
      db.run(
        `INSERT INTO daily_quotes (id, quote_text, quote_zh, author, source, quote_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), q.text, q.zh, q.author, q.source, q.type],
      )
    }
    saveDatabase()
    console.log(`[Quotes] Seeded ${DEFAULT_QUOTES.length} default quotes`)
  }

  // 随机获取一条语录
  handle('quotes:get-random', () => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM daily_quotes ORDER BY RANDOM() LIMIT 1`,
    )
    let result: unknown = null
    if (stmt.step()) result = stmt.getAsObject()
    stmt.free()
    return result
  })

  // 获取每日语录（优先未使用的）
  handle('quotes:get-daily', () => {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    // 先检查今天是否已有指定语录
    const todayStmt = db.prepare(
      `SELECT * FROM daily_quotes WHERE used_date = ? LIMIT 1`,
    )
    todayStmt.bind([today])
    let result: unknown = null
    if (todayStmt.step()) result = todayStmt.getAsObject()
    todayStmt.free()

    if (result) return result

    // 随机选择一条未使用的
    const stmt = db.prepare(
      `SELECT * FROM daily_quotes WHERE is_used = 0 ORDER BY RANDOM() LIMIT 1`,
    )
    if (stmt.step()) result = stmt.getAsObject()
    stmt.free()

    // 全部用过了，重置并随机选一条
    if (!result) {
      db.run("UPDATE daily_quotes SET is_used = 0, used_date = NULL")
      const resetStmt = db.prepare(
        `SELECT * FROM daily_quotes ORDER BY RANDOM() LIMIT 1`,
      )
      if (resetStmt.step()) result = resetStmt.getAsObject()
      resetStmt.free()
    }

    // 标记已使用
    if (result) {
      const r = result as { id: string }
      db.run("UPDATE daily_quotes SET is_used = 1, used_date = ? WHERE id = ?", [today, r.id])
      saveDatabase()
    }

    return result
  })

  // 添加语录
  handle('quotes:add-quote', (data: { text: string; zh?: string; author: string; source?: string; type?: string }) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO daily_quotes (id, quote_text, quote_zh, author, source, quote_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.text, data.zh || null, data.author, data.source || null, data.type || 'motivation'],
    )
    saveDatabase()
    return { id, ...data }
  })

  // 获取所有语录
  handle('quotes:get-quotes', (type?: string) => {
    const db = getDatabase()
    let stmt
    if (type) {
      stmt = db.prepare('SELECT * FROM daily_quotes WHERE quote_type = ? ORDER BY created_at DESC')
      stmt.bind([type])
    } else {
      stmt = db.prepare('SELECT * FROM daily_quotes ORDER BY created_at DESC')
    }
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })
}
