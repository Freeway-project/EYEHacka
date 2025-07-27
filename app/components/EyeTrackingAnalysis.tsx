'use client'

import { CheckCircle, AlertTriangle, Eye, Clock, TrendingUp, X } from 'lucide-react'

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

interface EyeTrackingAnalysisProps {
  analysis: AnalysisData | null
  isAnalyzing: boolean
  onClose: () => void
}

export default function EyeTrackingAnalysis({ analysis, isAnalyzing, onClose }: EyeTrackingAnalysisProps) {
  // Don't show modal if no analysis and not analyzing
  if (!isAnalyzing && !analysis) {
    return null
  }

  // Show loading state
  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Analyzing Video...</h3>
            <p className="text-gray-600">Our AI is processing eye movements and detecting potential issues</p>
            <div className="mt-4 text-sm text-gray-500">
              This may take 10-30 seconds depending on video length
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show results
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

          {/* Technical Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Technical Analysis Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Frames:</span>
                <span className="font-medium">{analysis.video_info.total_frames.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Analyzed:</span>
                <span className="font-medium">{analysis.analysis.frames_analyzed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Face Detected:</span>
                <span className="font-medium">{analysis.analysis.frames_with_face.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frame Rate:</span>
                <span className="font-medium">{analysis.video_info.fps.toFixed(1)} fps</span>
              </div>
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