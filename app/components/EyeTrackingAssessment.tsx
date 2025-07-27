'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle, AlertTriangle, Eye, Clock, TrendingUp, X } from 'lucide-react'
import { useVideoRecording } from '@/hooks/videorec'
import AnalysisResults from './EyeTrackingAnalysis'

// Updated to a 20-second assessment
const ASSESSMENT_DURATION_MS = 20000

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
  const videoRef = useRef<HTMLVideoElement>(null)
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

  // ... (other hooks unchanged)

  // Start assessment with recording
  const startAssessment = async () => {
    await startRecording()
    const startTime = Date.now()
    
    const eyeSequence = ['center', 'left', 'right', 'up', 'down'] as const
    let sequenceIndex = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / ASSESSMENT_DURATION_MS, 1)
      const newIndex = Math.floor(elapsed / (ASSESSMENT_DURATION_MS / eyeSequence.length)) % eyeSequence.length
      if (newIndex !== sequenceIndex) {
        sequenceIndex = newIndex
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
    const filename = await stopRecording()
    setSavedFilename(filename)
    setPhase('complete')
  }

  // ... (UI phases unchanged except messages below)

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
    // ... (same as before)
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
        {/* ... (rest unchanged) */}
      </div>
    )
  }

  return null
}