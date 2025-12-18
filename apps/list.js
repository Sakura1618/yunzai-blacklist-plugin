import plugin from '../../../lib/plugins/plugin.js'
import { hasPermission, loadBlacklist, loadPermission } from './common.js'

export class BlacklistList extends plugin {
  constructor() {
    super({
      name: '黑名单列表',
      dsc: '查询黑名单与管理名单',
      event: 'message',
      priority: 0,
      rule: [
        {
          reg: '^#黑名单列表$',
          fnc: 'showBlacklist',
          event: 'message',
        },
        {
          reg: '^#黑名单管理列表$',
          fnc: 'showManagers',
          permission: 'master',
          event: 'message',
        },
      ],
    })
  }

  async showBlacklist(e) {
    if (!hasPermission(e)) {
      await e.reply('暂无权限查看，联系主人授权')
      return false
    }

    const blacklist = loadBlacklist()
    if (!blacklist.length) {
      await e.reply('黑名单为空')
      return true
    }

    await e.reply(`黑名单（共${blacklist.length}个）：\n${blacklist.join('\n')}`)
    return true
  }

  async showManagers(e) {
    const managers = loadPermission()
    if (!managers.length) {
      await e.reply('黑名单管理名单为空')
      return true
    }

    await e.reply(`黑名单管理名单（共${managers.length}个）：\n${managers.join('\n')}`)
    return true
  }
}
