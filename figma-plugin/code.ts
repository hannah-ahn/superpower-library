// Superpower Library Figma Plugin
// Build with: npm run build (in figma-plugin directory)

const TOKEN_KEY = 'superpower_auth_token'
const STATE_KEY = 'superpower_auth_state'
const APP_URL = 'https://superpower-library.vercel.app'

interface PluginToken {
  token: string
  user_id: string
  email: string
  expires_at: number
}

// Token management
async function getStoredToken(): Promise<PluginToken | null> {
  const data = await figma.clientStorage.getAsync(TOKEN_KEY)
  if (!data) return null

  // Check expiry
  if (Date.now() > data.expires_at) {
    await clearToken()
    return null
  }

  return data
}

async function storeToken(token: PluginToken): Promise<void> {
  await figma.clientStorage.setAsync(TOKEN_KEY, token)
}

async function clearToken(): Promise<void> {
  await figma.clientStorage.deleteAsync(TOKEN_KEY)
}

function generateState(): string {
  return Math.random().toString(36).substring(2, 15)
}

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100) || 'untitled'
  )
}

// Main plugin logic
figma.on('run', async ({ command }) => {
  if (command === 'export') {
    // Check auth
    const token = await getStoredToken()
    if (!token) {
      figma.notify('Please sign in first', { error: true })
      return
    }

    // Check selection
    const selection = figma.currentPage.selection
    if (selection.length === 0) {
      figma.notify('Please select a frame to export', { error: true })
      return
    }

    if (selection.length > 1) {
      figma.notify('Please select only one frame', { error: true })
      return
    }

    const node = selection[0]
    if (!('exportAsync' in node)) {
      figma.notify('Selected element cannot be exported', { error: true })
      return
    }

    try {
      figma.notify('Exporting...', { timeout: 2000 })

      // Export as PNG at 2x
      const bytes = await (node as SceneNode & ExportMixin).exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 2 },
      })

      // Sanitize filename
      const filename = sanitizeFilename(node.name) + '.png'

      // Upload via UI (handles network request)
      figma.ui.postMessage({
        type: 'upload',
        bytes: Array.from(bytes),
        filename,
        token: token.token,
      })

      figma.showUI(__html__, { visible: false, width: 1, height: 1 })
    } catch (error: any) {
      figma.notify('Export failed: ' + error.message, { error: true })
    }
  }

  if (command === 'auth') {
    const state = generateState()
    await figma.clientStorage.setAsync(STATE_KEY, state)

    const authUrl = `${APP_URL}/auth/figma-plugin?state=${state}`

    figma.ui.postMessage({ type: 'open-url', url: authUrl })
    figma.showUI(__html__, { visible: false, width: 1, height: 1 })

    figma.notify('Opening browser for sign in...')
  }

  if (command === 'signout') {
    await clearToken()
    figma.notify('Signed out')
  }
})

// Handle messages from UI
figma.ui.onmessage = async (msg: any) => {
  if (msg.type === 'upload-complete') {
    figma.notify('✓ Exported to Superpower Library')
    figma.closePlugin()
  }

  if (msg.type === 'upload-error') {
    figma.notify('Upload failed: ' + msg.error, { error: true })
    figma.closePlugin()
  }

  if (msg.type === 'auth-callback') {
    const storedState = await figma.clientStorage.getAsync(STATE_KEY)
    if (msg.state !== storedState) {
      figma.notify('Auth failed: state mismatch', { error: true })
      return
    }

    await storeToken(msg.token)
    figma.notify('✓ Signed in as ' + msg.token.email)
    figma.closePlugin()
  }
}
