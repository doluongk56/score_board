import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Edit3,
  Gamepad2,
  LogIn,
  LogOut,
  Medal,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { isConfigured, supabase } from './lib/supabase.js'
import { calculateStandings, scoreTotal, validateScores } from './lib/scoring.js'

const formatDate = (date) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(new Date(`${date}T00:00:00`))

const today = () => new Date().toISOString().slice(0, 10)

function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState({ name: 'tours' })
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const notify = useCallback((message, type = 'success') => {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
  }, [])

  if (!isConfigured) return <SetupRequired />

  const navigate = (next) => {
    setPage(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate({ name: 'tours' })}>
          <span className="brand-mark"><Gamepad2 size={22} /></span>
          <span><strong>Game Score</strong><small>Chơi vui, tính chuẩn</small></span>
        </button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <button className={page.name === 'tours' ? 'active' : ''} onClick={() => navigate({ name: 'tours' })}>
            <Trophy size={18} /> Các tour
          </button>
          <button className={page.name === 'players' ? 'active' : ''} onClick={() => navigate({ name: 'players' })}>
            <Users size={18} /> Người chơi
          </button>
          {session ? (
            <button onClick={() => supabase.auth.signOut()}><LogOut size={18} /> Đăng xuất</button>
          ) : (
            <button onClick={() => { setLoginOpen(true); setMenuOpen(false) }}><LogIn size={18} /> Quản trị</button>
          )}
        </nav>
        <div className="admin-status">
          {session ? <span><span className="status-dot" /> Quản trị</span> : <span>Chỉ xem</span>}
        </div>
        <button className="menu-button" aria-label="Mở menu" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        {page.name === 'tours' && <ToursPage admin={Boolean(session)} navigate={navigate} notify={notify} />}
        {page.name === 'players' && <PlayersPage admin={Boolean(session)} notify={notify} onLogin={() => setLoginOpen(true)} />}
        {page.name === 'tour' && (
          <TourPage tourId={page.id} admin={Boolean(session)} navigate={navigate} notify={notify} />
        )}
      </main>

      <footer>Game Scoreboard · Dữ liệu được lưu an toàn trên Supabase</footer>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} notify={notify} />}
      {notice && <div className={`toast ${notice.type}`}>{notice.type === 'success' ? <Check /> : <X />}{notice.message}</div>}
    </div>
  )
}

function SetupRequired() {
  return (
    <main className="setup-page">
      <div className="setup-card">
        <span className="brand-mark large"><Settings /></span>
        <p className="eyebrow">Cần cấu hình lần đầu</p>
        <h1>Kết nối Supabase để bắt đầu</h1>
        <p>Copy <code>.env.example</code> thành <code>.env</code>, sau đó điền URL và anon key của project.</p>
        <pre>VITE_SUPABASE_URL=https://...supabase.co{`\n`}VITE_SUPABASE_ANON_KEY=...</pre>
        <p className="muted">Xem hướng dẫn đầy đủ trong file README.md.</p>
      </div>
    </main>
  )
}

function LoginModal({ onClose, notify }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return notify('Email hoặc mật khẩu không đúng.', 'error')
    notify('Đã đăng nhập quản trị.')
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Đăng nhập quản trị">
      <form onSubmit={submit} className="stack-form">
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" /></label>
        <label>Mật khẩu<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
        <button className="primary full" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <LogIn />} Đăng nhập</button>
      </form>
    </Modal>
  )
}

