const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing ClientRequest model...')
    
    // Check if model exists
    if (!prisma.clientRequest) {
      console.error('❌ prisma.clientRequest is undefined')
      console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')))
      process.exit(1)
    }
    
    console.log('✅ prisma.clientRequest exists')
    
    // Try to count
    const count = await prisma.clientRequest.count()
    console.log(`✅ Can query: ${count} requests found`)
    
    // Try to create a test request (will fail if no users exist, but that's OK)
    console.log('✅ Model is ready to use')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

test()
