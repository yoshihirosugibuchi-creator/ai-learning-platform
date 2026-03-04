#!/usr/bin/env node

/**
 * PWA用アイコン生成スクリプト
 * canvas パッケージを使用して仮アイコンを生成
 */

import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const PRIMARY_COLOR = '#4f46e5'
const TEXT_COLOR = '#ffffff'
const TEXT = 'ALE'

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = PRIMARY_COLOR
  ctx.fillRect(0, 0, size, size)

  // Rounded corners effect via circle overlay (subtle)
  ctx.fillStyle = PRIMARY_COLOR

  // Text
  ctx.fillStyle = TEXT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const fontSize = Math.floor(size * 0.32)
  ctx.font = `bold ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`
  ctx.fillText(TEXT, size / 2, size / 2 + fontSize * 0.05)

  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outputPath, buffer)
  console.log(`Generated: ${outputPath} (${size}x${size})`)
}

// Ensure output directories exist
mkdirSync(join(projectRoot, 'public', 'icons'), { recursive: true })

// Generate icons
const icons = [
  { size: 192, path: join(projectRoot, 'public', 'icons', 'icon-192x192.png') },
  { size: 512, path: join(projectRoot, 'public', 'icons', 'icon-512x512.png') },
  { size: 180, path: join(projectRoot, 'public', 'apple-touch-icon.png') },
]

for (const icon of icons) {
  generateIcon(icon.size, icon.path)
}

console.log('\nAll PWA icons generated successfully!')
