import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  listShirtImages: () => ipcRenderer.invoke('list-shirt-images'),
  uploadShirtImages: () => ipcRenderer.invoke('upload-shirt-images'),
  importShirtImages: (files) =>
    ipcRenderer.invoke('import-shirt-images', Array.from(files, (f) => webUtils.getPathForFile(f))),
  deleteShirtImage: (filename) => ipcRenderer.invoke('delete-shirt-image', filename),
  getTemplateImage: (side) => ipcRenderer.invoke('get-template-image', side),
  getShirtImage: (filename) => ipcRenderer.invoke('get-shirt-image', filename),
  getShirtImageBytes: (filename) => ipcRenderer.invoke('get-shirt-image-bytes', filename),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveTemplateQuad: (side, quad) => ipcRenderer.invoke('save-template-quad', side, quad),
  saveShirtMeta: (filename, partial) => ipcRenderer.invoke('save-shirt-meta', filename, partial),
  pickDesignImage: () => ipcRenderer.invoke('pick-design-image'),
  revealInFinder: (path) => ipcRenderer.invoke('reveal-in-finder', path),
  exportAll: (payload) => ipcRenderer.invoke('export-all', payload)
})
