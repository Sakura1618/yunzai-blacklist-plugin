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
      '#查黑            检查本群并自动踢黑名单成员（主人/授权名单自动跳过，需授权，通知主人）',
      '#全群查黑        全部群自动查黑并踢黑（主人/授权名单自动跳过，主人，通知主人）',
      '#黑名单列表      查看黑名单（需授权）',
      '#黑名单管理列表  查看管理名单（主人）',
      '#加黑<QQ>       添加黑名单（需授权，通知主人）',
      '#删黑<QQ>       删除黑名单（需授权，通知主人）',
      '#黑名单授权<QQ>   授权使用黑名单管理（主人，通知主人）',
      '#黑名单取消授权<QQ> 取消授权（主人，通知主人）',
      '说明：主人和授权名单内 QQ 即使在黑名单中，也不会被本插件自动踢出。',
    ].join('\n')

    await e.reply(helpText)
    return true
  }
}
