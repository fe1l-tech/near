/**
 * 默认语录种子数据
 *
 * 由主进程（Electron）与 Web 端共用：两端都在首次运行时把空表填满。
 */

export interface SeedQuote {
  text: string
  zh: string
  author: string
  source: string
  type: string
}

export const DEFAULT_QUOTES: SeedQuote[] = [
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
  { text: "Code is like humor. When you have to explain it, it's bad.", zh: '代码就像幽默，如果需要解释，那就糟了。', author: 'Cory House', source: '', type: 'tech' },
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

/**
 * 当语录表为空时写入默认语录。
 * @param run 执行 SQL 的函数（两端各自注入自己的 sql.js 实例）
 * @param uuid id 生成器
 * @returns 实际写入的条数
 */
export function seedDefaultQuotes(
  run: (sql: string, params?: unknown[]) => unknown,
  uuid: () => string,
): number {
  for (const quote of DEFAULT_QUOTES) {
    run(
      `INSERT INTO daily_quotes (id, quote_text, quote_zh, author, source, quote_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), quote.text, quote.zh, quote.author, quote.source, quote.type],
    )
  }
  return DEFAULT_QUOTES.length
}
