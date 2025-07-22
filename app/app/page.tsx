'use client'

import { useState } from 'react'
import { Eye, Menu, Trophy, Star, Gift } from 'lucide-react'
import EyeTrackingAssessment from '@/components/EyeTrackingAssessment'


export default function HomePage() {
  const [currentView, setCurrentView] = useState<'home' | 'eyeTracking' | 'kidsTest'>('home')

  if (currentView === 'eyeTracking') {
    return <EyeTrackingAssessment onBack={() => setCurrentView('home')} />
  }

  return (
    <div className="p-4 bg-white min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-2">
        <div className="flex items-center space-x-2">
          <Eye className="eye-icon" />
          <span className="text-xl font-semibold text-gray-800">Eye Care +</span>
        </div>
        {/* <button className="px-4 py-2 bg-blue-200 text-blue-800 rounded-full text-sm font-medium">
          <Menu className="w-4 h-4" />
        </button> */}
      </header>

      {/* Main Content */}
      <div className="space-y-6 flex flex-col items-center justify-center">
      

        {/* Eye Tracking Game and Kids Eye Test Buttons */}
        <div className="space-y-3 mt-8 flex flex-col items-center justify-center">
          <button
            onClick={() => setCurrentView('eyeTracking')}
            className="w-full bg-blue-200 text-blue-800 py-4 px-6 rounded-full font-medium text-lg flex items-center justify-center space-x-2"
          >
            <Eye className="w-5 h-5" />
            <span>Eye Tracking Game</span>
          </button>
          
      
        </div>

     
      </div>
    </div>
  )
}