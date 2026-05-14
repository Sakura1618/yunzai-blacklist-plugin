import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { fileURLToPath } from 'url'

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(pluginDir, 'data')
const configDir = path.join(pluginDir, 'config')
const blacklistFile = path.join(dataDir, 'blacklist.json')
const permissionFile = path.join(dataDir, 'blacklist_permission.json')
const configFile = path.join(configDir, 'config.yaml')
const defaultConfigFile = path.join(configDir, 'default_config.yaml')
const legacyBlacklistFile = path.join(process.cwd(), 'data/blacklist.json')
const legacyPermissionFile = path.join(process.cwd(), 'data/blacklist_permission.json')
const otherConfigFile = path.join(process.cwd(), 'config/config/other.yaml')
const defaultOtherConfigFile = path.join(process.cwd(), 'config/default_config/other.yaml')

const defaultBlacklistConfig = {
  fullGroupCheckCron: '',
  fullGroupMemberInterval: 1,
}

const ensureDir = dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const ensureYamlFile = (file, fallback) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, YAML.stringify(fallback), 'utf8')
}

const migrateLegacyFile = (legacyFile, targetFile, fallback = []) => {
  if (fs.existsSync(targetFile)) return

  if (fs.existsSync(legacyFile)) {
    try {
      fs.renameSync(legacyFile, targetFile)
      return
    } catch (error) {
      logger.error(`迁移旧数据失败 ${legacyFile} -> ${targetFile} ${error}`)

      try {
        const legacyData = JSON.parse(fs.readFileSync(legacyFile, 'utf8'))
        fs.writeFileSync(targetFile, JSON.stringify(legacyData, null, 2))
        return
      } catch (copyError) {
        logger.error(`复制旧数据失败 ${legacyFile} -> ${targetFile} ${copyError}`)
      }
    }
  }

  fs.writeFileSync(targetFile, JSON.stringify(fallback, null, 2))
}

const ensureFile = (file, fallback = []) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback))
}

const ensureFiles = () => {
  ensureDir(dataDir)
  ensureDir(configDir)
  ensureYamlFile(defaultConfigFile, defaultBlacklistConfig)
  ensureYamlFile(configFile, readYaml(defaultConfigFile, defaultBlacklistConfig))
  migrateLegacyFile(legacyBlacklistFile, blacklistFile, [])
  migrateLegacyFile(legacyPermissionFile, permissionFile, [])
  ensureFile(blacklistFile, [])
  ensureFile(permissionFile, [])
}

const readYaml = (file, fallback = {}) => {
  try {
    if (!fs.existsSync(file)) return fallback
    const config = YAML.parse(fs.readFileSync(file, 'utf8'))
    return config && typeof config === 'object' ? config : fallback
  } catch (error) {
    logger.error(`读取配置失败 ${file} ${error}`)
    return fallback
  }
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

const getBlacklistConfig = () => {
  ensureFiles()

  const config = {
    ...defaultBlacklistConfig,
    ...readYaml(defaultConfigFile, defaultBlacklistConfig),
    ...readYaml(configFile, {}),
  }

  const interval = Number(config.fullGroupMemberInterval)

  return {
    fullGroupCheckCron: String(config.fullGroupCheckCron || '').trim(),
    fullGroupMemberInterval: Number.isFinite(interval) && interval >= 0 ? interval : 1,
  }
}

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

  const meta = e && typeof e === 'object' ? e : {}
  const groupId = meta.group_id || meta.groupId || 'system'
  const operator = meta.user_id || meta.userId || 'system'
  const targetText = Array.isArray(targets) ? targets.join('\n') : targets
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
  dataDir,
  configFile,
  defaultConfigFile,
  blacklistFile,
  permissionFile,
  loadBlacklist,
  saveBlacklist,
  loadPermission,
  savePermission,
  getBlacklistConfig,
  loadMasterIds,
  isProtectedUser,
  hasPermission,
  sendNotice,
}

export {
  dataDir,
  configFile,
  defaultConfigFile,
  blacklistFile,
  permissionFile,
  loadBlacklist,
  saveBlacklist,
  loadPermission,
  savePermission,
  getBlacklistConfig,
  loadMasterIds,
  isProtectedUser,
  hasPermission,
  sendNotice,
}
