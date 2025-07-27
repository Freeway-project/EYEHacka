'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle, Clock, TrendingUp, X, AlertTriangle, Eye } from 'lucide-react'

// Mock hook since the original isn't available
const useVideoRecording = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setVideoStream(stream)
      setHasPermission(true)
      setIsRecording(true)
      setPermissionError(null)
      return Promise.resolve()
    } catch (error) {
      setPermissionError('Camera access denied. Please allow camera access and try again.')
      setHasPermission(false)
      return Promise.reject(error)
    }
  }
  
  const stopRecording = async () => {
    setIsRecording(false)
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop())
    }
    
    // Simulate analysis
    setIsAnalyzing(true)
    setTimeout(() => {
      setAnalysisResults({
        video_info: {
          duration: 20.0,
          fps: 30.0,
          total_frames: 600
        },
        analysis: {
          frames_analyzed: 580,
          frames_with_face: 520,
          face_detection_rate: 89.7,
          lazy_eye_detections: 0,
          detection_events: []
        },
        risk_assessment: {
          level: 'LOW',
          confidence: '85%',
          recommendation: 'No signs of lazy eye detected. Regular check-ups recommended.'
        }
      })
      setIsAnalyzing(false)
    }, 3000)
    
    return `eye_tracking_${Date.now()}.mp4`
  }
  
  return {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    videoPreview: null,
    videoStream,
    analysisResults,
    isAnalyzing,
    setAnalysisResults
  }
}

interface EyeTrackingAssessmentProps {
  onBack: () => void
}

type AssessmentPhase = 'intro' | 'consent' | 'positioning' | 'permission' | 'countdown' | 'assessment' | 'complete'

// Analysis Results Component
interface AnalysisData {
  video_info: {
    duration: number
    fps: number
    total_frames: number
  }
  analysis: {
    frames_analyzed: number
    frames_with_face: number
    face_detection_rate: number
    lazy_eye_detections: number
    detection_events: Array<{
      timestamp: number
      left_displacement: number
      right_displacement: number
      message: string
    }>
  }
  risk_assessment: {
    level: 'HIGH' | 'LOW' | 'MEDIUM'
    confidence: string
    recommendation: string
  }
}

interface AnalysisResultsProps {
  analysis: AnalysisData | null
  isAnalyzing: boolean
  onClose: () => void
}

