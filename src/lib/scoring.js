export function scoreTotal(scores) {
  return scores.reduce((total, item) => total + Number(item.score || 0), 0)
}

export function validateScores(scores) {
  if (!Array.isArray(scores) || scores.length < 2) {
    return 'Mỗi game cần ít nhất 2 người chơi.'
  }
  if (scores.some((item) => !Number.isInteger(Number(item.score)))) {
    return 'Điểm phải là số nguyên.'
  }
  if (scoreTotal(scores) !== 0) {
    return 'Tổng điểm của game phải bằng 0.'
  }
  return null
}

export function calculateStandings(players, games) {
  const totals = new Map(players.map((player) => [player.id, 0]))
  for (const game of games) {
    for (const score of game.game_scores || []) {
      totals.set(score.player_id, (totals.get(score.player_id) || 0) + score.score)
    }
  }
  return players
    .map((player) => ({ ...player, total: totals.get(player.id) || 0 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'vi'))
}
