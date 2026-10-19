// dshx-language-mirror —— 让 AI 的回复（尤其是最终报告/总结）始终使用用户提示词的语言。
//
// 原理：通过 DSH 的 systemPrompt 服务注册一个常驻的系统提示段落（与 beauticode 同一机制），
// 每一次请求都会带上这段规则，不依赖技能是否被触发。
// 不修改 agent 主循环，不拦截消息，卸载插件即自动移除。
import z from '@deepseek-ai/schemastery'

export const name = 'dshx-language-mirror'

export const Config = z.object({
  enabled: z.boolean().default(true).description('是否启用'),
  order: z.number().default(5).description('系统提示段落排序；越小越靠前'),
  extra: z.string().default('').description('追加到默认规则后面的自定义说明（可留空）'),
  text: z.string().default('').description('完全替换默认规则（留空则用默认规则）'),
})

/** 默认规则。用英文书写，因为它是写给模型看的；规则本身要求模型按用户语言回复。 */
export const DEFAULT_RULE = [
  'LANGUAGE MIRROR (mandatory, highest priority among formatting rules):',
  '- Detect the language of the user\'s MOST RECENT message. Write your entire reply in that language, including the final report, summary, headings, tables, and status lines.',
  '- Mixed-language prompts (e.g. Chinese with English technical terms): reply in the dominant natural language and keep the same terms in English, mirroring the user\'s mix.',
  '- If the user switches language mid-conversation, switch immediately. The latest message wins over earlier history; an explicit instruction such as "reply in English" / "用中文回答" wins over everything.',
  '- The language of this system prompt, tool output, file contents, logs, web pages, and subagent/teammate reports does NOT decide the reply language. When relaying such material, translate your narration and summary into the user\'s language.',
  '- Keep verbatim (do not translate): code, commands, file paths, identifiers, config keys, error messages, and product/API names.',
  '- Do not announce the language choice; just answer in it.',
].join('\n')

/**
 * 组装最终规则文本。
 * @param {object} config - 经过 Config 校验的配置
 * @returns {string}
 */
export function buildRule(config = {}) {
  const base = typeof config.text === 'string' && config.text.trim() ? config.text.trim() : DEFAULT_RULE
  const extra = typeof config.extra === 'string' ? config.extra.trim() : ''
  return extra ? `${base}\n${extra}` : base
}

/**
 * 把规则注册到 systemPrompt 服务上。
 * @param {any} prompt - systemPrompt 服务
 * @param {object} config
 * @returns {Function|undefined} 若服务返回注销函数则透传
 */
export function registerSection(prompt, config = {}) {
  if (!prompt || typeof prompt.section !== 'function') return undefined
  const order = Number.isFinite(config.order) ? config.order : 5
  const disposer = prompt.section({ name: 'dshx:language-mirror', order, text: buildRule(config) })
  return typeof disposer === 'function' ? disposer : undefined
}

export function apply(ctx, config = {}) {
  const logger = ctx.logger?.(name)
  if (config.enabled === false) {
    logger?.info?.('disabled by config')
    return
  }
  let done = false
  const tryRegister = (scope) => {
    if (done) return
    try {
      const prompt = typeof scope.get === 'function' ? scope.get('systemPrompt') : scope.systemPrompt
      if (!prompt || typeof prompt.section !== 'function') return
      done = true
      const disposer = registerSection(prompt, config)
      if (disposer && typeof scope.effect === 'function') scope.effect(() => disposer)
      logger?.info?.('language mirror rule registered')
    } catch (error) {
      logger?.warn?.('register failed: %s', error?.message ?? error)
    }
  }
  // 优先等 systemPrompt 服务就绪；某些 DSH 版本只能通过 ctx.get 拿到，再兜底直接尝试一次。
  try {
    if (typeof ctx.inject === 'function') ctx.inject(['systemPrompt'], (scope) => { done = false; tryRegister(scope) })
  } catch { /* 该版本没有名为 systemPrompt 的可注入服务 */ }
  tryRegister(ctx)
}
