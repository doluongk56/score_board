import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateStandings, scoreTotal, validateScores } from '../src/lib/scoring.js'

test('tổng điểm được tính đúng', () => {
  assert.equal(scoreTotal([{ score: 10 }, { score: -4 }, { score: -6 }]), 0)
})

test('từ chối game có tổng khác 0', () => {
  assert.equal(validateScores([{ score: 10 }, { score: -4 }]), 'Tổng điểm của game phải bằng 0.')
})

test('xếp hạng theo tổng điểm giảm dần', () => {
  const players = [{ id: 1, name: 'An' }, { id: 2, name: 'Bình' }]
  const games = [{ game_scores: [{ player_id: 1, score: 5 }, { player_id: 2, score: -5 }] }]
  assert.deepEqual(calculateStandings(players, games).map((p) => [p.name, p.total]), [['An', 5], ['Bình', -5]])
})