const AnalysisResults = ({ analysis, isAnalyzing, onClose }: AnalysisResultsProps) => {
  if (!isAnalyzing && !analysis) return null
  
  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Uploading & Analyzing...</h3>
            <p className="text-gray-600">Please wait while we process and analyze the video.</p>
            <div className="mt-4 text-sm text-gray-500">
              This may take up to 20 seconds including upload
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) return null

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'HIGH': return <AlertTriangle className="w-6 h-6 text-red-600" />
      case 'MEDIUM': return <AlertTriangle className="w-6 h-6 text-yellow-600" />
      default: return <CheckCircle className="w-6 h-6 text-green-600" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">👁️ Eye Tracking Analysis</h2>
              <p className="text-sm text-gray-600 mt-1">AI-powered lazy eye detection results</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Risk Assessment Banner */}
        <div className="p-6">
          <div className={`border rounded-xl p-6 mb-6 ${getRiskColor(analysis.risk_assessment.level)}`}>
            <div className="flex items-center space-x-4 mb-3">
              {getRiskIcon(analysis.risk_assessment.level)}
              <div>
                <h3 className="font-bold text-xl">Risk Level: {analysis.risk_assessment.level}</h3>
                <p className="text-sm opacity-75">Analysis Confidence: {analysis.risk_assessment.confidence}</p>
              </div>
            </div>
            <div className="bg-white bg-opacity-50 rounded-lg p-4">
              <p className="font-medium text-lg">{analysis.risk_assessment.recommendation}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-blue-800 mb-1">Video Duration</h4>
              <p className="text-3xl font-bold text-blue-600">
                {analysis.video_info.duration.toFixed(1)}s
              </p>
              <p className="text-xs text-blue-600 mt-1">{analysis.video_info.total_frames} frames</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
              <Eye className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-green-800 mb-1">Face Detection</h4>
              <p className="text-3xl font-bold text-green-600">
                {analysis.analysis.face_detection_rate.toFixed(1)}%
              </p>
              <p className="text-xs text-green-600 mt-1">{analysis.analysis.frames_with_face} frames</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h4 className="font-semibold text-orange-800 mb-1">Detections</h4>
              <p className="text-3xl font-bold text-orange-600">
                {analysis.analysis.lazy_eye_detections}
              </p>
              <p className="text-xs text-orange-600 mt-1">lazy eye events</p>
            </div>
          </div>

          {/* Detection Events */}
          {analysis.analysis.detection_events.length > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-red-800 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                ⚠️ Detection Events ({analysis.analysis.detection_events.length})
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {analysis.analysis.detection_events.map((event, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-red-800">{event.message}</p>
                        <p className="text-gray-600 text-sm">⏱️ At {event.timestamp.toFixed(1)} seconds</p>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
                        <div>Left: {event.left_displacement.toFixed(1)}px</div>
                        <div>Right: {event.right_displacement.toFixed(1)}px</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h4 className="font-semibold text-green-800 mb-2 text-lg">✅ No Issues Detected</h4>
              <p className="text-green-700">
                The analysis found no signs of lazy eye or significant eye movement asymmetry. 
                Both eyes appear to be tracking normally.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <div className="text-sm text-gray-600">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Analysis powered by MediaPipe AI
              </div>
              <p className="mt-1">Results are for screening purposes only</p>
            </div>
            <div className="flex space-x-3">
              {analysis.risk_assessment.level === 'HIGH' && (
                <button className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors">
                  📞 Consult Professional
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EyeTrackingAssessment({ onBack }: EyeTrackingAssessmentProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [assessmentTime, setAssessmentTime] = useState(0)
  const [savedFilename, setSavedFilename] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up' | 'down'>('center')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  
  const {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    videoStream,
    analysisResults,
    isAnalyzing,
    setAnalysisResults
  } = useVideoRecording()

  // Handle camera permission check
  const requestPermission = async () => {
    setPhase('permission')
    try {
      await startRecording()
      // If permission granted, stop immediately and go to countdown
      if (hasPermission) {
        await stopRecording()
        setTimeout(() => setPhase('countdown'), 500)
      }
    } catch (error) {
      console.error('Permission request failed:', error)
    }
  }

  // Set up video stream for display
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream
    }
  }, [videoStream])

  // Countdown effect
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('assessment')
      startAssessment()
    }
  }, [phase, countdown])

  // Start assessment with recording
  const startAssessment = async () => {
    await startRecording()
    
    const duration = 20000 // 20 seconds
    const startTime = Date.now()
    
    // Eye movement sequence: center -> left -> right -> up -> down -> center (repeat)
    const eyeSequence = ['center', 'left', 'right', 'up', 'down'] as const
    let sequenceIndex = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Change eye direction every 4 seconds (20/5 = 4 seconds each)
      const currentSequenceIndex = Math.floor((elapsed / 4000)) % eyeSequence.length
      if (currentSequenceIndex !== sequenceIndex) {
        sequenceIndex = currentSequenceIndex
        setEyeDirection(eyeSequence[sequenceIndex])
      }
      
      setAssessmentTime(Math.floor(elapsed / 1000))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        completeAssessment()
      }
    }
    
    animate()
  }

  // Complete assessment
  const completeAssessment = async () => {
    console.log('🏁 Assessment completed, stopping recording...')
    const filename = await stopRecording()
    setSavedFilename(filename)
    console.log('💾 Video saved:', filename)
    setPhase('complete')
  }

  if (phase === 'intro') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center mb-6">
          <button onClick={onBack} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Eye Tracking Assessment</h1>
        </header>

        <div className="bg-blue-100 rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Welcome to Infant Assessment</h2>
          <p className="text-gray-700 mb-4">
            The child interacts with the animation and we help you screen for Lazy eye, crossed eyes, etc.
          </p>
          <p className="text-gray-600 text-sm">
            📹 Assessment Duration: 20 seconds
          </p>
        </div>

        <div className="bg-gray-100 rounded-3xl p-6 mb-8">
          <h3 className="font-semibold mb-3">Instructions for Caregivers</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Ensure the infant is comfortably seated.</li>
            <li>• Guide their attention towards the screen.</li>
            <li>• Adjust the volume to a gentle level.</li>
          </ul>
        </div>

        <div className="flex space-x-4 mb-6">
          <button 
            onClick={() => setPhase('consent')}
            className="flex-1 bg-blue-200 text-blue-800 py-3 px-6 rounded-full font-medium"
          >
            Start
          </button>
          <button 
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
          >
            Home
          </button>
        </div>

        <div className="bg-gray-100 rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Activities</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🚂</div>
              <p className="text-sm font-medium">Eye Tracking Assessment</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">👀</div>
              <p className="text-sm font-medium">The Flash Test</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'consent') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center mb-6">
          <button onClick={() => setPhase('intro')} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Parental Consent</h1>
        </header>

        <div className="bg-blue-50 rounded-3xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-blue-800">Important Notice</h2>
          <p className="text-gray-700 mb-4">
            I am the parent/guardian and consent to my child's vision screening using this app. 
            Data will be used only for screening, kept confidential, and anonymised.
          </p>
          
          <div className="flex items-start space-x-3 mt-6">
            <input 
              type="checkbox" 
              id="consent" 
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="consent" className="text-gray-700 font-medium">
              I agree to the terms above
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => setPhase('positioning')}
            disabled={!consentChecked}
            className={`w-full py-3 px-6 rounded-full font-medium ${
              consentChecked 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue to Assessment
          </button>
          
          <button 
            onClick={() => setPhase('intro')}
            className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'permission') {
    return (
      <div className="p-4 min-h-screen bg-white flex flex-col items-center justify-center">
        <Camera className="w-16 h-16 text-blue-500 mb-6" />
        
        {permissionError ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-4">Camera Access Required</h2>
            <p className="text-center text-gray-700 mb-6 px-4">
              {permissionError}
            </p>
            <div className="space-y-3 w-full max-w-sm">
              <button 
                onClick={requestPermission}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-full font-medium"
              >
                Try Again
              </button>
              <button 
                onClick={() => setPhase('intro')}
                className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">Requesting Camera Access</h2>
            <p className="text-center text-gray-700 mb-6">
              Please allow camera access to continue with the assessment.
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </>
        )}
      </div>
    )
  }

  if (phase === 'positioning') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center mb-6">
          <button onClick={() => setPhase('consent')} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Distance to Face</h1>
        </header>

        <p className="text-center text-lg mb-8">
          Please ensure that the camera is <strong>40 cm away</strong> from your face.
        </p>

        <div className="bg-gray-200 rounded-3xl p-4 mb-8" style={{ aspectRatio: '3/4' }}>
          <div className="bg-black rounded-2xl h-full flex flex-col justify-between p-4">
            <div className="text-center">
              <div className="bg-gray-800 text-red-400 px-4 py-2 rounded-full text-sm inline-block">
                Bring your face inside the box
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        </div>

        <button 
          onClick={requestPermission}
          className="w-full bg-blue-500 text-white py-4 px-6 rounded-full font-medium text-lg"
        >
          Proceed
        </button>
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-8xl font-bold">
          {countdown || 'GO!'}
        </div>
      </div>
    )
  }

  if (phase === 'assessment') {
    const getDirectionInstruction = () => {
      switch (eyeDirection) {
        case 'left': return 'Look LEFT ←'
        case 'right': return 'Look RIGHT →'
        case 'up': return 'Look UP ↑'
        case 'down': return 'Look DOWN ↓'
        default: return 'Look STRAIGHT ahead'
      }
    }

    const getEyePosition = () => {
      switch (eyeDirection) {
        case 'left': return 'translate-x-[-8px]'
        case 'right': return 'translate-x-[8px]'
        case 'up': return 'translate-y-[-8px]'
        case 'down': return 'translate-y-[8px]'
        default: return 'translate-x-0 translate-y-0'
      }
    }

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Camera Feed */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Instructions */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Face Animation */}
            <div className="mb-8">
              <div className="w-32 h-32 bg-yellow-200 rounded-full flex items-center justify-center relative border-4 border-yellow-400">
                {/* Eyes */}
                <div className="flex space-x-6">
                  <div className={`w-6 h-6 bg-black rounded-full transition-transform duration-1000 ${getEyePosition()}`}></div>
                  <div className={`w-6 h-6 bg-black rounded-full transition-transform duration-1000 ${getEyePosition()}`}></div>
                </div>
                {/* Mouth */}
                <div className="absolute bottom-6 w-4 h-2 bg-black rounded-full"></div>
              </div>
            </div>

            {/* Direction Instruction */}
            <div className="bg-black bg-opacity-70 px-6 py-3 rounded-full mb-4">
              <span className="text-white text-xl font-bold">{getDirectionInstruction()}</span>
            </div>

            {/* Keep Head Still Reminder */}
            <div className="bg-red-500 px-4 py-2 rounded-full mb-8">
              <span className="text-white font-semibold">Keep head STILL - Move eyes ONLY</span>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="p-4 bg-gray-100">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">Recording {assessmentTime}s</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="bg-gray-300 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-500 rounded-full h-3 transition-all duration-1000"
              style={{ width: `${(assessmentTime / 20) * 100}%` }}
            ></div>
          </div>
          
          <div className="text-center text-gray-700 font-medium">
            {20 - assessmentTime} seconds remaining
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="p-4 min-h-screen bg-green-50 flex flex-col items-center justify-center">
        <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-green-800 mb-4">Assessment Complete!</h1>
        <div className="mb-6 text-center">
          {isAnalyzing ? (
            <div className="bg-blue-100 rounded-lg p-4 mb-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-blue-800 font-medium">🔄 Uploading & Analyzing video...</p>
              <p className="text-blue-600 text-sm">This may take a few seconds...</p>
            </div>
          ) : analysisResults ? (
            <div className="bg-green-100 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">✅ Analysis completed!</p>
              <p className="text-green-700">Risk Level: {analysisResults.risk_assessment.level}</p>
              <button 
                onClick={() => setShowDetailedResults(true)} 
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                View Detailed Results
              </button>
            </div>
          ) : (
            <div className="bg-yellow-100 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium">⏳ Processing...</p>
              <p className="text-yellow-600 text-sm">Will begin automatically</p>
            </div>
          )}
        </div>
        
        {savedFilename && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>20-second assessment video saved:</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">{savedFilename}</p>
            <p className="text-xs text-gray-400 mt-1">
              Check your device Downloads folder
            </p>
          </div>
        )}
        
        <div className="space-y-3 w-full max-w-sm">
          <button 
            onClick={() => {
              // Reset states for new assessment
              setPhase('intro')
              setCountdown(3)
              setAssessmentTime(0)
              setEyeDirection('center')
              setSavedFilename(null)
              setConsentChecked(false)
              setAnalysisResults(null)
            }}
            className="w-full bg-blue-500 text-white py-3 px-8 rounded-full font-medium"
          >
            New Assessment
          </button>
          
          <button 
            onClick={onBack}
            className="w-full bg-green-500 text-white py-3 px-8 rounded-full font-medium"
          >
            Done
          </button>
        </div>
        
        {analysisResults && showDetailedResults && (
          <AnalysisResults
            analysis={analysisResults}
            isAnalyzing={false}
            onClose={() => setShowDetailedResults(false)}
          />
        )}
      </div>
    )
  }

  return null
}