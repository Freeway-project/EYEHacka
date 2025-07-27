// Simple EyeTrackingAssessment - just record and send
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
  
  // Simple video recording - no complex compression
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

  // Log analysis results
  useEffect(() => {
    if (analysisResults) {
      console.log('🎉 Analysis complete!')
      console.log('Risk Level:', analysisResults.risk_assessment.level)
    }
  }, [analysisResults])

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

  // Start simple assessment
  const startAssessment = async () => {
    await startRecording()
    
    const duration = 20000 // 20 seconds
    const startTime = Date.now()
    
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

  // Simple completion - just stop and send
  const completeAssessment = async () => {
    console.log('🏁 Assessment completed')
    
    const filename = await stopRecording()
    setSavedFilename(filename)
    
    if (filename) {
      console.log('💾 Video saved:', filename)
    }
    
    setPhase('complete')
  }

  // Show phases (intro, consent, positioning, etc.)
  if (phase === 'intro') {
    return (
      <div className="p-4 min-h-screen bg-blue-50 flex flex-col">
        <button onClick={onBack} className="self-start mb-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-6">
            <Camera className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Eye Tracking Assessment</h1>
          <p className="text-gray-600 mb-8 max-w-md">
            This test will record a 20-second video to analyze eye movements for potential lazy eye detection.
          </p>
          
          <button 
            onClick={() => setPhase('consent')}
            className="bg-blue-500 text-white py-3 px-8 rounded-full font-medium"
          >
            Start Assessment
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'consent') {
    return (
      <div className="p-4 min-h-screen bg-blue-50 flex flex-col">
        <button onClick={() => setPhase('intro')} className="self-start mb-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-6">Privacy & Consent</h1>
          
          <div className="bg-white rounded-lg p-6 mb-6 max-w-md">
            <h3 className="font-semibold mb-3">What we'll do:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Record 20 seconds of video</li>
              <li>• Analyze eye movements with AI</li>
              <li>• Provide screening results</li>
              <li>• Save video locally on your device</li>
            </ul>
          </div>
          
          <label className="flex items-center space-x-3 mb-6">
            <input 
              type="checkbox" 
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">I consent to video recording for eye tracking analysis</span>
          </label>
          
          <button 
            onClick={() => setPhase('positioning')}
            disabled={!consentChecked}
            className="bg-blue-500 text-white py-3 px-8 rounded-full font-medium disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'positioning') {
    return (
      <div className="p-4 min-h-screen bg-blue-50 flex flex-col">
        <button onClick={() => setPhase('consent')} className="self-start mb-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-6">Position Yourself</h1>
          
          <div className="bg-white rounded-lg p-6 mb-6 max-w-md text-center">
            <h3 className="font-semibold mb-4">For best results:</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>📱 Hold device 40cm from your face</li>
              <li>💡 Ensure good lighting</li>
              <li>👤 Keep your face centered</li>
              <li>👀 Look directly at the screen</li>
            </ul>
          </div>
          
          <button 
            onClick={requestPermission}
            className="bg-blue-500 text-white py-3 px-8 rounded-full font-medium"
          >
            Enable Camera
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'permission') {
    return (
      <div className="p-4 min-h-screen bg-blue-50 flex flex-col items-center justify-center">
        {permissionError ? (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4">Camera Access Needed</h2>
            <p className="text-gray-600 mb-6">{permissionError}</p>
            <button 
              onClick={requestPermission}
              className="bg-blue-500 text-white py-3 px-8 rounded-full font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-bold">Accessing Camera...</h2>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="p-4 min-h-screen bg-green-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <video 
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 bg-black rounded-lg mb-8 object-cover"
          />
          
          <div className="text-6xl font-bold text-green-600 mb-4">
            {countdown}
          </div>
          
          <p className="text-gray-600">Get ready! Assessment starts in...</p>
        </div>
      </div>
    )
  }

  if (phase === 'assessment') {
    return (
      <div className="p-4 min-h-screen bg-red-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <video 
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 bg-black rounded-lg mb-8 object-cover"
          />
          
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-red-600 mb-2">
              {20 - assessmentTime}
            </div>
            <p className="text-gray-600">Follow the dot with your eyes</p>
          </div>
          
          {/* Simple eye direction indicator */}
          <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg mb-4">
            <div 
              className={`absolute w-4 h-4 bg-red-500 rounded-full transition-all duration-1000 ${
                eyeDirection === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                eyeDirection === 'left' ? 'top-1/2 left-2 -translate-y-1/2' :
                eyeDirection === 'right' ? 'top-1/2 right-2 -translate-y-1/2' :
                eyeDirection === 'up' ? 'top-2 left-1/2 -translate-x-1/2' :
                'bottom-2 left-1/2 -translate-x-1/2'
              }`}
            />
          </div>
          
          <div className="bg-red-100 rounded-lg p-3">
            <p className="text-red-800 text-sm">Recording in progress...</p>
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
            <div className="bg-blue-100 rounded-lg p-4 mb-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-blue-800 font-medium">🔍 Analyzing video with AI...</p>
            </div>
          ) : analysisResults ? (
            <div className="bg-green-100 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">✅ Analysis completed!</p>
              <p className="text-green-700">Risk Level: {analysisResults.risk_assessment.level}</p>
              <button 
                onClick={() => setShowDetailedResults(true)} 
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                View Results
              </button>
            </div>
          ) : (
            <div className="bg-yellow-100 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium">⏳ Processing video...</p>
            </div>
          )}
        </div>
        
        {savedFilename && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Video saved:</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">{savedFilename}</p>
          </div>
        )}
        
        <div className="space-y-3 w-full max-w-sm">
          <button 
            onClick={() => {
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