import plugin from '../../../lib/plugins/plugin.js'

export class BlacklistHelp extends plugin {
  constructor() {
    super({
      name: '黑名单帮助',
      dsc: '黑名单插件指令说明',
      event: 'message',
      priority: 0,
      rule: [
        {
          reg: '^#黑名单帮助$',
          fnc: 'help',
          event: 'message',
        },
      ],
    })
  }

  async help(e) {
    const helpText = [
      '黑名单插件指令：',
      '#查黑            检查本群并自动踢黑名单成员（群内仅显示汇总，详细结果通知主人）',
      '#全群查黑        全部群自动查黑并踢黑（默认请求间隔1秒，可配置cron和间隔，详细结果通知主人）',
      '#黑名单列表      查看黑名单（需授权）',
      '#黑名单管理列表  查看管理名单（主人）',
      '#加黑<QQ/@成员>       添加黑名单后立即执行一次全群查黑（需授权，通知主人）',
      '#删黑<QQ/@成员>       删除黑名单（需授权，通知主人）',
      '#黑名单授权<QQ/@成员>   授权使用黑名单管理（主人，通知主人）',
      '#黑名单取消授权<QQ/@成员> 取消授权（主人，通知主人）',
      '说明：主人和授权名单内 QQ 即使在黑名单中，也不会被本插件自动踢出。',
      '说明：全群查黑会先获取群列表，再按群依次获取成员列表，默认每次请求间隔 1 秒，可在插件 config 中修改。',
      '说明：定时全群查黑可在插件 config 中填写精确 cron 表达式启用。',
    ].join('\n')

    await e.reply(helpText)
    return true
  }
}