function ToursPage({ admin, navigate, notify }) {
  const [tours, setTours] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: tourRows, error }, { data: playerRows }] = await Promise.all([
      supabase.from('tours').select('*, tour_players(count), games(count)').order('played_on', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('players').select('*').eq('is_active', true).order('name'),
    ])
    if (error) notify(error.message, 'error')
    setTours(tourRows || [])
    setPlayers(playerRows || [])
    setLoading(false)
  }, [notify])

  useEffect(() => { load() }, [load])

  return (
    <section className="page-container">
      <div className="page-heading">
        <div><p className="eyebrow">Lịch sử thi đấu</p><h1>Các tour chơi game</h1><p>Mở một tour để xem bảng xếp hạng và điểm từng game.</p></div>
        {admin && <button className="primary" onClick={() => setCreateOpen(true)}><Plus /> Tạo tour</button>}
      </div>

      {loading ? <Loading /> : tours.length === 0 ? (
        <Empty icon={<Trophy />} title="Chưa có tour nào" text={admin ? 'Tạo tour đầu tiên và chọn người tham gia.' : 'Quản trị viên chưa tạo tour.'} />
      ) : (
        <div className="tour-grid">
          {tours.map((tour) => (
            <button className="tour-card" key={tour.id} onClick={() => navigate({ name: 'tour', id: tour.id })}>
              <div className="tour-card-top"><span className="tour-icon"><Trophy /></span><ChevronRight /></div>
              <h2>{tour.name}</h2>
              <p><CalendarDays /> {formatDate(tour.played_on)}</p>
              <div className="tour-meta"><span><Users /> {tour.tour_players?.[0]?.count || 0} người</span><span><Gamepad2 /> {tour.games?.[0]?.count || 0} game</span></div>
            </button>
          ))}
        </div>
      )}
      {!admin && <ReadOnlyHint />}
      {createOpen && <CreateTourModal players={players} onClose={() => setCreateOpen(false)} onCreated={load} notify={notify} />}
    </section>
  )
}

function CreateTourModal({ players, onClose, onCreated, notify }) {
  const [name, setName] = useState(`Tour ${formatDate(today())}`)
  const [date, setDate] = useState(today())
  const [selected, setSelected] = useState(() => players.map((p) => p.id))
  const [busy, setBusy] = useState(false)

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id])

  const submit = async (event) => {
    event.preventDefault()
    if (selected.length < 2) return notify('Hãy chọn ít nhất 2 người chơi.', 'error')
    setBusy(true)
    const { data: tour, error } = await supabase.from('tours').insert({ name: name.trim(), played_on: date }).select().single()
    if (error) { setBusy(false); return notify(error.message, 'error') }
    const { error: memberError } = await supabase.from('tour_players').insert(selected.map((player_id) => ({ tour_id: tour.id, player_id })))
    if (memberError) {
      await supabase.from('tours').delete().eq('id', tour.id)
      setBusy(false)
      return notify(memberError.message, 'error')
    }
    setBusy(false)
    notify('Đã tạo tour mới.')
    await onCreated()
    onClose()
  }

  return (
    <Modal title="Tạo tour mới" onClose={onClose} wide>
      <form onSubmit={submit} className="stack-form">
        <div className="form-row">
          <label>Tên tour<input required maxLength="100" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Ngày chơi<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <fieldset><legend>Chọn người tham gia <span>{selected.length} đã chọn</span></legend>
          {players.length === 0 ? <p className="muted">Hãy thêm người chơi trước.</p> : (
            <div className="check-grid">{players.map((player) => (
              <label className={selected.includes(player.id) ? 'check-card selected' : 'check-card'} key={player.id}>
                <input type="checkbox" checked={selected.includes(player.id)} onChange={() => toggle(player.id)} />
                <span className="avatar">{player.name.charAt(0).toUpperCase()}</span><span>{player.name}</span><Check />
              </label>
            ))}</div>
          )}
        </fieldset>
        <button className="primary full" disabled={busy || players.length < 2}>{busy ? <RefreshCw className="spin" /> : <Plus />} Tạo tour</button>
      </form>
    </Modal>
  )
}

