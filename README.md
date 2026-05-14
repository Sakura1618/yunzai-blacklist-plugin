# 🛡️ Yunzai Blacklist Plugin

黑名单/授权管理插件，支持入群自动踢黑、自检踢黑、定时全群查黑、黑名单与管理名单查询以及主人授权，并在关键操作时私聊通知主人。主人和授权名单内用户即使在黑名单中，也不会被本插件自动踢出。

## 💡 安装教程 
### 使用 Git 安装（推荐）
1. 在Yunzai目录打开终端，运行
    ```sh
    git clone https://github.com/Sakura1618/yunzai-blacklist-plugin.git ./plugins/yunzai-blacklist-plugin
    ```
2. 重启 Yunzai-Bot 后即可使用。

### 手动安装
1. 下载 [yunzai-blacklist-plugin](https://github.com/Sakura1618/yunzai-blacklist-plugin) 的代码。
2. 将 yunzai-blacklist-plugin 放置在 Yunzai-Bot 的 plugins 目录下。
3. 重启 Yunzai-Bot 后即可使用。

## ✨ 功能
- 📥 入群检测：新成员在黑名单内时自动踢出（需 Bot 管理员权限），但主人和授权名单内用户会自动跳过。
- 🔍 查黑自检：`#查黑` 扫描当前群成员，发现黑名单成员自动踢出；群内仅返回汇总，详细结果通知主人；主人和授权名单内用户会自动跳过。
- 🌐 全群查黑：`#全群查黑` 主人一键扫描所有群，自动踢出黑名单成员，详细结果通知主人；主人和授权名单内用户会自动跳过，群成员列表请求间隔默认 1 秒且支持配置，也支持配置精确 cron 定时任务。
- ➕➖ 黑名单管理：`#加黑`、`#删黑` 支持通过 QQ 或 @群成员 添加/删除黑名单；`#加黑` 成功后会立即执行一次全群查黑。
- 🧑‍💼 授权管理：主人可 `#黑名单授权`/`#黑名单取消授权` 通过 QQ 或 @群成员 指定可使用管理指令的对象（操作后通知主人）。
- 📃 列表查询：`#黑名单列表`、`#黑名单管理列表` 查看当前名单。
- 🆘 帮助：`#黑名单帮助` 查看完整指令列表。

## 📜 指令一览
- `#查黑`：扫描本群成员并自动踢出黑名单成员（群内仅显示汇总，详细结果通知主人，主人/授权名单自动跳过，需授权）
- `#全群查黑`：扫描所有群并自动踢出黑名单成员（默认每个群成员列表请求间隔 1 秒，可配置，主人/授权名单自动跳过，主人，详细结果通知主人）
- `#黑名单列表`：查看黑名单（需授权）
- `#黑名单管理列表`：查看管理名单（主人）
- `#加黑 <QQ/@成员>`：添加黑名单并立即执行一次全群查黑（需授权，通知主人）
- `#删黑 <QQ/@成员>`：删除黑名单（需授权，通知主人）
- `#黑名单授权 <QQ/@成员>`：授权目标使用黑名单管理指令（主人，通知主人）
- `#黑名单取消授权 <QQ/@成员>`：取消授权（主人，通知主人）
- `#黑名单帮助`：查看帮助

## 🔐 权限说明
- 主人：始终有权限，并可授权/取消授权其他 QQ。
- 管理员名单：存储于 `plugins/yunzai-blacklist-plugin/data/blacklist_permission.json`，名单内 QQ 可使用黑名单管理和查询指令。
- 黑名单：存储于 `plugins/yunzai-blacklist-plugin/data/blacklist.json`。
- 踢群豁免：主人与管理员名单中的 QQ 即使存在于黑名单，也不会被本插件自动踢出。

## 🗂️ 目录结构
插件目录：
- `apps/common.js`：文件读写、授权工具函数
- `apps/notice.js`：入群检测踢黑
- `apps/check.js`：`#查黑`、`#全群查黑` 与定时查黑
- `apps/manage.js`：黑名单增删、授权管理
- `apps/list.js`：名单查询
- `apps/help.js`：帮助指令
- `config/default_config.yaml`：默认配置
- `config/config.yaml`：运行时配置（首次启动自动生成）
- `data/blacklist.json`：黑名单
- `data/blacklist_permission.json`：管理名单

## 🚀 使用提示
1. 确保 Bot 在群内拥有管理员权限，以便踢黑成功。
2. 先由主人使用 `#黑名单授权 <QQ/@成员>` 将管理者加入授权名单，再由其执行黑名单相关指令。
3. 修改黑名单/管理名单后可直接生效，无需重启；如遇缓存问题，可重启 Yunzai。
4. 插件会在首次启动时自动生成 `plugins/yunzai-blacklist-plugin/config/config.yaml`，可在其中配置 `fullGroupCheckCron` 和 `fullGroupMemberInterval`。
5. `fullGroupCheckCron` 留空表示不启用定时全群查黑；填写后按 cron 表达式定时执行。
6. `fullGroupMemberInterval` 单位为秒，默认值为 `1`。

## ⚠️ 注意
- 主人和授权名单内 QQ 即使在黑名单中，也不会被本插件自动踢出，但仍会保留在黑名单数据中。
- 群聊中的 `#查黑` 与 `#全群查黑` 仅返回汇总，踢人失败等详细结果会私聊通知主人，需人工处理。
- 插件会在首次加载时尝试将旧的 `Yunzai/data/blacklist.json` 和 `Yunzai/data/blacklist_permission.json` 迁移到插件目录 `data/` 下。
- 全群查黑依赖适配器提供群列表、群成员列表和踢人接口；在 OneBot v11 + NapCat 环境下可按协议正常工作，如遇失败请优先检查 Bot 群管理权限与接口连通性。
