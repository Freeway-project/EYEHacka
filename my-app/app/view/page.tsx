'use client'

import { useState, useEffect } from 'react'
import { Play, Download, Eye, Calendar, FileVideo, ArrowLeft } from 'lucide-react'

interface SavedAssessment {
  id: string
  filename: string
  timestamp: string
  size: number
  duration: number
  assessmentDuration: number
  serverPath?: string
  status: string
}



export default function VideoViewer({ onBack }: any) {
  const [assessments, setAssessments] = useState<SavedAssessment[]>([])
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  useEffect(() => {
    // Load saved assessments from localStorage
    const saved = localStorage.getItem('eyeAssessments')
    if (saved) {
      const parsedAssessments = JSON.parse(saved)
      setAssessments(parsedAssessments.reverse()) // Show newest first
    }
  }, [])

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const downloadVideo = (assessment: SavedAssessment) => {
    if (assessment.serverPath) {
      // Create download link for server-stored video
      const link = document.createElement('a')
      link.href = assessment.serverPath
      link.download = assessment.filename
      link.click()
    }
  }

  return (
    <div className="p-4 min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">Saved Assessments</h1>
      </header>

      {/* Video Player */}
      {selectedVideo && (
        <div className="mb-6 bg-black rounded-lg overflow-hidden">
          <video
            src={selectedVideo}
            controls
            className="w-full"
            style={{ maxHeight: '300px' }}
          >
            Your browser does not support video playback.
          </video>
          <div className="p-3 bg-gray-100">
            <button
              onClick={() => setSelectedVideo(null)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Close Player
            </button>
          </div>
        </div>
      )}

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div className="text-center py-12">
          <FileVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Assessments Yet</h3>
          <p className="text-gray-500">Complete an eye tracking assessment to see videos here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="border rounded-lg p-4 bg-gray-50">
              {/* Assessment Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-800">Eye Tracking Assessment</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(assessment.timestamp)}</span>
                    </div>
                    <div>Duration: {assessment.assessmentDuration}s</div>
                    <div>Size: {formatFileSize(assessment.size)}</div>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  assessment.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {assessment.status}
                </div>
              </div>

              {/* Filename */}
              <div className="text-xs font-mono text-gray-500 mb-3 bg-white p-2 rounded border">
                {assessment.filename}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                {assessment.serverPath && (
                  <button
                    onClick={() => setSelectedVideo(assessment.serverPath!)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    <Play className="w-3 h-3" />
                    <span>Play</span>
                  </button>
                )}
                
                <button
                  onClick={() => downloadVideo(assessment)}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>

                {assessment.serverPath && (
                  <div className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded text-sm">
                    <span>✓ Stored</span>
                  </div>
                )}
              </div>

              {/* Server Path Info */}
              {assessment.serverPath && (
                <div className="mt-2 text-xs text-green-600">
                  📁 Saved to: <code className="bg-green-50 px-1 rounded">{assessment.serverPath}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Storage Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Storage Locations:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>📱 <strong>Device Downloads:</strong> Videos saved to your downloads folder</li>
          <li>🖥️ <strong>Server Storage:</strong> Videos also saved to <code>/public/videos/</code></li>
          <li>💾 <strong>Access:</strong> View videos directly in browser or download again</li>
        </ul>
      </div>
    </div>
  )
}