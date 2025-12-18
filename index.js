import fs from 'node:fs'

logger.info('yunzai-blacklist-plugin -By Sakura1618')
logger.info('yunzai-blacklist-plugin 黑名单插件加载中')

const files = fs.readdirSync('./plugins/yunzai-blacklist-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

logger.info('yunzai-blacklist-plugin 黑名单插件加载成功!')

export { apps }