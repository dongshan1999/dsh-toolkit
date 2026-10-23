# dsh-toolkit 操作规则（禁止事项）

> 本文件只记录**不能做的事**与**必须的验证**。
> 违反任一「红线」都可能让 DSH 面板全部 404 或宿主崩溃。

## 一、红线：绝对不做

两条「唯一性」约束是所有事故的总开关：**Fetch 路由按 pathname 唯一**（`methods` 不参与判重）、
**每个 part 的 `inject` 必须覆盖它用到的全部服务**（尤其 `timer`）。守住这两条，绝大多数全站 404 不会发生。

### A. 路由与依赖注入

1. **不要用同一个 pathname 注册两条 Fetch 路由。**
   DSH 按 pathname 唯一判重，`methods` 不参与（`dsh-client-connection` 的 `registerFetchRoute`）。
   后果：`connection: exact Fetch route "…" is already registered` → 重试分支拿不到依赖 → fiber 回滚 →
   所有 `/api/*` 404、所有面板空白。
   正确：一条路由声明 `methods: ['GET','POST']`，在 handler 里按 `request.method` 分支。
   反例：同一 pathname 分别注册 `['GET','POST']` 与 `['DELETE']`。

2. **不要在没声明 `inject: ['timer']` 的 part 里用 `ctx.timeout / interval / throttle / debounce`。**
   后果：`cannot get property "timer" without inject`（timer 是 mixin accessor，报的是源服务名，不是
   `timeout`）。
   正确：`live-entry-*.js` 的顶层 `inject` 是全部 parts 的并集，改完必须确认它含 `timer`。

### B. 入口、缓存与模块

3. **不要删除或改名被任何 `live-entry-*.js` import 的模块。**
   后果：入口 `ERR_MODULE_NOT_FOUND` → 插件激活失败 → 所有面板 404。
   反例：删掉被入口 import 的模块后，profile 仍指向旧入口。

4. **不要用「删了再重建」处理组件目录或文件。**
   删目录会让所有 `import` 断链（同上一条），重建出来的新文件也不会自动被入口引用。
   正确：原地改；必须换文件时先加新的、同步改入口、最后才删旧的。

5. **换入口后不要在磁盘上保留旧 `live-entry-NN.js`。**
   旧入口指向已删模块，随时可能被组合树拣起；`node tools/check-client.mjs` 里专门有断言盯这条。

6. **入口相关三处必须同步改，不许只改一处：**
   `cordis.patch.yml` 的 `name: './live-entry-NN.js'`、`.gitignore` 的 `!live-entry-NN.js`、
   磁盘上只留当前入口。`node tools/check-client.mjs` 会核对这三者一致。

7. **改了被入口 import 的组件文件，必须升 `?v=N`。**
   不升的话 ESM 缓存命中旧模块，软重载后「代码改了、行为没变」。

### C. 宿主与 profile

8. **不要往 `~/.dsh/profiles/*/cordis.patch.yml` 追加注释来「触发重载」。**
   这会走宿主启动重载路径，可能触发宿主崩溃
   （`DesktopHostFatalError: cannot create effect on inactive context`）并导致前端
   gateway 一直 `failed to fetch`。
   正确：改完让**用户重启 DSH App**；或只改仓库侧文件，等下次启动生效。

9. **不要手工改 `~/.dsh/profiles/*/node_modules` 里的包。**
   装包、升包、禁用一律走 `plugin_manager` 或 profile 的 pnpm；手改会破坏目录结构与版本一致性。

10. **不要在项目目录里保留 rc.x 包副本、兼容性比对产物、升级备份目录。**
    这类目录体积大、容易被误判成「装了两份不同版本」。

11. **改 profile 的 `cordis.patch.yml` 前必须先备份**
    （`cp ~/.dsh/profiles/<名>/cordis.patch.yml /tmp/cordis.patch.yml.bak-<ts>`）；
    写 `~/.dsh` 下的文件需要 `danger-full-access`，并说明为什么必须写。

12. **不要在用户没确认时自己重载/重启宿主或 DSH App。**
    重启会换端口、断开前端连接，页面必须刷新，用户会以为接口坏了。
    要重启先问一句，得到确认再动。

### D. 数据与 git

13. **不要自动迁移、覆盖或删除用户数据。**
    老位置数据只给手工 `mv` 说明；旧 `favorites/` 目录不必搬。
    不加 `.migrated` 标记、不做启动时迁移（`migrate.js` 已删除，不要加回来）。

14. **数据只能落在 `$DSH_HOME/dsh-toolkit/<组件>/`**，文件 `0600`、目录 `0700`；
    不落进仓库、不落到项目目录、不用 `~/image-gen` 之类老路径。

15. **不要擅自 `git commit` / `git push`。**
    用户说「不要直接提交」时就只 `git add` 并汇报待提交文件清单。

### E. 脱敏与隐私

16. **提交前必须跑脱敏扫描**（`node tools/scrub-check.mjs`）：不提交 `.selfcheck-*`、`data/`、
    `node_modules`、真实密钥、本机绝对路径、邮箱。该脚本默认**连 git 历史一起扫**，
    `--no-history` 只用于临时排查，不能当提交依据。

