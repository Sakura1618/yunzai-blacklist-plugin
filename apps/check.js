import plugin from '../../../lib/plugins/plugin.js'
import { hasPermission, loadBlacklist, sendNotice } from './common.js'

export class BlacklistCheck extends plugin {
  constructor() {
    super({
      name: '黑名单自检',
      dsc: '查黑并自动踢黑',
      event: 'message',
      priority: 0,
      rule: [
        {
          reg: '^#查黑$',
          fnc: 'checkAndKick',
          event: 'message.group',
        },
        {
          reg: '^#全群查黑$',
          fnc: 'checkAllGroups',
          permission: 'master',
          event: 'message',
        },
      ],
    })
  }

  async checkAndKick(e) {
    if (!hasPermission(e)) {
      await e.reply('暂无权限使用黑名单管理，联系主人授权')
      return false
    }

    if (!e.group?.getMemberMap) {
      await e.reply('无法获取群成员列表，可能Bot缺少权限')
      return true
    }

    const blacklist = loadBlacklist()
    if (!blacklist.length) {
      await e.reply('黑名单为空，无需检查')
      return true
    }

    try {
      const memberMap = await e.group.getMemberMap()
      const kickTargets = []

      for (const [, member] of memberMap) {
        const uid = String(member.user_id || member.userId || '')
        if (!uid || uid === String(e.self_id)) continue
        if (blacklist.includes(uid)) kickTargets.push(uid)
      }

      if (!kickTargets.length) {
        await e.reply('群内未发现黑名单成员')
        await sendNotice(e, '查黑', '未发现黑名单成员')
        return true
      }

      const success = []
      const failed = []

      for (const uid of kickTargets) {
        try {
          await e.group.kickMember(Number(uid) || uid, false)
          success.push(uid)
        } catch (err) {
          logger.error(`踢出黑名单成员(${uid})失败 ${err}`)
          failed.push(uid)
        }
      }

      const messages = []
      if (success.length) messages.push(`已踢出黑名单成员：${success.join(', ')}`)
      if (failed.length) messages.push(`以下成员踢出失败，请手动处理：${failed.join(', ')}`)

      await e.reply(messages.join('\n'))
      await sendNotice(e, '查黑/踢黑', [
        success.length ? `成功：${success.join(', ')}` : '成功：无',
        failed.length ? `失败：${failed.join(', ')}` : '失败：无',
      ])
      return true
    } catch (err) {
      logger.error(`查黑失败 ${err}`)
      await e.reply('查黑失败，稍后再试')
      await sendNotice(e, '查黑失败', err?.message || 'unknown error')
      return false
    }
  }

  async checkAllGroups(e) {
    const bot = e.bot || Bot
    if (!bot?.getGroupMap) {
      await e.reply('无法获取群列表，可能Bot不支持该操作')
      return false
    }

    const blacklist = loadBlacklist()
    if (!blacklist.length) {
      await e.reply('黑名单为空，无需检查')
      return true
    }

    try {
      const groupMap = await bot.getGroupMap()
      const summaries = []
      const noticeDetails = []

      for (const [groupId, groupObj] of groupMap || []) {
        const group = groupObj || bot.pickGroup?.(groupId)
        if (!group?.getMemberMap) {
          summaries.push(`${groupId}: 无法获取成员列表`)
          continue
        }

        let memberMap
        try {
          memberMap = await group.getMemberMap()
        } catch (err) {
          logger.error(`获取群(${groupId})成员失败 ${err}`)
          summaries.push(`${groupId}: 成员获取失败`)
          continue
        }

        const kickTargets = []
        for (const [, member] of memberMap) {
          const uid = String(member.user_id || member.userId || '')
          if (!uid || uid === String(e.self_id)) continue
          if (blacklist.includes(uid)) kickTargets.push(uid)
        }

        if (!kickTargets.length) {
          summaries.push(`${groupId}: 未发现黑名单成员`)
          continue
        }

        const success = []
        const failed = []
        for (const uid of kickTargets) {
          try {
            await group.kickMember(Number(uid) || uid, false)
            success.push(uid)
          } catch (err) {
            logger.error(`群(${groupId}) 踢出黑名单(${uid})失败 ${err}`)
            failed.push(uid)
          }
        }

        const parts = []
        if (success.length) parts.push(`踢出：${success.join(',')}`)
        if (failed.length) parts.push(`失败：${failed.join(',')}`)
        summaries.push(`${groupId}: ${parts.join('；') || '无操作'}`)
        noticeDetails.push(`${groupId} -> ${parts.join('；') || '无操作'}`)
      }

      await e.reply(summaries.join('\n') || '未找到任何群')
      await sendNotice(e, '全群查黑/踢黑', noticeDetails.length ? noticeDetails.join('\n') : '无结果')
      return true
    } catch (err) {
      logger.error(`全群查黑失败 ${err}`)
      await e.reply('全群查黑失败，稍后再试')
      await sendNotice(e, '全群查黑失败', err?.message || 'unknown error')
      return false
    }
  }
}
