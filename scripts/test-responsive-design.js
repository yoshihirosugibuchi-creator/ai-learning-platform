#!/usr/bin/env node

/**
 * Responsive Design Test
 * Checks that key components use proper responsive CSS classes
 */

const fs = require('fs')
const path = require('path')

function analyzeResponsiveClasses(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    const responsivePatterns = {
      'Grid Responsive': /grid-cols-\d+\s+md:grid-cols-\d+|grid-cols-\d+\s+lg:grid-cols-\d+/g,
      'Flex Responsive': /flex-col\s+md:flex-row|flex-col\s+lg:flex-row/g,
      'Text Responsive': /text-\w+\s+md:text-\w+|text-\w+\s+lg:text-\w+/g,
      'Padding Responsive': /p-\d+\s+md:p-\d+|px-\d+\s+md:px-\d+|py-\d+\s+md:py-\d+/g,
      'Margin Responsive': /m-\d+\s+md:m-\d+|mx-\d+\s+md:mx-\d+|my-\d+\s+md:my-\d+/g,
      'Width Responsive': /w-\w+\s+md:w-\w+|w-\w+\s+lg:w-\w+/g,
      'Display Responsive': /hidden\s+md:block|block\s+md:hidden|hidden\s+lg:block/g,
      'Container Responsive': /container\s+mx-auto/g
    }
    
    const results = {}
    let totalMatches = 0
    
    for (const [pattern, regex] of Object.entries(responsivePatterns)) {
      const matches = content.match(regex) || []
      results[pattern] = matches.length
      totalMatches += matches.length
    }
    
    return {
      file: path.basename(filePath),
      totalResponsiveClasses: totalMatches,
      patterns: results,
      hasResponsiveDesign: totalMatches > 0
    }
  } catch (error) {
    return {
      file: path.basename(filePath),
      error: error.message
    }
  }
}

function findReactComponents(dir) {
  const components = []
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir)
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath)
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.jsx'))) {
          components.push(fullPath)
        }
      }
    } catch (error) {
      console.log(`Warning: Cannot scan directory ${currentDir}: ${error.message}`)
    }
  }
  
  scanDirectory(dir)
  return components
}

