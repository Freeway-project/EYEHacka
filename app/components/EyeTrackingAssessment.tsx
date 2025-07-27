'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  
  const {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    videoPreview,
    videoStream,
    analysisResults,
    isAnalyzing,
    setAnalysisResults
  } = useVideoRecording()

  // Handle camera permission check
  const requestPermission = async () => {
    setPhase('permission')
    await startRecording()
    
    // If permission granted, stop immediately and go to countdown
    if (hasPermission) {
      await stopRecording()
      setTimeout(() => setPhase('countdown'), 500)
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
    
    const duration = 20000 // Changed to 20 seconds
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
          onClick={() => setPhase('countdown')}
          className="w-full bg-gray-300 text-gray-700 py-4 px-6 rounded-full font-medium text-lg"
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
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-green-800 mb-4">Assessment Complete!</h1>
        
        {/* Analysis Status */}
        <div className="mb-6 text-center">
          {isAnalyzing ? (
            <div className="bg-blue-100 rounded-lg p-6 mb-4 max-w-md">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-blue-800 font-medium text-lg mb-2">🤖 AI Analysis in Progress</p>
              <p className="text-blue-600 text-sm mb-3">Processing your 20-second video recording...</p>
              <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                <p>• Uploading video to server</p>
                <p>• Running eye movement analysis</p>
                <p>• Generating results</p>
                <p className="mt-2 font-medium">⏳ This may take 30-60 seconds</p>
              </div>
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
              <p className="text-yellow-800 font-medium">⏳ Preparing Analysis...</p>
              <p className="text-yellow-600 text-sm">Video recorded successfully, analysis starting soon</p>
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