17. **仓库里出现的一切示例一律用占位符**，不写本机真实值：

    | 类别 | 唯一允许的写法 | 反例（禁止） |
    |---|---|---|
    | 家目录 | `/Users/x/…`、`/home/x/…`、`~/.dsh/…` | 真实用户名拼出的绝对路径 |
    | 项目 / 工作区 | `demo-app`、`/work/demo`、`~/proj/demo` | 真实客户或项目代号 |
    | 会话 id | `session-00000000` | 真实会话 id 片段 |
    | 会话标题 | `示例会话`、`Demo session` | 真实会话标题 |
    | 落盘文件名 | `143012-a1b2c3d4.txt` | 真实剪贴板 / 生成图文件名 |
    | 域名 | `example.com`、`api.example.com` | 真实网关或代理域名 |
    | IP | `192.0.2.1`（RFC 5737 文档段） | 内网或公网真实 IP |
    | 端口 | `127.0.0.1:<port>` 或直接省略 | 本机 DSH 真实端口 |

18. **禁止写入仓库的真实信息**：本机用户名与家目录、主机名（`<user>de<Model>.local` 形态）、
    真实会话 id / 标题、真实项目或客户代号、真实落盘文件名、内网 IP 与端口、手机号、
    邮箱、身份证号、API key / token、模型网关域名与其 key、`git log` 里的 `用户名@主机名`。
    需要举例时按第 17 条换成占位符，不是"看起来像"就够。

19. **git 身份与提交信息也不许带私人信息。**
    作者必须是公开账号 + noreply 邮箱（如 `name <id@users.noreply.github.com>`），
    不要出现 `用户名@主机名`。提交信息里同样不写真实项目名、客户名、会话标题。

20. **发现历史已泄露时的固定动作**（顺序不能乱）：
    ① `git filter-repo --force --refs main --replace-text <清单>` 重写（清单 `旧==>新` 一行一条）；
    ② `--name-callback` / `--email-callback` 刷掉作者名里的本机信息；
    ③ `git push --force-with-lease origin main`（**永远不要 `git push --all` / `--mirror`**，
       会把含旧历史的备份分支推上去）；
    ④ 删本地备份分支 → `git reflog expire --expire=now --all` + `git gc --prune=now`；
    ⑤ 明确告知用户：强推后旧提交在 GitHub 上**仍可通过 commit URL 访问**（服务端缓存不可达对象），
       要彻底清除只能联系 GitHub Support 或删除仓库重建。

## 二、需要先问用户（不要自己决定）

- 重载 / 重启 DSH App 或宿主（会换端口、断连，见第 12 条）。
- 升级插件版本号（`package.json` 的 `version`）。
- 改 profile 的模型参数、凭据，或任何 `~/.dsh/profiles/**` 内容（仓库内的 `cordis.patch.yml` 除外）。
- 删除用户数据、迁移数据目录、重新生成索引。
- 改变面板交互（删按钮、改默认展开/收起、改快捷键）。

## 三、每次改完必须验证（缺一步就不算完成）

```bash
node -e "import('./live-entry-<NN>.js').then(m => console.log(m.inject.includes('timer')))"  # 入口可加载 + inject 含 timer
node build.mjs                                  # 重新生成顶层 client.js
node tools/check-client.mjs                     # 路由 / 面板 / 边界断言
node tools/scrub-check.mjs                      # 密钥 / 绝对路径 / 邮箱 / 历史泄露（工作区 + git 历史）
grep -n "live-entry" cordis.patch.yml .gitignore # 入口三处一致
```

任何一项失败：先修，不要跳过，不要「稍后再说」。

## 四、正确的重载方式（按优先级）

1. 改仓库代码 → 全部验证通过 → **让用户重启 DSH App**（最稳）。
2. 只改仓库内文件（不碰 profile）时，可以直接告诉用户「下次启动生效」。
3. 任何情况下，先 `node -e import('./live-entry-NN.js')` 验证新入口，再对用户说「已生效」。
4. 验证没全绿之前，不要说「已生效」，也不要自己去重启宿主。

## 五、事故速查

| 症状 | 最可能原因 | 处置 |
|---|---|---|
| 所有面板 404、`/api/*` 全部拿不到数据 | 插件 fiber 激活失败：入口 import 失败 / 路由重复 / inject 缺依赖 | 看宿主 warning 里的入口名；`plugin_manager` 查 `fiberPhase`；逐个 `node -e import` 入口 |
| `connection: exact Fetch route "…" is already registered` | 同一 pathname 注册多条 | 合并为一条 `methods` 数组，handler 内按 method 分支 |
| `cannot get property "timer" without inject` | 用了 `ctx.timeout` 但顶层 inject 没 timer | 补 `'timer'`，或把 timer 用法挪进已含 timer 的 part |
| 改完代码行为没变 | 没升 `?v=N`，ESM 缓存命中旧模块 | 升版本号 + 重建 + 重启 |
| 入口 ERR_MODULE_NOT_FOUND / 删过组件目录 | 被 import 的模块被删或改名 | 恢复模块；不要用「删了重建」处理组件目录 |
| 前端 gateway 一直 `failed to fetch` | 宿主重启换了端口，页面还连旧 origin | 刷新页面（确认 `lsof -nP -iTCP -sTCP:LISTEN` 里的端口） |
| `DesktopHostFatalError: cannot create effect on inactive context` | 宿主启动/重载时序缺陷（profile 变更触发） | 重启 App；不要再用 patch 注释触发重载 |
| `git log -p` 里出现本机路径 / 真实项目名 / 真实会话 id | 历史泄露（工作区改干净了，历史没改） | 按第 20 条 `filter-repo --replace-text` 重写 + 强推 + 清理 |
| 强推后旧 commit URL 仍能打开 | GitHub 保留不可达提交对象 | 联系 Support 清除，或删库重建后重新 push |
| 本地 ahead/behind 变成 `N↑ M↓` | 重写了历史，远端还是旧历史 | `git push --force-with-lease origin main`；**不要** `--all` |
