import plugin from '../../../lib/plugins/plugin.js'
import { hasPermission, loadBlacklist, saveBlacklist, loadPermission, savePermission, sendNotice } from './common.js'

const resolveTargetQq = (e, reg) => e.msg.match(reg)?.[1] || String(e.at || '')
const isValidTargetQq = qq => /^\d+$/.test(qq)

export class BlacklistManage extends plugin {
  constructor() {
    super({
      name: '黑名单管理',
      dsc: '黑名单添加/删除与授权管理',
      event: 'message',
      priority: 0,
      rule: [
        {
          reg: '^#加黑(?:\\s*(\\d+))?$',
          fnc: 'addBlacklist',
          event: 'message',
        },
        {
          reg: '^#删黑(?:\\s*(\\d+))?$',
          fnc: 'removeBlacklist',
          event: 'message',
        },
        {
          reg: '^#黑名单授权(?:\\s*(\\d+))?$',
          fnc: 'grantPermission',
          permission: 'master',
          event: 'message',
        },
        {
          reg: '^#黑名单取消授权(?:\\s*(\\d+))?$',
          fnc: 'revokePermission',
          permission: 'master',
          event: 'message',
        },
      ],
    })
  }

  async addBlacklist(e) {
    if (!hasPermission(e)) {
      await e.reply('暂无权限使用黑名单管理，联系主人授权')
      return false
    }

    try {
      const qq = resolveTargetQq(e, /^#加黑\s*(\d+)$/)
      if (!isValidTargetQq(qq)) {
        await e.reply('请发送 #加黑<QQ> 或 #加黑@群成员')
        return false
      }

      const blacklist = loadBlacklist()

      if (blacklist.includes(qq)) {
        await e.reply(`QQ号${qq} 已经在黑名单中`)
        return true
      }

      blacklist.push(qq)
      saveBlacklist(blacklist)
      await e.reply(`已成功添加黑名单QQ(${qq})`)
      await sendNotice(e, '加黑', qq)

      return true
    } catch (error) {
      logger.error(`添加黑名单失败 ${error}`)
      await e.reply(`添加黑名单失败 ${error.message}`)
      return false
    }
  }

  async removeBlacklist(e) {
    if (!hasPermission(e)) {
      await e.reply('暂无权限使用黑名单管理，联系主人授权')
      return false
    }

    try {
      const qq = resolveTargetQq(e, /^#删黑\s*(\d+)$/)
      if (!isValidTargetQq(qq)) {
        await e.reply('请发送 #删黑<QQ> 或 #删黑@群成员')
        return false
      }

      const blacklist = loadBlacklist()

      if (!blacklist.includes(qq)) {
        await e.reply(`QQ号${qq} 不在黑名单中`)
        return true
      }

      const newBlacklist = blacklist.filter(item => item !== qq)
      saveBlacklist(newBlacklist)
      await e.reply(`已成功删除黑名单QQ(${qq})`)
      await sendNotice(e, '删黑', qq)

      return true
    } catch (error) {
      logger.error(`删除黑名单失败 ${error}`)
      await e.reply(`删除黑名单失败 ${error.message}`)
      return false
    }
  }

  async grantPermission(e) {
    try {
      const qq = resolveTargetQq(e, /^#黑名单授权\s*(\d+)$/)
      if (!isValidTargetQq(qq)) {
        await e.reply('请发送 #黑名单授权<QQ> 或 #黑名单授权@群成员')
        return false
      }

      const permissionList = loadPermission()

      if (permissionList.includes(qq)) {
        await e.reply(`QQ号${qq} 已在授权名单中`)
        return true
      }

      permissionList.push(qq)
      savePermission(permissionList)
      await e.reply(`已授权QQ(${qq})使用黑名单管理指令`)
      await sendNotice(e, '黑名单授权', qq)
      return true
    } catch (error) {
      logger.error(`授权失败 ${error}`)
      await e.reply(`授权失败 ${error.message}`)
      return false
    }
  }

  async revokePermission(e) {
    try {
      const qq = resolveTargetQq(e, /^#黑名单取消授权\s*(\d+)$/)
      if (!isValidTargetQq(qq)) {
        await e.reply('请发送 #黑名单取消授权<QQ> 或 #黑名单取消授权@群成员')
        return false
      }

      const permissionList = loadPermission()

      if (!permissionList.includes(qq)) {
        await e.reply(`QQ号${qq} 不在授权名单中`)
        return true
      }

      const newList = permissionList.filter(item => item !== qq)
      savePermission(newList)
      await e.reply(`已取消授权QQ(${qq})使用黑名单管理指令`)
      await sendNotice(e, '黑名单取消授权', qq)
      return true
    } catch (error) {
      logger.error(`取消授权失败 ${error}`)
      await e.reply(`取消授权失败 ${error.message}`)
      return false
    }
  }
}
