import fs from 'fs'
import path from 'path'

const blacklistFile = path.join(process.cwd(), 'data/blacklist.json')
const permissionFile = path.join(process.cwd(), 'data/blacklist_permission.json')

const ensureFile = (file, fallback = []) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback))
}

const ensureFiles = () => {
  ensureFile(blacklistFile, [])
  ensureFile(permissionFile, [])
}

const readJson = file => {
  try {
    ensureFiles()
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    logger.error(`读取文件失败 ${file} ${error}`)
    return []
  }
}

const writeJson = (file, data) => {
  ensureFiles()
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

const loadBlacklist = () => readJson(blacklistFile)
const saveBlacklist = list => writeJson(blacklistFile, list)

const loadPermission = () => readJson(permissionFile)
const savePermission = list => writeJson(permissionFile, list)

const hasPermission = e => {
  if (e.isMaster) return true
  const list = loadPermission()
  return list.includes(String(e.user_id))
}

const sendNotice = async (e, action, targets = []) => {
  if (!global.Bot?.sendMasterMsg) return
  const groupId = e.group_id || 'private'
  const operator = e.user_id
  const targetText = Array.isArray(targets) ? targets.join(', ') : targets
  const msg = [
    '【黑名单通知】',
    `指令：${action}`,
    `群号：${groupId}`,
    `操作人：${operator}`,
    `目标：${targetText || '无'}`,
  ].join('\n')
  await Bot.sendMasterMsg(msg)
}

ensureFiles()

export default {
  blacklistFile,
  permissionFile,
  loadBlacklist,
  saveBlacklist,
  loadPermission,
  savePermission,
  hasPermission,
  sendNotice,
}

export {
  blacklistFile,
  permissionFile,
  loadBlacklist,
  saveBlacklist,
  loadPermission,
  savePermission,
  hasPermission,
  sendNotice,
}
