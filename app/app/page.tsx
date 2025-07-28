'use client'

import { useState } from 'react'
import { Eye, Menu, Trophy, Star, Gift, Activity } from 'lucide-react'
import EyeTrackingAssessment from '@/components/EyeTrackingAssessment'
import Image from 'next/image'


export default function HomePage() {
  const [currentView, setCurrentView] = useState<'home' | 'eyeTracking' | 'kidsTest'>('home')
  const [apiStatus, setApiStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown')

  const checkApiHealth = async () => {
    setApiStatus('checking')
    try {
      const response = await fetch('https://eyehacka.onrender.com/health', {
        method: 'GET',

      })
      
      if (response.ok) {
        setApiStatus('online')
        console.log('✅ API is online and ready')
      } else {
        setApiStatus('offline')
        console.log('❌ API returned error:', response.status)
      }
    } catch (error) {
      setApiStatus('offline')
      console.log('❌ API health check failed:', error)
    }
  }

  if (currentView === 'eyeTracking') {
    return <EyeTrackingAssessment onBack={() => setCurrentView('home')} />
  }

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online': return 'bg-green-200 text-green-800'
      case 'offline': return 'bg-red-200 text-red-800'
      case 'checking': return 'bg-yellow-200 text-yellow-800'
      default: return 'bg-gray-200 text-gray-800'
    }
  }

  const getStatusText = () => {
    switch (apiStatus) {
      case 'online': return 'API Online ✅'
      case 'offline': return 'API Offline ❌'
      case 'checking': return 'Checking... ⏳'
      default: return 'Check API Status'
    }
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-2">

      </header>

      {/* Main Content */}
      <div className="space-y-6 flex flex-col items-center justify-center">
        
        {/* Welcome Section */}
        <div className="text-center mb-6">
             <Image src="/logo.png" alt="EYEHacka logo" width={100} height={100}/>

          <p className="text-gray-600 mt-4 max-w-md mx-auto">
            Advanced eye tracking technology for early detection of vision issues in children
          </p>
        </div>
        
        {/* API Health Check Section */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={checkApiHealth}
            disabled={apiStatus === 'checking'}
            className={`w-full py-3 px-6 rounded-full font-medium text-sm flex items-center justify-center space-x-2 transition-colors ${getStatusColor()}`}
          >
            <Activity className="w-4 h-4" />
            <span>{getStatusText()}</span>
          </button>
          
          {apiStatus === 'offline' && (
            <p className="text-xs text-center text-gray-600">
              API may be sleeping. Click to wake it up (takes 30-60s)
            </p>
          )}
          
          {apiStatus === 'online' && (
            <p className="text-xs text-center text-green-600">
              Ready for eye tracking analysis!
            </p>
          )}
        </div>

        {/* Eye Tracking Assessment Button */}
        <div className="space-y-3 mt-8 flex flex-col items-center justify-center">
          <button
            onClick={() => setCurrentView('eyeTracking')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-8 rounded-full font-medium text-lg flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Eye className="w-6 h-6" />
            <span>Start Eye Assessment</span>
          </button>
          
          {apiStatus === 'offline' && (
            <p className="text-xs text-center text-amber-600">
              💡 Tip: Check API status first to ensure faster analysis
            </p>
          )}
        </div>
      </div>
    </div>
  )
}