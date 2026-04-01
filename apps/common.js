import fs from 'fs'
import path from 'path'

const blacklistFile = path.join(process.cwd(), 'data/blacklist.json')
const permissionFile = path.join(process.cwd(), 'data/blacklist_permission.json')
const otherConfigFile = path.join(process.cwd(), 'config/config/other.yaml')
const defaultOtherConfigFile = path.join(process.cwd(), 'config/default_config/other.yaml')

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

const parseYamlList = (content, key) => {
  const lines = content.split(/\r?\n/)
  const result = []
  let inList = false

  for (const line of lines) {
    if (!inList) {
      if (line.match(new RegExp(`^${key}:\\s*$`))) inList = true
      continue
    }

    if (!line.trim()) continue
    if (!line.startsWith(' ') && !line.startsWith('\t') && !line.trimStart().startsWith('-')) break

    const match = line.match(/^\s*-\s*(.+?)\s*$/)
    if (!match) break

    const value = match[1].replace(/^['"]|['"]$/g, '').trim()
    if (value) result.push(value)
  }

  return result
}

const loadMasterIds = () => {
  try {
    const configFile = fs.existsSync(otherConfigFile) ? otherConfigFile : defaultOtherConfigFile
    if (!fs.existsSync(configFile)) return []
    const content = fs.readFileSync(configFile, 'utf8')
    return parseYamlList(content, 'masterQQ').map(String)
  } catch (error) {
    logger.error(`读取主人配置失败 ${error}`)
    return []
  }
}

const isProtectedUser = userId => {
  const uid = String(userId || '')
  if (!uid) return false

  const masterIds = loadMasterIds()
  if (masterIds.includes(uid)) return true

  const permissionList = loadPermission()
  return permissionList.includes(uid)
}

const hasPermission = e => {
  if (e.isMaster) return true
  return isProtectedUser(e.user_id)
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
  loadMasterIds,
  isProtectedUser,
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
  loadMasterIds,
  isProtectedUser,
  hasPermission,
  sendNotice,
}
