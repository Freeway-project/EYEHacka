'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'
import { useVideoRecording } from '@/hooks/videorec'
import AnalysisResults from './EyeTrackingAnalysis'

interface EyeTrackingAssessmentProps {
  onBack: () => void
}

type AssessmentPhase = 'intro' | 'consent' | 'positioning' | 'permission' | 'countdown' | 'assessment' | 'complete'

export default function EyeTrackingAssessment({ onBack }: EyeTrackingAssessmentProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [assessmentTime, setAssessmentTime] = useState(0)
  const [savedFilename, setSavedFilename] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up' | 'down'>('center')
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const assessmentTimerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldCleanupRef = useRef(false) // Prevent cleanup during active phases

  const {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    requestCameraPermission,
    videoPreview,
    videoStream,
    analysisResults,
    isAnalyzing,
    analysisProgress,
    analysisError,
    retryAnalysis,
    setAnalysisResults,
    cleanupStreams
  } = useVideoRecording()

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Clean up ONLY when truly unmounting or going back
  useEffect(() => {
    return () => {
      if (shouldCleanupRef.current) {
        console.log('🧹 Component unmounting - cleaning up streams')
        if (assessmentTimerRef.current) {
          clearTimeout(assessmentTimerRef.current)
        }
        cleanupStreams()
      }
    }
  }, [cleanupStreams])

  // Handle back navigation with cleanup
  const handleBack = () => {
    console.log('⬅️ Going back - cleaning up streams')
    shouldCleanupRef.current = true
    if (assessmentTimerRef.current) {
      clearTimeout(assessmentTimerRef.current)
    }
    cleanupStreams()
    onBack()
  }

  // Handle camera permission check - DON'T cleanup after success
  const requestPermission = async () => {
    setPhase('permission')
    await requestCameraPermission()
    
    // If permission granted, go to countdown WITHOUT cleaning up
    if (hasPermission && !permissionError) {
      console.log('✅ Permission granted, proceeding to countdown')
      setTimeout(() => setPhase('countdown'), 500)
    }
  }

  // Set up video stream for display
  useEffect(() => {
    if (videoStream && videoRef.current) {
      console.log('📺 Setting video stream to video element')
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
    console.log('🎯 Starting assessment - using existing stream')
    await startRecording()
    
    const duration = 20000 // 20 seconds
    const startTime = Date.now()
    
    // Eye movement sequence optimized for mobile
    const eyeSequence = ['center', 'left', 'right', 'up', 'down'] as const
    let sequenceIndex = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Change eye direction every 4 seconds
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
    // Camera will be cleaned up after analysis is complete
  }

  // Reset function for new assessment
  const resetAssessment = () => {
    console.log('🔄 Resetting assessment')
    shouldCleanupRef.current = false // Reset cleanup flag
    
    // Only cleanup if we're actually starting fresh
    cleanupStreams()
    
    setPhase('intro')
    setCountdown(3)
    setAssessmentTime(0)
    setEyeDirection('center')
    setSavedFilename(null)
    setConsentChecked(false)
    setAnalysisResults(null)
    setShowDetailedResults(false)
    
    if (assessmentTimerRef.current) {
      clearTimeout(assessmentTimerRef.current)
    }
  }

  // Clean up after analysis is complete and user is done
  const handleFinalDone = () => {
    console.log('✅ User finished - final cleanup')
    shouldCleanupRef.current = true
    cleanupStreams()
    handleBack()
  }

  // Network status indicator
  const NetworkStatus = () => (
    <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
      isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  )

  // Analysis progress with timer
  const AnalysisProgress = () => {
    const [timeElapsed, setTimeElapsed] = useState(0)
    
    useEffect(() => {
      if (isAnalyzing) {
        const interval = setInterval(() => {
          setTimeElapsed(prev => prev + 1)
        }, 1000)
        return () => clearInterval(interval)
      } else {
        setTimeElapsed(0)
      }
    }, [isAnalyzing])
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    
    return (
      <div className="bg-blue-100 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <div className="flex items-center space-x-1 text-blue-600 text-sm">
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeElapsed)}</span>
          </div>
        </div>
        <p className="text-blue-800 font-medium">🔍 Analyzing video...</p>
        <p className="text-blue-600 text-sm">{analysisProgress}</p>
        {analysisError && (
          <div className="mt-3 p-2 bg-red-100 rounded border border-red-200">
            <p className="text-red-700 text-sm">{analysisError}</p>
            <button 
              onClick={retryAnalysis}
              className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-xs font-medium flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Analysis</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={handleBack} className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">Eye Tracking Assessment</h1>
          </div>
          <NetworkStatus />
        </header>

        <div className="bg-blue-100 rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📱 Mobile Eye Assessment</h2>
          <p className="text-gray-700 mb-4">
            Quick 20-second eye tracking test. Works best with good lighting and stable internet.
          </p>
        </div>

        <div className="bg-gray-100 rounded-3xl p-6 mb-8">
          <h3 className="font-semibold mb-3">📋 Before You Start</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Hold phone steady at arm's length</li>
            <li>• Ensure good lighting on your face</li>
            <li>• Keep a stable internet connection</li>
            <li>• Results may take 2-5 minutes to process</li>
          </ul>
        </div>

        {!isOnline && (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-orange-800">
              <WifiOff className="w-5 h-5" />
              <span className="font-semibold">No Internet Connection</span>
            </div>
            <p className="text-orange-700 text-sm mt-1">
              Please connect to the internet to upload and analyze your assessment.
            </p>
          </div>
        )}

        <div className="flex space-x-4 mb-6">
          <button 
            onClick={() => setPhase('consent')}
            disabled={!isOnline}
            className={`flex-1 py-3 px-6 rounded-full font-medium ${
              isOnline 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Assessment
          </button>
          <button 
            onClick={handleBack}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
          >
            Back
          </button>
        </div>

        <div className="bg-gray-100 rounded-3xl p-6">
          <h3 className="font-semibold mb-4">🎯 What We Detect</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">👁️</div>
              <p className="text-sm font-medium">Lazy Eye</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">👀</div>
              <p className="text-sm font-medium">Eye Coordination</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'consent') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => setPhase('intro')} className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">Consent</h1>
          </div>
          <NetworkStatus />
        </header>

        <div className="bg-blue-50 rounded-3xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-blue-800">📄 Important Notice</h2>
          <p className="text-gray-700 mb-4">
            I consent to this eye screening assessment. The video will be processed by AI and then deleted. 
            Results are for screening only and not a medical diagnosis.
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
              I agree to the above terms
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => setPhase('positioning')}
            disabled={!consentChecked || !isOnline}
            className={`w-full py-3 px-6 rounded-full font-medium ${
              consentChecked && isOnline
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
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

  if (phase === 'positioning') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => setPhase('consent')} className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">Position Camera</h1>
          </div>
          <NetworkStatus />
        </header>

        <p className="text-center text-lg mb-8">
          Hold your phone <strong>40cm (arm's length)</strong> from your face.
        </p>

        <div className="bg-gray-200 rounded-3xl p-4 mb-8" style={{ aspectRatio: '3/4' }}>
          <div className="bg-black rounded-2xl h-full flex flex-col justify-between p-4">
            <div className="text-center">
              <div className="bg-gray-800 text-yellow-400 px-4 py-2 rounded-full text-sm inline-block">
                Position your face in the frame
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-dashed border-yellow-400 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">📝 Tips for Best Results:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Find good lighting (face your light source)</li>
            <li>• Keep your head still during recording</li>
            <li>• Only move your eyes, not your head</li>
            <li>• Make sure camera can see both eyes clearly</li>
          </ul>
        </div>

        <button 
          onClick={requestPermission}
          className="w-full bg-blue-500 text-white py-4 px-6 rounded-full font-medium text-lg"
        >
          Enable Camera & Continue
        </button>
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
            <h2 className="text-xl font-semibold text-red-600 mb-4">Camera Access Needed</h2>
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
                onClick={() => setPhase('positioning')}
                className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
              >
                Back
              </button>
            </div>
          </>
        ) : hasPermission ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-green-600 mb-4">Camera Ready!</h2>
            <p className="text-center text-gray-700 mb-6">
              Camera access granted. Starting assessment...
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">Requesting Camera Access</h2>
            <p className="text-center text-gray-700 mb-6">
              Please allow camera access when prompted by your browser.
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </>
        )}
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Camera Preview */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Countdown Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-8xl font-bold animate-pulse">
              {countdown || 'GO!'}
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="p-4 bg-black bg-opacity-50 text-center">
          <p className="text-white text-lg font-semibold">
            Get ready! Keep your head still and follow the instructions with your eyes only.
          </p>
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
            {/* Face Animation with TRANSLUCENT EMOJI */}
            <div className="mb-8">
              <div className="w-32 h-32 bg-yellow-200 bg-opacity-70 rounded-full flex items-center justify-center relative border-4 border-yellow-400 border-opacity-70">
                {/* Eyes */}
                <div className="flex space-x-6">
                  <div className={`w-6 h-6 bg-black bg-opacity-70 rounded-full transition-transform duration-1000 ${getEyePosition()}`}></div>
                  <div className={`w-6 h-6 bg-black bg-opacity-70 rounded-full transition-transform duration-1000 ${getEyePosition()}`}></div>
                </div>
                {/* Mouth */}
                <div className="absolute bottom-6 w-4 h-2 bg-black bg-opacity-70 rounded-full"></div>
              </div>
            </div>

            {/* Direction Instruction */}
            <div className="bg-black bg-opacity-70 px-6 py-3 rounded-full mb-4">
              <span className="text-white text-xl font-bold">{getDirectionInstruction()}</span>
            </div>

            {/* Keep Head Still Reminder */}
            <div className="bg-red-500 bg-opacity-80 px-4 py-2 rounded-full mb-8">
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
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-green-800 mb-4">Assessment Complete!</h1>
        
        {/* Analysis Status */}
        <div className="mb-6 text-center w-full max-w-md">
          {isAnalyzing ? (
            <AnalysisProgress />
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
              <p className="text-yellow-600 text-sm">Analysis will start automatically</p>
            </div>
          )}
        </div>
        
        {savedFilename && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200 w-full max-w-md">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Assessment video recorded</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">{savedFilename}</p>
          </div>
        )}
        
        <div className="space-y-3 w-full max-w-sm">
          <button 
            onClick={resetAssessment}
            className="w-full bg-blue-500 text-white py-3 px-8 rounded-full font-medium"
          >
            New Assessment
          </button>
          
          <button 
            onClick={handleFinalDone}
            className="w-full bg-green-500 text-white py-3 px-8 rounded-full font-medium"
          >
            Done
          </button>
        </div>
        
        {/* Camera Status Indicator */}
        <div className="mt-4 text-center">
          <div className={`inline-flex items-center space-x-2 text-xs px-3 py-1 rounded-full ${
            videoStream ? 'text-green-600 bg-green-100' : 'text-gray-500 bg-gray-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              videoStream ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span>{videoStream ? 'Camera active' : 'Camera stopped'}</span>
          </div>
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