import test from 'node:test'
import assert from 'node:assert/strict'
import { GAME_RULE_LIST, calculateStandings, getGameRule, scoreTotal, validateScores } from '../src/lib/scoring.js'

test('tổng điểm được tính đúng', () => {
  assert.equal(scoreTotal([{ score: 10 }, { score: -4 }, { score: -6 }]), 0)
})

test('tổng điểm bỏ qua dấu âm đang nhập dở', () => {
  assert.equal(scoreTotal([{ score: '-' }, { score: 4 }]), 4)
})

test('từ chối game có tổng khác 0', () => {
  assert.equal(validateScores([{ score: 10 }, { score: -4 }]), 'Tổng điểm mỗi ván phải bằng 0.')
})

test('xếp hạng theo tổng điểm giảm dần', () => {
  const players = [{ id: 1, name: 'An' }, { id: 2, name: 'Bình' }]
  const games = [{ game_scores: [{ player_id: 1, score: 5 }, { player_id: 2, score: -5 }] }]
  assert.deepEqual(calculateStandings(players, games).map((p) => [p.name, p.total]), [['An', 5], ['Bình', -5]])
})

test('có rule mặc định cho Tá lả', () => {
  assert.equal(GAME_RULE_LIST[0].key, 'ta_la')
  assert.equal(getGameRule('ta_la').name, 'Tá lả')
})

test('rule không tồn tại được đưa về Tá lả', () => {
  assert.equal(getGameRule('future_game').key, 'ta_la')
})