function PlayersPage({ admin, notify, onLogin }) {
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('players').select('*').order('is_active', { ascending: false }).order('name')
    if (error) notify(error.message, 'error')
    setPlayers(data || [])
    setLoading(false)
  }, [notify])
  useEffect(() => { load() }, [load])

  const add = async (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    const { error } = await supabase.from('players').insert({ name: cleanName })
    if (error) return notify(error.code === '23505' ? 'Tên người chơi đã tồn tại.' : error.message, 'error')
    setName('')
    notify(`Đã thêm ${cleanName}.`)
    load()
  }

  const toggleActive = async (player) => {
    const { error } = await supabase.from('players').update({ is_active: !player.is_active }).eq('id', player.id)
    if (error) return notify(error.message, 'error')
    notify(player.is_active ? `Đã ẩn ${player.name}.` : `Đã khôi phục ${player.name}.`)
    load()
  }

  const remove = async (player) => {
    if (!window.confirm(`Xoá ${player.name}? Nếu đã có lịch sử, người này sẽ chỉ được ẩn.`)) return
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    if (error) {
      const { error: archiveError } = await supabase.from('players').update({ is_active: false }).eq('id', player.id)
      if (archiveError) return notify(archiveError.message, 'error')
      notify(`${player.name} đã có lịch sử nên được chuyển sang trạng thái ẩn.`)
    } else notify(`Đã xoá ${player.name}.`)
    load()
  }

  return (
    <section className="page-container narrow">
      <div className="page-heading"><div><p className="eyebrow">Thành viên</p><h1>Người chơi</h1><p>Người đã có điểm sẽ được ẩn thay vì xoá khỏi lịch sử.</p></div></div>
      {admin && (
        <form className="add-player" onSubmit={add}><div><UserPlus /><input value={name} onChange={(e) => setName(e.target.value)} maxLength="60" placeholder="Nhập tên người chơi…" /></div><button className="primary"><Plus /> Thêm</button></form>
      )}
      {loading ? <Loading /> : (
        <div className="player-list">{players.map((player) => (
          <div className={`player-row ${player.is_active ? '' : 'inactive'}`} key={player.id}>
            <span className="avatar">{player.name.charAt(0).toUpperCase()}</span>
            <div><strong>{player.name}</strong><small>{player.is_active ? 'Đang hoạt động' : 'Đã ẩn'}</small></div>
            {admin && <div className="row-actions"><button className="ghost" onClick={() => toggleActive(player)}>{player.is_active ? <UserMinus /> : <RefreshCw />}{player.is_active ? 'Ẩn' : 'Khôi phục'}</button><button className="icon-danger" aria-label="Xoá" onClick={() => remove(player)}><Trash2 /></button></div>}
          </div>
        ))}</div>
      )}
      {!admin && <ReadOnlyHint onLogin={onLogin} />}
    </section>
  )
}

