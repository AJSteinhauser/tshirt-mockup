import { ipcMain, app, dialog, shell } from 'electron'
import { readFile, writeFile, mkdir, readdir, copyFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { exportDesignToAllShirts } from './exporter.js'

// Everything mutable (config, shirt photos, templates) lives under Electron's userData
// directory rather than inside the app's own install/source directory. Packaged apps
// replace that directory wholesale on every update, which would silently wipe any of this
// if it lived there — userData is the one location guaranteed to survive app updates/reinstalls.
const PROJECT_ROOT = app.getAppPath()
const DATA_ROOT = app.getPath('userData')

const TEMPLATE_PATHS = {
  front: join(DATA_ROOT, 'assets/template.png'),
  back: join(DATA_ROOT, 'assets/back-template.png')
}
const SHIRTS_DIR = join(DATA_ROOT, 'shirts/images')
const CONFIG_DIR = join(DATA_ROOT, 'config')
const TEMPLATE_CONFIG_PATH = join(CONFIG_DIR, 'template.json')
const SHIRTS_CONFIG_PATH = join(CONFIG_DIR, 'shirts.json')
const OUTPUT_DIR = app.getPath('downloads')

// fs.promises.cp can't read from inside an app.asar archive (packaged builds) — it uses
// internals that bypass Electron's asar-aware fs shim. Walk and copy by hand instead, using
// only the primitives (readdir/readFile/writeFile/mkdir) that shim actually supports.
async function copyRecursive(src, dest) {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath)
    } else if (entry.isFile()) {
      await writeFile(destPath, await readFile(srcPath))
    }
  }
}

async function migrateIfMissing(oldPath, newPath) {
  if (existsSync(newPath) || !existsSync(oldPath)) return
  await copyRecursive(oldPath, newPath)
}

// One-time migration for installs that still have data sitting next to the app source
// (e.g. this project's original dev-time layout), plus first-run scaffolding otherwise.
export async function initDataDirs() {
  await migrateIfMissing(join(PROJECT_ROOT, 'config'), CONFIG_DIR)
  await migrateIfMissing(join(PROJECT_ROOT, 'shirts/images'), SHIRTS_DIR)
  await migrateIfMissing(join(PROJECT_ROOT, 'assets'), join(DATA_ROOT, 'assets'))

  if (!existsSync(CONFIG_DIR)) await mkdir(CONFIG_DIR, { recursive: true })
  if (!existsSync(SHIRTS_DIR)) await mkdir(SHIRTS_DIR, { recursive: true })
}

async function readJson(path, fallback) {
  try {
    const text = await readFile(path, 'utf-8')
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function extToMime(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'image/png'
}

async function fileToDataUrl(path) {
  const buf = await readFile(path)
  return `data:${extToMime(path)};base64,${buf.toString('base64')}`
}

// Older configs stored a single `{ quad }` for one implicit "front" template,
// and shirt entries with no `side`/`tags`. Normalize on read so old data keeps working.
function normalizeTemplateConfig(raw) {
  if (!raw) return { front: null, back: null }
  if (raw.front || raw.back) return { front: raw.front ?? null, back: raw.back ?? null }
  if (raw.quad) return { front: { quad: raw.quad }, back: null }
  return { front: null, back: null }
}

function normalizeShirtsConfig(raw) {
  const out = {}
  for (const [filename, entry] of Object.entries(raw ?? {})) {
    out[filename] = {
      quad: entry.quad ?? null,
      side: entry.side ?? 'front',
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      name: entry.name ?? filename,
      calibratedAt: entry.calibratedAt ?? null
    }
  }
  return out
}

async function listShirtFiles() {
  const files = await readdir(SHIRTS_DIR)
  return files
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

async function uniqueShirtFilename(desiredName) {
  const ext = extname(desiredName)
  const base = basename(desiredName, ext)
  let candidate = desiredName
  let n = 1
  while (existsSync(join(SHIRTS_DIR, candidate))) {
    candidate = `${base} (${n})${ext}`
    n += 1
  }
  return candidate
}

async function importShirtFiles(paths) {
  await mkdir(SHIRTS_DIR, { recursive: true })
  for (const srcPath of paths.filter((p) => /\.(png|jpg|jpeg)$/i.test(p))) {
    const destName = await uniqueShirtFilename(basename(srcPath))
    await copyFile(srcPath, join(SHIRTS_DIR, destName))
  }
  return listShirtFiles()
}

export function registerIpcHandlers() {
  ipcMain.handle('list-shirt-images', async () => listShirtFiles())

  ipcMain.handle('upload-shirt-images', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
    })
    if (result.canceled) return listShirtFiles()
    return importShirtFiles(result.filePaths)
  })

  ipcMain.handle('import-shirt-images', async (_e, paths) => importShirtFiles(paths))

  ipcMain.handle('delete-shirt-image', async (_e, filename) => {
    await unlink(join(SHIRTS_DIR, filename)).catch(() => {})
    const shirts = normalizeShirtsConfig(await readJson(SHIRTS_CONFIG_PATH, {}))
    delete shirts[filename]
    await mkdir(CONFIG_DIR, { recursive: true })
    await writeFile(SHIRTS_CONFIG_PATH, JSON.stringify(shirts, null, 2))

    return { files: await listShirtFiles(), shirts }
  })

  ipcMain.handle('get-template-image', async (_e, side) => fileToDataUrl(TEMPLATE_PATHS[side]))

  ipcMain.handle('get-shirt-image', async (_e, filename) =>
    fileToDataUrl(join(SHIRTS_DIR, filename))
  )

  ipcMain.handle('get-shirt-image-bytes', async (_e, filename) =>
    readFile(join(SHIRTS_DIR, filename))
  )

  ipcMain.handle('load-config', async () => {
    const template = normalizeTemplateConfig(await readJson(TEMPLATE_CONFIG_PATH, null))
    const shirts = normalizeShirtsConfig(await readJson(SHIRTS_CONFIG_PATH, {}))
    return { template, shirts }
  })

  ipcMain.handle('save-template-quad', async (_e, side, quad) => {
    await mkdir(CONFIG_DIR, { recursive: true })
    const template = normalizeTemplateConfig(await readJson(TEMPLATE_CONFIG_PATH, null))
    template[side] = { quad }
    await writeFile(TEMPLATE_CONFIG_PATH, JSON.stringify(template, null, 2))
  })

  ipcMain.handle('save-shirt-meta', async (_e, filename, partial) => {
    await mkdir(CONFIG_DIR, { recursive: true })
    const shirts = normalizeShirtsConfig(await readJson(SHIRTS_CONFIG_PATH, {}))
    const existing = shirts[filename] ?? { quad: null, side: 'front', tags: [], name: filename, calibratedAt: null }
    shirts[filename] = {
      ...existing,
      ...partial,
      calibratedAt: partial.quad ? new Date().toISOString() : existing.calibratedAt
    }
    await writeFile(SHIRTS_CONFIG_PATH, JSON.stringify(shirts, null, 2))
  })

  ipcMain.handle('pick-design-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]
    const name = path.split('/').pop().replace(/\.[^.]+$/, '')
    return { name, dataUrl: await fileToDataUrl(path) }
  })

  ipcMain.handle('reveal-in-finder', async (_e, path) => shell.openPath(path))

  ipcMain.handle('export-all', async (_e, payload) => {
    return exportDesignToAllShirts({
      ...payload,
      shirtsDir: SHIRTS_DIR,
      outputDir: OUTPUT_DIR,
      shirtsConfigPath: SHIRTS_CONFIG_PATH
    })
  })
}
