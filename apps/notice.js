import plugin from '../../../lib/plugins/plugin.js'
import { isProtectedUser, loadBlacklist } from './common.js'

export class BlacklistJoinWatcher extends plugin {
  constructor() {
    super({
      name: '黑名单入群检测',
      dsc: '入群自动踢黑名单成员',
      event: 'notice.group.increase',
      priority: 0,
    })
  }

  async accept() {
    const { post_type, notice_type, sub_type } = this.e
    if (!(post_type === 'notice' && notice_type === 'group' && sub_type === 'increase')) return false
    if (this.e.user_id == this.e.self_id) return

    const blacklist = loadBlacklist()
    const newMemberId = this.e.user_id

    if (!blacklist.includes(String(newMemberId))) return
    if (isProtectedUser(newMemberId)) {
      await this.reply(`检测到黑名单QQ(${newMemberId})，但该用户属于主人或授权名单，已跳过踢出`)
      return true
    }

    let isAdmin = false
    try {
      const botGroup = this.e.group
      const botMember = botGroup?.pickMember ? botGroup.pickMember(this.e.self_id) : null

      isAdmin =
        botGroup?.is_admin ||
        botGroup?.is_owner ||
        botMember?.is_admin ||
        botMember?.is_owner

      if (!isAdmin && botMember?.getInfo) {
        const info = await botMember.getInfo()
        const role = info?.role || botMember.role
        isAdmin = role === 'admin' || role === 'owner'
      }
    } catch (err) {
      logger.error(`获取Bot群权限失败 ${err}`)
    }

    if (isAdmin) {
      await this.reply(`检测到黑名单QQ(${newMemberId})，正在执行踢出！`)

      try {
        await this.e.group.kickMember(newMemberId, false)
        await this.reply(`已踢出黑名单QQ(${newMemberId})`)
      } catch (kickErr) {
        logger.error(`踢出黑名单成员失败 ${kickErr}`)
        await this.reply(`踢出黑名单QQ(${newMemberId}) 失败，请手动处理`)
      }
    } else {
      await this.reply(`检测到黑名单QQ(${newMemberId})，Bot没有管理员权限，请人工复核进行踢出处理`)
    }
  }
}