async function testResponsiveDesign() {
  console.log('📱 Starting Responsive Design Tests...\n')

  // Key directories to check
  const keyDirectories = [
    './app',
    './components',
    './app/admin'
  ]

  console.log('🔍 Scanning for React components...')
  
  const allComponents = []
  for (const dir of keyDirectories) {
    if (fs.existsSync(dir)) {
      const components = findReactComponents(dir)
      allComponents.push(...components)
      console.log(`   📁 ${dir}: ${components.length} components`)
    }
  }
  
  console.log(`   📊 Total components found: ${allComponents.length}\n`)

  // Test key UI components
  const keyComponents = [
    './app/admin/categories/page.tsx',
    './components/categories/CategorySelector.tsx',
    './app/categories/page.tsx',
    './app/page.tsx',
    './app/quiz/page.tsx',
    './app/learning/page.tsx'
  ].filter(file => fs.existsSync(file))

  console.log('🧪 Testing Key Components for Responsive Design:')
  console.log('================================================')

  const results = []
  
  for (const componentPath of keyComponents) {
    const analysis = analyzeResponsiveClasses(componentPath)
    results.push(analysis)
    
    if (analysis.error) {
      console.log(`❌ ${analysis.file}: Error - ${analysis.error}`)
    } else {
      const status = analysis.hasResponsiveDesign ? '✅' : '⚠️'
      console.log(`${status} ${analysis.file}: ${analysis.totalResponsiveClasses} responsive classes`)
      
      if (analysis.totalResponsiveClasses > 0) {
        const topPatterns = Object.entries(analysis.patterns)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
        
        for (const [pattern, count] of topPatterns) {
          console.log(`   📐 ${pattern}: ${count}`)
        }
      }
    }
    console.log('')
  }

  // Check for mobile-first patterns
  console.log('🧪 Testing Mobile-First Design Patterns:')
  console.log('==========================================')

  const mobileFirstPatterns = [
    'Viewport Meta Tag',
    'Mobile Menu Toggle', 
    'Touch-Friendly Buttons',
    'Responsive Typography',
    'Mobile Navigation'
  ]

  // Check layout.tsx for viewport meta tag
  const layoutFiles = ['./app/layout.tsx', './app/root-layout.tsx']
  let hasViewportMeta = false
  
  for (const layoutFile of layoutFiles) {
    if (fs.existsSync(layoutFile)) {
      const content = fs.readFileSync(layoutFile, 'utf8')
      if (content.includes('viewport') && content.includes('width=device-width')) {
        hasViewportMeta = true
        break
      }
    }
  }
  
  console.log(`${hasViewportMeta ? '✅' : '❌'} Viewport Meta Tag: ${hasViewportMeta ? 'Found' : 'Missing'}`)

  // Check for container classes
  const responsiveComponents = results.filter(r => r.hasResponsiveDesign)
  const containerUsage = responsiveComponents.filter(r => 
    r.patterns && r.patterns['Container Responsive'] > 0
  ).length

  console.log(`${containerUsage > 0 ? '✅' : '⚠️'} Container Classes: ${containerUsage}/${keyComponents.length} components`)

  // Check admin dashboard specifically
  const adminComponent = results.find(r => r.file === 'page.tsx' && r.file.includes('admin'))
  if (adminComponent) {
    console.log(`${adminComponent.hasResponsiveDesign ? '✅' : '⚠️'} Admin Dashboard: ${adminComponent.hasResponsiveDesign ? 'Responsive' : 'Needs attention'}`)
  }

  console.log('')

  // Summary and recommendations
  console.log('📋 Responsive Design Summary:')
  console.log('==============================')
  
  const responsiveCount = results.filter(r => r.hasResponsiveDesign).length
  const totalTested = results.filter(r => !r.error).length
  const responsivePercentage = totalTested > 0 ? (responsiveCount / totalTested * 100).toFixed(1) : 0

  console.log(`📊 Responsive Components: ${responsiveCount}/${totalTested} (${responsivePercentage}%)`)
  
  const totalResponsiveClasses = results
    .filter(r => !r.error)
    .reduce((sum, r) => sum + r.totalResponsiveClasses, 0)
  
  console.log(`📐 Total Responsive Classes: ${totalResponsiveClasses}`)

  // Recommendations
  console.log('\n💡 Recommendations:')
  
  if (responsivePercentage >= 80) {
    console.log('✅ Excellent responsive design coverage!')
    console.log('✅ Most components are mobile-ready')
  } else if (responsivePercentage >= 60) {
    console.log('🟡 Good responsive design, but some components need attention')
    console.log('🔧 Consider adding responsive classes to remaining components')
  } else {
    console.log('🔴 Responsive design needs improvement')
    console.log('🔧 Add responsive breakpoints to more components')
  }

  if (!hasViewportMeta) {
    console.log('📱 Add viewport meta tag to layout for proper mobile rendering')
  }

  console.log('\n📱 Mobile Testing Recommendations:')
  console.log('1. Test on actual mobile devices or browser dev tools')
  console.log('2. Verify touch interactions work properly')
  console.log('3. Check that text is readable without zooming')
  console.log('4. Ensure buttons are touch-friendly (44px minimum)')
  console.log('5. Test category selection and admin interfaces on mobile')

  // Final status
  if (responsivePercentage >= 80 && hasViewportMeta) {
    console.log('\n🎯 Overall Status: ✅ Mobile-Ready')
  } else if (responsivePercentage >= 60) {
    console.log('\n🎯 Overall Status: 🟡 Mostly Mobile-Ready')
  } else {
    console.log('\n🎯 Overall Status: 🔴 Needs Mobile Optimization')
  }
}

testResponsiveDesign().catch(console.error)