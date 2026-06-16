import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Sidebar from '../../components/common/Sidebar'

const MOODS = [
  { score: 1, emoji: '😢', label: 'Very Bad' },
  { score: 3, emoji: '😔', label: 'Bad' },
  { score: 5, emoji: '😐', label: 'Okay' },
  { score: 7, emoji: '😊', label: 'Good' },
  { score: 9, emoji: '😄', label: 'Great' },
]

export default function MoodTracker() {
  const navigate = useNavigate()
  const [selectedMood, setSelectedMood] = useState(null)
  const [notes, setNotes] = useState('')
  const [moodLogs, setMoodLogs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchMoodData() }, [])

  const fetchMoodData = async () => {
    try {
      const [historyRes, analyticsRes] = await Promise.all([
        api.get('/mood/history?limit=30'),
        api.get('/mood/analytics'),
      ])
      setMoodLogs(historyRes.data)
      setAnalytics(analyticsRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedMood) { toast.error('Please select your mood'); return }
    setSubmitting(true)
    try {
      await api.post('/mood/', {
        mood_score: selectedMood.score,
        mood_label: selectedMood.label.toLowerCase(),
        notes: notes,
      })
      toast.success('Mood logged successfully!')
      setSelectedMood(null)
      setNotes('')
      fetchMoodData()
    } catch (error) {
      toast.error('Failed to log mood')
    } finally {
      setSubmitting(false)
    }
  }

  const chartData = moodLogs.slice().reverse().slice(-14).map(log => ({
    date: new Date(log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: log.mood_score,
  }))

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="user" />

      <div className="flex-1 lg:ml-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg ml-10 lg:ml-0">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mood Tracker</h1>
              <p className="text-gray-500 text-sm hidden sm:block">Monitor and understand your emotions daily</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-4xl mx-auto">

          {/* Log Mood */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">How are you feeling today?</h2>
            <p className="text-gray-500 text-sm mb-6">Select your current mood</p>

            <div className="flex items-center justify-between mb-6">
              {MOODS.map((mood) => (
                <button
                  key={mood.score}
                  onClick={() => setSelectedMood(mood)}
                  className={`flex flex-col items-center gap-1 lg:gap-2 p-2 lg:p-4 rounded-2xl transition-all ${
                    selectedMood?.score === mood.score
                      ? 'bg-primary-50 border-2 border-primary-600 scale-110'
                      : 'border-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl lg:text-4xl">{mood.emoji}</span>
                  <span className="text-xs font-medium text-gray-600 hidden sm:block">{mood.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add a note (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling? What's on your mind?"
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedMood}
              className="btn-primary w-full py-3"
            >
              {submitting ? 'Logging...' : 'Log My Mood'}
            </button>
          </div>

          {/* Analytics */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Logs', value: analytics.total_logs, emoji: '📊' },
                { label: 'Average Score', value: `${analytics.average_score}/10`, emoji: '📈' },
                { label: 'Highest', value: `${analytics.highest_score}/10`, emoji: '🌟' },
                { label: 'Lowest', value: `${analytics.lowest_score}/10`, emoji: '💙' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
                  <div className="text-2xl mb-1">{stat.emoji}</div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-sm mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Your Mood History
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value}/10`, 'Mood Score']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={2}
                    dot={{ fill: '#16a34a', r: 4 }} activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Logs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Mood Logs</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : moodLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">😊</p>
                <p className="text-gray-500">No mood logs yet — start tracking today!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {moodLogs.slice(0, 7).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{MOODS.find(m => m.score <= log.mood_score)?.emoji || '😐'}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm capitalize">{log.mood_label || 'No label'}</p>
                        {log.notes && <p className="text-gray-400 text-xs truncate max-w-xs">{log.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{log.mood_score}/10</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}