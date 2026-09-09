export const DEFAULT_GAME_KEY = 'ta_la'

export const GAME_RULES = {
  ta_la: {
    key: 'ta_la',
    name: 'Tá lả',
    description: 'Bảng điểm tổng bằng 0 cho từng ván Tá lả.',
    roundName: 'ván',
    scoreLabel: 'Điểm ăn/thua',
    totalRule: 'Tổng điểm mỗi ván phải bằng 0.',
    zeroSum: true,
    highScoreWins: true,
  },
}

export const GAME_RULE_LIST = Object.values(GAME_RULES)

export function getGameRule(key = DEFAULT_GAME_KEY) {
  return GAME_RULES[key] || GAME_RULES[DEFAULT_GAME_KEY]
}

export function scoreTotal(scores) {
  return scores.reduce((total, item) => {
    const score = Number(item.score || 0)
    return total + (Number.isFinite(score) ? score : 0)
  }, 0)
}

export function validateScores(scores, gameKey = DEFAULT_GAME_KEY) {
  const rule = getGameRule(gameKey)
  if (!Array.isArray(scores) || scores.length < 2) {
    return `Mỗi ${rule.roundName} cần ít nhất 2 người chơi.`
  }
  if (scores.some((item) => !Number.isInteger(Number(item.score)))) {
    return 'Điểm phải là số nguyên.'
  }
  if (rule.zeroSum && scoreTotal(scores) !== 0) {
    return rule.totalRule
  }
  return null
}

export function calculateStandings(players, games, gameKey = DEFAULT_GAME_KEY) {
  const rule = getGameRule(gameKey)
  const totals = new Map(players.map((player) => [player.id, 0]))
  for (const game of games) {
    for (const score of game.game_scores || []) {
      totals.set(score.player_id, (totals.get(score.player_id) || 0) + score.score)
    }
  }
  return players
    .map((player) => ({ ...player, total: totals.get(player.id) || 0 }))
    .sort((a, b) => {
      const scoreDiff = rule.highScoreWins ? b.total - a.total : a.total - b.total
      return scoreDiff || a.name.localeCompare(b.name, 'vi')
    })
}
