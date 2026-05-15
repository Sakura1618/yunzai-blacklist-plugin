import plugin from '../../../lib/plugins/plugin.js'
import { getBlacklistConfig, hasPermission, isProtectedUser, loadBlacklist, sendNotice } from './common.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const getFullScanBots = bot => {
  if (Array.isArray(bot?.uin) && bot?.bots) {
    return bot.uin
      .map(botId => bot.bots[botId])
      .filter(item => item?.adapter?.name === 'OneBotv11' && typeof item.getGroupMap === 'function')
  }

  return bot?.adapter?.name === 'OneBotv11' && typeof bot?.getGroupMap === 'function' ? [bot] : []
}

const createSystemEvent = (action, bot = global.Bot) => ({
  bot,
  self_id: bot?.uin || bot?.self_id,
  group_id: 'system',
  user_id: 'system',
  reply: async msg => {
    if (!msg || !bot?.sendMasterMsg) return false
    return bot.sendMasterMsg(msg)
  },
})

const buildDetailLines = result => [
  `群号：${result.groupId}`,
  `成功：${result.success.length ? result.success.join(', ') : '无'}`,
  `失败：${result.failed.length ? result.failed.join(', ') : '无'}`,
  `跳过：${result.skipped.length ? result.skipped.join(', ') : '无'}`,
]

async function scanGroup(group, blacklist, selfId, fallbackGroupId = '') {
  const memberMap = await group.getMemberMap()
  const kickTargets = []
  const skippedTargets = []

  for (const [, member] of memberMap) {
    const uid = String(member.user_id || member.userId || '')
    if (!uid || uid === String(selfId || '')) continue
    if (!blacklist.includes(uid)) continue
    if (isProtectedUser(uid)) {
      skippedTargets.push(uid)
      continue
    }
    kickTargets.push(uid)
  }

  const success = []
  const failed = []

  for (const uid of kickTargets) {
    try {
      await group.kickMember(Number(uid) || uid, false)
      success.push(uid)
    } catch (err) {
      logger.error(`群(${group.group_id || group.groupId || 'unknown'}) 踢出黑名单(${uid})失败 ${err}`)
      failed.push(uid)
    }
  }

  return {
    groupId: String(group.group_id || group.groupId || fallbackGroupId || ''),
    success,
    failed,
    skipped: skippedTargets,
  }
}

