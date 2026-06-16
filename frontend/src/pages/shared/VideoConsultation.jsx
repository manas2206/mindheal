import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Video, VideoOff, Phone,
  MessageCircle, Monitor, MonitorOff, Heart,
  Clock, AlertTriangle, Star, X, Users,
  Wifi, WifiOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const SESSION_DURATION = 50 * 60
const WARNING_TIME = 5 * 60

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
}

export default function VideoConsultation() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sessionTime, setSessionTime] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [warningShown, setWarningShown] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [connectionState, setConnectionState] = useState('connecting')
  const [peerConnected, setPeerConnected] = useState(false)
  const [isInitiator, setIsInitiator] = useState(false)
  const [sigConnected, setSigConnected] = useState(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerRef = useRef(null)
  const sigWsRef = useRef(null)
  const timerRef = useRef(null)
  const chatEndRef = useRef(null)
  const mountedRef = useRef(true)

  // ── Fetch appointment ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchAppointment()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [])

  const fetchAppointment = async () => {
    try {
      const res = await api.get(`/appointments/${appointmentId}`)
      setAppointment(res.data)
    } catch (error) {
      toast.error('Appointment not found')
      navigate(user?.role === 'therapist' ? '/therapist/dashboard' : '/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // ── Start everything once appointment loaded ──────────────────────────────
  useEffect(() => {
    if (!appointment || loading) return
    initCamera()
    startTimer()
  }, [appointment, loading])

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return
      setSessionTime(prev => prev + 1)
    }, 1000)
  }

  useEffect(() => {
    if (sessionEnded) return
    const remaining = SESSION_DURATION - sessionTime
    if (remaining <= WARNING_TIME && !warningShown) {
      setShowWarning(true)
      setWarningShown(true)
      toast.error('⚠️ 5 minutes remaining!', { duration: 6000 })
    }
    if (sessionTime >= SESSION_DURATION) {
      handleEndCall('auto')
    }
  }, [sessionTime, sessionEnded])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Camera & Mic ──────────────────────────────────────────────────────────
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      // Start signaling after camera is ready
      connectSignaling()
    } catch (error) {
      console.warn('Camera unavailable:', error)
      toast('Camera/mic not found — joining without video', { icon: '📷' })
      connectSignaling()
    }
  }

  // ── WebRTC Signaling ──────────────────────────────────────────────────────
  const connectSignaling = useCallback(() => {
    if (!mountedRef.current) return
    const token = localStorage.getItem('access_token')
    const roomId = `appt_${appointmentId}`
    const wsUrl = `ws://localhost:8000/api/v1/messages/signal/${roomId}?token=${token}`

    try {
      const ws = new WebSocket(wsUrl)
      sigWsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setSigConnected(true)
        setConnectionState('waiting')
      }

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return
        const msg = JSON.parse(event.data)
        await handleSignalingMessage(msg)
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setSigConnected(false)
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setSigConnected(false)
        setConnectionState('error')
      }
    } catch (error) {
      setConnectionState('error')
    }
  }, [appointmentId])

  const sendSignal = (message) => {
    if (sigWsRef.current?.readyState === WebSocket.OPEN) {
      sigWsRef.current.send(JSON.stringify(message))
    }
  }

  const handleSignalingMessage = async (msg) => {
    switch (msg.type) {

      case 'joined':
        setIsInitiator(msg.is_initiator)
        if (!msg.is_initiator) {
          // Second to join — wait for offer
          setConnectionState('waiting')
        } else {
          setConnectionState('waiting_peer')
        }
        break

      case 'peer_joined':
        // The other person joined — if we are initiator, create offer
        setPeerConnected(true)
        setConnectionState('connecting_peer')
        if (isInitiator || !peerRef.current) {
          await createPeerAndOffer()
        }
        break

      case 'offer':
        await handleOffer(msg.sdp)
        break

      case 'answer':
        await handleAnswer(msg.sdp)
        break

      case 'ice':
        await handleIceCandidate(msg.candidate)
        break

      case 'peer_left':
        setPeerConnected(false)
        setConnectionState('peer_disconnected')
        toast('Other participant left the call', { icon: '👤' })
        if (peerRef.current) {
          peerRef.current.close()
          peerRef.current = null
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null
        }
        break

      default:
        break
    }
  }

  // ── WebRTC Peer Connection ────────────────────────────────────────────────
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setConnectionState('connected')
        setPeerConnected(true)
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'ice', candidate: event.candidate })
      }
    }

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (!mountedRef.current) return
      if (state === 'connected') {
        setConnectionState('connected')
        setPeerConnected(true)
        toast.success('Connected! Session started.', { duration: 2000 })
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionState('peer_disconnected')
        setPeerConnected(false)
      }
    }

    peerRef.current = pc
    return pc
  }

  const createPeerAndOffer = async () => {
    const pc = createPeerConnection()
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    sendSignal({ type: 'offer', sdp: offer })
  }

  const handleOffer = async (sdp) => {
    const pc = createPeerConnection()
    await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    sendSignal({ type: 'answer', sdp: answer })
  }

  const handleAnswer = async (sdp) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
    }
  }

  const handleIceCandidate = async (candidate) => {
    if (peerRef.current && candidate) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {}
    }
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share, go back to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream

        if (peerRef.current) {
          const videoSender = peerRef.current.getSenders().find(s => s.track?.kind === 'video')
          if (videoSender) videoSender.replaceTrack(stream.getVideoTracks()[0])
        }
        setIsScreenSharing(false)
        toast('Switched back to camera', { icon: '📷' })
      } catch (e) {
        toast.error('Could not switch back to camera')
      }
    } else {
      // Start screen share
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screen.getVideoTracks()[0]

        if (localVideoRef.current) {
          const combined = new MediaStream([screenTrack, ...localStreamRef.current.getAudioTracks()])
          localVideoRef.current.srcObject = combined
        }

        if (peerRef.current) {
          const videoSender = peerRef.current.getSenders().find(s => s.track?.kind === 'video')
          if (videoSender) videoSender.replaceTrack(screenTrack)
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false)
        }
        setIsScreenSharing(true)
        toast('Screen sharing started', { icon: '🖥️' })
      } catch (e) {
        toast.error('Screen sharing cancelled or unavailable')
      }
    }
  }

  const sendChatMessage = () => {
    if (!newMessage.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: newMessage.trim(),
      sender: user?.full_name,
      isMe: true,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }])
    setNewMessage('')
  }

  // ── End Call ──────────────────────────────────────────────────────────────
  const handleEndCall = async (reason = 'manual') => {
    clearInterval(timerRef.current)
    setSessionEnded(true)
    setShowWarning(false)
    cleanup()

    if (reason === 'auto') {
      toast.success('Session completed — 50 minutes reached!', { duration: 3000 })
    }

    // Mark appointment complete
    try {
      if (user?.role !== 'therapist') {
        await api.put(`/appointments/${appointmentId}/complete`)
      }
    } catch (e) {}

    if (user?.role === 'user') {
      setTimeout(() => setShowReviewModal(true), 800)
    } else {
      setTimeout(() => navigate('/therapist/dashboard'), 2000)
    }
  }

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
    }
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    if (sigWsRef.current) {
      sigWsRef.current.close()
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Please write a comment')
      return
    }
    setSubmittingReview(true)
    try {
      await api.post(`/appointments/${appointmentId}/review`, {
        rating: reviewRating,
        comment: reviewComment,
      })
      toast.success('Review submitted! 🎉')
      setShowReviewModal(false)
      navigate('/appointments')
    } catch (error) {
      setShowReviewModal(false)
      navigate('/appointments')
    } finally {
      setSubmittingReview(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const formatRemaining = () => {
    const r = SESSION_DURATION - sessionTime
    return r <= 0 ? '00:00' : formatTime(r)
  }

  const getConnectionLabel = () => {
    switch (connectionState) {
      case 'waiting_peer': return { text: 'Waiting for other participant...', color: 'text-yellow-400' }
      case 'waiting': return { text: 'Joining room...', color: 'text-blue-400' }
      case 'connecting_peer': return { text: 'Connecting...', color: 'text-yellow-400' }
      case 'connected': return { text: 'Connected', color: 'text-green-400' }
      case 'peer_disconnected': return { text: 'Participant disconnected', color: 'text-red-400' }
      case 'error': return { text: 'Connection error', color: 'text-red-400' }
      default: return { text: 'Initializing...', color: 'text-gray-400' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const connLabel = getConnectionLabel()

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* ── Review Modal ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Rate Your Session</h3>
              <button onClick={() => { setShowReviewModal(false); navigate('/appointments') }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-semibold text-gray-900">Session Completed!</p>
              <p className="text-gray-500 text-sm mt-1">
                How was your video session with {appointment?.therapist_name || 'your therapist'}?
              </p>
            </div>
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 text-center mb-3">Rate your experience</p>
              <div className="flex items-center justify-center gap-2">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {reviewRating === 5 ? '⭐ Excellent' : reviewRating === 4 ? '😊 Good' : reviewRating === 3 ? '😐 Average' : reviewRating === 2 ? '😔 Poor' : '😢 Very Poor'}
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Share your experience</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was the video session? Was the therapist helpful?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowReviewModal(false); navigate('/dashboard') }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm"
              >Skip</button>
              <button onClick={handleSubmitReview} disabled={submittingReview}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 text-sm flex items-center justify-center gap-2"
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
                <h3 className="font-bold text-gray-900">Session Ending Soon!</h3>
                <p className="text-gray-500 text-sm">5 minutes remaining</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-5">Your video session will end automatically at 50 minutes.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowWarning(false)}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium text-sm"
              >Continue</button>
              <button onClick={() => handleEndCall('manual')}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm"
              >End Now</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-gray-800 px-4 lg:px-6 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold">MindHeal</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-300 text-sm hidden sm:block">
            {appointment?.therapist_name || appointment?.patient_name || `Session #${appointmentId}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 text-xs ${connLabel.color}`}>
            {connectionState === 'connected'
              ? <Wifi className="w-3 h-3" />
              : <WifiOff className="w-3 h-3" />
            }
            <span className="hidden sm:block">{connLabel.text}</span>
          </div>

          {/* Timer */}
          {!sessionEnded && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              SESSION_DURATION - sessionTime <= WARNING_TIME
                ? 'border-red-500 bg-red-900 bg-opacity-50 text-red-300'
                : 'border-gray-600 bg-gray-700 text-gray-200'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{formatTime(sessionTime)} / 50:00</span>
              <span className="text-gray-400">•</span>
              <span>{formatRemaining()} left</span>
            </div>
          )}

          {sessionEnded && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900 bg-opacity-40 px-3 py-1.5 rounded-full border border-green-700">
              ✅ Session Ended
            </span>
          )}
        </div>
      </header>

      {/* ── Main Area ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Video Grid */}
        <div className="flex-1 relative bg-gray-950 p-2 lg:p-4">

          {/* Remote Video (full screen) */}
          <div className="w-full h-full bg-gray-800 rounded-2xl overflow-hidden relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Show placeholder when not connected */}
            {!peerConnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-white font-semibold text-lg">
                    {user?.role === 'user'
                      ? (appointment?.therapist_name || 'Your Therapist')
                      : (appointment?.patient_name || 'Your Patient')
                    }
                  </p>
                  <p className={`text-sm mt-2 ${connLabel.color}`}>{connLabel.text}</p>
                  {connectionState === 'waiting_peer' && (
                    <div className="flex items-center justify-center gap-1 mt-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Remote name overlay */}
            {peerConnected && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-60 rounded-xl px-3 py-1.5">
                <p className="text-white text-sm font-medium">
                  {user?.role === 'user'
                    ? (appointment?.therapist_name || 'Therapist')
                    : (appointment?.patient_name || 'Patient')
                  }
                </p>
              </div>
            )}

            {/* Session ended overlay */}
            {sessionEnded && !showReviewModal && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <p className="text-white text-xl font-bold mb-2">Session Ended</p>
                  <p className="text-gray-300 text-sm">Duration: {formatTime(sessionTime)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Local Video (PiP) */}
          <div className="absolute bottom-6 right-6 w-40 h-28 lg:w-52 lg:h-36 bg-gray-700 rounded-2xl overflow-hidden border-2 border-gray-600 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{user?.full_name?.charAt(0)}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 rounded-lg px-2 py-0.5">
              <p className="text-white text-xs">You {isMuted ? '🔇' : ''}</p>
            </div>
          </div>
        </div>

        {/* ── In-call Chat ── */}
        {showChat && (
          <div className="w-72 bg-gray-800 flex flex-col border-l border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Session Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-xs text-center mt-4">No messages yet</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-48 rounded-xl px-3 py-2 ${
                      msg.isMe ? 'bg-primary-600' : 'bg-gray-700'
                    }`}>
                      <p className="text-white text-xs font-medium mb-0.5 opacity-70">{msg.sender}</p>
                      <p className="text-white text-sm">{msg.text}</p>
                      <p className="text-white text-xs opacity-50 mt-0.5 text-right">{msg.time}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Message..."
                  className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button onClick={sendChatMessage}
                  className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="bg-gray-800 px-4 py-4 border-t border-gray-700">
        {sessionEnded ? (
          <div className="flex items-center justify-center gap-3">
            <p className="text-gray-400 text-sm">Session ended</p>
            {user?.role === 'user' && (
              <button onClick={() => setShowReviewModal(true)}
                className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-yellow-600"
              >
                <Star className="w-4 h-4" />Rate Session
              </button>
            )}
            <button
              onClick={() => navigate(user?.role === 'therapist' ? '/therapist/dashboard' : '/dashboard')}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 lg:gap-4">

            {/* Mute */}
            <button onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>

            {/* Video */}
            <button onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
            </button>

            {/* Screen Share */}
            <button onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isScreenSharing ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5 text-white" /> : <Monitor className="w-5 h-5 text-white" />}
            </button>

            {/* Chat */}
            <button onClick={() => setShowChat(!showChat)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${
                showChat ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="In-call chat"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              {messages.length > 0 && !showChat && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white" style={{fontSize:'8px'}}>
                  {messages.length}
                </span>
              )}
            </button>

            {/* End Call */}
            <button onClick={() => handleEndCall('manual')}
              className="w-16 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all ml-2"
              title="End call"
            >
              <Phone className="w-5 h-5 text-white rotate-[135deg]" />
            </button>

          </div>
        )}
      </div>
    </div>
  )
}