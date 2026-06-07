/**
 * Batch decode all JSON files in OUTPUT_DIR_RAW_EVENTS directory (local debugging tool)
 * 
 * Usage:
 * npm run decode:events
 * tsx src/local/decodeEventsExample.ts
 */

import '../config/env' // Load environment variables (supports .env and .env.local)
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { processFile } from './processFile'
import { OUTPUT_CONFIG } from '../config/sync'


/**
 * Main function
 */
async function main() {
  try {
    console.log('='.repeat(60))
    console.log('Batch Event Decoding Tool')
    console.log('='.repeat(60))
    console.log(`Input directory: ${OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS}`)
    console.log(`Output directory: ${OUTPUT_CONFIG.OUTPUT_DIR_DECODED_EVENTS}`)
    console.log('='.repeat(60))

    // Get input directory path
    const inputDir = path.resolve(process.cwd(), OUTPUT_CONFIG.OUTPUT_DIR_RAW_EVENTS)

    // Check if directory exists
    try {
      await fs.access(inputDir)
    } catch {
      console.error(`❌ Input directory does not exist: ${inputDir}`)
      process.exitCode = 1
      return
    }

    // Read all files in directory
    const files = await fs.readdir(inputDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    if (jsonFiles.length === 0) {
      console.log(`\n⚠️  No JSON files found in directory`)
      return
    }

    console.log(`\n📁 Found ${jsonFiles.length} JSON files`)
    console.log()

    // Process each file
    let successCount = 0
    let failCount = 0

    for (const file of jsonFiles) {
      const filePath = path.join(inputDir, file)
      try {
        await processFile(filePath)
        successCount++
      } catch (error) {
        failCount++
        // Continue processing next file
      }
    }

    // Output summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Batch decoding completed!')
    console.log('='.repeat(60))
    console.log(`   Success: ${successCount} files`)
    console.log(`   Failed: ${failCount} files`)
    console.log(`   Total: ${jsonFiles.length} files`)
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ Batch decoding failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exitCode = 1
  }
}

void main()

