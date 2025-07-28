'use client'

import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return {
          width: 32,
          height: 32,
          text: 'text-lg',
          container: 'space-x-2'
        }
      case 'lg':
        return {
          width: 64,
          height: 64,
          text: 'text-3xl',
          container: 'space-x-3'
        }
      default:
        return {
          width: 48,
          height: 48,
          text: 'text-xl',
          container: 'space-x-2'
        }
    }
  }

  const sizes = getSizes()

  return (
    <div className={`flex items-center ${sizes.container}`}>
      <div className="relative">
        <Image
          src="/logo.png"
          alt="OcuScan Logo"
          width={sizes.width}
          height={sizes.height}
          className="object-contain"
          priority
        />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`${sizes.text} font-bold text-gray-800 leading-tight`}>
            Ocu<span className="text-blue-600">Scan</span>
          </span>
          {size === 'lg' && (
            <span className="text-xs text-gray-500 -mt-1">Eye Tracking Assessment</span>
          )}
        </div>
      )}
    </div>
  )
}
