// src/app/api/save-video/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('video') as unknown as File
    const filename: string = data.get('filename') as string

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create videos directory if it doesn't exist
    const videosDir = path.join(process.cwd(), 'public', 'videos')
    try {
      await mkdir(videosDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Save file to public/videos
    const filepath = path.join(videosDir, filename)
    await writeFile(filepath, buffer)

    console.log(`Video saved: ${filepath}`)

    return NextResponse.json({
      message: 'Video saved successfully',
      filename: filename,
      path: `/videos/${filename}`,
      size: buffer.length
    })

  } catch (error) {
    console.error('Error saving video:', error)
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 })
  }
}