function TourPage({ tourId, admin, navigate, notify }) {
  const [tour, setTour] = useState(null)
  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null)
  const [renameOpen, setRenameOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: tourRow, error }, { data: members }, { data: gameRows }] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('tour_players').select('player_id, players(id,name,is_active)').eq('tour_id', tourId),
      supabase.from('games').select('id, game_number, created_at, game_scores(player_id,score)').eq('tour_id', tourId).order('game_number'),
    ])
    if (error) notify(error.message, 'error')
    setTour(tourRow)
    setPlayers((members || []).map((m) => m.players).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'vi')))
    setGames(gameRows || [])
    setLoading(false)
  }, [tourId, notify])
  useEffect(() => { load() }, [load])

  const standings = useMemo(() => calculateStandings(players, games), [players, games])

  const removeGame = async (game) => {
    if (!window.confirm(`Xoá Game ${game.game_number}?`)) return
    const { error } = await supabase.rpc('delete_game', { p_game_id: game.id })
    if (error) return notify(error.message, 'error')
    notify('Đã xoá game.')
    load()
  }

  const removeTour = async () => {
    if (!window.confirm(`Xoá toàn bộ “${tour.name}” và tất cả điểm? Hành động này không thể hoàn tác.`)) return
    const { error } = await supabase.from('tours').delete().eq('id', tour.id)
    if (error) return notify(error.message, 'error')
    notify('Đã xoá tour.')
    navigate({ name: 'tours' })
  }

  if (loading) return <section className="page-container"><Loading /></section>
  if (!tour) return <section className="page-container"><Empty icon={<X />} title="Không tìm thấy tour" text="Tour có thể đã bị xoá." /></section>

  return (
    <section className="page-container">
      <button className="back-button" onClick={() => navigate({ name: 'tours' })}><ArrowLeft /> Tất cả tour</button>
      <div className="tour-hero">
        <div>
          <p className="eyebrow"><CalendarDays /> {formatDate(tour.played_on)}</p>
          <div className="tour-title-row">
            <h1>{tour.name}</h1>
            {admin && <button className="icon-button" aria-label="Đổi tên tour" onClick={() => setRenameOpen(true)}><Edit3 /></button>}
          </div>
          <p>{players.length} người chơi · {games.length} game đã hoàn thành</p>
        </div>
        {admin && <div className="hero-actions"><button className="primary" onClick={() => setEditor({ mode: 'new' })}><Plus /> Thêm game</button><button className="icon-danger" aria-label="Xoá tour" onClick={removeTour}><Trash2 /></button></div>}
      </div>

      <div className="detail-grid">
        <article className="panel standings-panel">
          <div className="panel-title"><div><p className="eyebrow">Tổng kết</p><h2>Bảng xếp hạng</h2></div><Medal /></div>
          <div className="standings">{standings.map((player, index) => (
            <div className={`standing-row rank-${index + 1}`} key={player.id}>
              <RankBadge rank={index + 1} /><span className="avatar">{player.name.charAt(0).toUpperCase()}</span><strong>{player.name}</strong><Score value={player.total} />
            </div>
          ))}</div>
        </article>

        <article className="panel games-panel">
          <div className="panel-title"><div><p className="eyebrow">Chi tiết</p><h2>Kết quả từng game</h2></div><Gamepad2 /></div>
          {games.length === 0 ? <Empty icon={<Gamepad2 />} title="Chưa có game" text={admin ? 'Nhấn “Thêm game” để nhập kết quả.' : 'Chưa có kết quả được nhập.'} compact /> : (
            <div className="game-list">{games.map((game) => (
              <div className="game-row" key={game.id}>
                <div className="game-number">G{game.game_number}</div>
                <div className="game-scores">{players.map((player) => {
                  const value = game.game_scores?.find((s) => s.player_id === player.id)?.score ?? 0
                  return <span key={player.id}><small>{player.name}</small><Score value={value} /></span>
                })}</div>
                {admin && <div className="row-actions"><button className="icon-button" aria-label="Sửa" onClick={() => setEditor({ mode: 'edit', game })}><Edit3 /></button><button className="icon-danger" aria-label="Xoá" onClick={() => removeGame(game)}><Trash2 /></button></div>}
              </div>
            ))}</div>
          )}
        </article>
      </div>
      {!admin && <ReadOnlyHint />}
      {editor && <GameEditor tourId={tour.id} players={players} game={editor.game} onClose={() => setEditor(null)} onSaved={load} notify={notify} />}
      {renameOpen && <RenameTourModal tour={tour} onClose={() => setRenameOpen(false)} onSaved={load} notify={notify} />}
    </section>
  )
}

function RankBadge({ rank }) {
  if (rank <= 3) {
    return <span className={`rank medal-rank medal-${rank}`} aria-label={`Hạng ${rank}`}><Medal /></span>
  }
  return <span className="rank">{rank}</span>
}

function RenameTourModal({ tour, onClose, onSaved, notify }) {
  const [name, setName] = useState(tour.name)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return notify('Tên tour không được để trống.', 'error')
    setBusy(true)
    const { error } = await supabase.from('tours').update({ name: cleanName }).eq('id', tour.id)
    setBusy(false)
    if (error) return notify(error.message, 'error')
    notify('Đã đổi tên tour.')
    await onSaved()
    onClose()
  }

  return (
    <Modal title="Đổi tên tour" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>Tên tour<input required maxLength="100" value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} /></label>
        <button className="primary full" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <Save />} Lưu tên mới</button>
      </form>
    </Modal>
  )
}

