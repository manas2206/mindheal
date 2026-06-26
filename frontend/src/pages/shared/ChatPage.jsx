import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Send, MessageCircle, Clock, AlertTriangle,
  Wifi, WifiOff, Check, CheckCheck,
  Star, LogOut, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

const SESSION_DURATION = 25 * 60
const WARNING_TIME = 5 * 60

export default function ChatPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [warningShown, setWarningShown] = useState(false)
  const [isSessionChat, setIsSessionChat] = useState(false)
  const [appointmentId, setAppointmentId] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const messagesEndRef = useRef(null)
  const timerRef = useRef(null)
  const wsRef = useRef(null)
  const typingRef = useRef(null)
  const reconnectRef = useRef(null)
  const pollRef = useRef(null)
  const mountedRef = useRef(true)

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations')
      if (mountedRef.current) setConversations(res.data.conversations || [])
    } catch (error) {
      console.error('fetchConversations error:', error)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (targetUserId) => {
    const uid = targetUserId || userId
    if (!uid) return
    try {
      const res = await api.get(`/messages/${uid}`)
      if (mountedRef.current) setMessages(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('fetchMessages error:', error)
    }
  }, [userId])

  const startPolling = useCallback((targetUserId) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      if (!mountedRef.current) return
      if (targetUserId) fetchMessages(targetUserId)
      fetchConversations()
    }, 3000)
  }, [fetchMessages, fetchConversations])

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    if (!user?.user_id) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return
    if (!mountedRef.current) return

    const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1'
    const wsUrl = `${WS_BASE}/messages/ws/${user.user_id}?token=${token}`
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setWsConnected(true)
        clearInterval(pollRef.current)
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'message') {
            const currentUserId = userId ? parseInt(userId) : null
            const isRelevant = currentUserId && (
              (data.sender_id === currentUserId && data.receiver_id === user.user_id) ||
              (data.sender_id === user.user_id && data.receiver_id === currentUserId)
            )
            if (isRelevant) {
              setMessages(prev => {
                if (prev.find(m => m.id === data.id)) return prev
                return [...prev, data]
              })
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
            fetchConversations()
          }
          if (data.type === 'typing' && data.sender_id === parseInt(userId)) {
            setIsTyping(true)
            clearTimeout(typingRef.current)
            typingRef.current = setTimeout(() => {
              if (mountedRef.current) setIsTyping(false)
            }, 2000)
          }
          if (data.type === 'read_receipt') {
            setMessages(prev => prev.map(m =>
              m.sender_id === user.user_id ? { ...m, is_read: true } : m
            ))
          }
        } catch (e) {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setWsConnected(false)
        wsRef.current = null
        startPolling(userId)
        clearTimeout(reconnectRef.current)
        reconnectRef.current = setTimeout(connectWebSocket, 4000)
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setWsConnected(false)
        startPolling(userId)
      }
    } catch (error) {
      if (mountedRef.current) {
        setWsConnected(false)
        startPolling(userId)
      }
    }
  }, [user?.user_id, userId, fetchConversations, startPolling])

  useEffect(() => {
    mountedRef.current = true
    connectWebSocket()
    return () => {
      mountedRef.current = false
      if (wsRef.current) wsRef.current.close()
      clearTimeout(reconnectRef.current)
      clearInterval(pollRef.current)
    }
  }, [connectWebSocket])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    if (!userId) return
    fetchMessages(userId)
    const sendRead = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'read', sender_id: parseInt(userId) }))
      } else {
        setTimeout(sendRead, 500)
      }
    }
    setTimeout(sendRead, 500)
  }, [userId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Session setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const sessionKey = `session_${userId}`
    const apptKey = `appt_${userId}`
    const fromSession = sessionStorage.getItem(sessionKey)
    const storedApptId = sessionStorage.getItem(apptKey)

    if (fromSession) {
      setIsSessionChat(true)
      if (storedApptId) setAppointmentId(parseInt(storedApptId))
      timerRef.current = setInterval(() => setSessionTime(prev => prev + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [userId])

  // ── Session timer effects ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isSessionChat || sessionEnded) return
    const remaining = SESSION_DURATION - sessionTime
    if (remaining <= WARNING_TIME && !warningShown) {
      setShowWarning(true)
      setWarningShown(true)
      toast.error('⚠️ 5 minutes remaining in your session!', { duration: 6000 })
    }
    if (sessionTime >= SESSION_DURATION) {
      handleSessionComplete('auto')
    }
  }, [sessionTime, isSessionChat, sessionEnded])

  // ── Session end ───────────────────────────────────────────────────────────
  const handleSessionComplete = async (reason = 'manual') => {
    clearInterval(timerRef.current)
    setSessionEnded(true)
    setShowWarning(false)

    sessionStorage.removeItem(`session_${userId}`)
    sessionStorage.removeItem(`appt_${userId}`)

    if (reason === 'auto') {
      toast.success('✅ 25 minutes completed! Session ended.', { duration: 3000 })
    }

    // Mark appointment completed
    if (appointmentId && user?.role === 'therapist') {
      try {
        await api.put(`/appointments/${appointmentId}/complete`)
      } catch (e) {
        console.log('Mark complete failed:', e)
      }
    }

    // Show review for users, redirect therapist
    if (user?.role === 'user') {
      setTimeout(() => setShowReviewModal(true), 800)
    } else {
      toast.success('Session ended. Redirecting...', { duration: 2000 })
      setTimeout(() => navigate('/therapist/dashboard'), 2000)
    }
  }

  const handleEndSession = () => {
    setShowWarning(false)
    handleSessionComplete('manual')
  }

  // ── Submit Review ─────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Please write a comment')
      return
    }
    setSubmittingReview(true)
    try {
      if (appointmentId) {
        await api.post(`/appointments/${appointmentId}/review`, {
          rating: reviewRating,
          comment: reviewComment,
        })
        toast.success('Review submitted! Thank you 🎉')
      } else {
        toast.success('Session completed!')
      }
      setShowReviewModal(false)
      navigate('/appointments')
    } catch (error) {
      // Even if review fails, navigate
      toast.success('Session completed!')
      setShowReviewModal(false)
      navigate('/appointments')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleSkipReview = () => {
    setShowReviewModal(false)
    navigate('/dashboard')
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || sessionEnded) return
    const content = newMessage.trim()
    setNewMessage('')
    setSending(true)
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message', receiver_id: parseInt(userId), content }))
        setSending(false)
      } else {
        const res = await api.post(`/messages/${userId}`, { content })
        setMessages(prev => {
          if (prev.find(m => m.id === res.data.id)) return prev
          return [...prev, res.data]
        })
        fetchConversations()
        setSending(false)
      }
    } catch (error) {
      toast.error('Failed to send message')
      setNewMessage(content)
      setSending(false)
    }
  }

  const sendTypingIndicator = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userId) {
      wsRef.current.send(JSON.stringify({ type: 'typing', receiver_id: parseInt(userId) }))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    } else {
      sendTypingIndicator()
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const formatRemaining = () => {
    const r = SESSION_DURATION - sessionTime
    return r <= 0 ? '00:00' : formatTime(r)
  }

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const groupMessagesByDate = (msgs) => {
    const groups = {}
    msgs.forEach(msg => {
      const date = new Date(msg.sent_at).toDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })
    return groups
  }

  const currentConversation = conversations.find(c => c.user_id === parseInt(userId))
  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Review Modal ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900">Rate Your Session</h3>
              <button onClick={handleSkipReview} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🎉</span>
              </div>
              <h4 className="font-semibold text-gray-900">Session Completed!</h4>
              <p className="text-gray-500 text-sm mt-1">
                How was your experience with {currentConversation?.full_name || 'your therapist'}?
              </p>
            </div>

            {/* Stars */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 text-center mb-3">Rate your session</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 transition-colors ${
                      star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`} />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {reviewRating === 5 ? '⭐ Excellent' : reviewRating === 4 ? '😊 Good' : reviewRating === 3 ? '😐 Average' : reviewRating === 2 ? '😔 Poor' : '😢 Very Poor'}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Share your experience</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How did the session help you? What did you like about the therapist?"
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={handleSkipReview}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >Skip</button>
              <button onClick={handleSubmitReview} disabled={submittingReview}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {submittingReview
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Star className="w-4 h-4" />
                }
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5 Min Warning ── */}
      {showWarning && !sessionEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-yellow-400 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Session Ending Soon!</h3>
                <p className="text-gray-500 text-sm">5 minutes remaining</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-5">Your chat session will automatically end at 25 minutes.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowWarning(false)}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700"
              >Continue</button>
              <button onClick={handleEndSession}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700"
              >End Now</button>
            </div>
          </div>
        </div>
      )}

      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64 flex">

        {/* ── Conversations List ── */}
        <div className={`${userId ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 bg-white border-r border-gray-200 flex-col flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg pl-10 lg:pl-0">Messages</h2>
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              wsConnected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {wsConnected
                ? <><Wifi className="w-3 h-3" />&nbsp;Live</>
                : <><WifiOff className="w-3 h-3" />&nbsp;Polling</>
              }
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No conversations yet</p>
                {user?.role === 'user' && (
                  <Link to="/therapists" className="text-primary-600 text-xs hover:underline mt-1 block">
                    Find a therapist to chat →
                  </Link>
                )}
              </div>
            ) : (
              conversations.map((conv) => (
                <Link key={conv.user_id} to={`/chat/${conv.user_id}`}
                  className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    parseInt(userId) === conv.user_id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-primary-700 font-semibold text-sm">{conv.full_name?.charAt(0)}</span>
                    {conv.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm truncate">{conv.full_name}</p>
                      {conv.unread_count > 0 && (
                        <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-1">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{conv.last_message}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── Message Area ── */}
        {userId ? (
          <div className="flex flex-1 flex-col min-w-0">

            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/messages')}
                  className="sm:hidden p-1 mr-1 text-gray-400 hover:text-gray-600"
                >←</button>
                <div className="relative">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-semibold">
                      {currentConversation?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  {currentConversation?.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {currentConversation?.full_name || `User #${userId}`}
                  </p>
                  <p className="text-xs">
                    {isTyping ? (
                      <span className="text-primary-600 italic animate-pulse">typing...</span>
                    ) : currentConversation?.is_online ? (
                      <span className="text-green-500">● Online</span>
                    ) : (
                      <span className="text-gray-400">Offline</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Session Timer */}
                {isSessionChat && !sessionEnded && (
                  <>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      SESSION_DURATION - sessionTime <= WARNING_TIME
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-primary-200 bg-primary-50 text-primary-600'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(sessionTime)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatRemaining()} left</span>
                    </div>
                    <button onClick={handleEndSession}
                      className="flex items-center gap-1 bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium border border-red-200"
                    >
                      <LogOut className="w-3 h-3" />
                      End
                    </button>
                  </>
                )}

                {sessionEnded && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 font-medium">
                    ✅ Session Ended
                  </span>
                )}

                
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {Object.keys(messageGroups).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No messages yet — say hello! 👋</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(messageGroups).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="flex items-center justify-center my-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="mx-3 bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full whitespace-nowrap">
                          {getDateLabel(date)}
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>
                      <div className="space-y-2">
                        {msgs.map((msg) => {
                          const isMe = msg.sender_id === user?.user_id
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {!isMe && (
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                                  <span className="text-primary-700 text-xs font-bold">
                                    {currentConversation?.full_name?.charAt(0) || 'T'}
                                  </span>
                                </div>
                              )}
                              <div className={`max-w-xs lg:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words ${
                                  isMe
                                    ? 'bg-primary-600 text-white rounded-br-sm'
                                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                                }`}>
                                  {msg.content}
                                </div>
                                <div className="flex items-center gap-1 mt-1 px-1">
                                  <p className="text-gray-400 text-xs">
                                    {new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit',  timeZone: 'Asia/Kolkata' })}
                                  </p>
                                  {isMe && (
                                    msg.is_read
                                      ? <CheckCheck className="w-3 h-3 text-primary-500" />
                                      : <Check className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Typing */}
                  {isTyping && (
                    <div className="flex justify-start mt-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-primary-700 text-xs font-bold">
                          {currentConversation?.full_name?.charAt(0) || 'T'}
                        </span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1 items-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Session ended separator */}
                  {sessionEnded && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2 rounded-full">
                        ✅ Session ended • {formatTime(sessionTime)} total duration
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              {sessionEnded ? (
                <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
                  <p className="text-gray-400 text-sm">Session has ended</p>
                  {user?.role === 'user' && (
                    <button onClick={() => setShowReviewModal(true)}
                      className="flex items-center gap-1 bg-yellow-50 text-yellow-600 text-sm px-4 py-2 rounded-lg hover:bg-yellow-100 font-medium border border-yellow-200"
                    >
                      <Star className="w-4 h-4" />
                      Rate Session
                    </button>
                  )}
                  <button
                    onClick={() => navigate(user?.role === 'therapist' ? '/therapist/dashboard' : '/dashboard')}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {isSessionChat && (
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Session chat
                      </span>
                      <span className={`text-xs font-medium ${
                        SESSION_DURATION - sessionTime <= WARNING_TIME ? 'text-red-500' : 'text-primary-600'
                      }`}>
                        {formatRemaining()} remaining
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                    />
                    <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                      className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-primary-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Messages</h3>
              <p className="text-gray-500 text-sm">Select a conversation to start chatting</p>
              {user?.role === 'user' && (
                <Link to="/therapists" className="btn-primary mt-4 inline-block text-sm">Find a Therapist</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}