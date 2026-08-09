const blobFromResponse = (response) => new Blob([response.data], {
  type: response.headers?.['content-type'] || 'application/octet-stream',
})

const releaseLater = (url) => window.setTimeout(() => URL.revokeObjectURL(url), 60000)

export const saveFileResponse = (response, fileName) => {
  const url = URL.createObjectURL(blobFromResponse(response))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'download'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  releaseLater(url)
}

export const openFileResponse = (response, popup, fileName) => {
  const url = URL.createObjectURL(blobFromResponse(response))
  if (popup && !popup.closed) {
    popup.location.replace(url)
  } else {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noreferrer'
    anchor.download = fileName || ''
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  releaseLater(url)
}
