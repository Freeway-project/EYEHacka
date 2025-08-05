'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { useVideoRecording } from '@/hooks/videorec'
import AnalysisResults from './EyeTrackingAnalysis'
import FlashLightTest from './FlashLightTest'
import Logo from './Logo'

import Image from 'next/image'

interface EyeTrackingAssessmentProps {
  onBack: () => void
}

type AssessmentPhase = 'intro' | 'vision-screening' | 'flashlight-test' | 'consent' | 'positioning' | 'permission' | 'countdown' | 'assessment' | 'processing' | 'complete'

export default function EyeTrackingAssessment({ onBack }: EyeTrackingAssessmentProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [toyPosition, setToyPosition] = useState(0)
  const [assessmentTime, setAssessmentTime] = useState(0)
  const [savedFilename, setSavedFilename] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up' | 'down'>('center')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Log analysis results when received
  useEffect(() => {
    if (analysisResults) {
      console.log('🎉 ANALYSIS RESULTS RECEIVED!')
      console.log('═══════════════════════════════════')
      console.log('📹 Video Info:', analysisResults.video_info)
      console.log('🔍 Analysis:', analysisResults.analysis)
      console.log('⚠️ Risk Assessment:', analysisResults.risk_assessment)
      console.log('═══════════════════════════════════')
      
      if (analysisResults.analysis.detection_events.length > 0) {
        console.log('🚨 DETECTION EVENTS:')
        analysisResults.analysis.detection_events.forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.message} at ${event.timestamp.toFixed(1)}s`)
        })
      } else {
        console.log('✅ No lazy eye events detected')
      }
    }
  }, [analysisResults])

  // Log analysis status
  useEffect(() => {
    if (isAnalyzing) {
      console.log('🔄 Analysis in progress...')
    }
  }, [isAnalyzing])

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

  // Handle transition to complete phase after analysis
  useEffect(() => {
    // Move to complete phase when:
    // 1. We're in processing phase AND
    // 2. Analysis is complete (either we have results OR analysis is no longer running)
    if (phase === 'processing' && !isAnalyzing && (analysisResults || savedFilename)) {
      console.log('🎉 Analysis complete, moving to results phase');
      setPhase('complete');
    }
  }, [phase, isAnalyzing, analysisResults, savedFilename]);

  // Start assessment with recording
 const startAssessment = async () => {
 
  await startRecording();

  const startTime = Date.now();
  const duration = 20000; // 20 seconds
  const eyeSequence = ['center', 'left', 'right', 'up', 'down'] as const;
  let sequenceIndex = 0;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentSequenceIndex = Math.floor(elapsed / 4000) % eyeSequence.length; // 4 seconds each direction

    if (currentSequenceIndex !== sequenceIndex) {
      sequenceIndex = currentSequenceIndex;
      setEyeDirection(eyeSequence[sequenceIndex]);
    }

    setAssessmentTime(Math.floor(elapsed / 1000));
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  animate();

  // Stop after 20 seconds and move to processing phase
  setTimeout(async () => {
    console.log('🎬 20s elapsed, stopping recording and starting analysis...');
    
    try {
      const filename = await stopRecording();
      setSavedFilename(filename);
      
      // Move to processing phase to show loading state
      console.log('⏳ Moving to processing phase...');
       setLoading(true); // Start loading
      setPhase('processing');
    } catch (error) {
      console.error('❌ Error during recording stop:', error);
      setPhase('complete');
    } finally {
      setLoading(false); // Stop loading
    }
  }, duration);
};

// Add a loading screen
if (loading) {
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4 pb-safe">
      <div className="max-w-sm mx-auto text-center space-y-6">
        <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <h1 className="text-xl sm:text-2xl font-bold text-blue-800">Processing...</h1>
        <p className="text-blue-600 text-sm sm:text-base">Please wait while we analyze the data.</p>
      </div>
    </div>
  );
}


  // Complete assessment (keeping this for potential manual use)
  const completeAssessment = async () => {
    console.log('🏁 Assessment completed, stopping recording...')
    const filename = await stopRecording()
    setSavedFilename(filename)
    console.log('💾 Video saved:', filename)
    setPhase('complete')
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
        <div className="px-4 pt-safe">
          <header className="flex items-center py-4">
            <button onClick={onBack} className="mr-3 p-2 -ml-2 rounded-full hover:bg-white/50 transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Image src="/logo.png" alt="EYEHacka logo" width={80} height={80} className="sm:w-24 sm:h-24"/>
          </header>
        </div>

        <div className="flex-1 px-4 pb-safe">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="text-lg sm:text-xl font-semibold mb-3">Welcome to OcuScan Assessment</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                Advanced eye tracking technology helps screen for lazy eye, crossed eyes, and other vision issues in children.
              </p>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-3 text-sm sm:text-base">Instructions for Caregivers</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li>• Ensure the infant is comfortably seated</li>
                <li>• Guide their attention towards the screen</li>
                <li>• Adjust the volume to a gentle level</li>
              </ul>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-4 text-sm sm:text-base">Choose Assessment Type</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setPhase('consent')}
                  className="w-full bg-white rounded-xl p-4 text-center hover:bg-blue-50 active:scale-95 transition-all shadow-sm"
                >
                  <div className="text-3xl mb-2">🚂</div>
                  <p className="text-sm font-medium text-gray-800">OcuScan Assessment</p>
                  <p className="text-xs text-gray-500 mt-1">AI-powered eye tracking</p>
                </button>
                <button 
                  onClick={() => setPhase('vision-screening')}
                  className="w-full bg-white rounded-xl p-4 text-center hover:bg-blue-50 active:scale-95 transition-all shadow-sm"
                >
                  <div className="text-3xl mb-2">👀</div>
                  <p className="text-sm font-medium text-gray-800">Vision Screening</p>
                  <p className="text-xs text-gray-500 mt-1">Flashlight & vision tests</p>
                </button>
              </div>
            </div>

            <button 
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-gray-300 active:scale-95 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'vision-screening') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
        <div className="px-4 pt-safe">
          <header className="flex items-center py-4">
            <button onClick={() => setPhase('intro')} className="mr-3 p-2 -ml-2 rounded-full hover:bg-white/50 transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Image src="/logo.png" alt="EYEHacka logo" width={80} height={80} className="sm:w-24 sm:h-24"/>
          </header>
        </div>

        <div className="flex-1 px-4 pb-safe">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="text-lg sm:text-xl font-semibold mb-3">Vision Screening</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                Comprehensive vision screening tools to assess visual acuity and detect potential vision problems.
              </p>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-3 text-sm sm:text-base">Available Tests</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setPhase('flashlight-test')}
                  className="w-full bg-white rounded-xl p-4 text-left hover:bg-yellow-50 active:scale-95 transition-all shadow-sm border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Flashlight Test</p>
                      <p className="text-xs text-gray-500">Pupil light reflex assessment</p>
                    </div>
                  </div>
                </button>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">👁️</div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visual Acuity Test</p>
                      <p className="text-xs text-gray-400">Coming soon</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🌈</div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Color Vision Test</p>
                      <p className="text-xs text-gray-400">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-100 rounded-2xl p-4 sm:p-6 border border-blue-200">
              <h3 className="font-semibold mb-3 text-blue-800 text-sm sm:text-base">💡 Available Now</h3>
              <p className="text-blue-700 text-xs sm:text-sm">
                The Flashlight Test is ready to use! It analyzes pupil light reflex using your device's camera flash.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setPhase('intro')}
                className="w-full bg-purple-200 text-purple-800 py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-purple-300 active:scale-95 transition-all"
              >
                Back to Options
              </button>
              <button 
                onClick={() => setPhase('consent')}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-blue-600 active:scale-95 transition-all"
              >
                Try OcuScan Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'flashlight-test') {
    return (
      <FlashLightTest 
        onBack={() => setPhase('vision-screening')} 
        apiEndpoint="/api/detect"
      />
    )
  }

  if (phase === 'consent') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 pt-safe">
          <header className="flex items-center py-4">
            <button onClick={() => setPhase('intro')} className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Logo size="sm" />
            <span className="ml-3 text-lg sm:text-xl font-semibold">Parental Consent</span>
          </header>
        </div>

        <div className="flex-1 px-4 pb-safe">
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-blue-50 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4 text-blue-800">Important Notice</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-4">
                I am the parent/guardian and consent to my child's vision screening using this app. 
                Data will be used only for screening, kept confidential, and anonymised.
              </p>
              
              <div className="flex items-start space-x-3 mt-6">
                <input 
                  type="checkbox" 
                  id="consent" 
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded flex-shrink-0"
                />
                <label htmlFor="consent" className="text-gray-700 font-medium text-sm sm:text-base">
                  I agree to the terms above
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setPhase('positioning')}
                disabled={!consentChecked}
                className={`w-full py-4 px-6 rounded-full font-medium text-sm sm:text-base transition-all ${
                  consentChecked 
                    ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue to Assessment
              </button>
              
              <button 
                onClick={() => setPhase('intro')}
                className="w-full bg-gray-200 text-gray-800 py-4 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-gray-300 active:scale-95 transition-all"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'permission') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-safe">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <Camera className="w-16 h-16 text-blue-500 mx-auto" />
          
          {permissionError ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold text-red-600">Camera Access Required</h2>
                <p className="text-center text-gray-700 text-sm sm:text-base">
                  {permissionError}
                </p>
              </div>
              <div className="space-y-3 w-full">
                <button 
                  onClick={requestPermission}
                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-blue-600 active:scale-95 transition-all"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => setPhase('intro')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-gray-300 active:scale-95 transition-all"
                >
                  Back
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold">Requesting Camera Access</h2>
                <p className="text-center text-gray-700 text-sm sm:text-base">
                  Please allow camera access to continue with the assessment.
                </p>
              </div>
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'positioning') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 pt-safe">
          <header className="flex items-center py-4">
            <button onClick={() => setPhase('consent')} className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Logo size="sm" />
            <span className="ml-3 text-lg sm:text-xl font-semibold">Position Setup</span>
          </header>
        </div>

        <div className="flex-1 px-4 pb-safe flex flex-col">
          <div className="max-w-md mx-auto w-full space-y-6">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Camera Position</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Please ensure that the camera is <strong>40 cm away</strong> from your face.
              </p>
            </div>

            <div className="bg-gray-200 rounded-2xl p-3 sm:p-4 aspect-[3/4]">
              <div className="bg-black rounded-xl h-full flex flex-col justify-between p-4 sm:p-6">
                <div className="text-center">
                  <div className="bg-gray-800 text-red-400 px-3 py-2 rounded-full text-xs sm:text-sm inline-block">
                    Bring your face inside the box
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                </div>
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 sm:p-6">
                    <span className="text-gray-400 text-xs sm:text-sm">Face area</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setPhase('countdown')}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-blue-600 active:scale-95 transition-all"
            >
              Start Assessment
            </button>
          </div>
        </div>
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
        case 'left': return 'Follow the ball LEFT ←'
        case 'right': return 'Follow the ball RIGHT →'
        case 'up': return 'Follow the ball UP ↑'
        case 'down': return 'Follow the ball DOWN ↓'
        default: return 'Look at the ball'
      }
    }

    const getBallPosition = () => {
      const centerX = '50%'
      const centerY = '50%'
      const offset = '120px'
      
      switch (eyeDirection) {
        case 'left': return { left: `calc(${centerX} - ${offset})`, top: centerY }
        case 'right': return { left: `calc(${centerX} + ${offset})`, top: centerY }
        case 'up': return { left: centerX, top: `calc(${centerY} - ${offset})` }
        case 'down': return { left: centerX, top: `calc(${centerY} + ${offset})` }
        default: return { left: centerX, top: centerY }
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
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {/* Moving Ball Animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute w-16 h-16 sm:w-20 sm:h-20 transition-all duration-1000 ease-in-out transform -translate-x-1/2 -translate-y-1/2"
                style={getBallPosition()}
              >
                {/* Colorful bouncing ball with glow effect */}
                <div className="relative w-full h-full">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 rounded-full animate-pulse opacity-70 blur-sm"></div>
                  {/* Main ball */}
                  <div className="relative w-full h-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-full shadow-lg animate-bounce">
                    {/* Highlight */}
                    <div className="absolute top-2 left-2 w-4 h-4 bg-white rounded-full opacity-80"></div>
                    {/* Inner glow */}
                    <div className="absolute inset-2 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direction Instruction */}
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 px-4 py-2 sm:px-6 sm:py-3 rounded-full">
              <span className="text-white text-lg sm:text-xl font-bold">{getDirectionInstruction()}</span>
            </div>

            {/* Keep Head Still Reminder */}
            <div className="absolute top-36 left-1/2 transform -translate-x-1/2 bg-red-500 px-3 py-2 sm:px-4 sm:py-2 rounded-full">
              <span className="text-white font-semibold text-sm sm:text-base">Keep head STILL - Follow with eyes ONLY</span>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="px-4 py-4 bg-gray-100 pb-safe">
          <div className="max-w-md mx-auto">
            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-sm sm:text-base">Recording {assessmentTime}s</span>
              </div>
            )}

            {/* Progress bar */}
            <div className="bg-gray-300 rounded-full h-2 sm:h-3 mb-4">
              <div 
                className="bg-blue-500 rounded-full h-2 sm:h-3 transition-all duration-1000"
                style={{ width: `${(assessmentTime / 20) * 100}%` }}
              ></div>
            </div>
            
            <div className="text-center text-gray-700 font-medium text-sm sm:text-base">
              {20 - assessmentTime} seconds remaining
            </div>
          </div>
        </div>
      </div>
    )
  }

  // New processing phase
  if (phase === 'processing') {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4 pb-safe">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          
          <h1 className="text-xl sm:text-2xl font-bold text-blue-800">Processing Assessment</h1>
          
          <div className="bg-white rounded-lg p-4 sm:p-6">
            <p className="text-blue-700 font-medium mb-2 text-sm sm:text-base">🔍 Analyzing video with AI...</p>
            <p className="text-blue-600 text-xs sm:text-sm">This may take up to 3 minutes</p>
            <p className="text-blue-500 text-xs mt-2">Please keep this page open</p>
          </div>

          {savedFilename && (
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Video recorded successfully</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Analysis in progress...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 pb-safe">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800">Assessment Complete!</h1>
          
          {/* Analysis Status */}
          <div>
            {analysisResults ? (
              <div className="bg-green-100 rounded-lg p-4 sm:p-6">
                <p className="text-green-800 font-medium text-sm sm:text-base">✅ Analysis completed!</p>
                <p className="text-green-700 text-sm">Risk Level: {analysisResults.risk_assessment.level}</p>
                <button 
                  onClick={() => setShowDetailedResults(true)} 
                  className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
                >
                  View Detailed Results
                </button>
              </div>
            ) : (
              <div className="bg-yellow-100 rounded-lg p-4 sm:p-6">
                <p className="text-yellow-800 font-medium text-sm sm:text-base">⚠️ Analysis completed with fallback data</p>
                <p className="text-yellow-600 text-xs sm:text-sm">Check console for details</p>
              </div>
            )}
          </div>
          
          {savedFilename && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs sm:text-sm">Assessment video saved:</span>
                  <p className="text-xs text-gray-500 mt-1 font-mono break-all">{savedFilename}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Check your device Downloads folder
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3 w-full">
            <button 
              onClick={() => {
                // Reset states for new assessment
                setPhase('intro')
                setCountdown(3)
                setToyPosition(0)
                setAssessmentTime(0)
                setEyeDirection('center')
                setSavedFilename(null)
                setConsentChecked(false)
                setAnalysisResults(null)
                setShowDetailedResults(false)
              }}
              className="w-full bg-blue-500 text-white py-3 px-8 rounded-full font-medium text-sm sm:text-base hover:bg-blue-600 active:scale-95 transition-all"
            >
              New Assessment
            </button>
            
            <button 
              onClick={onBack}
              className="w-full bg-green-500 text-white py-3 px-8 rounded-full font-medium text-sm sm:text-base hover:bg-green-600 active:scale-95 transition-all"
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
      </div>
    )
  }

  return null
}
