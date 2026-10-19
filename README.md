# dshx-language-mirror

> Makes the agent always reply — including final reports and summaries — in the language of the user's latest message.

让 AI 的回复（尤其是最终报告和总结）始终使用**你最近一条消息的语言**。中文提问就中文回答，中英混排就照样混排，中途换语言立刻跟着换；代码、命令、路径、标识符保持原文。

原理：通过 DSH 的 `systemPrompt` 服务注册一段常驻系统提示，每次请求都带上，不依赖技能是否被触发；不改 agent 主循环，卸载即移除。

## 配置（`cordis.patch.yml`）

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 是否启用 |
| `order` | `5` | 系统提示段落排序，越小越靠前 |
| `extra` | 空 | 追加到默认规则后的说明 |
| `text` | 空 | 完全替换默认规则 |

## 安装

```sh
# Web profile
dsh plugin --profile web add github:callaumyan-design/dshx-language-mirror
# Desktop（用 DSH Desktop 自带的 dsh 命令，先从托盘完全退出 Desktop）
dsh plugin --profile desktop add github:callaumyan-design/dshx-language-mirror
```

安装后重启 DSH。卸载：`dsh plugin --profile <profile> remove dshx-language-mirror`。

## 兼容性

在 DeepSeek Harness 0.2.0-rc.2（desktop / web profile）上开发和使用。纯 JavaScript，无构建步骤，无安装脚本。

## License

MIT