function GameEditor({ tourId, players, game, onClose, onSaved, notify }) {
  const initial = players.map((player) => ({
    player_id: player.id,
    name: player.name,
    score: String(game?.game_scores?.find((item) => item.player_id === player.id)?.score ?? 0),
  }))
  const [scores, setScores] = useState(initial)
  const [busy, setBusy] = useState(false)
  const total = scoreTotal(scores)

  const update = (id, raw) => {
    if (!/^-?\d*$/.test(raw)) return
    setScores((current) => current.map((item) => item.player_id === id ? { ...item, score: raw } : item))
  }
  const toggleSign = (id) => {
    setScores((current) => current.map((item) => {
      if (item.player_id !== id) return item
      const score = String(item.score)
      return { ...item, score: score.startsWith('-') ? score.slice(1) : `-${score}` }
    }))
  }
  const balanceLast = () => {
    if (scores.length < 2) return
    const rest = scores.slice(0, -1).reduce((sum, item) => sum + Number(item.score || 0), 0)
    setScores((current) => current.map((item, index) => index === current.length - 1 ? { ...item, score: String(-rest) } : item))
  }
  const submit = async (event) => {
    event.preventDefault()
    const payload = scores.map(({ player_id, score }) => ({ player_id, score: Number(score) }))
    const message = validateScores(payload)
    if (message) return notify(message, 'error')
    setBusy(true)
    const { error } = await supabase.rpc('save_game', { p_tour_id: tourId, p_scores: payload, p_game_id: game?.id || null })
    setBusy(false)
    if (error) return notify(error.message, 'error')
    notify(game ? 'Đã cập nhật điểm.' : 'Đã lưu game mới.')
    await onSaved()
    onClose()
  }

  return (
    <Modal title={game ? `Sửa điểm Game ${game.game_number}` : 'Nhập điểm game mới'} onClose={onClose} wide>
      <form className="stack-form" onSubmit={submit}>
        <div className="score-inputs">{scores.map((item, index) => (
          <label key={item.player_id}><span><span className="avatar small">{item.name.charAt(0).toUpperCase()}</span>{item.name}{index === scores.length - 1 && <small> · người cân điểm</small>}</span><span className="score-field"><button type="button" className="sign-button" aria-label={`Đổi dấu điểm của ${item.name}`} onClick={() => toggleSign(item.player_id)}>+/-</button><input type="text" inputMode="numeric" pattern="-?[0-9]*" required value={item.score} onFocus={(e) => e.target.select()} onChange={(e) => update(item.player_id, e.target.value)} /></span></label>
        ))}</div>
        <div className={`score-total ${total === 0 ? 'valid' : 'invalid'}`}><span>Tổng điểm</span><strong>{total > 0 ? `+${total}` : total}</strong><span>{total === 0 ? <><Check /> Hợp lệ</> : 'Cần bằng 0'}</span></div>
        <button type="button" className="ghost full" onClick={balanceLast}><RefreshCw /> Tự cân điểm người cuối</button>
        <button className="primary full" disabled={busy || total !== 0}>{busy ? <RefreshCw className="spin" /> : <Save />} {game ? 'Lưu thay đổi' : 'Lưu game'}</button>
      </form>
    </Modal>
  )
}

function Score({ value }) {
  return <strong className={`score ${value > 0 ? 'positive' : value < 0 ? 'negative' : ''}`}>{value > 0 ? `+${value}` : value}</strong>
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X /></button></div>
        {children}
      </div>
    </div>
  )
}

function Loading() { return <div className="loading"><RefreshCw className="spin" /> Đang tải dữ liệu…</div> }
function Empty({ icon, title, text, compact = false }) { return <div className={`empty ${compact ? 'compact' : ''}`}><span>{icon}</span><h2>{title}</h2><p>{text}</p></div> }
function ReadOnlyHint({ onLogin }) {
  return (
    <div className="readonly">
      <CircleUserRound />
      <span>Bạn đang xem công khai. Đăng nhập quản trị để thêm hoặc sửa dữ liệu.</span>
      {onLogin && <button className="ghost" onClick={onLogin}><LogIn /> Đăng nhập</button>}
    </div>
  )
}

export default App