export async function runFullGroupCheck(context = {}) {
  const bot = context.bot || global.Bot
  const event = context.event || createSystemEvent(context.action || '全群查黑', bot)
  const scanBots = getFullScanBots(bot)

  if (!scanBots.length) {
    if (!context.silentReply) await event.reply?.('无法获取群列表，可能Bot不支持该操作')
    return { ok: false, reply: '无法获取群列表，可能Bot不支持该操作' }
  }

  const blacklist = loadBlacklist()
  if (!blacklist.length) {
    if (!context.silentReply) await event.reply?.('黑名单为空，无需检查')
    return { ok: true, reply: '黑名单为空，无需检查', totalGroups: 0, totalRemoved: 0 }
  }

  const config = getBlacklistConfig()
  const intervalMs = Math.max(0, Number(config.fullGroupMemberInterval || 1) * 1000)

  try {
    const results = []
    let index = 0

    for (const scanBot of scanBots) {
      const groupMap = await scanBot.getGroupMap()

      for (const [groupId, groupInfo] of groupMap || []) {
        if (!/^\d+$/.test(String(groupId))) continue
        if (groupInfo?.guild) continue

        const group = scanBot.pickGroup?.(groupId)
        if (!group?.getMemberMap) {
          results.push({ groupId: String(groupId), success: [], failed: [], skipped: [], error: '无法获取成员列表' })
          continue
        }

        try {
          if (index > 0 && intervalMs > 0) await sleep(intervalMs)
          const result = await scanGroup(group, blacklist, event.self_id, groupId)
          results.push(result)
        } catch (err) {
          logger.error(`获取群(${groupId})成员失败 ${err}`)
          results.push({ groupId: String(groupId), success: [], failed: [], skipped: [], error: '成员获取失败' })
        }

        index++
      }
    }

    const activeResults = results.filter(item => item.success.length || item.failed.length || item.skipped.length || item.error)
    const affectedGroupCount = results.filter(item => item.success.length).length
    const totalRemoved = results.reduce((sum, item) => sum + item.success.length, 0)
    const totalFailed = results.reduce((sum, item) => sum + item.failed.length, 0)
    const totalSkipped = results.reduce((sum, item) => sum + item.skipped.length, 0)
    const groupCount = results.length

    const reply = `已在 ${affectedGroupCount} 个群聊中移除 ${totalRemoved} 人`

    const localDetails = activeResults.length
      ? activeResults.map(item => {
          if (item.error) return `${item.groupId}: ${item.error}`
          const parts = []
          if (item.success.length) parts.push(`踢出：${item.success.join(',')}`)
          if (item.failed.length) parts.push(`失败：${item.failed.join(',')}`)
          if (item.skipped.length) parts.push(`跳过：${item.skipped.join(',')}`)
          return `${item.groupId}: ${parts.join('；') || '无操作'}`
        })
      : ['无结果']

    if (!context.silentReply) {
      if (context.localDetail ?? !event.isGroup) await event.reply?.(localDetails.join('\n'))
      else await event.reply?.(reply)
    }

    const detailLines = activeResults.length
      ? activeResults.map(item => {
          if (item.error) return `群号：${item.groupId}\n结果：${item.error}`
          return buildDetailLines(item).join('\n')
        })
      : ['无结果']

    await sendNotice(event, context.noticeAction || '全群查黑/踢黑', [
      `扫描群聊：${groupCount}`,
      `移除人数：${totalRemoved}`,
      `失败人数：${totalFailed}`,
      `跳过人数：${totalSkipped}`,
      ...detailLines,
    ])

    return {
      ok: true,
      reply,
      affectedGroupCount,
      totalGroups: groupCount,
      totalRemoved,
      totalFailed,
      totalSkipped,
      results,
    }
  } catch (err) {
    logger.error(`全群查黑失败 ${err}`)
    if (!context.silentReply) await event.reply?.('全群查黑失败，稍后再试')
    await sendNotice(event, context.errorAction || '全群查黑失败', err?.message || 'unknown error')
    return { ok: false, reply: '全群查黑失败，稍后再试', error: err }
  }
}

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

  init() {
    const config = getBlacklistConfig()
    if (!config.fullGroupCheckCron) return

    this.e = createSystemEvent('定时全群查黑')
    this.task = [
      {
        name: '定时全群查黑',
        cron: config.fullGroupCheckCron,
        fnc: this.scheduledCheck.bind(this),
      },
    ]
  }

  async scheduledCheck() {
    return runFullGroupCheck({
      bot: global.Bot,
      event: this.e || createSystemEvent('定时全群查黑'),
      silentReply: true,
      noticeAction: '定时全群查黑/踢黑',
      errorAction: '定时全群查黑失败',
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
      const result = await scanGroup(e.group, blacklist, e.self_id, e.group_id)
      const affectedGroupCount = result.success.length ? 1 : 0

      if (!result.success.length && !result.failed.length && !result.skipped.length) {
        await e.reply('已在 0 个群聊中移除 0 人')
        await sendNotice(e, '查黑', ['群号：' + result.groupId, '结果：未发现黑名单成员'])
        return true
      }

      await e.reply(`已在 ${affectedGroupCount} 个群聊中移除 ${result.success.length} 人`)
      await sendNotice(e, '查黑/踢黑', buildDetailLines(result))
      return true
    } catch (err) {
      logger.error(`查黑失败 ${err}`)
      await e.reply('查黑失败，稍后再试')
      await sendNotice(e, '查黑失败', err?.message || 'unknown error')
      return false
    }
  }

  async checkAllGroups(e) {
    const result = await runFullGroupCheck({
      bot: global.Bot,
      event: e,
      noticeAction: '全群查黑/踢黑',
      errorAction: '全群查黑失败',
    })

    return result.ok
  }
}
